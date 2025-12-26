const express = require('express');
const router = express.Router();
const nftController = require('../controllers/nftController');
const auth = require('../middleware/auth');

// NFT 에어드랍 (크리에이터용)
router.post('/airdrop', auth, nftController.airdropNFT);

// 내 NFT 목록
router.get('/my', auth, nftController.getMyNFTs);

// 크리에이터가 발행한 NFT 목록
router.get('/creator/:creatorId', auth, nftController.getCreatorNFTs);

// NFT 상세 조회
router.get('/:nftId', auth, nftController.getNFT);

// NFT 전송 (재판매/선물)
router.post('/:nftId/transfer', auth, nftController.transferNFT);

module.exports = router;
