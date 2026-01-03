const express = require('express');
const router = express.Router();
const ipoOfferingController = require('../controllers/ipoOfferingController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

/**
 * GET /api/ipo-offerings
 * 공모 목록 조회
 */
router.get('/', ipoOfferingController.getOfferings);

/**
 * GET /api/ipo-offerings/my
 * 내 공모 현황
 */
router.get('/my', authenticateToken, ipoOfferingController.getMyOffering);

/**
 * GET /api/ipo-offerings/my-subscriptions
 * 내 청약 목록
 */
router.get('/my-subscriptions', authenticateToken, ipoOfferingController.getMySubscriptions);

/**
 * GET /api/ipo-offerings/:offeringId
 * 공모 상세 조회
 */
router.get('/:offeringId', ipoOfferingController.getOfferingDetail);

/**
 * POST /api/ipo-offerings
 * 공모 신청
 */
router.post('/', authenticateToken, ipoOfferingController.createOffering);

/**
 * POST /api/ipo-offerings/:offeringId/subscribe
 * 청약 신청
 */
router.post('/:offeringId/subscribe', authenticateToken, ipoOfferingController.subscribe);

/**
 * DELETE /api/ipo-offerings/subscriptions/:subscriptionId
 * 청약 취소
 */
router.delete('/subscriptions/:subscriptionId', authenticateToken, ipoOfferingController.cancelSubscription);

/**
 * POST /api/ipo-offerings/:offeringId/approve
 * 공모 승인 (관리자)
 */
router.post('/:offeringId/approve', authenticateToken, isAdmin, ipoOfferingController.approveOffering);

/**
 * POST /api/ipo-offerings/:offeringId/reject
 * 공모 거절 (관리자)
 */
router.post('/:offeringId/reject', authenticateToken, isAdmin, ipoOfferingController.rejectOffering);

/**
 * POST /api/ipo-offerings/:offeringId/allocate
 * 배정 처리 (관리자)
 */
router.post('/:offeringId/allocate', authenticateToken, isAdmin, ipoOfferingController.processAllocation);

/**
 * POST /api/ipo-offerings/:offeringId/list
 * 상장 처리 (관리자)
 */
router.post('/:offeringId/list', authenticateToken, isAdmin, ipoOfferingController.processListing);

module.exports = router;
