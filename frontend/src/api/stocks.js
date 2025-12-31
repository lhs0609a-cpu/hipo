import api from './client';

/**
 * 주식 목록 조회
 */
export const getStocks = async (page = 1, limit = 20, sortBy = 'marketCap') => {
  const response = await api.get('/stocks', {
    params: { page, limit, sortBy },
  });
  return response.data;
};

/**
 * 주식 상세 조회
 */
export const getStockDetail = async (stockId) => {
  const response = await api.get(`/stocks/${stockId}`);
  return response.data;
};

/**
 * 주식 매수
 */
export const buyStock = async (stockId, shares) => {
  const response = await api.post('/stocks/buy', {
    stockId,
    shares,
  });
  return response.data;
};

/**
 * 주식 매도
 */
export const sellStock = async (stockId, shares) => {
  const response = await api.post('/stocks/sell', {
    stockId,
    shares,
  });
  return response.data;
};

/**
 * 내 보유 주식 조회
 */
export const getMyHoldings = async () => {
  const response = await api.get('/stocks/me/holdings');
  return response.data;
};

/**
 * 거래 내역 조회
 */
export const getTransactions = async (page = 1, limit = 20) => {
  const response = await api.get('/stocks/me/transactions', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * 내 주식을 보유한 주주 목록 조회
 */
export const getMyShareholders = async () => {
  const response = await api.get('/stocks/me/shareholders');
  return response.data;
};

/**
 * 추천 주식 목록 조회
 */
export const getRecommendedStocks = async () => {
  const response = await api.get('/stocks/recommended');
  return response.data;
};

/**
 * 주식 가격 히스토리 조회
 */
export const getPriceHistory = async (stockId, timeframe = '1d', limit = 100) => {
  const response = await api.get(`/stocks/${stockId}/history`, {
    params: { timeframe, limit }
  });
  return response.data;
};

/**
 * 데모용 가격 히스토리 생성
 */
export const generateDemoHistory = async (stockId, days = 90) => {
  const response = await api.post(`/stocks/${stockId}/generate-demo-history`, { days });
  return response.data;
};

/**
 * 시장 전체 차트 데이터 조회
 */
export const getMarketChartData = async (timeframe = '1d', limit = 24) => {
  const response = await api.get('/stocks/market/chart', {
    params: { timeframe, limit }
  });
  return response.data;
};

/**
 * 호가창 데이터 조회
 */
export const getOrderBook = async (stockId) => {
  const response = await api.get(`/stocks/${stockId}/orderbook`);
  return response.data;
};

/**
 * 주식 상세 통계 조회 (시가, 고가, 저가, 거래량)
 */
export const getStockStats = async (stockId) => {
  const response = await api.get(`/stocks/${stockId}/stats`);
  return response.data;
};
