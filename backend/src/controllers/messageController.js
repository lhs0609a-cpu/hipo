const { Conversation, Message, User } = require('../models');
const { Op } = require('sequelize');
const { checkDMLimit, incrementDMCount } = require('../utils/shareholderHelper');

/**
 * 사용자의 대화 목록 조회
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'username']
          }]
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    // 상대방 정보와 마지막 메시지 포함
    const conversationsWithDetails = conversations.map(conv => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
      const lastMessage = conv.messages && conv.messages.length > 0 ? conv.messages[0] : null;

      return {
        id: conv.id,
        otherUser,
        lastMessage,
        lastMessageAt: conv.lastMessageAt
      };
    });

    res.json({ conversations: conversationsWithDetails });
  } catch (error) {
    console.error('대화 목록 조회 오류:', error);
    res.status(500).json({ error: '대화 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 특정 사용자와의 대화 또는 새 대화 시작
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    if (userId === parseInt(otherUserId)) {
      return res.status(400).json({ error: '자기 자신과는 대화할 수 없습니다' });
    }

    // 기존 대화 찾기
    let conversation = await Conversation.findOne({
      where: {
        [Op.or]: [
          { user1Id: userId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: userId }
        ]
      }
    });

    // 대화가 없으면 생성
    if (!conversation) {
      conversation = await Conversation.create({
        user1Id: userId,
        user2Id: otherUserId
      });
    }

    res.json({ conversationId: conversation.id });
  } catch (error) {
    console.error('대화 생성 오류:', error);
    res.status(500).json({ error: '대화 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 대화 내 메시지 조회
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // 대화가 존재하고 현재 사용자가 참여자인지 확인
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: '대화를 찾을 수 없습니다' });
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: '접근 권한이 없습니다' });
    }

    // 상대방 ID 확인
    const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;

    // 읽음 확인 권한 체크 (1,000주 이상 보유 시)
    const dmLimitCheck = await checkDMLimit(userId, otherUserId);
    const hasReadReceipt = dmLimitCheck.hasReadReceipt;

    const messages = await Message.findAll({
      where: { conversationId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [['created_at', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 읽음 확인 권한이 없으면 isRead 정보 숨기기
    const messagesWithReadStatus = messages.map(msg => {
      const msgData = msg.toJSON();
      if (!hasReadReceipt && msg.senderId === userId) {
        delete msgData.isRead; // 읽음 확인 권한이 없으면 숨김
      }
      return msgData;
    });

    res.json({
      messages: messagesWithReadStatus,
      hasReadReceipt
    });
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    res.status(500).json({ error: '메시지 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 메시지 전송
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '메시지 내용이 필요합니다' });
    }

    // 대화가 존재하고 현재 사용자가 참여자인지 확인
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: '대화를 찾을 수 없습니다' });
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: '접근 권한이 없습니다' });
    }

    // 상대방 ID 확인
    const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;

    // DM 제한 확인 (본인에게 보내는 경우 제외)
    if (userId !== otherUserId) {
      const dmLimitCheck = await checkDMLimit(userId, otherUserId);

      if (!dmLimitCheck.allowed) {
        return res.status(403).json({
          error: dmLimitCheck.reason || 'DM 발송 제한을 초과했습니다.',
          limit: dmLimitCheck.limit,
          used: dmLimitCheck.used
        });
      }
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      content: content.trim()
    });

    // 대화의 마지막 메시지 시간 업데이트
    await conversation.update({
      lastMessageAt: new Date()
    });

    // DM 카운트 증가 (본인에게 보내는 경우 제외)
    if (userId !== otherUserId) {
      await incrementDMCount(userId, otherUserId);
    }

    const messageWithSender = await Message.findByPk(message.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    res.status(201).json({
      message: '메시지가 전송되었습니다',
      data: messageWithSender
    });
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ error: '메시지 전송 중 오류가 발생했습니다' });
  }
};

/**
 * 메시지 읽음 처리
 */
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // 대화가 존재하고 현재 사용자가 참여자인지 확인
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: '대화를 찾을 수 없습니다' });
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: '접근 권한이 없습니다' });
    }

    // 상대방이 보낸 읽지 않은 메시지를 읽음 처리
    await Message.update(
      { isRead: true },
      {
        where: {
          conversationId,
          senderId: { [Op.ne]: userId },
          isRead: false
        }
      }
    );

    res.json({ message: '메시지를 읽음 처리했습니다' });
  } catch (error) {
    console.error('메시지 읽음 처리 오류:', error);
    res.status(500).json({ error: '메시지 읽음 처리 중 오류가 발생했습니다' });
  }
};
