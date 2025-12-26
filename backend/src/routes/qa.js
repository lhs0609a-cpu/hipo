const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qaController');
const auth = require('../middleware/auth');

// Q&A 질문 작성
router.post('/questions', auth, qaController.createQuestion);

// Q&A 답변 작성
router.post('/questions/:qaId/answer', auth, qaController.answerQuestion);

// Q&A 거부
router.post('/questions/:qaId/reject', auth, qaController.rejectQuestion);

// Q&A 삭제
router.delete('/questions/:qaId', auth, qaController.deleteQA);

// 특정 사용자의 Q&A 목록 조회
router.get('/users/:userId/questions', auth, qaController.getQAsByUser);

// 내가 작성한 질문 목록 조회
router.get('/my-questions', auth, qaController.getMyQuestions);

module.exports = router;
