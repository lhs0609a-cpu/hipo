const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const auth = require('../middleware/auth');

// 투표 생성
router.post('/', auth, pollController.createPoll);

// 투표하기
router.post('/:pollId/vote', auth, pollController.vote);

// 투표 종료
router.post('/:pollId/close', auth, pollController.closePoll);

// 투표 삭제
router.delete('/:pollId', auth, pollController.deletePoll);

// 투표 목록 조회
router.get('/', auth, pollController.getPolls);

// 투표 상세 조회
router.get('/:pollId', auth, pollController.getPoll);

module.exports = router;
