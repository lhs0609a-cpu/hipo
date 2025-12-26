const { NFT, NFTTransfer, User } = require('../models');
const { getShareholding } = require('../utils/shareholderHelper');
const crypto = require('crypto');

/**
 * NFT 에어드랍 (크리에이터용)
 */
exports.airdropNFT = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const {
      name,
      description,
      imageUrl,
      nftType = 'SHAREHOLDER_BADGE',
      minSharesRequired = 1000,
      totalEditions = 1,
      metadata
    } = req.body;

    if (!name || !imageUrl) {
      return res.status(400).json({ error: 'NFT 이름과 이미지가 필요합니다.' });
    }

    // 최소 주식 수 이상 보유한 모든 주주 찾기
    const { StockTransaction } = require('../models');

    // 모든 거래 조회 후 주주 리스트 계산
    const transactions = await StockTransaction.findAll({
      where: { targetUserId: creatorId }
    });

    const shareholders = {};
    for (const tx of transactions) {
      if (tx.buyerId) {
        shareholders[tx.buyerId] = (shareholders[tx.buyerId] || 0) + tx.quantity;
      }
      if (tx.sellerId) {
        shareholders[tx.sellerId] = (shareholders[tx.sellerId] || 0) - tx.quantity;
      }
    }

    const eligibleShareholders = Object.entries(shareholders)
      .filter(([userId, shares]) => shares >= minSharesRequired)
      .map(([userId]) => userId);

    if (eligibleShareholders.length === 0) {
      return res.status(400).json({
        error: `${minSharesRequired}주 이상 보유한 주주가 없습니다.`
      });
    }

    const airdropResults = [];
    const airdropDate = new Date();

    // 각 적격 주주에게 NFT 발행
    for (let i = 0; i < eligibleShareholders.length; i++) {
      const ownerId = eligibleShareholders[i];
      const edition = i + 1;
      const tokenId = crypto.randomUUID();

      const nft = await NFT.create({
        creatorId,
        ownerId,
        name,
        description,
        imageUrl,
        tokenId,
        edition,
        totalEditions: eligibleShareholders.length,
        nftType,
        minSharesRequired,
        isTransferable: true,
        metadata,
        airdropDate
      });

      // NFT 전송 기록 생성 (에어드랍)
      await NFTTransfer.create({
        nftId: nft.id,
        fromUserId: null, // 최초 발행
        toUserId: ownerId,
        transferType: 'AIRDROP'
      });

      airdropResults.push(nft);
    }

    res.status(201).json({
      message: `${eligibleShareholders.length}명의 주주에게 NFT를 에어드랍했습니다.`,
      totalAirdropped: eligibleShareholders.length,
      nfts: airdropResults
    });
  } catch (error) {
    console.error('NFT 에어드랍 오류:', error);
    res.status(500).json({ error: 'NFT 에어드랍 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 NFT 목록 조회
 */
exports.getMyNFTs = async (req, res) => {
  try {
    const userId = req.user.id;

    const nfts = await NFT.findAll({
      where: { ownerId: userId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profileImage']
        }
      ],
      order: [['airdropDate', 'DESC']]
    });

    res.json({ nfts });
  } catch (error) {
    console.error('NFT 목록 조회 오류:', error);
    res.status(500).json({ error: 'NFT 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * NFT 상세 조회
 */
exports.getNFT = async (req, res) => {
  try {
    const { nftId } = req.params;

    const nft = await NFT.findByPk(nftId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: NFTTransfer,
          as: 'transfers',
          include: [
            {
              model: User,
              as: 'fromUser',
              attributes: ['id', 'username']
            },
            {
              model: User,
              as: 'toUser',
              attributes: ['id', 'username']
            }
          ],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!nft) {
      return res.status(404).json({ error: 'NFT를 찾을 수 없습니다.' });
    }

    res.json({ nft });
  } catch (error) {
    console.error('NFT 조회 오류:', error);
    res.status(500).json({ error: 'NFT 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * NFT 전송 (재판매/선물)
 */
exports.transferNFT = async (req, res) => {
  try {
    const { nftId } = req.params;
    const { toUserId, price, transferType = 'TRANSFER' } = req.body;
    const fromUserId = req.user.id;

    if (!toUserId) {
      return res.status(400).json({ error: '받는 사람이 필요합니다.' });
    }

    const nft = await NFT.findByPk(nftId);

    if (!nft) {
      return res.status(404).json({ error: 'NFT를 찾을 수 없습니다.' });
    }

    // 소유자 확인
    if (nft.ownerId !== fromUserId) {
      return res.status(403).json({ error: 'NFT 소유자만 전송할 수 있습니다.' });
    }

    // 전송 가능 여부 확인
    if (!nft.isTransferable) {
      return res.status(400).json({ error: '이 NFT는 전송할 수 없습니다.' });
    }

    // NFT 소유자 변경
    await nft.update({ ownerId: toUserId });

    // 전송 기록 생성
    await NFTTransfer.create({
      nftId,
      fromUserId,
      toUserId,
      transferType,
      price: price || null
    });

    const updatedNFT = await NFT.findByPk(nftId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'profileImage']
        }
      ]
    });

    res.json({
      message: 'NFT가 전송되었습니다.',
      nft: updatedNFT
    });
  } catch (error) {
    console.error('NFT 전송 오류:', error);
    res.status(500).json({ error: 'NFT 전송 중 오류가 발생했습니다.' });
  }
};

/**
 * 크리에이터가 발행한 NFT 목록
 */
exports.getCreatorNFTs = async (req, res) => {
  try {
    const { creatorId } = req.params;

    const nfts = await NFT.findAll({
      where: { creatorId },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'profileImage']
        }
      ],
      order: [['airdropDate', 'DESC']]
    });

    res.json({ nfts });
  } catch (error) {
    console.error('크리에이터 NFT 조회 오류:', error);
    res.status(500).json({ error: 'NFT 조회 중 오류가 발생했습니다.' });
  }
};
