/**
 * 온보딩 컨트롤러 — "30초 안에 첫 주주 되기"
 *
 * 신규 가입자가 처음 한 종목을 매수하고 주주 커뮤니티에 들어가도록 유도하는
 * 동선의 백엔드. 복잡한 메인 화면 대신 "누구의 주주가 될까요?" 추천만 보여준다.
 */
const { User, Stock, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/onboarding/state
 * 현재 온보딩 완료 여부 + 추천 종목 목록을 반환.
 * 추천 = 거래 가능한(본인 인증된, isVirtualListing=false) active 종목을
 *        거래량·주주수 순으로. 본인 종목은 제외.
 */
exports.getState = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, { attributes: ['id', 'onboardedAt', 'poBalance'] });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 추천 종목: 거래 가능한 종목만 (tradeGuard와 일관: isVirtualListing=false)
    const stocks = await Stock.findAll({
      where: {
        status: 'active',
        isVirtualListing: false,
        userId: { [Op.ne]: userId } // 본인 종목 제외
      },
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'bio', 'trustLevel']
      }],
      order: [
        ['dayVolume', 'DESC'],
        ['shareholderCount', 'DESC'],
        ['marketCapTotal', 'DESC']
      ],
      limit: 3
    });

    const recommended = stocks.map(s => ({
      stockId: s.id,
      userId: s.userId,
      username: s.issuer?.username,
      displayName: s.issuer?.displayName || s.issuer?.username,
      profileImage: s.issuer?.profileImage || null,
      bio: s.issuer?.bio || null,
      trustLevel: s.issuer?.trustLevel || 'bronze',
      sharePrice: parseFloat(s.sharePrice) || 0,
      priceChangePercent: parseFloat(s.priceChangePercent) || 0,
      shareholderCount: s.shareholderCount || 0
    }));

    /**
     * 1호 상장 전에는 거래 가능한 종목이 0개다.
     * 그때는 빈 화면 대신 "내 종목을 공유해 첫 주주를 받는" 동선으로 보낸다.
     * 회원가입 시 모든 유저에게 본인 종목이 자동 개설되므로 항상 가능한 행동이다.
     */
    const myStock = await Stock.findOne({
      where: { userId },
      attributes: ['id', 'sharePrice', 'shareholderCount', 'status']
    });

    res.json({
      onboarded: !!user.onboardedAt,
      poBalance: user.poBalance || 0,
      // 첫 매수 기본 수량(원탭 매수용). PO 잔액으로 살 수 있는 한도 안에서 작게.
      suggestedShares: 10,
      recommended,
      // 추천이 비었을 때 프론트가 대안 동선을 그리기 위한 정보
      hasListedCreators: recommended.length > 0,
      myStock: myStock
        ? {
            stockId: myStock.id,
            sharePrice: parseFloat(myStock.sharePrice) || 0,
            shareholderCount: myStock.shareholderCount || 0,
            status: myStock.status
          }
        : null
    });
  } catch (error) {
    console.error('온보딩 상태 조회 오류:', error);
    res.status(500).json({ error: '온보딩 상태 조회 중 오류가 발생했습니다' });
  }
};

/**
 * POST /api/onboarding/complete
 * 온보딩 동선을 마쳤음을 표시 (onboardedAt 세팅).
 * 이미 완료된 경우에도 멱등하게 200.
 */
exports.complete = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    if (!user.onboardedAt) {
      await user.update({ onboardedAt: new Date() });
    }

    res.json({ success: true, onboardedAt: user.onboardedAt });
  } catch (error) {
    console.error('온보딩 완료 처리 오류:', error);
    res.status(500).json({ error: '온보딩 완료 처리 중 오류가 발생했습니다' });
  }
};
