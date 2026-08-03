const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const onboardingController = require('../controllers/onboardingController');

router.use(authenticateToken);

// 온보딩 상태 + 추천 종목
router.get('/state', onboardingController.getState);

// 온보딩 완료 표시
router.post('/complete', onboardingController.complete);

module.exports = router;
