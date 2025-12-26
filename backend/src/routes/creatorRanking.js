const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const creatorRankingController = require('../controllers/creatorRankingController');

// 크리에이터 랭킹 목록 조회
router.get('/', authenticateToken, creatorRankingController.getRankings);

// 내 랭킹 조회
router.get('/me', authenticateToken, creatorRankingController.getMyRanking);

// 특정 크리에이터 랭킹 조회
router.get('/:userId', authenticateToken, creatorRankingController.getCreatorRanking);

module.exports = router;
