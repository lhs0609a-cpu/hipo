const express = require('express');
const router = express.Router();
const viralController = require('../controllers/viralController');
const auth = require('../middleware/auth');

// 모든 라우트에 인증 필요
router.use(auth);

// ===== 추천 코드 시스템 =====
// 내 추천 코드 조회
router.get('/referral/code', viralController.getMyReferralCode);

// 추천 코드 적용
router.post('/referral/apply', viralController.applyReferralCode);

// 내 초대 목록 조회
router.get('/referral/list', viralController.getMyReferrals);

// ===== 출석 체크 시스템 =====
// 출석 체크
router.post('/attendance/check-in', viralController.checkIn);

// 출석 현황 조회
router.get('/attendance/status', viralController.getAttendanceStatus);

// ===== 친구 랭킹 =====
// 친구 수익률 랭킹
router.get('/friends/ranking', viralController.getFriendRanking);

// ===== 초대 리더보드 =====
// 주간 초대 리더보드
router.get('/leaderboard/weekly', viralController.getWeeklyLeaderboard);

// ===== 소셜 공유 =====
// 공유 카드 데이터
router.get('/share/card', viralController.getShareCard);

// ===== 얼리버드 뱃지 =====
// 내 얼리버드 뱃지 목록
router.get('/badges/early-bird', viralController.getMyEarlyBirdBadges);

module.exports = router;
