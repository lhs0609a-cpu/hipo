const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const auth = require('../middleware/auth');

// 뱃지 목록 조회
router.get('/', auth, badgeController.getAllBadges);

// 사용자 뱃지 조회
router.get('/user/:userId', auth, badgeController.getUserBadges);

// 내 뱃지 조회
router.get('/my', auth, badgeController.getMyBadges);

// 뱃지 표시 토글
router.patch('/:userBadgeId/toggle', auth, badgeController.toggleBadgeDisplay);

// 뱃지 생성 (관리자 전용)
router.post('/', auth, badgeController.createBadge);

// 뱃지 수동 부여 (관리자 전용)
router.post('/award', auth, badgeController.awardBadge);

// 주주 뱃지 업데이트
router.post('/update-shareholder', auth, badgeController.updateShareholderBadge);

module.exports = router;
