const { LiveStream, User } = require('../models');
const { canAccessContentTier } = require('../utils/contentTierHelper');
const { getShareholding } = require('../utils/shareholderHelper');
const { Op } = require('sequelize');

/**
 * 라이브 스트림 생성
 */
exports.createLiveStream = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      scheduledAt,
      accessTier = 'PUBLIC',
      thumbnailUrl
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: '제목이 필요합니다.' });
    }

    // 유효한 티어 확인
    const validTiers = ['PUBLIC', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'MAJOR_SHAREHOLDER'];
    if (!validTiers.includes(accessTier)) {
      return res.status(400).json({ error: '유효하지 않은 접근 티어입니다.' });
    }

    // 스트림 키 생성 (간단한 UUID 기반)
    const streamKey = `stream_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const liveStream = await LiveStream.create({
      userId,
      title,
      description,
      scheduledAt: scheduledAt || new Date(),
      accessTier,
      thumbnailUrl,
      streamKey,
      status: scheduledAt ? 'scheduled' : 'live',
      startedAt: scheduledAt ? null : new Date()
    });

    const liveStreamWithUser = await LiveStream.findByPk(liveStream.id, {
      include: [
        {
          model: User,
          as: 'streamer',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    res.status(201).json(liveStreamWithUser);
  } catch (error) {
    console.error('라이브 스트림 생성 오류:', error);
    res.status(500).json({ error: '라이브 스트림 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 라이브 스트림 목록 조회
 */
exports.getLiveStreams = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'live', page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await LiveStream.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'streamer',
          attributes: ['id', 'username', 'profilePicture']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // 각 라이브 스트림에 대한 접근 권한 확인
    const streamsWithAccess = await Promise.all(
      rows.map(async (stream) => {
        let hasAccess = false;

        // PUBLIC은 모두 접근 가능
        if (stream.accessTier === 'PUBLIC') {
          hasAccess = true;
        }
        // 본인 라이브는 항상 접근 가능
        else if (stream.userId === userId) {
          hasAccess = true;
        }
        // MAJOR_SHAREHOLDER 체크 (1000주 이상)
        else if (stream.accessTier === 'MAJOR_SHAREHOLDER') {
          const shareholding = await getShareholding(userId, stream.userId);
          hasAccess = shareholding >= 1000;
        }
        // 일반 티어 체크
        else {
          hasAccess = await canAccessContentTier(userId, stream.userId, stream.accessTier);
        }

        return {
          ...stream.toJSON(),
          hasAccess,
          // 접근 불가능한 경우 스트리밍 URL 숨김
          streamUrl: hasAccess ? stream.streamUrl : null,
          streamKey: (hasAccess && stream.userId === userId) ? stream.streamKey : null
        };
      })
    );

    res.json({
      liveStreams: streamsWithAccess,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('라이브 스트림 목록 조회 오류:', error);
    res.status(500).json({ error: '라이브 스트림 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 특정 라이브 스트림 조회
 */
exports.getLiveStream = async (req, res) => {
  try {
    const userId = req.user.id;
    const { streamId } = req.params;

    const liveStream = await LiveStream.findByPk(streamId, {
      include: [
        {
          model: User,
          as: 'streamer',
          attributes: ['id', 'username', 'profilePicture']
        }
      ]
    });

    if (!liveStream) {
      return res.status(404).json({ error: '라이브 스트림을 찾을 수 없습니다.' });
    }

    // 접근 권한 확인
    let hasAccess = false;

    if (liveStream.accessTier === 'PUBLIC') {
      hasAccess = true;
    } else if (liveStream.userId === userId) {
      hasAccess = true;
    } else if (liveStream.accessTier === 'MAJOR_SHAREHOLDER') {
      const shareholding = await getShareholding(userId, liveStream.userId);
      hasAccess = shareholding >= 1000;
    } else {
      hasAccess = await canAccessContentTier(userId, liveStream.userId, liveStream.accessTier);
    }

    if (!hasAccess) {
      const shareholding = await getShareholding(userId, liveStream.userId);
      return res.status(403).json({
        error: '이 라이브 스트림에 접근할 수 없습니다.',
        accessTier: liveStream.accessTier,
        currentShares: shareholding,
        requiredInfo: liveStream.accessTier === 'MAJOR_SHAREHOLDER'
          ? '대주주 (1,000주 이상) 필요'
          : `${liveStream.accessTier} 티어 필요`
      });
    }

    // 조회수 증가
    if (liveStream.status === 'live') {
      await liveStream.increment('totalViews');
    }

    res.json({
      ...liveStream.toJSON(),
      hasAccess,
      streamKey: liveStream.userId === userId ? liveStream.streamKey : null
    });
  } catch (error) {
    console.error('라이브 스트림 조회 오류:', error);
    res.status(500).json({ error: '라이브 스트림 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 라이브 스트림 시작
 */
exports.startLiveStream = async (req, res) => {
  try {
    const userId = req.user.id;
    const { streamId } = req.params;

    const liveStream = await LiveStream.findByPk(streamId);

    if (!liveStream) {
      return res.status(404).json({ error: '라이브 스트림을 찾을 수 없습니다.' });
    }

    if (liveStream.userId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    liveStream.status = 'live';
    liveStream.startedAt = new Date();
    await liveStream.save();

    res.json(liveStream);
  } catch (error) {
    console.error('라이브 스트림 시작 오류:', error);
    res.status(500).json({ error: '라이브 스트림 시작 중 오류가 발생했습니다.' });
  }
};

/**
 * 라이브 스트림 종료
 */
exports.endLiveStream = async (req, res) => {
  try {
    const userId = req.user.id;
    const { streamId } = req.params;

    const liveStream = await LiveStream.findByPk(streamId);

    if (!liveStream) {
      return res.status(404).json({ error: '라이브 스트림을 찾을 수 없습니다.' });
    }

    if (liveStream.userId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    liveStream.status = 'ended';
    liveStream.endedAt = new Date();
    liveStream.viewerCount = 0;
    await liveStream.save();

    res.json(liveStream);
  } catch (error) {
    console.error('라이브 스트림 종료 오류:', error);
    res.status(500).json({ error: '라이브 스트림 종료 중 오류가 발생했습니다.' });
  }
};

/**
 * 라이브 스트림 삭제
 */
exports.deleteLiveStream = async (req, res) => {
  try {
    const userId = req.user.id;
    const { streamId } = req.params;

    const liveStream = await LiveStream.findByPk(streamId);

    if (!liveStream) {
      return res.status(404).json({ error: '라이브 스트림을 찾을 수 없습니다.' });
    }

    if (liveStream.userId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    await liveStream.destroy();

    res.json({ message: '라이브 스트림이 삭제되었습니다.' });
  } catch (error) {
    console.error('라이브 스트림 삭제 오류:', error);
    res.status(500).json({ error: '라이브 스트림 삭제 중 오류가 발생했습니다.' });
  }
};

/**
 * 시청자 수 업데이트 (WebSocket 연동용)
 */
exports.updateViewerCount = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { viewerCount } = req.body;

    const liveStream = await LiveStream.findByPk(streamId);

    if (!liveStream) {
      return res.status(404).json({ error: '라이브 스트림을 찾을 수 없습니다.' });
    }

    liveStream.viewerCount = viewerCount || 0;
    await liveStream.save();

    res.json({ viewerCount: liveStream.viewerCount });
  } catch (error) {
    console.error('시청자 수 업데이트 오류:', error);
    res.status(500).json({ error: '시청자 수 업데이트 중 오류가 발생했습니다.' });
  }
};
