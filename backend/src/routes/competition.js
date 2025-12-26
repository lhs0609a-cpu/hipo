const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competitionController');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/competitions
 * 대회 생성 (관리자)
 */
router.post('/', authenticateToken, competitionController.createCompetition);

/**
 * GET /api/competitions
 * 대회 목록 조회
 */
router.get('/', competitionController.getCompetitions);

/**
 * GET /api/competitions/my
 * 내 대회 참가 내역
 */
router.get('/my', authenticateToken, competitionController.getMyCompetitions);

/**
 * GET /api/competitions/:competitionId
 * 대회 상세 조회
 */
router.get('/:competitionId', competitionController.getCompetitionDetail);

/**
 * POST /api/competitions/:competitionId/join
 * 대회 참가 신청
 */
router.post('/:competitionId/join', authenticateToken, competitionController.joinCompetition);

/**
 * DELETE /api/competitions/:competitionId/join
 * 대회 참가 취소
 */
router.delete('/:competitionId/join', authenticateToken, competitionController.leaveCompetition);

/**
 * POST /api/competitions/:competitionId/trade
 * 대회 내 거래
 */
router.post('/:competitionId/trade', authenticateToken, competitionController.tradeinCompetition);

/**
 * GET /api/competitions/:competitionId/leaderboard
 * 대회 리더보드
 */
router.get('/:competitionId/leaderboard', competitionController.getLeaderboard);

/**
 * GET /api/competitions/:competitionId/my-trades
 * 내 대회 거래 내역
 */
router.get('/:competitionId/my-trades', authenticateToken, competitionController.getMyCompetitionTrades);

/**
 * POST /api/competitions/:competitionId/finalize
 * 대회 종료 및 보상 분배 (관리자)
 */
router.post('/:competitionId/finalize', authenticateToken, competitionController.finalizeCompetition);

module.exports = router;
