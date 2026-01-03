/**
 * 주주 전용 커뮤니티 컨트롤러
 */

const shareholderCommunityService = require('../services/shareholderCommunityService');

// 커뮤니티 생성
exports.createCommunity = async (req, res) => {
  try {
    const { stockId, ...data } = req.body;
    const community = await shareholderCommunityService.createCommunity(
      req.user.id,
      stockId,
      data
    );
    res.status(201).json(community);
  } catch (error) {
    console.error('Create community error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 주식으로 커뮤니티 조회
exports.getCommunityByStock = async (req, res) => {
  try {
    const { stockId } = req.params;
    const community = await shareholderCommunityService.getCommunityByStock(stockId);
    if (!community) {
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다' });
    }
    res.json(community);
  } catch (error) {
    console.error('Get community error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 커뮤니티 상세 조회
exports.getCommunityDetail = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user?.id;
    const detail = await shareholderCommunityService.getCommunityDetail(communityId, userId);
    res.json(detail);
  } catch (error) {
    console.error('Get community detail error:', error);
    res.status(404).json({ error: error.message });
  }
};

// 커뮤니티 가입
exports.joinCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const member = await shareholderCommunityService.joinCommunity(communityId, req.user.id);
    res.status(201).json(member);
  } catch (error) {
    console.error('Join community error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 커뮤니티 탈퇴
exports.leaveCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    await shareholderCommunityService.leaveCommunity(communityId, req.user.id);
    res.json({ message: '커뮤니티를 탈퇴했습니다' });
  } catch (error) {
    console.error('Leave community error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 멤버 목록 조회
exports.getMembers = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { tier, limit, offset } = req.query;
    const result = await shareholderCommunityService.getMembers(communityId, {
      tier,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });
    res.json(result);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 메시지 전송
exports.sendMessage = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { content, isVipRoom } = req.body;
    const message = await shareholderCommunityService.sendMessage(
      communityId,
      req.user.id,
      content,
      { isVipRoom }
    );
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 메시지 조회
exports.getMessages = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { limit, before, isVipRoom } = req.query;
    const messages = await shareholderCommunityService.getMessages(
      communityId,
      req.user?.id,
      {
        limit: parseInt(limit) || 50,
        before: before ? new Date(before) : null,
        isVipRoom: isVipRoom === 'true'
      }
    );
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 메시지 고정
exports.pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await shareholderCommunityService.pinMessage(messageId, req.user.id);
    res.json(message);
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 고정 메시지 조회
exports.getPinnedMessages = async (req, res) => {
  try {
    const { communityId } = req.params;
    const messages = await shareholderCommunityService.getPinnedMessages(communityId);
    res.json(messages);
  } catch (error) {
    console.error('Get pinned messages error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 공지사항 작성
exports.createNotice = async (req, res) => {
  try {
    const { communityId } = req.params;
    const notice = await shareholderCommunityService.createNotice(
      communityId,
      req.user.id,
      req.body
    );
    res.status(201).json(notice);
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 공지사항 목록 조회
exports.getNotices = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { limit, offset } = req.query;
    const notices = await shareholderCommunityService.getNotices(
      communityId,
      req.user?.id,
      { limit: parseInt(limit) || 20, offset: parseInt(offset) || 0 }
    );
    res.json(notices);
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 멤버 경고
exports.warnMember = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    const { reason } = req.body;
    const result = await shareholderCommunityService.warnMember(
      communityId,
      userId,
      req.user.id,
      reason
    );
    res.json(result);
  } catch (error) {
    console.error('Warn member error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 멤버 퇴장
exports.banMember = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    const { reason, hours } = req.body;
    const result = await shareholderCommunityService.banMember(
      communityId,
      userId,
      req.user.id,
      reason,
      hours || 48
    );
    res.json(result);
  } catch (error) {
    console.error('Ban member error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 커뮤니티 통계 조회
exports.getCommunityStats = async (req, res) => {
  try {
    const { communityId } = req.params;
    const stats = await shareholderCommunityService.getCommunityStats(communityId);
    res.json(stats);
  } catch (error) {
    console.error('Get community stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 커뮤니티 설정 업데이트
exports.updateSettings = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await shareholderCommunityService.updateCommunitySettings(
      communityId,
      req.user.id,
      req.body
    );
    res.json(community);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(400).json({ error: error.message });
  }
};

// 사용자의 커뮤니티 목록
exports.getUserCommunities = async (req, res) => {
  try {
    const communities = await shareholderCommunityService.getUserCommunities(req.user.id);
    res.json(communities);
  } catch (error) {
    console.error('Get user communities error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 멤버 보유량 업데이트 (관리자용)
exports.updateMemberShareholdings = async (req, res) => {
  try {
    const { communityId } = req.params;
    const result = await shareholderCommunityService.updateMemberShareholdings(communityId);
    res.json(result);
  } catch (error) {
    console.error('Update member shareholdings error:', error);
    res.status(500).json({ error: error.message });
  }
};
