/**
 * 가격 히스토리(캔들) 기록 스케줄러
 *
 * 실시간으로 변동하는 sharePrice 를 주기적으로 캔들로 기록한다.
 * - 캔들이 없으면 생성 (open=high=low=close=현재가)
 * - 이미 있으면 close=현재가, high/low 갱신, 구간 거래량 재계산
 *
 * 분봉·시간봉·일봉을 함께 기록한다. 예전에는 '1d' 만 기록해서 차트의
 * "1일/1주/1개월" 탭이 전부 같은 일봉을 개수만 다르게 보여줬다.
 *
 * 분봉은 행이 빠르게 늘어나므로 TIMEFRAMES 의 retentionDays 만큼만 보관하고
 * 주기적으로 정리한다.
 */

const { Op } = require('sequelize');
const { Stock, PriceHistory, Transaction, sequelize } = require('../models');

/** 캔들 갱신 주기. 가장 짧은 봉(1분)에 맞춘다. */
const RECORD_INTERVAL_MS = 60 * 1000;

/** 오래된 분봉 정리 주기 */
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * 기록할 타임프레임.
 * ms 는 버킷 길이, retentionDays 는 보관 기간(null = 영구).
 */
const TIMEFRAMES = [
  { key: '1m', ms: 60 * 1000, retentionDays: 2 },
  { key: '5m', ms: 5 * 60 * 1000, retentionDays: 7 },
  { key: '15m', ms: 15 * 60 * 1000, retentionDays: 30 },
  { key: '1h', ms: 60 * 60 * 1000, retentionDays: 90 },
  { key: '1d', ms: 24 * 60 * 60 * 1000, retentionDays: null },
];

let recordIntervalId = null;
let pruneIntervalId = null;
let isRecording = false;

/**
 * 오늘 00:00 (로컬) 반환
 */
function getDayStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 해당 타임프레임에서 date 가 속한 버킷의 시작 시각.
 *
 * 일봉은 로컬 자정 기준으로 끊는다. epoch 기준으로 나누면 타임존 오프셋만큼
 * 밀려서 하루가 어긋난다.
 */
function getBucketStart(timeframe, date = new Date()) {
  if (timeframe.key === '1d') {
    return getDayStart(date);
  }
  const dayStart = getDayStart(date);
  const sinceDayStart = date.getTime() - dayStart.getTime();
  const bucketIndex = Math.floor(sinceDayStart / timeframe.ms);
  return new Date(dayStart.getTime() + bucketIndex * timeframe.ms);
}

/**
 * 구간별 종목 거래량 집계.
 * 타임프레임마다 한 번씩만 질의한다 (종목 수만큼 질의하지 않는다).
 */
async function getVolumeSince(since) {
  const rows = await Transaction.findAll({
    where: sequelize.where(sequelize.col('created_at'), Op.gte, since),
    attributes: [
      ['stock_id', 'stockId'],
      [sequelize.fn('SUM', sequelize.col('shares')), 'vol'],
    ],
    group: ['stock_id'],
    raw: true,
  });

  const map = {};
  for (const row of rows) {
    map[row.stockId] = parseInt(row.vol, 10) || 0;
  }
  return map;
}

/**
 * 일봉 처리. 새 거래일이 시작되면 전일 종가를 롤오버하고 당일 통계를 리셋한다.
 */
async function recordDailyCandle(stock, price, bucketStart, volume, intraday) {
  const nextDayStart = new Date(bucketStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  const existing = await PriceHistory.findOne({
    where: {
      stockId: stock.id,
      timeframe: '1d',
      timestamp: { [Op.gte]: bucketStart, [Op.lt]: nextDayStart },
    },
  });

  if (existing) {
    await existing.update({
      high: Math.max(parseFloat(existing.high), price, intraday.high),
      low: Math.min(parseFloat(existing.low), price, intraday.low),
      close: price,
      volume,
    });
    return 'updated';
  }

  const prevCandle = await PriceHistory.findOne({
    where: {
      stockId: stock.id,
      timeframe: '1d',
      timestamp: { [Op.lt]: bucketStart },
    },
    order: [['timestamp', 'DESC']],
  });

  if (prevCandle) {
    // 새 거래일: 전일 종가 롤오버 + 당일 통계 리셋
    const prevClose = parseFloat(prevCandle.close);
    await PriceHistory.create({
      stockId: stock.id,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
      timeframe: '1d',
      timestamp: bucketStart,
    });
    await stock.update({
      previousClose: Math.round(prevClose),
      dayOpen: price,
      dayHigh: price,
      dayLow: price,
      dayVolume: 0,
      priceChangePercent:
        prevClose > 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0,
    });
  } else {
    // 이 종목의 최초 캔들: 이미 발생한 당일 장중 고저/거래량을 반영
    const open = stock.dayOpen != null ? parseFloat(stock.dayOpen) : price;
    await PriceHistory.create({
      stockId: stock.id,
      open,
      high: Math.max(price, intraday.high),
      low: Math.min(price, intraday.low),
      close: price,
      volume,
      timeframe: '1d',
      timestamp: bucketStart,
    });
  }
  return 'created';
}

/**
 * 분·시간봉 처리. 버킷이 없으면 현재가로 열고, 있으면 갱신한다.
 */
async function recordIntradayCandle(stock, price, timeframe, bucketStart, volume) {
  const bucketEnd = new Date(bucketStart.getTime() + timeframe.ms);

  const existing = await PriceHistory.findOne({
    where: {
      stockId: stock.id,
      timeframe: timeframe.key,
      timestamp: { [Op.gte]: bucketStart, [Op.lt]: bucketEnd },
    },
  });

  if (existing) {
    await existing.update({
      high: Math.max(parseFloat(existing.high), price),
      low: Math.min(parseFloat(existing.low), price),
      close: price,
      volume,
    });
    return 'updated';
  }

  // 새 버킷의 시가는 직전 봉의 종가로 이어 붙인다. 없으면 현재가.
  const prev = await PriceHistory.findOne({
    where: {
      stockId: stock.id,
      timeframe: timeframe.key,
      timestamp: { [Op.lt]: bucketStart },
    },
    order: [['timestamp', 'DESC']],
    attributes: ['close'],
  });
  const open = prev ? parseFloat(prev.close) : price;

  await PriceHistory.create({
    stockId: stock.id,
    open,
    high: Math.max(open, price),
    low: Math.min(open, price),
    close: price,
    volume,
    timeframe: timeframe.key,
    timestamp: bucketStart,
  });
  return 'created';
}

/**
 * 캔들 기록 1회 실행
 */
async function recordCandles() {
  if (isRecording) {
    return;
  }
  isRecording = true;

  try {
    const now = new Date();

    // issuedShares 포함: Stock beforeSave 훅이 marketCapTotal=sharePrice*issuedShares 를
    // 계산하므로, update 시 issuedShares 가 로드돼 있지 않으면 marketCapTotal 이 NaN 이 된다.
    const stocks = await Stock.findAll({
      where: { status: 'active' },
      attributes: [
        'id', 'userId', 'sharePrice', 'issuedShares', 'previousClose',
        'dayOpen', 'dayHigh', 'dayLow', 'dayVolume',
      ],
    });

    if (stocks.length === 0) {
      return;
    }

    // 타임프레임별 버킷 시작 시각과 그 구간의 거래량을 미리 구해 둔다
    const buckets = [];
    for (const tf of TIMEFRAMES) {
      const bucketStart = getBucketStart(tf, now);
      buckets.push({ tf, bucketStart, volumeMap: await getVolumeSince(bucketStart) });
    }

    let created = 0;
    let updated = 0;

    for (const stock of stocks) {
      const price = parseFloat(stock.sharePrice) || 0;
      if (price <= 0) {
        continue;
      }

      const intraday = {
        high: stock.dayHigh != null ? parseFloat(stock.dayHigh) : price,
        low: stock.dayLow != null ? parseFloat(stock.dayLow) : price,
      };

      for (const { tf, bucketStart, volumeMap } of buckets) {
        try {
          let result;
          if (tf.key === '1d') {
            // 일봉 거래량: Transaction 집계와 Stock.dayVolume 중 큰 값 (경로별 누락 방지)
            const volume = Math.max(
              volumeMap[stock.id] || 0,
              parseInt(stock.dayVolume, 10) || 0
            );
            result = await recordDailyCandle(stock, price, bucketStart, volume, intraday);
          } else {
            result = await recordIntradayCandle(
              stock, price, tf, bucketStart, volumeMap[stock.id] || 0
            );
          }
          if (result === 'created') created++;
          else updated++;
        } catch (candleErr) {
          console.error(`캔들 기록 실패 (${stock.id}, ${tf.key}):`, candleErr.message);
        }
      }
    }

    console.log(
      `🕯️ 가격 히스토리 기록: 생성 ${created}, 갱신 ${updated} ` +
      `(활성 ${stocks.length}종목 × ${TIMEFRAMES.length}개 타임프레임)`
    );
  } catch (error) {
    console.error('가격 히스토리 기록 오류:', error);
  } finally {
    isRecording = false;
  }
}

/**
 * 보관 기간이 지난 분봉 정리.
 * 1분봉은 종목당 하루 1,440행씩 쌓이므로 방치하면 테이블이 빠르게 커진다.
 */
async function pruneOldCandles() {
  try {
    let totalDeleted = 0;
    for (const tf of TIMEFRAMES) {
      if (!tf.retentionDays) continue;
      const cutoff = new Date(Date.now() - tf.retentionDays * 24 * 60 * 60 * 1000);
      const deleted = await PriceHistory.destroy({
        where: { timeframe: tf.key, timestamp: { [Op.lt]: cutoff } },
      });
      totalDeleted += deleted;
    }
    if (totalDeleted > 0) {
      console.log(`🧹 오래된 캔들 정리: ${totalDeleted}행 삭제`);
    }
  } catch (error) {
    console.error('캔들 정리 오류:', error);
  }
}

/**
 * 스케줄러 시작
 */
function startPriceHistoryScheduler() {
  if (recordIntervalId) {
    console.log('⚠️ 가격 히스토리 스케줄러가 이미 실행 중입니다.');
    return;
  }

  console.log(
    `🕯️ 가격 히스토리(캔들) 스케줄러 시작 - 1분 간격, ` +
    `타임프레임 ${TIMEFRAMES.map((t) => t.key).join('/')}`
  );

  // 초기 실행 (15초 후, DB 동기화 안정화 대기)
  setTimeout(recordCandles, 15000);

  recordIntervalId = setInterval(recordCandles, RECORD_INTERVAL_MS);
  pruneIntervalId = setInterval(pruneOldCandles, PRUNE_INTERVAL_MS);
}

/**
 * 스케줄러 중지
 */
function stopPriceHistoryScheduler() {
  if (recordIntervalId) {
    clearInterval(recordIntervalId);
    recordIntervalId = null;
  }
  if (pruneIntervalId) {
    clearInterval(pruneIntervalId);
    pruneIntervalId = null;
  }
  console.log('⏸️ 가격 히스토리 스케줄러 중지');
}

module.exports = {
  startPriceHistoryScheduler,
  stopPriceHistoryScheduler,
  recordCandles,
  pruneOldCandles,
  TIMEFRAMES,
};
