const express = require('express');
const router = express.Router();
const liveStreamController = require('../controllers/liveStreamController');
const auth = require('../middleware/auth');

// 라이브 스트림 생성
router.post('/', auth, liveStreamController.createLiveStream);

// 라이브 스트림 목록 조회
router.get('/', auth, liveStreamController.getLiveStreams);

// 특정 라이브 스트림 조회
router.get('/:streamId', auth, liveStreamController.getLiveStream);

// 라이브 스트림 시작
router.post('/:streamId/start', auth, liveStreamController.startLiveStream);

// 라이브 스트림 종료
router.post('/:streamId/end', auth, liveStreamController.endLiveStream);

// 라이브 스트림 삭제
router.delete('/:streamId', auth, liveStreamController.deleteLiveStream);

// 시청자 수 업데이트
router.put('/:streamId/viewers', liveStreamController.updateViewerCount);

module.exports = router;
