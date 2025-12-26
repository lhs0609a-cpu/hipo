/**
 * 기술적 지표 계산 유틸리티
 */

/**
 * 단순 이동평균 (SMA - Simple Moving Average)
 * @param {Array} data - 가격 데이터 배열
 * @param {Number} period - 기간
 * @returns {Array} SMA 값 배열
 */
function calculateSMA(data, period) {
  const sma = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma.push(sum / period);
  }

  return sma;
}

/**
 * 지수 이동평균 (EMA - Exponential Moving Average)
 * @param {Array} data - 가격 데이터 배열
 * @param {Number} period - 기간
 * @returns {Array} EMA 값 배열
 */
function calculateEMA(data, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);

  // 첫 번째 EMA는 SMA로 시작
  let sum = 0;
  for (let i = 0; i < period; i++) {
    if (i >= data.length) break;
    sum += data[i];
    ema.push(null);
  }

  if (data.length < period) return ema;

  ema[period - 1] = sum / period;

  // 나머지는 EMA 공식 사용
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    ema.push(currentEMA);
  }

  return ema;
}

/**
 * 볼린저 밴드 (Bollinger Bands)
 * @param {Array} data - 가격 데이터 배열
 * @param {Number} period - 기간 (기본 20)
 * @param {Number} stdDev - 표준편차 배수 (기본 2)
 * @returns {Object} {upper, middle, lower} 배열
 */
function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const middle = calculateSMA(data, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }

    // 표준편차 계산
    let sumSquaredDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j] - middle[i];
      sumSquaredDiff += diff * diff;
    }
    const standardDeviation = Math.sqrt(sumSquaredDiff / period);

    upper.push(middle[i] + (standardDeviation * stdDev));
    lower.push(middle[i] - (standardDeviation * stdDev));
  }

  return { upper, middle, lower };
}

/**
 * RSI (Relative Strength Index)
 * @param {Array} data - 가격 데이터 배열
 * @param {Number} period - 기간 (기본 14)
 * @returns {Array} RSI 값 배열
 */
function calculateRSI(data, period = 14) {
  const rsi = [];
  const gains = [];
  const losses = [];

  // 첫 번째 값은 계산 불가
  rsi.push(null);

  // 가격 변화 계산
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // 초기 period-1개는 null
  for (let i = 0; i < period - 1; i++) {
    rsi.push(null);
  }

  if (data.length < period + 1) return rsi;

  // 첫 번째 평균 계산
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgGain / (avgLoss === 0 ? 0.0001 : avgLoss);
  rsi.push(100 - (100 / (1 + rs)));

  // 나머지 RSI 계산 (Wilder's smoothing)
  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

    const rs = avgGain / (avgLoss === 0 ? 0.0001 : avgLoss);
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * @param {Array} data - 가격 데이터 배열
 * @param {Number} fastPeriod - 빠른 EMA 기간 (기본 12)
 * @param {Number} slowPeriod - 느린 EMA 기간 (기본 26)
 * @param {Number} signalPeriod - 시그널 라인 기간 (기본 9)
 * @returns {Object} {macd, signal, histogram} 배열
 */
function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  const macd = [];
  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macd.push(null);
    } else {
      macd.push(fastEMA[i] - slowEMA[i]);
    }
  }

  const signal = calculateEMA(macd.filter(v => v !== null), signalPeriod);

  // signal을 원래 길이로 맞추기
  const fullSignal = [];
  let signalIndex = 0;
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null) {
      fullSignal.push(null);
    } else {
      fullSignal.push(signal[signalIndex]);
      signalIndex++;
    }
  }

  const histogram = [];
  for (let i = 0; i < data.length; i++) {
    if (macd[i] === null || fullSignal[i] === null) {
      histogram.push(null);
    } else {
      histogram.push(macd[i] - fullSignal[i]);
    }
  }

  return { macd, signal: fullSignal, histogram };
}

/**
 * 스토캐스틱 오실레이터 (Stochastic Oscillator)
 * @param {Array} high - 고가 배열
 * @param {Array} low - 저가 배열
 * @param {Array} close - 종가 배열
 * @param {Number} period - %K 기간 (기본 14)
 * @param {Number} smoothK - %K 스무딩 (기본 3)
 * @param {Number} smoothD - %D 스무딩 (기본 3)
 * @returns {Object} {k, d} 배열
 */
function calculateStochastic(high, low, close, period = 14, smoothK = 3, smoothD = 3) {
  const k = [];

  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      k.push(null);
      continue;
    }

    let highestHigh = high[i];
    let lowestLow = low[i];

    for (let j = 0; j < period; j++) {
      if (high[i - j] > highestHigh) highestHigh = high[i - j];
      if (low[i - j] < lowestLow) lowestLow = low[i - j];
    }

    const range = highestHigh - lowestLow;
    if (range === 0) {
      k.push(50);
    } else {
      k.push(((close[i] - lowestLow) / range) * 100);
    }
  }

  // %K 스무딩
  const smoothedK = calculateSMA(k.map(v => v === null ? 0 : v), smoothK);

  // %D 계산
  const d = calculateSMA(smoothedK.map(v => v === null ? 0 : v), smoothD);

  return { k: smoothedK, d };
}

module.exports = {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  calculateStochastic
};
