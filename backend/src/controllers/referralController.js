const { Referral, User, Wallet, CoinTransaction, StockTrade } = require('../models');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

/**
 * 추천 코드 생성
 */
exports.generateReferralCode = async (req, res) => {
  try {
    const userId = req.user.id;

    // 기존 추천 코드 확인
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 추천 코드가 없으면 생성
    let referralCode = user.referralCode;
    if (!referralCode) {
      // 6자리 랜덤 코드 생성
      referralCode = crypto.randomBytes(3).toString('hex').toUpperCase();

      // 중복 체크
      while (await User.findOne({ where: { referralCode } })) {
        referralCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      }

      await user.update({ referralCode });
    }

    res.json({
      referralCode,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`
    });
  } catch (error) {
    console.error('추천 코드 생성 오류:', error);
    res.status(500).json({ error: '추천 코드 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 추천인 등록 (회원가입 시)
 */
exports.registerReferral = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const referredUserId = req.user.id;
    const { referralCode } = req.body;

    if (!referralCode) {
      await transaction.rollback();
      return res.status(400).json({ error: '추천 코드가 필요합니다.' });
    }

    // 추천인 찾기
    const referrer = await User.findOne({
      where: { referralCode },
      transaction
    });

    if (!referrer) {
      await transaction.rollback();
      return res.status(404).json({ error: '유효하지 않은 추천 코드입니다.' });
    }

    if (referrer.id === referredUserId) {
      await transaction.rollback();
      return res.status(400).json({ error: '자신을 추천할 수 없습니다.' });
    }

    // 이미 추천인이 있는지 확인
    const existingReferral = await Referral.findOne({
      where: { referredUserId },
      transaction
    });

    if (existingReferral) {
      await transaction.rollback();
      return res.status(400).json({ error: '이미 추천인이 등록되어 있습니다.' });
    }

    // 추천 관계 생성
    const referral = await Referral.create({
      referrerId: referrer.id,
      referredUserId,
      referralCode,
      status: 'PENDING'
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      message: '추천인이 등록되었습니다.',
      referral
    });
  } catch (error) {
    await transaction.rollback();
    console.error('추천인 등록 오류:', error);
    res.status(500).json({ error: '추천인 등록 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 추천인 목록 조회
 */
exports.getMyReferrals = async (req, res) => {
  try {
    const userId = req.user.id;

    const referrals = await Referral.findAll({
      where: { referrerId: userId },
      include: [
        {
          model: User,
          as: 'referredUser',
          attributes: ['id', 'username', 'profileImage', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 통계 계산
    const stats = {
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter(r => r.status === 'ACTIVE').length,
      completedReferrals: referrals.filter(r => r.status === 'COMPLETED').length,
      totalCommission: referrals.reduce((sum, r) => sum + parseFloat(r.totalCommission || 0), 0)
    };

    res.json({ referrals, stats });
  } catch (error) {
    console.error('추천인 목록 조회 오류:', error);
    res.status(500).json({ error: '추천인 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 추천 보상 지급 (주식 거래 시 자동 호출)
 */
async function processReferralCommission(buyerId, tradeAmount) {
  const transaction = await sequelize.transaction();

  try {
    // 구매자의 추천인 확인
    const referral = await Referral.findOne({
      where: { referredUserId: buyerId },
      transaction
    });

    if (!referral) {
      await transaction.commit();
      return;
    }

    // 첫 거래인 경우 상태를 ACTIVE로 변경
    if (referral.status === 'PENDING' && !referral.firstPurchaseAt) {
      await referral.update({
        status: 'ACTIVE',
        firstPurchaseAt: new Date()
      }, { transaction });
    }

    // 커미션 계산 (5%)
    const commissionRate = 0.05;
    const commission = parseFloat(tradeAmount) * commissionRate;

    // 추천인 지갑에 커미션 지급
    const [referrerWallet] = await Wallet.findOrCreate({
      where: { userId: referral.referrerId },
      defaults: { balance: 0, totalDeposited: 0, totalWithdrawn: 0, totalEarned: 0 },
      transaction
    });

    await referrerWallet.update({
      balance: parseFloat(referrerWallet.balance) + commission,
      totalEarned: parseFloat(referrerWallet.totalEarned) + commission
    }, { transaction });

    // 거래 내역 기록
    await CoinTransaction.create({
      userId: referral.referrerId,
      transactionType: 'REFERRAL_BONUS',
      amount: commission,
      balanceAfter: parseFloat(referrerWallet.balance) + commission,
      relatedId: referral.id,
      description: `추천 보상 (${commissionRate * 100}%): ${buyerId} 거래`
    }, { transaction });

    // 추천 관계의 총 커미션 업데이트
    await referral.update({
      totalCommission: parseFloat(referral.totalCommission || 0) + commission
    }, { transaction });

    await transaction.commit();

    console.log(`추천 보상 지급: ${referral.referrerId}에게 ${commission} HIPO 코인`);
  } catch (error) {
    await transaction.rollback();
    console.error('추천 보상 지급 오류:', error);
  }
}

/**
 * 추천 통계 조회
 */
exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const referrals = await Referral.findAll({
      where: { referrerId: userId }
    });

    const stats = {
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter(r => r.status === 'PENDING').length,
      activeReferrals: referrals.filter(r => r.status === 'ACTIVE').length,
      completedReferrals: referrals.filter(r => r.status === 'COMPLETED').length,
      totalCommission: referrals.reduce((sum, r) => sum + parseFloat(r.totalCommission || 0), 0),
      averageCommissionPerReferral: referrals.length > 0
        ? referrals.reduce((sum, r) => sum + parseFloat(r.totalCommission || 0), 0) / referrals.length
        : 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('추천 통계 조회 오류:', error);
    res.status(500).json({ error: '추천 통계 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 추천인 정보 조회
 */
exports.getMyReferrer = async (req, res) => {
  try {
    const userId = req.user.id;

    const referral = await Referral.findOne({
      where: { referredUserId: userId },
      include: [
        {
          model: User,
          as: 'referrer',
          attributes: ['id', 'username', 'profileImage']
        }
      ]
    });

    if (!referral) {
      return res.status(404).json({ error: '추천인 정보가 없습니다.' });
    }

    res.json({ referral });
  } catch (error) {
    console.error('추천인 정보 조회 오류:', error);
    res.status(500).json({ error: '추천인 정보 조회 중 오류가 발생했습니다.' });
  }
};

module.exports.processReferralCommission = processReferralCommission;
