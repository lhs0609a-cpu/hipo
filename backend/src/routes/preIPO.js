const express = require('express');
const router = express.Router();
const preIPOController = require('../controllers/preIPOController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// ============ 공개 라우트 ============

// 활성 Pre-IPO 라운드 목록 조회 (로그인 선택)
router.get('/rounds', optionalAuth, preIPOController.getActiveRounds);

// Pre-IPO 라운드 상세 조회 (로그인 선택)
router.get('/rounds/:roundId', optionalAuth, preIPOController.getRoundDetail);

// 라운드 통계 조회
router.get('/rounds/:roundId/stats', preIPOController.getRoundStats);

// ============ 인증 필요 라우트 ============

// 내 Pre-IPO 라운드 조회 (발행자)
router.get('/my-round', authenticateToken, preIPOController.getMyRound);

// 내 Pre-IPO 투자 목록
router.get('/my-investments', authenticateToken, preIPOController.getMyInvestments);

// Pre-IPO 라운드 생성
router.post('/rounds', authenticateToken, preIPOController.createRound);

// 라운드 업데이트
router.put('/rounds/:roundId', authenticateToken, preIPOController.updateRound);

// 라운드 취소
router.delete('/rounds/:roundId', authenticateToken, preIPOController.cancelRound);

// 투자 자격 확인
router.get('/rounds/:roundId/eligibility', authenticateToken, preIPOController.checkEligibility);

// Pre-IPO 투자하기
router.post('/rounds/:roundId/invest', authenticateToken, preIPOController.invest);

// 투자 취소
router.delete('/investments/:investmentId', authenticateToken, preIPOController.cancelInvestment);

// 라운드 투자자 목록 조회 (발행자/관리자)
router.get('/rounds/:roundId/investors', authenticateToken, preIPOController.getRoundInvestors);

// ============ 관리자 라우트 ============

// 라운드 승인
router.post('/admin/rounds/:roundId/approve', authenticateToken, preIPOController.approveRound);

// 라운드 거절
router.post('/admin/rounds/:roundId/reject', authenticateToken, preIPOController.rejectRound);

// IPO 전환
router.post('/admin/rounds/:roundId/convert', authenticateToken, preIPOController.convertToIPO);

module.exports = router;
