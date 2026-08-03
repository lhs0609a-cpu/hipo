const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { User, Stock, VirtualClaim, CelebSuggestion, Holding, Transaction, Notification } = require('../models');
const { sequelize } = require('../config/database');
const {
  PUBLIC_LIST_MAX,
  UNCLAIMED_NOTICE,
  sanitizeProfile,
  bumpExpectation,
} = require('../utils/publicityGuard');

// =====================================================
// 관리자: 가상 셀럽 생성
// =====================================================

/**
 * 관리자: 상장 대기 프로필 생성.
 *
 * 본인 동의 전에는 종목(Stock)을 만들지 않는다. 가격이 붙는 순간
 * "동의 없는 실존 인물에 값을 매겨 공표"하는 것이 되기 때문이다.
 * 종목은 approveClaim(본인 확인 승인) 시점에 생성된다.
 */
exports.createVirtualCelebrity = async (req, res) => {
  try {
    const {
      username, displayName, email, bio, category, occupation,
      trustLevel,
    } = req.body;

    if (!username || !displayName) {
      return res.status(400).json({ error: '별칭과 표시 이름은 필수입니다' });
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: '이미 사용 중인 별칭입니다' });
    }

    const virtualEmail = email || `virtual_${username.toLowerCase().replace(/\s/g, '')}_${uuidv4().substring(0, 8)}@hipo.virtual`;

    const existingEmail = await User.findOne({ where: { email: virtualEmail } });
    if (existingEmail) {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다' });
    }

    const randomPw = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPw, 10);

    const virtualUser = await User.create({
      id: uuidv4(),
      email: virtualEmail,
      username,
      displayName,
      password: hashedPassword,
      bio: bio || `${displayName} 상장 대기 프로필입니다`,
      category: category || 'entertainment',
      occupation: occupation || '',
      trustLevel: trustLevel || 'silver',
      // 동의 전에는 시가총액을 매기지 않는다
      marketCap: 0,
      poBalance: 0,
      isCreator: true,
      isVerified: false,
      isVirtual: true,
      virtualStatus: 'unclaimed',
      virtualCreatedBy: req.user.id,
      virtualCreatedAt: new Date(),
      // 초상권: 본인 확인 전에는 사진을 보관하지 않는다
      profileImage: null,
      realName: null,
      newsKeywords: null,
      externalLinks: null,
      referralCode: `V${username.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    });

    res.status(201).json({
      success: true,
      message: '상장 대기 프로필이 생성되었습니다 (종목은 본인 확인 후 생성됩니다)',
      data: {
        user: {
          id: virtualUser.id,
          username: virtualUser.username,
          displayName: virtualUser.displayName,
          isVirtual: true,
          virtualStatus: 'unclaimed',
          isListed: false,
          tradable: false,
        },
        stock: null,
      },
    });
  } catch (error) {
    console.error('Create virtual celebrity error:', error);
    res.status(500).json({ error: '상장 대기 프로필 생성 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 관리자: 가상 셀럽 대량 생성
// =====================================================

exports.createBulkVirtualCelebrities = async (req, res) => {
  try {
    const { celebrities } = req.body;

    if (!Array.isArray(celebrities) || celebrities.length === 0) {
      return res.status(400).json({ error: '셀럽 목록이 필요합니다' });
    }

    if (celebrities.length > 50) {
      return res.status(400).json({ error: '한 번에 최대 50명까지 생성할 수 있습니다' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const celeb of celebrities) {
      try {
        const existing = await User.findOne({ where: { username: celeb.username } });
        if (existing) {
          results.skipped++;
          continue;
        }

        const randomPw = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPw, 10);
        const virtualEmail = `virtual_${celeb.username.toLowerCase().replace(/\s/g, '')}_${uuidv4().substring(0, 8)}@hipo.virtual`;

        const existingEmail = await User.findOne({ where: { email: virtualEmail } });
        if (existingEmail) {
          results.skipped++;
          continue;
        }

        // 종목은 만들지 않는다. 본인 확인(approveClaim) 시점에 생성된다.
        await User.create({
          id: uuidv4(),
          email: virtualEmail,
          username: celeb.username,
          displayName: celeb.displayName || celeb.username,
          password: hashedPassword,
          bio: celeb.bio || `${celeb.displayName || celeb.username} 상장 대기 프로필입니다`,
          category: celeb.category || 'entertainment',
          occupation: celeb.occupation || '',
          trustLevel: celeb.trustLevel || 'silver',
          marketCap: 0,
          poBalance: 0,
          isCreator: true,
          isVirtual: true,
          virtualStatus: 'unclaimed',
          virtualCreatedBy: req.user.id,
          virtualCreatedAt: new Date(),
          profileImage: null,
          realName: null,
          newsKeywords: null,
          externalLinks: null,
          referralCode: `V${celeb.username.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        });

        results.created++;
      } catch (err) {
        results.errors.push({ username: celeb.username, error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Bulk create virtual celebrities error:', error);
    res.status(500).json({ error: '대량 생성 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 공개: 가상 셀럽 목록/상세 조회
// =====================================================

/**
 * 공개: 상장 대기 목록.
 *
 * 동의 전 인물에 대해서는 가격·시가총액·사진·실명을 내보내지 않는다.
 * 시가총액 순 정렬도 하지 않는다 — 실존 인물을 값으로 줄 세우는 공개 랭킹이 되기 때문.
 * 대기 인원(기대지수) 순으로만 정렬하고, 상위 PUBLIC_LIST_MAX 명까지만 노출한다.
 */
exports.listVirtualCelebrities = async (req, res) => {
  try {
    const { category, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, PUBLIC_LIST_MAX);

    const where = { isVirtual: true };
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { displayName: { [Op.like]: `%${search}%` } },
      ];
    }

    const rows = await User.findAll({
      where,
      attributes: [
        'id', 'username', 'displayName', 'bio', 'category',
        'occupation', 'virtualStatus', 'isVirtual', 'createdAt',
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });

    // 각 프로필의 기대지수를 붙인다 (이름 기준 매칭)
    const names = rows.map((u) => u.displayName || u.username);
    const suggestions = names.length
      ? await CelebSuggestion.findAll({
          where: { celebName: { [Op.in]: names } },
          attributes: ['celebName', 'expectationScore', 'upvoteCount'],
        })
      : [];
    const scoreByName = new Map(
      suggestions.map((s) => [s.celebName, { score: s.expectationScore || 0, waiting: s.upvoteCount || 0 }])
    );

    const data = rows
      .map((u) => {
        const match = scoreByName.get(u.displayName) || scoreByName.get(u.username) || {};
        const clean = sanitizeProfile(u, { expectationScore: match.score || 0 });
        clean.waitingCount = match.waiting || 0;
        return clean;
      })
      // 대기 인원이 많은 순. 값이 아니라 수요 순이다.
      .sort((a, b) => (b.expectationScore || 0) - (a.expectationScore || 0));

    res.json({
      success: true,
      data,
      notice: UNCLAIMED_NOTICE,
      // 전체 개수는 내보내지 않는다. 순위/백분위를 계산할 수 없게 하기 위함.
      pagination: { limit, returned: data.length },
    });
  } catch (error) {
    console.error('List virtual celebrities error:', error);
    res.status(500).json({ error: '상장 대기 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 공개: 상장 대기 프로필 상세.
 *
 * 동의 전에는 종목이 존재하지 않으므로 가격 정보를 붙이지 않는다.
 * 구버전 데이터가 남아 있어도 sanitizeProfile 이 제거한다.
 */
exports.getVirtualCelebrityDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: { id, isVirtual: true },
      attributes: [
        'id', 'username', 'displayName', 'bio', 'category',
        'occupation', 'virtualStatus', 'isVirtual', 'createdAt',
      ],
    });

    if (!user) {
      return res.status(404).json({ error: '프로필을 찾을 수 없습니다' });
    }

    const suggestion = await CelebSuggestion.findOne({
      where: { celebName: { [Op.in]: [user.displayName, user.username].filter(Boolean) } },
      attributes: ['id', 'expectationScore', 'upvoteCount'],
    });

    const data = sanitizeProfile(user, { expectationScore: suggestion?.expectationScore || 0 });
    data.waitingCount = suggestion?.upvoteCount || 0;
    data.suggestionId = suggestion?.id || null;

    res.json({ success: true, data, notice: UNCLAIMED_NOTICE });
  } catch (error) {
    console.error('Get virtual celebrity detail error:', error);
    res.status(500).json({ error: '상세 조회 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 관리자: 가상 셀럽 관리 목록
// =====================================================

exports.adminListVirtualCelebrities = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { isVirtual: true };
    if (status) where.virtualStatus = status;

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{
        model: Stock,
        as: 'issuedStock',
        attributes: ['id', 'sharePrice', 'issuedShares', 'shareholderCount', 'status', 'isVirtualListing', 'marketCapTotal'],
      }],
      attributes: { exclude: ['password', 'tradingPin', 'twoFactorSecret'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Admin list virtual celebrities error:', error);
    res.status(500).json({ error: '관리자 목록 조회 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 유저: 인수 요청 제출 (rate limiting + verification code)
// =====================================================

exports.submitClaim = async (req, res) => {
  try {
    const { virtualUserId } = req.params;
    const claimantUserId = req.user.id;
    const {
      verificationMethod, claimantRealName, proofDocuments, socialLinks,
      verificationNote,
    } = req.body;

    if (!verificationMethod || !claimantRealName) {
      return res.status(400).json({ error: '인증 방법과 실명은 필수입니다' });
    }

    // 가상 유저 확인
    const virtualUser = await User.findOne({
      where: { id: virtualUserId, isVirtual: true },
    });

    if (!virtualUser) {
      return res.status(404).json({ error: '가상 셀럽을 찾을 수 없습니다' });
    }

    if (virtualUser.virtualStatus === 'claimed') {
      return res.status(400).json({ error: '이미 인수된 계정입니다' });
    }

    if (virtualUser.virtualStatus === 'claim_pending') {
      return res.status(400).json({ error: '이미 인수 심사 중인 계정입니다' });
    }

    if (claimantUserId === virtualUserId) {
      return res.status(400).json({ error: '자신의 계정을 인수할 수 없습니다' });
    }

    // Rate limiting: 유저당 총 3건 제한
    const totalClaims = await VirtualClaim.count({
      where: { claimantUserId },
    });
    if (totalClaims >= 3) {
      return res.status(429).json({ error: '인수 요청은 총 3건까지만 가능합니다' });
    }

    // 24시간 내 1건 제한
    const recentClaim = await VirtualClaim.findOne({
      where: {
        claimantUserId,
        createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentClaim) {
      return res.status(429).json({ error: '24시간 내에 1건만 신청할 수 있습니다' });
    }

    // 거부 후 7일 쿨다운
    const recentRejection = await VirtualClaim.findOne({
      where: {
        claimantUserId,
        status: 'rejected',
        reviewedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recentRejection) {
      return res.status(429).json({ error: '거부 후 7일간 새로운 인수 요청을 할 수 없습니다' });
    }

    // 이미 진행 중인 인수 신청이 있는지 확인
    const existingClaim = await VirtualClaim.findOne({
      where: {
        claimantUserId,
        status: { [Op.in]: ['pending', 'under_review'] },
      },
    });
    if (existingClaim) {
      return res.status(400).json({ error: '이미 진행 중인 인수 신청이 있습니다' });
    }

    // SNS 인증 코드 생성
    const verificationCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    const verificationCodeExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48시간

    const claim = await sequelize.transaction(async (t) => {
      const newClaim = await VirtualClaim.create({
        id: uuidv4(),
        virtualUserId,
        claimantUserId,
        claimantEmail: req.user.email,
        claimantRealName,
        status: 'pending',
        verificationMethod,
        proofDocuments: proofDocuments ? JSON.stringify(proofDocuments) : null,
        socialLinks: socialLinks || {},
        verificationCode,
        verificationCodeExpiresAt,
        verificationNote: verificationNote || null,
      }, { transaction: t });

      await virtualUser.update({
        virtualStatus: 'claim_pending',
        claimedBy: claimantUserId,
      }, { transaction: t });

      return newClaim;
    });

    res.status(201).json({
      success: true,
      message: '인수 신청이 접수되었습니다. 관리자 심사 후 결과를 알려드립니다.',
      data: {
        claimId: claim.id,
        status: claim.status,
        verificationCode: claim.verificationCode,
        verificationCodeExpiresAt: claim.verificationCodeExpiresAt,
      },
    });
  } catch (error) {
    console.error('Submit claim error:', error);
    res.status(500).json({ error: '인수 신청 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 유저: 내 인수 요청 목록
// =====================================================

exports.getMyClaims = async (req, res) => {
  try {
    const claims = await VirtualClaim.findAll({
      where: { claimantUserId: req.user.id },
      include: [{
        model: User,
        as: 'virtualUser',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'category'],
      }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: claims });
  } catch (error) {
    console.error('Get my claims error:', error);
    res.status(500).json({ error: '인수 요청 조회 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 관리자: 인수 요청 관리
// =====================================================

exports.adminListClaims = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await VirtualClaim.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'virtualUser',
          attributes: ['id', 'username', 'displayName', 'profileImage', 'category', 'virtualStatus'],
        },
        {
          model: User,
          as: 'claimant',
          attributes: ['id', 'username', 'displayName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Admin list claims error:', error);
    res.status(500).json({ error: '인수 요청 목록 조회 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 관리자: 인수 승인 (핵심 트랜잭션 - 계정 병합 포함)
// =====================================================

exports.approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes, newPassword } = req.body;

    const claim = await VirtualClaim.findByPk(id, {
      include: [
        { model: User, as: 'virtualUser' },
        { model: User, as: 'claimant' },
      ],
    });

    if (!claim) {
      return res.status(404).json({ error: '인수 요청을 찾을 수 없습니다' });
    }

    if (claim.status !== 'pending' && claim.status !== 'under_review') {
      return res.status(400).json({ error: `현재 상태(${claim.status})에서는 승인할 수 없습니다` });
    }

    const virtualUser = claim.virtualUser;
    const claimant = claim.claimant;
    const mergeDetails = { mergedAt: new Date(), actions: [] };

    await sequelize.transaction(async (t) => {
      /**
       * 상장은 여기서 처음 일어난다.
       *
       * 본인 확인 전에는 종목이 존재하지 않으므로(신규 플로우) 이 시점에 생성한다.
       * 구버전 데이터에는 이미 종목이 있을 수 있어 그 경우엔 재사용한다.
       */
      let virtualStock = await Stock.findOne({
        where: { userId: virtualUser.id },
        transaction: t,
      });

      if (!virtualStock) {
        const { listingTotalShares, listingInitialPrice } = req.body;
        const totalShares = listingTotalShares || 100000;
        virtualStock = await Stock.create({
          id: uuidv4(),
          userId: virtualUser.id,
          totalShares,
          issuedShares: 0,
          availableShares: Math.floor(totalShares * 0.3),
          // 초기가는 본인 동의 이후 산정된다 (기대지수와 연동하지 않는다)
          sharePrice: listingInitialPrice || 1000,
          status: 'active',
          isVirtualListing: false,
          category: virtualUser.category || 'entertainment',
          ipoApproved: true,
          listingDate: new Date(),
        }, { transaction: t });
        mergeDetails.actions.push({ type: 'stock_created_on_claim', stockId: virtualStock.id });
      }

      const stockSnapshot = {
        stockId: virtualStock.id,
        sharePrice: virtualStock.sharePrice,
        issuedShares: virtualStock.issuedShares,
        shareholderCount: virtualStock.shareholderCount,
        marketCapTotal: virtualStock.marketCapTotal,
        transactionCount: virtualStock.transactionCount,
      };

      // === Case A: 요청자에게 기존 계정이 있는 경우 (merge) ===
      if (claimant) {
        // 1. 기존 계정 PO 잔액 → 가상 계정으로 합산
        const claimantPO = claimant.poBalance || 0;
        const claimantBalance = claimant.balance || 0;
        if (claimantPO > 0 || claimantBalance > 0) {
          await virtualUser.update({
            poBalance: (virtualUser.poBalance || 0) + claimantPO,
            balance: (virtualUser.balance || 0) + claimantBalance,
          }, { transaction: t });
          mergeDetails.actions.push({
            type: 'balance_transfer',
            poTransferred: claimantPO,
            balanceTransferred: claimantBalance,
          });
        }

        // 2. 기존 계정 Holdings → 가상 계정으로 이전
        const claimantHoldings = await Holding.findAll({
          where: { holderId: claimant.id },
          transaction: t,
        });

        for (const holding of claimantHoldings) {
          // 같은 종목 보유 여부 확인
          const existingHolding = await Holding.findOne({
            where: { holderId: virtualUser.id, stockId: holding.stockId },
            transaction: t,
          });

          if (existingHolding) {
            // 가중평균가 합산
            const totalShares = existingHolding.shares + holding.shares;
            const weightedAvg = Math.round(
              ((existingHolding.averagePrice * existingHolding.shares) +
               (holding.averagePrice * holding.shares)) / totalShares
            );
            await existingHolding.update({
              shares: totalShares,
              averagePrice: weightedAvg,
            }, { transaction: t });
            await holding.destroy({ transaction: t });
          } else {
            await holding.update({ holderId: virtualUser.id }, { transaction: t });
          }
        }
        mergeDetails.actions.push({
          type: 'holdings_transfer',
          count: claimantHoldings.length,
        });

        // 3. 기존 계정 Transactions → 가상 계정 ID로 변경
        const [buyerUpdated] = await Transaction.update(
          { buyerId: virtualUser.id },
          { where: { buyerId: claimant.id }, transaction: t }
        );
        const [sellerUpdated] = await Transaction.update(
          { sellerId: virtualUser.id },
          { where: { sellerId: claimant.id }, transaction: t }
        );
        mergeDetails.actions.push({
          type: 'transactions_transfer',
          buyerUpdated,
          sellerUpdated,
        });

        // 4. 기존 계정 Stock 처리
        const claimantStock = await Stock.findOne({
          where: { userId: claimant.id },
          transaction: t,
        });
        if (claimantStock) {
          const holderCount = await Holding.count({
            where: { stockId: claimantStock.id },
            transaction: t,
          });
          if (holderCount === 0) {
            await claimantStock.destroy({ transaction: t });
            mergeDetails.actions.push({ type: 'stock_deleted', stockId: claimantStock.id });
          } else {
            await claimantStock.update({ status: 'delisted' }, { transaction: t });
            mergeDetails.actions.push({ type: 'stock_delisted', stockId: claimantStock.id, holderCount });
          }
        }

        // 5. Posts, Comments, Likes, Follows → 가상 계정 ID로 이전
        try {
          const models = require('../models');
          if (models.Post) {
            await models.Post.update(
              { userId: virtualUser.id },
              { where: { userId: claimant.id }, transaction: t }
            );
          }
          if (models.Comment) {
            await models.Comment.update(
              { userId: virtualUser.id },
              { where: { userId: claimant.id }, transaction: t }
            );
          }
          if (models.Like) {
            await models.Like.update(
              { userId: virtualUser.id },
              { where: { userId: claimant.id }, transaction: t }
            );
          }
          if (models.Follow) {
            await models.Follow.update(
              { followerId: virtualUser.id },
              { where: { followerId: claimant.id }, transaction: t }
            );
            await models.Follow.update(
              { followingId: virtualUser.id },
              { where: { followingId: claimant.id }, transaction: t }
            );
          }
          mergeDetails.actions.push({ type: 'social_data_transferred' });
        } catch (migrationErr) {
          console.log('Social data migration skipped:', migrationErr.message);
        }

        // 6. 기존 계정 비활성화
        await claimant.update({
          email: `deactivated_${claimant.id}@hipo.deactivated`,
          username: `deactivated_${claimant.id.substring(0, 8)}`,
          isVirtual: false,
          virtualStatus: 'none',
        }, { transaction: t });
        mergeDetails.actions.push({
          type: 'account_deactivated',
          originalEmail: claimant.email,
          originalUsername: claimant.username,
        });
      }

      // === Case B: 가상 계정 활성화 ===
      // 가상 User 업데이트: 실제 사용 가능한 계정으로 전환
      const updateData = {
        isVirtual: false,
        virtualStatus: 'claimed',
        isVerified: true,
        claimedAt: new Date(),
        claimedBy: req.user.id, // 승인 관리자
        email: claim.claimantEmail,
      };

      // 새 비밀번호가 제공된 경우
      if (newPassword) {
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      await virtualUser.update(updateData, { transaction: t });

      // 가상 주식 → 활성 주식으로 전환
      await virtualStock.update({
        status: 'active',
        isVirtualListing: false,
        virtualListingNote: null,
      }, { transaction: t });

      // CelebClaim 레코드 업데이트
      await claim.update({
        status: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null,
        stockSnapshotAtClaim: stockSnapshot,
        mergedFromUserId: claimant ? claimant.id : null,
        mergeDetails,
      }, { transaction: t });

      // 주주 전원에게 알림
      try {
        const holdings = await Holding.findAll({
          where: { stockId: virtualStock.id },
          attributes: ['holderId'],
          transaction: t,
        });

        const notifications = holdings.map(h => ({
          id: uuidv4(),
          userId: h.holderId,
          type: 'stock_claimed',
          title: '본인 인증 완료!',
          message: `${virtualUser.displayName}이(가) 실제 본인 인증을 완료했습니다! 가상 주식이 실제 주식으로 전환되었습니다.`,
          data: JSON.stringify({
            stockId: virtualStock.id,
            virtualUserId: virtualUser.id,
          }),
        }));

        if (notifications.length > 0 && Notification) {
          await Notification.bulkCreate(notifications, { transaction: t });
        }
      } catch (notifErr) {
        console.log('Notification creation skipped:', notifErr.message);
      }
    });

    // Socket.IO 알림
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      if (io) {
        io.emit('stock:claimed', {
          virtualUserId: virtualUser.id,
          virtualUsername: virtualUser.username,
          message: `${virtualUser.displayName}이(가) 본인 인증을 완료했습니다!`,
        });
      }
    } catch (socketErr) {
      console.log('Socket notification skipped:', socketErr.message);
    }

    res.json({
      success: true,
      message: '인수가 승인되었습니다. 가상 주식이 실제 주식으로 전환됩니다.',
      data: { claimId: id, status: 'approved', mergeDetails },
    });
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ error: '인수 승인 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 관리자: 인수 거부
// =====================================================

exports.rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: '거절 사유를 입력해주세요' });
    }

    const claim = await VirtualClaim.findByPk(id, {
      include: [
        { model: User, as: 'virtualUser' },
        { model: User, as: 'claimant' },
      ],
    });

    if (!claim) {
      return res.status(404).json({ error: '인수 요청을 찾을 수 없습니다' });
    }

    if (claim.status !== 'pending' && claim.status !== 'under_review') {
      return res.status(400).json({ error: `현재 상태(${claim.status})에서는 거부할 수 없습니다` });
    }

    await sequelize.transaction(async (t) => {
      await claim.update({
        status: 'rejected',
        rejectionReason,
        adminNotes: adminNotes || null,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      }, { transaction: t });

      await claim.virtualUser.update({
        virtualStatus: 'unclaimed',
        claimedBy: null,
      }, { transaction: t });
    });

    try {
      if (Notification && claim.claimantUserId) {
        await Notification.create({
          id: uuidv4(),
          userId: claim.claimantUserId,
          type: 'claim_rejected',
          title: '인수 신청 결과',
          message: `${claim.virtualUser.displayName} 인수 신청이 거부되었습니다. 사유: ${rejectionReason}`,
          data: JSON.stringify({ claimId: id }),
        });
      }
    } catch (notifErr) {
      console.log('Notification creation skipped:', notifErr.message);
    }

    res.json({
      success: true,
      message: '인수 요청이 거부되었습니다',
      data: { claimId: id, status: 'rejected' },
    });
  } catch (error) {
    console.error('Reject claim error:', error);
    res.status(500).json({ error: '인수 거부 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 유저: 셀럽 추천 요청
// =====================================================

exports.submitSuggestion = async (req, res) => {
  try {
    const { celebName, category, occupation, reason, socialLinks } = req.body;

    if (!celebName) {
      return res.status(400).json({ error: '셀럽 이름은 필수입니다' });
    }

    // 중복 추천 확인 (같은 유저가 같은 이름)
    const existingSuggestion = await CelebSuggestion.findOne({
      where: {
        suggestedBy: req.user.id,
        celebName: { [Op.like]: celebName },
      },
    });
    if (existingSuggestion) {
      return res.status(400).json({ error: '이미 같은 셀럽을 추천하셨습니다' });
    }

    // 이미 가상 셀럽으로 등록된 경우
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: { [Op.like]: celebName } },
          { displayName: { [Op.like]: celebName } },
        ],
        isVirtual: true,
      },
    });
    if (existingUser) {
      return res.status(400).json({ error: '이미 등록된 가상 셀럽입니다' });
    }

    const suggestion = await CelebSuggestion.create({
      id: uuidv4(),
      suggestedBy: req.user.id,
      celebName,
      category: category || 'other',
      occupation: occupation || null,
      reason: reason || null,
      socialLinks: socialLinks || null,
      upvoterIds: [req.user.id],
      upvoteCount: 1,
      expectationScore: 1,
      expectationUpdatedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: '셀럽 추천이 접수되었습니다',
      data: suggestion,
    });
  } catch (error) {
    console.error('Submit suggestion error:', error);
    res.status(500).json({ error: '셀럽 추천 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 유저: 추천 투표 (upvote)
// =====================================================

/**
 * 유저: "이 사람 상장되면 좋겠다" 표시.
 *
 * 취소(=감소) 경로를 의도적으로 제공하지 않는다. 기대지수가 내려갈 수 있으면
 * 그 하락이 곧 해당 인물에 대한 부정적 평가의 공표가 되어 주가와 같은 문제를 갖는다.
 * 반대표 역시 두지 않는다 — 긍정 수요 신호만 수집한다.
 */
exports.upvoteSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const suggestion = await CelebSuggestion.findByPk(id);
    if (!suggestion) {
      return res.status(404).json({ error: '해당 항목을 찾을 수 없습니다' });
    }

    if (suggestion.status === 'rejected') {
      return res.status(400).json({ error: '종료된 항목입니다' });
    }

    const upvoterIds = suggestion.upvoterIds || [];
    if (upvoterIds.includes(userId)) {
      return res.status(400).json({
        error: '이미 기다리고 있어요',
        data: {
          waitingCount: suggestion.upvoteCount,
          expectationScore: suggestion.expectationScore,
          alreadyWaiting: true,
        },
      });
    }

    upvoterIds.push(userId);
    const nextScore = bumpExpectation(suggestion.expectationScore, 1);

    await suggestion.update({
      upvoteCount: (suggestion.upvoteCount || 0) + 1,
      upvoterIds,
      expectationScore: nextScore,
      expectationUpdatedAt: new Date(),
    });

    res.json({
      success: true,
      message: '기다리는 목록에 추가했어요',
      data: {
        waitingCount: suggestion.upvoteCount,
        expectationScore: nextScore,
        alreadyWaiting: true,
      },
    });
  } catch (error) {
    console.error('Upvote suggestion error:', error);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 공개: 추천 목록 조회
// =====================================================

/**
 * 공개: 상장 대기 목록.
 *
 * 상위 PUBLIC_LIST_MAX 개까지만 내려보낸다. 전체 개수·페이지 수를 노출하지 않으므로
 * 클라이언트가 "전체 N명 중 몇 위" 같은 순위를 계산할 수 없다.
 * 하위 노출이 곧 조롱이 되는 것을 막기 위한 제약이다.
 */
exports.listSuggestions = async (req, res) => {
  try {
    const { sort = 'popular', status } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, PUBLIC_LIST_MAX);
    const userId = req.user?.id || null;

    const where = {};
    if (status) {
      where.status = status;
    } else {
      where.status = 'pending';
    }

    const order = sort === 'newest'
      ? [['createdAt', 'DESC']]
      : [['expectationScore', 'DESC'], ['createdAt', 'DESC']];

    const rows = await CelebSuggestion.findAll({
      where,
      include: [{
        model: User,
        as: 'suggester',
        attributes: ['id', 'username', 'displayName', 'profileImage'],
      }],
      attributes: [
        'id', 'celebName', 'category', 'occupation', 'reason',
        'status', 'upvoteCount', 'upvoterIds', 'expectationScore', 'createdAt',
      ],
      order,
      limit,
    });

    // socialLinks 는 공개 응답에서 제외한다 (개인정보 최소화).
    // upvoterIds 도 내려보내지 않고, 내가 눌렀는지 여부만 boolean 으로 알려준다.
    const data = rows.map((row) => {
      const plain = row.toJSON();
      const voters = plain.upvoterIds || [];
      delete plain.upvoterIds;
      return {
        ...plain,
        waitingCount: plain.upvoteCount || 0,
        alreadyWaiting: userId ? voters.includes(userId) : false,
      };
    });

    res.json({
      success: true,
      data,
      notice: UNCLAIMED_NOTICE,
      pagination: { limit, returned: data.length },
    });
  } catch (error) {
    console.error('List suggestions error:', error);
    res.status(500).json({ error: '목록 조회 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 관리자: 추천 관리 목록
// =====================================================

exports.adminListSuggestions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await CelebSuggestion.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'suggester',
          attributes: ['id', 'username', 'displayName', 'email'],
        },
        {
          model: User,
          as: 'createdVirtualUser',
          attributes: ['id', 'username', 'displayName'],
          required: false,
        },
      ],
      order: [['upvoteCount', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Admin list suggestions error:', error);
    res.status(500).json({ error: '추천 관리 목록 조회 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 관리자: 추천 승인 → 가상 셀럽 자동 생성
// =====================================================

exports.approveSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, displayName, bio, trustLevel } = req.body;

    const suggestion = await CelebSuggestion.findByPk(id);
    if (!suggestion) {
      return res.status(404).json({ error: '추천을 찾을 수 없습니다' });
    }

    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: '이미 처리된 추천입니다' });
    }

    const finalUsername = username || suggestion.celebName;
    const finalDisplayName = displayName || suggestion.celebName;

    // 중복 확인
    const existing = await User.findOne({ where: { username: finalUsername } });
    if (existing) {
      return res.status(400).json({ error: '이미 사용 중인 별칭입니다. 다른 별칭을 지정해주세요.' });
    }

    const randomPw = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPw, 10);
    const virtualEmail = `virtual_${finalUsername.toLowerCase().replace(/\s/g, '')}_${uuidv4().substring(0, 8)}@hipo.virtual`;

    const result = await sequelize.transaction(async (t) => {
      const virtualUser = await User.create({
        id: uuidv4(),
        email: virtualEmail,
        username: finalUsername,
        displayName: finalDisplayName,
        password: hashedPassword,
        bio: bio || `${finalDisplayName} 상장 대기 프로필입니다`,
        category: suggestion.category || 'entertainment',
        occupation: suggestion.occupation || '',
        trustLevel: trustLevel || 'silver',
        // 동의 전에는 값을 매기지 않는다
        marketCap: 0,
        poBalance: 0,
        isCreator: true,
        isVirtual: true,
        virtualStatus: 'unclaimed',
        virtualCreatedBy: req.user.id,
        virtualCreatedAt: new Date(),
        // 초상권·개인정보: 본인 확인 전에는 식별정보를 보관하지 않는다
        profileImage: null,
        realName: null,
        newsKeywords: null,
        externalLinks: null,
        referralCode: `V${finalUsername.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      }, { transaction: t });

      // 종목(Stock)은 여기서 만들지 않는다. approveClaim 에서 생성된다.

      await suggestion.update({
        status: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        createdVirtualUserId: virtualUser.id,
      }, { transaction: t });

      return { virtualUser };
    });

    // 추천자에게 알림
    try {
      if (Notification) {
        await Notification.create({
          id: uuidv4(),
          userId: suggestion.suggestedBy,
          type: 'suggestion_approved',
          title: '셀럽 추천 승인!',
          message: `추천하신 ${finalDisplayName}이(가) 상장 대기 목록에 등록되었습니다. 본인 확인이 완료되면 상장됩니다.`,
          data: JSON.stringify({ suggestionId: id, virtualUserId: result.virtualUser.id }),
        });
      }
    } catch (notifErr) {
      console.log('Notification creation skipped:', notifErr.message);
    }

    res.json({
      success: true,
      message: '추천이 승인되어 상장 대기 목록에 등록되었습니다',
      data: {
        suggestionId: id,
        virtualUser: {
          id: result.virtualUser.id,
          username: result.virtualUser.username,
          displayName: result.virtualUser.displayName,
          isListed: false,
          tradable: false,
        },
        stock: null,
      },
    });
  } catch (error) {
    console.error('Approve suggestion error:', error);
    res.status(500).json({ error: '추천 승인 중 오류가 발생했습니다' });
  }
};

// =====================================================
// 관리자: 추천 거부
// =====================================================

exports.rejectSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const suggestion = await CelebSuggestion.findByPk(id);
    if (!suggestion) {
      return res.status(404).json({ error: '추천을 찾을 수 없습니다' });
    }

    if (suggestion.status !== 'pending') {
      return res.status(400).json({ error: '이미 처리된 추천입니다' });
    }

    await suggestion.update({
      status: 'rejected',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason || null,
    });

    res.json({
      success: true,
      message: '추천이 거부되었습니다',
      data: { suggestionId: id, status: 'rejected' },
    });
  } catch (error) {
    console.error('Reject suggestion error:', error);
    res.status(500).json({ error: '추천 거부 중 오류가 발생했습니다' });
  }
};
