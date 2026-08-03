const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin, optionalAuth } = require('../middleware/auth');
const ctrl = require('../controllers/virtualCelebrityController');

// === 공개 API ===
// optionalAuth: 로그인 상태면 "내가 이미 기다리는 중인지"를 응답에 담기 위함.
// 로그인하지 않아도 조회는 가능하다.
router.get('/browse', optionalAuth, ctrl.listVirtualCelebrities);
router.get('/suggestions', optionalAuth, ctrl.listSuggestions);

// === 인증된 유저 API ===
router.post('/claim/:virtualUserId', authenticateToken, ctrl.submitClaim);
router.get('/claim/my-claims', authenticateToken, ctrl.getMyClaims);
router.post('/suggest', authenticateToken, ctrl.submitSuggestion);
router.post('/suggest/:id/upvote', authenticateToken, ctrl.upvoteSuggestion);

// === 관리자 API ===
router.post('/admin/create', authenticateToken, isAdmin, ctrl.createVirtualCelebrity);
router.post('/admin/bulk-create', authenticateToken, isAdmin, ctrl.createBulkVirtualCelebrities);
router.get('/admin/list', authenticateToken, isAdmin, ctrl.adminListVirtualCelebrities);
router.get('/admin/claims', authenticateToken, isAdmin, ctrl.adminListClaims);
router.post('/admin/claims/:id/approve', authenticateToken, isAdmin, ctrl.approveClaim);
router.post('/admin/claims/:id/reject', authenticateToken, isAdmin, ctrl.rejectClaim);
router.get('/admin/suggestions', authenticateToken, isAdmin, ctrl.adminListSuggestions);
router.post('/admin/suggestions/:id/approve', authenticateToken, isAdmin, ctrl.approveSuggestion);
router.post('/admin/suggestions/:id/reject', authenticateToken, isAdmin, ctrl.rejectSuggestion);

// === 공개 상세 조회 (맨 마지막 - :id 패턴) ===
router.get('/:id', optionalAuth, ctrl.getVirtualCelebrityDetail);

module.exports = router;
