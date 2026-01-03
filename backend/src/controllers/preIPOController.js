const preIPOService = require('../services/preIPOService');

// ============ 라운드 조회 ============

// 활성 Pre-IPO 라운드 목록 조회
exports.getActiveRounds = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const userId = req.user?.id;

    const result = await preIPOService.getActiveRounds({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      userId
    });

    res.json(result);
  } catch (error) {
    console.error('Get active rounds error:', error);
    res.status(500).json({
      success: false,
      message: 'Pre-IPO 라운드 조회에 실패했습니다.',
      error: error.message
    });
  }
};

// Pre-IPO 라운드 상세 조회
exports.getRoundDetail = async (req, res) => {
  try {
    const { roundId } = req.params;
    const userId = req.user?.id;

    const result = await preIPOService.getRoundDetail(roundId, userId);

    res.json(result);
  } catch (error) {
    console.error('Get round detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Pre-IPO 상세 조회에 실패했습니다.',
      error: error.message
    });
  }
};

// ============ 라운드 생성/관리 ============

// Pre-IPO 라운드 생성
exports.createRound = async (req, res) => {
  try {
    const userId = req.user.id;
    const roundData = req.body;

    const result = await preIPOService.createRound(userId, roundData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create round error:', error);
    res.status(500).json({
      success: false,
      message: 'Pre-IPO 라운드 생성에 실패했습니다.',
      error: error.message
    });
  }
};

// 내 Pre-IPO 라운드 조회 (발행자)
exports.getMyRound = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await preIPOService.getMyRound(userId);

    res.json(result);
  } catch (error) {
    console.error('Get my round error:', error);
    res.status(500).json({
      success: false,
      message: '내 Pre-IPO 조회에 실패했습니다.',
      error: error.message
    });
  }
};

// 라운드 업데이트
exports.updateRound = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roundId } = req.params;
    const updateData = req.body;

    const result = await preIPOService.updateRound(roundId, userId, updateData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Update round error:', error);
    res.status(500).json({
      success: false,
      message: 'Pre-IPO 라운드 수정에 실패했습니다.',
      error: error.message
    });
  }
};

// 라운드 취소
exports.cancelRound = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roundId } = req.params;

    const result = await preIPOService.cancelRound(roundId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Cancel round error:', error);
    res.status(500).json({
      success: false,
      message: 'Pre-IPO 라운드 취소에 실패했습니다.',
      error: error.message
    });
  }
};

// ============ 투자 ============

// 투자 자격 확인
exports.checkEligibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roundId } = req.params;

    const result = await preIPOService.checkEligibility(roundId, userId);

    res.json(result);
  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: '자격 확인에 실패했습니다.',
      error: error.message
    });
  }
};

// Pre-IPO 투자하기
exports.invest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roundId } = req.params;
    const { shares, inviteCode } = req.body;

    if (!shares || shares <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 투자 수량을 입력해주세요.'
      });
    }

    const result = await preIPOService.invest(roundId, userId, {
      shares: parseInt(shares),
      inviteCode
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Invest error:', error);
    res.status(500).json({
      success: false,
      message: '투자에 실패했습니다.',
      error: error.message
    });
  }
};

// 투자 취소
exports.cancelInvestment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { investmentId } = req.params;

    const result = await preIPOService.cancelInvestment(investmentId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Cancel investment error:', error);
    res.status(500).json({
      success: false,
      message: '투자 취소에 실패했습니다.',
      error: error.message
    });
  }
};

// 내 Pre-IPO 투자 목록
exports.getMyInvestments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const result = await preIPOService.getMyInvestments(userId, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    console.error('Get my investments error:', error);
    res.status(500).json({
      success: false,
      message: '투자 목록 조회에 실패했습니다.',
      error: error.message
    });
  }
};

// ============ 관리자 기능 ============

// 라운드 승인 (관리자)
exports.approveRound = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { roundId } = req.params;

    // 관리자 권한 체크
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const result = await preIPOService.approveRound(roundId, adminId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Approve round error:', error);
    res.status(500).json({
      success: false,
      message: '라운드 승인에 실패했습니다.',
      error: error.message
    });
  }
};

// 라운드 거절 (관리자)
exports.rejectRound = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { roundId } = req.params;
    const { reason } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const result = await preIPOService.rejectRound(roundId, adminId, reason);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Reject round error:', error);
    res.status(500).json({
      success: false,
      message: '라운드 거절에 실패했습니다.',
      error: error.message
    });
  }
};

// IPO 전환 (관리자 또는 시스템)
exports.convertToIPO = async (req, res) => {
  try {
    const { roundId } = req.params;
    const { ipoOfferingId } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const result = await preIPOService.convertToIPO(roundId, ipoOfferingId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Convert to IPO error:', error);
    res.status(500).json({
      success: false,
      message: 'IPO 전환에 실패했습니다.',
      error: error.message
    });
  }
};

// 라운드 투자자 목록 조회 (발행자/관리자)
exports.getRoundInvestors = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roundId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await preIPOService.getRoundInvestors(roundId, userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get round investors error:', error);
    res.status(500).json({
      success: false,
      message: '투자자 목록 조회에 실패했습니다.',
      error: error.message
    });
  }
};

// 라운드 통계 조회
exports.getRoundStats = async (req, res) => {
  try {
    const { roundId } = req.params;

    const result = await preIPOService.getRoundStats(roundId);

    res.json(result);
  } catch (error) {
    console.error('Get round stats error:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회에 실패했습니다.',
      error: error.message
    });
  }
};
