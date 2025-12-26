const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const auth = require('../middleware/auth');

// 추천 코드 생성
router.post('/code', auth, referralController.generateReferralCode);

// 추천인 등록 (회원가입 시)
router.post('/register', auth, referralController.registerReferral);

// 내 추천인 목록 조회
router.get('/my', auth, referralController.getMyReferrals);

// 추천 통계 조회
router.get('/stats', auth, referralController.getReferralStats);

// 내 추천인 정보 조회
router.get('/referrer', auth, referralController.getMyReferrer);

module.exports = router;
