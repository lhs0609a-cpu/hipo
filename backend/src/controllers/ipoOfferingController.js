/**
 * IPO 공모/청약 컨트롤러
 */

const ipoOfferingService = require('../services/ipoOfferingService');
const ipoEligibilityService = require('../services/ipoEligibilityService');
const { Stock, IPOOffering, sequelize } = require('../models');

/**
 * 공모 목록 조회
 */
exports.getOfferings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await ipoOfferingService.getActiveOfferings({
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    res.json(result);
  } catch (error) {
    console.error('공모 목록 조회 오류:', error);
    res.status(500).json({ error: '공모 목록을 불러오는데 실패했습니다' });
  }
};

/**
 * 공모 상세 조회
 */
exports.getOfferingDetail = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const userId = req.user?.id;
    const result = await ipoOfferingService.getOfferingDetail(offeringId, userId);

    if (!result) {
      return res.status(404).json({ error: '공모를 찾을 수 없습니다' });
    }

    res.json(result);
  } catch (error) {
    console.error('공모 상세 조회 오류:', error);
    res.status(500).json({ error: '공모 정보를 불러오는데 실패했습니다' });
  }
};

/**
 * IPO 공모 신청 (상장 자격 충족 후)
 */
exports.createOffering = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const {
      offeringPrice,
      totalShares,
      subscriptionDays,
      description,
      category,
      highlights,
      allocationMethod,
      maxSubscriptionShares
    } = req.body;

    // 자격 확인
    const eligibility = await ipoEligibilityService.checkEligibility(userId);
    if (!eligibility.isEligible) {
      await t.rollback();
      return res.status(400).json({
        error: '상장 자격 요건을 충족하지 않습니다',
        eligibility
      });
    }

    // 이미 상장된 주식이 있는지 확인
    let stock = await Stock.findOne({ where: { userId }, transaction: t });

    if (stock && stock.status === 'active') {
      await t.rollback();
      return res.status(400).json({ error: '이미 상장된 주식이 있습니다' });
    }

    // 진행 중인 공모가 있는지 확인
    const existingOffering = await IPOOffering.findOne({
      where: {
        userId,
        status: ['pending', 'approved', 'subscription', 'closed', 'allocating']
      },
      transaction: t
    });

    if (existingOffering) {
      await t.rollback();
      return res.status(400).json({ error: '이미 진행 중인 공모가 있습니다' });
    }

    // 주식이 없으면 생성
    if (!stock) {
      stock = await Stock.create({
        userId,
        sharePrice: offeringPrice,
        totalShares: 100000,
        availableShares: totalShares,
        issuedShares: 0,
        status: 'ipo_pending',
        ipoApproved: false,
        category: category || 'other',
        tier: 'BRONZE'
      }, { transaction: t });
    } else {
      await stock.update({
        sharePrice: offeringPrice,
        availableShares: totalShares,
        status: 'ipo_pending'
      }, { transaction: t });
    }

    // 공모 생성
    const offering = await ipoOfferingService.createOffering({
      stockId: stock.id,
      userId,
      offeringPrice,
      totalShares,
      subscriptionDays,
      description,
      category,
      highlights,
      allocationMethod,
      maxSubscriptionShares
    }, t);

    await t.commit();

    res.json({
      message: 'IPO 공모가 신청되었습니다. 심사 후 청약이 시작됩니다.',
      offering: {
        id: offering.id,
        offeringPrice,
        totalShares,
        subscriptionStartAt: offering.subscriptionStartAt,
        subscriptionEndAt: offering.subscriptionEndAt,
        status: offering.status
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('공모 신청 오류:', error);
    res.status(500).json({ error: error.message || '공모 신청 중 오류가 발생했습니다' });
  }
};

/**
 * 청약 신청
 */
exports.subscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { offeringId } = req.params;
    const { shares } = req.body;

    if (!shares || shares < 1) {
      return res.status(400).json({ error: '청약 수량을 입력해주세요' });
    }

    const result = await ipoOfferingService.subscribe(offeringId, userId, parseInt(shares));

    res.json({
      message: '청약이 완료되었습니다',
      subscription: result.subscription,
      competitionRate: result.competitionRate
    });
  } catch (error) {
    console.error('청약 신청 오류:', error);
    res.status(400).json({ error: error.message || '청약 신청에 실패했습니다' });
  }
};

/**
 * 청약 취소
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.params;

    const result = await ipoOfferingService.cancelSubscription(subscriptionId, userId);

    res.json({
      message: '청약이 취소되었습니다',
      refundAmount: result.refundAmount
    });
  } catch (error) {
    console.error('청약 취소 오류:', error);
    res.status(400).json({ error: error.message || '청약 취소에 실패했습니다' });
  }
};

/**
 * 내 청약 목록
 */
exports.getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const result = await ipoOfferingService.getMySubscriptions(userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    console.error('내 청약 목록 조회 오류:', error);
    res.status(500).json({ error: '청약 목록을 불러오는데 실패했습니다' });
  }
};

/**
 * 공모 승인 (관리자)
 */
exports.approveOffering = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { note } = req.body;
    const reviewerId = req.user.id;

    const offering = await ipoOfferingService.approveOffering(offeringId, reviewerId, note);

    res.json({
      message: '공모가 승인되었습니다',
      offering
    });
  } catch (error) {
    console.error('공모 승인 오류:', error);
    res.status(400).json({ error: error.message || '공모 승인에 실패했습니다' });
  }
};

/**
 * 공모 거절 (관리자)
 */
exports.rejectOffering = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const { note } = req.body;
    const reviewerId = req.user.id;

    const offering = await ipoOfferingService.rejectOffering(offeringId, reviewerId, note);

    res.json({
      message: '공모가 거절되었습니다',
      offering
    });
  } catch (error) {
    console.error('공모 거절 오류:', error);
    res.status(400).json({ error: error.message || '공모 거절에 실패했습니다' });
  }
};

/**
 * 배정 처리 (관리자/자동)
 */
exports.processAllocation = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const result = await ipoOfferingService.processAllocation(offeringId);

    if (result.success) {
      res.json({
        message: '배정이 완료되었습니다',
        ...result
      });
    } else {
      res.json({
        message: 'IPO가 실패했습니다',
        reason: result.reason
      });
    }
  } catch (error) {
    console.error('배정 처리 오류:', error);
    res.status(400).json({ error: error.message || '배정 처리에 실패했습니다' });
  }
};

/**
 * 상장 처리 (관리자/자동)
 */
exports.processListing = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const offering = await ipoOfferingService.processListing(offeringId);

    res.json({
      message: '상장이 완료되었습니다',
      offering
    });
  } catch (error) {
    console.error('상장 처리 오류:', error);
    res.status(400).json({ error: error.message || '상장 처리에 실패했습니다' });
  }
};

/**
 * 내 공모 현황
 */
exports.getMyOffering = async (req, res) => {
  try {
    const userId = req.user.id;

    const offering = await IPOOffering.findOne({
      where: { userId },
      include: [
        { model: require('../models').Stock, as: 'stock' }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!offering) {
      return res.json({ hasOffering: false });
    }

    const competitionRate = (offering.subscribedShares / offering.totalShares * 100).toFixed(2);

    res.json({
      hasOffering: true,
      offering: {
        ...offering.toJSON(),
        competitionRate: parseFloat(competitionRate)
      }
    });
  } catch (error) {
    console.error('내 공모 현황 조회 오류:', error);
    res.status(500).json({ error: '공모 현황을 불러오는데 실패했습니다' });
  }
};
