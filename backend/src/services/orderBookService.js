/**
 * 호가창 생성 서비스
 *
 * StockOrder 의 미체결 잔량을 가격대별로 집계해 호가창을 만든다.
 *
 * 증권앱 호가창과 맞추기 위한 두 가지 처리를 한다.
 *  1. 주문이 없는 가격대도 잔량 0으로 채워 항상 DEPTH 단계를 유지한다.
 *     (예전에는 주문이 있는 가격만 반환해서 호가 줄 수가 들쭉날쭉했다)
 *  2. 누적 잔량과 체결강도를 함께 계산한다.
 */

const { Op } = require('sequelize');
const { Stock, StockOrder, Transaction, sequelize } = require('../models');

/** 노출할 호가 단계 수 (매수/매도 각각) */
const DEPTH = 10;

/**
 * 호가 단위(틱). 가격대에 따라 달라진다.
 * 실제 거래소처럼 고가일수록 틱을 크게 잡아 호가가 촘촘해지지 않게 한다.
 */
function getTickSize(price) {
  if (price < 100) return 1;
  if (price < 1000) return 5;
  if (price < 10000) return 10;
  if (price < 100000) return 50;
  return 100;
}

/** 가격을 틱 단위로 내림/올림 */
function alignToTick(price, tick, direction = 'down') {
  if (tick <= 0) return Math.round(price);
  const fn = direction === 'up' ? Math.ceil : Math.floor;
  return fn(price / tick) * tick;
}

/**
 * 가격대별 미체결 잔량 집계.
 * @returns {Map<number, {quantity:number, orderCount:number}>}
 */
async function aggregatePending(stockId, side) {
  const rows = await StockOrder.findAll({
    where: {
      stockId,
      orderType: side,
      status: { [Op.in]: ['PENDING', 'PARTIAL'] },
      isTriggered: true,
    },
    attributes: [
      'limitPrice',
      [sequelize.fn('SUM', sequelize.literal('quantity - filled_quantity')), 'totalQuantity'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
    ],
    group: ['limitPrice'],
    raw: true,
  });

  const map = new Map();
  for (const row of rows) {
    const price = Math.round(parseFloat(row.limitPrice));
    if (!Number.isFinite(price)) continue;
    map.set(price, {
      quantity: parseInt(row.totalQuantity, 10) || 0,
      orderCount: parseInt(row.orderCount, 10) || 0,
    });
  }
  return map;
}

/**
 * 최근 체결의 매수/매도 비율로 체결강도를 낸다.
 * 100 초과면 매수 우위, 미만이면 매도 우위.
 */
async function getTradeStrength(stockId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 컬럼명은 transaction_type (모델 필드는 transactionType). 값은 'buy' / 'sell'.
  const rows = await Transaction.findAll({
    where: {
      stockId,
      [Op.and]: sequelize.where(sequelize.col('created_at'), Op.gte, since),
    },
    attributes: [
      'transactionType',
      [sequelize.fn('SUM', sequelize.col('shares')), 'vol'],
    ],
    group: ['transactionType'],
    raw: true,
  }).catch(() => []);

  let buy = 0;
  let sell = 0;
  for (const r of rows) {
    const vol = parseInt(r.vol, 10) || 0;
    const kind = String(r.transactionType || '').toLowerCase();
    if (kind.includes('buy') || kind.includes('purchase')) buy += vol;
    else if (kind.includes('sell') || kind.includes('sale')) sell += vol;
  }

  if (buy === 0 && sell === 0) return 100;
  if (sell === 0) return 200;
  // 지나치게 큰 값은 잘라 화면이 깨지지 않게 한다
  return Number(Math.min((buy / sell) * 100, 999).toFixed(1));
}

/**
 * 호가창 생성.
 *
 * @param {string} stockId
 * @returns {Promise<object|null>} 종목이 없으면 null
 */
async function buildOrderBook(stockId) {
  const stock = await Stock.findByPk(stockId, {
    attributes: ['id', 'sharePrice', 'priceChangePercent', 'dayVolume'],
  });
  if (!stock) return null;

  const currentPrice = Math.round(parseFloat(stock.sharePrice) || 0);
  const tick = getTickSize(currentPrice);

  const [bidMap, askMap] = await Promise.all([
    aggregatePending(stockId, 'BUY'),
    aggregatePending(stockId, 'SELL'),
  ]);

  // 실제 주문이 있는 최우선 호가를 기준으로 삼되, 없으면 현재가 기준으로 채운다
  const bidPrices = [...bidMap.keys()];
  const askPrices = [...askMap.keys()];
  const bestBid = bidPrices.length ? Math.max(...bidPrices) : alignToTick(currentPrice - tick, tick, 'down');
  const bestAsk = askPrices.length ? Math.min(...askPrices) : alignToTick(currentPrice + tick, tick, 'up');

  /** 지정한 방향으로 DEPTH 단계를 만든다 (빈 호가는 0으로 채움) */
  const buildSide = (startPrice, step, map) => {
    const levels = [];
    let cumulative = 0;
    for (let i = 0; i < DEPTH; i += 1) {
      const price = startPrice + step * i;
      if (price <= 0) break;
      const entry = map.get(price) || { quantity: 0, orderCount: 0 };
      cumulative += entry.quantity;
      levels.push({
        price,
        quantity: entry.quantity,
        orderCount: entry.orderCount,
        cumulativeQuantity: cumulative,
        totalVolume: price * entry.quantity,
      });
    }
    return levels;
  };

  // 매수는 최우선가에서 아래로, 매도는 최우선가에서 위로
  const bids = buildSide(bestBid, -tick, bidMap);
  const asksAscending = buildSide(bestAsk, tick, askMap);

  const allQuantities = [
    ...bids.map((b) => b.quantity),
    ...asksAscending.map((a) => a.quantity),
  ];
  const maxQuantity = Math.max(...allQuantities, 1);

  const withPercentage = (levels) =>
    levels.map((l) => ({ ...l, percentage: (l.quantity / maxQuantity) * 100 }));

  const totalBidQuantity = bids.reduce((s, b) => s + b.quantity, 0);
  const totalAskQuantity = asksAscending.reduce((s, a) => s + a.quantity, 0);
  const spread = bestAsk - bestBid;

  return {
    // 화면 표시 순서: 매도는 높은 가격이 위
    asks: withPercentage(asksAscending).reverse(),
    bids: withPercentage(bids),
    currentPrice,
    priceChangePercent: parseFloat(stock.priceChangePercent) || 0,
    tickSize: tick,
    depth: DEPTH,
    bestBid,
    bestAsk,
    spread,
    spreadPercent: currentPrice > 0 ? Number(((spread / currentPrice) * 100).toFixed(2)) : 0,
    totalBidQuantity,
    totalAskQuantity,
    /** 매수 잔량 비중(%) — 100 이면 매수/매도 균형 */
    bidRatio:
      totalBidQuantity + totalAskQuantity > 0
        ? Number(((totalBidQuantity / (totalBidQuantity + totalAskQuantity)) * 100).toFixed(1))
        : 50,
    tradeStrength: await getTradeStrength(stockId),
    dayVolume: parseInt(stock.dayVolume, 10) || 0,
  };
}

/**
 * 체결 경로 계획 (최선집행).
 *
 * 이 서비스에는 시장이 둘 있다.
 *  - 발행시장(primary) : 크리에이터가 발행한 물량을 현재가에 직접 매수. 대금은 크리에이터에게 간다.
 *  - 유통시장(secondary): 다른 주주가 걸어 둔 호가와 체결. 대금은 그 주주에게 간다.
 *
 * 예전에는 상세 화면의 매수 버튼이 항상 발행시장으로만 갔다. 그래서 호가창을 보며
 * 매수를 눌러도 화면에 보이는 호가와 체결되지 않았다. 여기서 둘을 비교해
 * 사용자에게 유리한 쪽을 고르고, 어느 시장에서 체결되는지 함께 돌려준다.
 *
 * @param {string} stockId
 * @param {'buy'|'sell'} side
 * @param {number} quantity
 * @returns {Promise<object|null>}
 */
async function planExecution(stockId, side, quantity) {
  const qty = parseInt(quantity, 10);
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const stock = await Stock.findByPk(stockId, {
    attributes: [
      'id', 'sharePrice', 'issuedShares', 'availableShares', 'totalShares',
      'buybackReserve',
    ],
  });
  if (!stock) return null;

  const primaryPrice = Math.round(parseFloat(stock.sharePrice) || 0);
  const book = await buildOrderBook(stockId);

  // 호가를 유리한 순서로 걸어가며 체결 가능 수량과 평균가를 구한다.
  // 매수는 싼 매도호가부터, 매도는 비싼 매수호가부터.
  const levels =
    side === 'buy'
      ? [...(book?.asks || [])].sort((a, b) => a.price - b.price)
      : [...(book?.bids || [])].sort((a, b) => b.price - a.price);

  let remaining = qty;
  let filledQty = 0;
  let filledCost = 0;
  const fills = [];

  for (const level of levels) {
    if (remaining <= 0) break;
    if (level.quantity <= 0) continue;
    const take = Math.min(level.quantity, remaining);
    fills.push({ price: level.price, quantity: take });
    filledQty += take;
    filledCost += take * level.price;
    remaining -= take;
  }

  const bookAvgPrice = filledQty > 0 ? filledCost / filledQty : null;

  /**
   * 발행시장에서 처리 가능한 수량.
   *  - 매수: 아직 발행하지 않은 물량
   *  - 매도(환매): 환매 준비 포인트로 감당 가능한 수량
   *
   * 환매 준비 포인트는 종목에 귀속된 게임 포인트 풀이다 (실제 자금 아님).
   * 이 풀이 마르면 발행시장 매도가 막히고 호가창으로만 팔 수 있다.
   */
  const buybackReserve = Number(stock.buybackReserve) || 0;
  const primaryAvailable =
    side === 'buy'
      ? Math.max((stock.availableShares || 0) - (stock.issuedShares || 0), 0)
      : primaryPrice > 0
        ? Math.floor(buybackReserve / primaryPrice)
        : 0;

  /**
   * 어느 쪽이 유리한가.
   * 매수는 싼 쪽, 매도는 비싼 쪽. 호가가 전량을 못 채우면 발행시장을 택한다
   * (부분체결 후 잔량이 미체결로 남는 것보다 즉시 전량 체결이 낫다).
   */
  let route = 'primary';
  let reason = '';

  if (filledQty >= qty && bookAvgPrice != null) {
    const better = side === 'buy' ? bookAvgPrice < primaryPrice : bookAvgPrice > primaryPrice;
    if (better) {
      route = 'secondary';
      reason = side === 'buy'
        ? '호가창에 더 싼 매도 물량이 있습니다'
        : '호가창에 더 비싼 매수 주문이 있습니다';
    } else {
      reason = side === 'buy'
        ? '호가창보다 현재가가 더 유리합니다'
        : '호가창보다 현재가가 더 유리합니다';
    }
  } else if (filledQty > 0) {
    reason = `호가창 물량이 ${filledQty}주뿐이라 전량 체결되지 않습니다`;
  } else {
    reason = side === 'buy'
      ? '호가창에 매도 물량이 없습니다'
      : '호가창에 매수 주문이 없습니다';
  }

  // 발행시장 여력이 모자라면 호가창으로 넘긴다
  if (route === 'primary' && primaryAvailable < qty) {
    if (filledQty > 0) {
      route = 'secondary';
      reason =
        side === 'buy'
          ? `발행 물량이 ${primaryAvailable}주뿐이라 호가창에서 체결합니다`
          : `환매 가능 수량이 ${primaryAvailable}주뿐이라 호가창에서 체결합니다`;
    } else {
      route = 'unavailable';
      reason =
        side === 'buy'
          ? '지금 매수할 수 있는 물량이 없습니다'
          : primaryAvailable > 0
            ? `지금은 ${primaryAvailable}주까지만 즉시 환매할 수 있어요. 나머지는 호가창에 매도 주문을 올려 주세요`
            : '환매 준비 포인트가 없어 즉시 매도가 어렵습니다. 호가창에 매도 주문을 올려 주세요';
    }
  }

  const estimatedPrice = route === 'secondary' ? Math.round(bookAvgPrice) : primaryPrice;

  return {
    stockId,
    side,
    quantity: qty,
    route, // 'primary' | 'secondary' | 'unavailable'
    routeLabel:
      route === 'secondary'
        ? '호가창'
        : route === 'primary'
          ? side === 'sell' ? '즉시 환매' : '발행시장'
          : '체결 불가',
    reason,
    estimatedPrice,
    estimatedTotal: estimatedPrice * qty,
    primaryPrice,
    primaryAvailable: Number.isFinite(primaryAvailable) ? primaryAvailable : null,
    /** 환매 준비 포인트 (게임 포인트 풀, 실제 자금 아님) */
    buybackReserve,
    maxBuybackShares: side === 'sell' ? primaryAvailable : null,
    bookAvgPrice: bookAvgPrice != null ? Math.round(bookAvgPrice) : null,
    bookFillableQuantity: filledQty,
    fills,
    /** 발행시장 대비 절감액(매수) 또는 추가 수익(매도) */
    advantage:
      route === 'secondary' && bookAvgPrice != null
        ? Math.round(Math.abs(primaryPrice - bookAvgPrice) * qty)
        : 0,
  };
}

/**
 * 호가창을 다시 만들어 해당 종목 구독자에게 브로드캐스트.
 * 주문 생성 / 체결 / 취소 직후에 호출한다.
 *
 * 소켓 전송 실패가 주문 처리 트랜잭션을 깨뜨리면 안 되므로 모든 예외를 삼킨다.
 */
async function broadcastOrderBook(stockId) {
  try {
    if (!stockId) return;
    const { sendOrderBookUpdate } = require('../config/socket');
    const book = await buildOrderBook(stockId);
    if (book) sendOrderBookUpdate(stockId, book);
  } catch (error) {
    console.error('호가창 브로드캐스트 실패:', error.message);
  }
}

module.exports = {
  DEPTH,
  getTickSize,
  buildOrderBook,
  planExecution,
  broadcastOrderBook,
};
