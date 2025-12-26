const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Verification = require('../models/Verification');
const { Op } = require('sequelize');
const autoVerificationService = require('../services/autoVerificationService');

// 인증 요청 제출
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      verificationType,
      realName,
      occupation,
      category,
      proofDocuments,
      socialLinks,
      followerCount,
      description,
      newsKeywords
    } = req.body;

    // 유효성 검사
    if (!verificationType || !realName || !occupation) {
      return res.status(400).json({
        success: false,
        error: '필수 정보를 모두 입력해주세요 (인증 유형, 실명, 직업)'
      });
    }

    // 이미 인증된 사용자인지 확인
    const user = await User.findByPk(userId);
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        error: '이미 인증된 계정입니다'
      });
    }

    // 대기 중인 인증 요청이 있는지 확인
    const pendingRequest = await Verification.findOne({
      where: {
        userId,
        status: 'pending'
      }
    });

    if (pendingRequest) {
      return res.status(400).json({
        success: false,
        error: '이미 대기 중인 인증 요청이 있습니다'
      });
    }

    // 인증 요청 생성
    const verification = await Verification.create({
      userId,
      verificationType,
      realName,
      occupation,
      category: category || verificationType,
      proofDocuments: proofDocuments || [],
      socialLinks: socialLinks || {},
      followerCount: followerCount || 0,
      description: description || '',
      newsKeywords: newsKeywords || `${realName} ${occupation}`,
      status: 'pending',
      submittedAt: new Date()
    });

    // 자동 검증 실행 (비동기)
    try {
      const autoVerificationResult = await autoVerificationService.verifyInfluencer({
        realName,
        occupation,
        category: category || verificationType,
        socialLinks: socialLinks || {},
        followerCount: followerCount || 0,
        description: description || '',
        newsKeywords: newsKeywords || `${realName} ${occupation}`,
        email: user.email,  // 이메일 도메인 검증용
      });

      // 자동 검증 결과 저장
      await verification.update({
        autoVerificationScore: autoVerificationResult.totalScore,
        autoVerificationResult: autoVerificationResult,
        autoVerificationDecision: autoVerificationResult.decision
      });

      // 자동 승인인 경우 즉시 처리
      if (autoVerificationResult.decision === 'auto_approved') {
        await verification.update({
          status: 'approved',
          reviewedAt: new Date()
        });

        await user.update({
          isVerified: true,
          realName,
          occupation,
          category: category || verificationType,
          newsKeywords: newsKeywords || `${realName} ${occupation}`,
          verifiedAt: new Date()
        });

        return res.json({
          success: true,
          verification: await verification.reload(),
          autoApproved: true,
          score: autoVerificationResult.totalScore,
          message: `축하합니다! 자동 인증되었습니다. (점수: ${autoVerificationResult.totalScore}/100)`
        });
      }

      // 자동 거부인 경우
      if (autoVerificationResult.decision === 'auto_rejected') {
        await verification.update({
          status: 'rejected',
          reviewedAt: new Date(),
          rejectionReason: `자동 검증 실패: 총점 ${autoVerificationResult.totalScore}점 (최소 70점 필요)\n\n상세:\n${JSON.stringify(autoVerificationResult.scores, null, 2)}`
        });

        return res.json({
          success: true,
          verification: await verification.reload(),
          autoRejected: true,
          score: autoVerificationResult.totalScore,
          message: `인증 요청이 거부되었습니다. 점수: ${autoVerificationResult.totalScore}/100 (최소 70점 필요)`
        });
      }

    } catch (autoVerifyError) {
      console.error('자동 검증 오류:', autoVerifyError);
      // 자동 검증 실패 시 관리자 검토로 진행
    }

    res.json({
      success: true,
      verification: await verification.reload(),
      message: '인증 요청이 제출되었습니다. 관리자 검토까지 최대 3-5일 소요됩니다.'
    });
  } catch (error) {
    console.error('인증 요청 제출 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 내 인증 요청 상태 조회
router.get('/my-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const verification = await Verification.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username']
      }]
    });

    res.json({
      success: true,
      verification,
      isVerified: req.user.isVerified
    });
  } catch (error) {
    console.error('인증 상태 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 인증 요청 취소
router.delete('/cancel/:verificationId', authenticateToken, async (req, res) => {
  try {
    const { verificationId } = req.params;
    const userId = req.user.id;

    const verification = await Verification.findOne({
      where: {
        id: verificationId,
        userId,
        status: 'pending'
      }
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: '인증 요청을 찾을 수 없거나 이미 처리되었습니다'
      });
    }

    await verification.destroy();

    res.json({
      success: true,
      message: '인증 요청이 취소되었습니다'
    });
  } catch (error) {
    console.error('인증 요청 취소 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// ===== 관리자 전용 API =====

// 모든 인증 요청 조회 (관리자)
router.get('/admin/requests', authenticateToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다'
      });
    }

    const { status, type } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }
    if (type) {
      where.verificationType = type;
    }

    const verifications = await Verification.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'profileImage', 'trustLevel', 'marketCap']
      }, {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username']
      }],
      order: [['submittedAt', 'DESC']]
    });

    res.json({
      success: true,
      verifications,
      total: verifications.length
    });
  } catch (error) {
    console.error('인증 요청 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 인증 요청 상세 조회 (관리자)
router.get('/admin/requests/:verificationId', authenticateToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다'
      });
    }

    const { verificationId } = req.params;

    const verification = await Verification.findByPk(verificationId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'profileImage', 'bio', 'trustLevel', 'marketCap', 'createdAt']
      }, {
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username']
      }]
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: '인증 요청을 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      verification
    });
  } catch (error) {
    console.error('인증 요청 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 인증 승인 (관리자)
router.post('/admin/approve/:verificationId', authenticateToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다'
      });
    }

    const { verificationId } = req.params;
    const adminId = req.user.id;

    const verification = await Verification.findByPk(verificationId, {
      include: [{ model: User, as: 'user' }]
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: '인증 요청을 찾을 수 없습니다'
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '이미 처리된 요청입니다'
      });
    }

    // 인증 승인 처리
    await verification.update({
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: new Date()
    });

    // User 테이블 업데이트
    await verification.user.update({
      isVerified: true,
      realName: verification.realName,
      occupation: verification.occupation,
      category: verification.category,
      newsKeywords: verification.newsKeywords,
      verifiedAt: new Date()
    });

    res.json({
      success: true,
      verification,
      message: `${verification.realName}님의 인증이 승인되었습니다`
    });
  } catch (error) {
    console.error('인증 승인 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 인증 거부 (관리자)
router.post('/admin/reject/:verificationId', authenticateToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다'
      });
    }

    const { verificationId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: '거부 사유를 입력해주세요'
      });
    }

    const verification = await Verification.findByPk(verificationId);

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: '인증 요청을 찾을 수 없습니다'
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '이미 처리된 요청입니다'
      });
    }

    // 인증 거부 처리
    await verification.update({
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectionReason
    });

    res.json({
      success: true,
      verification,
      message: '인증 요청이 거부되었습니다'
    });
  } catch (error) {
    console.error('인증 거부 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 인증 통계 (관리자)
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다'
      });
    }

    const [pending, approved, rejected, totalVerifiedUsers] = await Promise.all([
      Verification.count({ where: { status: 'pending' } }),
      Verification.count({ where: { status: 'approved' } }),
      Verification.count({ where: { status: 'rejected' } }),
      User.count({ where: { isVerified: true } })
    ]);

    // 유형별 통계
    const byType = await Verification.findAll({
      attributes: [
        'verificationType',
        [Verification.sequelize.fn('COUNT', Verification.sequelize.col('id')), 'count']
      ],
      where: { status: 'approved' },
      group: ['verificationType']
    });

    res.json({
      success: true,
      stats: {
        pending,
        approved,
        rejected,
        totalVerifiedUsers,
        byType: byType.map(item => ({
          type: item.verificationType,
          count: parseInt(item.get('count'))
        }))
      }
    });
  } catch (error) {
    console.error('인증 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

module.exports = router;
