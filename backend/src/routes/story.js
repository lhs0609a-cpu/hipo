const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');

// 스토리 생성
router.post('/', storyController.createStory);

// 활성 스토리 목록 조회
router.get('/', storyController.getStories);

// 특정 스토리 조회
router.get('/:storyId', storyController.viewStory);

// 스토리 삭제
router.delete('/:storyId', storyController.deleteStory);

module.exports = router;
