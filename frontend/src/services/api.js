import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

/**
 * 앱에는 axios 인스턴스가 둘 있다 (api/client.js, 이 파일).
 *
 * 예전에는 이 파일만 `https://hipo-backend.fly.dev/api` 를 하드코딩하고 있어서,
 * 12개 파일은 config 의 주소를, 54개 파일은 fly.io 주소를 바라보는 상태였다.
 * 두 백엔드가 서로 다르니 어떤 기능은 되고 어떤 기능은 안 되는 증상이 났다.
 *
 * 이제 둘 다 config 를 쓴다. 주소는 EXPO_PUBLIC_API_URL 로 주입한다.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
  // 구글 콜백이 준 일회용 코드를 토큰으로 교환한다. 응답 모양은 login 과 같다
  exchangeGoogleCode: (code) => api.post('/auth/google/exchange', { code }),
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },
};

// Stock APIs
export const stockAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/stocks?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/stocks/${id}`),
  search: (query) => api.get(`/stocks/search?q=${query}`),
  buy: (stockId, quantity) => api.post('/stocks/buy', { stockId, quantity }),
  sell: (stockId, quantity) => api.post('/stocks/sell', { stockId, quantity }),
  getHoldings: () => api.get('/stocks/me/holdings'),
  getTransactions: () => api.get('/stocks/me/transactions'),
  getHistory: (id, period) => api.get(`/stocks/${id}/history?period=${period}`),
  getChart: (id, period) => api.get(`/stocks/${id}/history?period=${period}`), // alias for getHistory
  issue: (data) => api.post('/stocks/issue', data),
  getUserStock: (userId) => api.get(`/stocks/user/${userId}`),
};

// Stock Market APIs
export const stockMarketAPI = {
  getOverview: () => api.get('/stock-market/overview'),
  getTopGainers: () => api.get('/stock-market/top-gainers'),
  getTopLosers: () => api.get('/stock-market/top-losers'),
  getMostActive: () => api.get('/stock-market/most-active'),
};

// User APIs
export const userAPI = {
  getProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (userId, data) => api.put(`/users/${userId}`, data),
  updateMyProfile: (data) => api.put('/users/me', data),
  follow: (userId) => api.post(`/users/${userId}/follow`),
  unfollow: (userId) => api.post(`/users/${userId}/follow`), // toggle (same endpoint)
  getFollowers: (userId) => api.get(`/users/${userId}/followers`),
  getFollowing: (userId) => api.get(`/users/${userId}/following`),
};

// Post APIs
export const postAPI = {
  getAll: (page = 1) => api.get(`/posts?page=${page}`),
  getById: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  unlike: (id) => api.post(`/posts/${id}/like`), // toggle (same endpoint)
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  comment: (id, content) => api.post(`/posts/${id}/comments`, { content }),
  getComments: (id) => api.get(`/posts/${id}/comments`),
};

// Story APIs
export const storyAPI = {
  getAll: () => api.get('/stories'),
  create: (data) => api.post('/stories', data),
  view: (id) => api.post(`/stories/${id}/view`),
  delete: (id) => api.delete(`/stories/${id}`),
  getViewers: (id) => api.get(`/stories/${id}/viewers`),
};

// Message APIs
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId) => api.get(`/messages/${userId}`),
  send: (userId, content) => api.post(`/messages/${userId}`, { content }),
  markAsRead: (userId) => api.put(`/messages/${userId}/read`),
};

// Community APIs
export const communityAPI = {
  getAll: () => api.get('/communities'),
  getById: (id) => api.get(`/communities/${id}`),
  join: (id) => api.post(`/communities/${id}/join`),
  leave: (id) => api.delete(`/communities/${id}/leave`),
  getMessages: (id) => api.get(`/communities/${id}/messages`),
  sendMessage: (id, content) => api.post(`/communities/${id}/messages`, { content }),
};

// Notification APIs
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// Wallet APIs
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: () => api.get('/wallet/transactions'),
  deposit: (amount) => api.post('/wallet/deposit', { amount }),
  withdraw: (amount) => api.post('/wallet/withdraw', { amount }),
};

// Live Stream APIs
export const liveStreamAPI = {
  getAll: () => api.get('/live-streams'),
  getById: (id) => api.get(`/live-streams/${id}`),
  create: (data) => api.post('/live-streams', data),
  end: (id) => api.put(`/live-streams/${id}/end`),
  join: (id) => api.post(`/live-streams/${id}/join`),
  leave: (id) => api.post(`/live-streams/${id}/leave`),
  sendChat: (id, message) => api.post(`/live-streams/${id}/chat`, { message }),
  donate: (id, amount) => api.post(`/live-streams/${id}/donate`, { amount }),
};

// NFT APIs
export const nftAPI = {
  getAll: () => api.get('/nfts'),
  getById: (id) => api.get(`/nfts/${id}`),
  getMyNFTs: () => api.get('/nfts/my'),
  buy: (id) => api.post(`/nfts/${id}/buy`),
  sell: (id, price) => api.post(`/nfts/${id}/sell`, { price }),
};

// Merchandise APIs
export const merchandiseAPI = {
  getAll: () => api.get('/merchandises'),
  getById: (id) => api.get(`/merchandises/${id}`),
  purchase: (id, data) => api.post(`/merchandises/${id}/purchase`, data),
  getMyOrders: () => api.get('/merchandises/orders'),
};

// Dividend APIs
export const dividendAPI = {
  getHistory: () => api.get('/dividend/history'),
  getUpcoming: () => api.get('/dividend/expected'),
  getByStock: (stockId) => api.get(`/dividend/stock/${stockId}`),
};

// Daily Mission APIs
export const missionAPI = {
  getAll: () => api.get('/daily-missions'),
  complete: (id) => api.post(`/daily-missions/${id}/complete`),
  claimReward: (id) => api.post(`/daily-missions/${id}/claim`),
};

// Stock Alert APIs
export const stockAlertAPI = {
  getAll: () => api.get('/stock-alerts'),
  create: (data) => api.post('/stock-alerts', data),
  delete: (id) => api.delete(`/stock-alerts/${id}`),
  update: (id, data) => api.put(`/stock-alerts/${id}`, data),
};

// Ranking APIs
export const rankingAPI = {
  getCreatorRankings: () => api.get('/creator-rankings'),
  getTopInvestors: () => api.get('/creator-rankings/investors'),
  getWeeklyRankings: () => api.get('/creator-rankings/weekly'),
};

// Search APIs
export const searchAPI = {
  search: (query) => api.get(`/search?q=${query}`),
  searchUsers: (query) => api.get(`/search/users?q=${query}`),
  searchStocks: (query) => api.get(`/search/stocks?q=${query}`),
  searchPosts: (query) => api.get(`/search/posts?q=${query}`),
};

// Bookmark APIs
export const bookmarkAPI = {
  getAll: () => api.get('/bookmarks'),
  add: (postId) => api.post('/bookmarks', { postId }),
  remove: (postId) => api.delete(`/bookmarks/${postId}`),
};

// Event APIs
export const eventAPI = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
  participate: (id) => api.post(`/events/${id}/participate`),
};

// News APIs
export const newsAPI = {
  getAll: () => api.get('/news'),
  getById: (id) => api.get(`/news/${id}`),
  getByCategory: (category) => api.get(`/news/category/${category}`),
};

// Badge APIs
export const badgeAPI = {
  getAll: () => api.get('/badges'),
  getMyBadges: () => api.get('/badges/my'),
};

// Referral APIs
export const referralAPI = {
  getCode: () => api.get('/referrals/code'),
  apply: (code) => api.post('/referrals/apply', { code }),
  getStats: () => api.get('/referrals/stats'),
};

// Poll APIs
export const pollAPI = {
  getAll: () => api.get('/polls'),
  vote: (id, optionId) => api.post(`/polls/${id}/vote`, { optionId }),
  getResults: (id) => api.get(`/polls/${id}/results`),
};

// Q&A APIs
export const qaAPI = {
  getAll: () => api.get('/qa'),
  create: (data) => api.post('/qa', data),
  answer: (id, content) => api.post(`/qa/${id}/answer`, { content }),
};

// Competition APIs
export const competitionAPI = {
  getAll: () => api.get('/competitions'),
  getById: (id) => api.get(`/competitions/${id}`),
  join: (id) => api.post(`/competitions/${id}/join`),
  getLeaderboard: (id) => api.get(`/competitions/${id}/leaderboard`),
};

// Fan Meeting APIs
export const fanMeetingAPI = {
  getAll: () => api.get('/fan-meetings'),
  getById: (id) => api.get(`/fan-meetings/${id}`),
  reserve: (id) => api.post(`/fan-meetings/${id}/reserve`),
};

// Strategy APIs
export const strategyAPI = {
  getAll: () => api.get('/strategies'),
  getById: (id) => api.get(`/strategies/${id}`),
  follow: (id) => api.post(`/strategies/${id}/follow`),
  unfollow: (id) => api.delete(`/strategies/${id}/follow`),
};

// Chat APIs
export const chatAPI = {
  getRooms: () => api.get('/chat/rooms'),
  getMessages: (roomId) => api.get(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId, content) => api.post(`/chat/rooms/${roomId}/messages`, { content }),
};

// Verification APIs
export const verificationAPI = {
  requestVerification: (data) => api.post('/verification/request', data),
  getStatus: () => api.get('/verification/status'),
};

// Payment APIs
export const paymentAPI = {
  getPaymentMethods: () => api.get('/payment/methods'),
  addPaymentMethod: (data) => api.post('/payment/methods', data),
  processPayment: (data) => api.post('/payment/process', data),
};

// Feedback APIs
export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
};

// === 신규 고급 기능 APIs ===

// Security APIs (보안)
export const securityAPI = {
  getSettings: () => api.get('/security/settings'),
  setTradingPin: (pin, confirmPin) => api.post('/security/trading-pin', { pin, confirmPin }),
  verifyPin: (pin) => api.post('/security/verify-pin', { pin }),
  setup2FA: () => api.post('/security/2fa/setup'),
  verify2FA: (token) => api.post('/security/2fa/verify', { token }),
  disable2FA: (token, password) => api.post('/security/2fa/disable', { token, password }),
  requestIdentityVerification: (data) => api.post('/security/identity-verification', data),
  setDailyLimit: (limit, pin) => api.put('/security/daily-limit', { limit, pin }),
  getLoginHistory: () => api.get('/security/login-history'),
};

// Advanced Trading APIs (고급 거래) - Legacy
export const tradingAPI = {
  createLimitOrder: (data) => api.post('/stock-orders', { ...data, orderMode: 'limit' }),
  createStopOrder: (data) => api.post('/stock-orders', data),
  cancelOrder: (orderId) => api.delete(`/stock-orders/${orderId}`),
  getMyOrders: (status = 'PENDING') => api.get(`/stock-orders?status=${status}`),
};

// Stock Order APIs (지정가/손절/익절 주문)
export const stockOrderAPI = {
  // 주문 생성
  create: (data) => api.post('/stock-orders', data),
  // 내 주문 목록 조회
  getMyOrders: (params) => api.get('/stock-orders', { params }),
  // 주문 상세 조회
  getOrderDetail: (orderId) => api.get(`/stock-orders/${orderId}`),
  // 주문 취소
  cancel: (orderId) => api.delete(`/stock-orders/${orderId}`),
  // 특정 주식의 호가창 (실제 주문 기반)
  getOrderBook: (stockId) => api.get(`/stock-orders/stock/${stockId}/orderbook`),
};

// IPO APIs
export const ipoAPI = {
  // 상장 자격 확인
  checkEligibility: () => api.get('/ipo/eligibility'),
  quickEligibilityCheck: () => api.get('/ipo/eligibility/quick'),
  // IPO 신청 및 관리
  apply: (data) => api.post('/ipo/apply', data),
  secondaryOffering: (shares, price) => api.post('/ipo/secondary-offering', { shares, price }),
  buyback: (shares, maxPrice) => api.post('/ipo/buyback', { shares, maxPrice }),
  burnTreasury: (shares) => api.post('/ipo/burn-treasury', { shares }),
  checkTierUpgrade: () => api.get('/ipo/tier-check'),
  upgradeTier: () => api.post('/ipo/upgrade-tier'),
  requestDelisting: (reason, buybackPrice) => api.post('/ipo/request-delisting', { reason, buybackPrice }),
  getLockupStatus: () => api.get('/ipo/lockup-status'),
  getMyStatus: () => api.get('/ipo/my-status'),
};

// IPO 공모/청약 APIs
export const ipoOfferingAPI = {
  // 공모 목록 조회
  getOfferings: (params) => api.get('/ipo-offerings', { params }),
  // 공모 상세 조회
  getOfferingDetail: (offeringId) => api.get(`/ipo-offerings/${offeringId}`),
  // 공모 신청
  createOffering: (data) => api.post('/ipo-offerings', data),
  // 청약 신청
  subscribe: (offeringId, shares) => api.post(`/ipo-offerings/${offeringId}/subscribe`, { shares }),
  // 청약 취소
  cancelSubscription: (subscriptionId) => api.delete(`/ipo-offerings/subscriptions/${subscriptionId}`),
  // 내 청약 목록
  getMySubscriptions: (params) => api.get('/ipo-offerings/my-subscriptions', { params }),
  // 내 공모 현황
  getMyOffering: () => api.get('/ipo-offerings/my'),
};

// Pre-IPO APIs (상장 전 투자)
export const preIPOAPI = {
  // 활성 라운드 목록 조회
  getRounds: (params) => api.get('/pre-ipo/rounds', { params }),
  // 라운드 상세 조회
  getRoundDetail: (roundId) => api.get(`/pre-ipo/rounds/${roundId}`),
  // 라운드 통계
  getRoundStats: (roundId) => api.get(`/pre-ipo/rounds/${roundId}/stats`),
  // 내 Pre-IPO 라운드 조회 (발행자)
  getMyRound: () => api.get('/pre-ipo/my-round'),
  // 내 Pre-IPO 투자 목록
  getMyInvestments: (params) => api.get('/pre-ipo/my-investments', { params }),
  // Pre-IPO 라운드 생성
  createRound: (data) => api.post('/pre-ipo/rounds', data),
  // 라운드 수정
  updateRound: (roundId, data) => api.put(`/pre-ipo/rounds/${roundId}`, data),
  // 라운드 취소
  cancelRound: (roundId) => api.delete(`/pre-ipo/rounds/${roundId}`),
  // 투자 자격 확인
  checkEligibility: (roundId) => api.get(`/pre-ipo/rounds/${roundId}/eligibility`),
  // Pre-IPO 투자
  invest: (roundId, shares, inviteCode) => api.post(`/pre-ipo/rounds/${roundId}/invest`, { shares, inviteCode }),
  // 투자 취소
  cancelInvestment: (investmentId) => api.delete(`/pre-ipo/investments/${investmentId}`),
  // 라운드 투자자 목록 (발행자/관리자)
  getRoundInvestors: (roundId, params) => api.get(`/pre-ipo/rounds/${roundId}/investors`, { params }),
};

// Portfolio APIs (포트폴리오)
export const portfolioAPI = {
  getSummary: () => api.get('/portfolio/summary'),
  getProfitAnalysis: (period = '30d') => api.get(`/portfolio/profit-analysis?period=${period}`),
  getSectorAnalysis: () => api.get('/portfolio/sector-analysis'),
  getTradeStatistics: (period = 'all') => api.get(`/portfolio/trade-statistics?period=${period}`),
  getDividendAnalysis: () => api.get('/portfolio/dividend-analysis'),
  getReport: () => api.get('/portfolio/report'),
};

// Watchlist APIs (관심종목)
export const watchlistAPI = {
  getAll: () => api.get('/watchlist'),
  add: (stockId, notes) => api.post('/watchlist', { stockId, notes }),
  remove: (stockId) => api.delete(`/watchlist/${stockId}`),
  setAlert: (stockId, priceAlert, alertCondition) => api.put(`/watchlist/${stockId}/alert`, { priceAlert, alertCondition }),
  updateNote: (stockId, notes) => api.put(`/watchlist/${stockId}/note`, { notes }),
  check: (stockId) => api.get(`/watchlist/check/${stockId}`),
  getCategories: () => api.get('/watchlist/categories'),
  getByCategory: (category, params) => api.get(`/watchlist/category/${category}`, { params }),
};

// PO Wallet APIs (PO 충전)
export const poWalletAPI = {
  getBalance: () => api.get('/wallet/po/balance'),
  charge: (amount, paymentMethod, paymentId) => api.post('/wallet/po/charge', { amount, paymentMethod, paymentId }),
  convert: (amount, bankName, accountNumber, accountHolder) => api.post('/wallet/po/convert', { amount, bankName, accountNumber, accountHolder }),
  getHistory: (type, page = 1, limit = 20) => api.get(`/wallet/po/history?type=${type}&page=${page}&limit=${limit}`),
  getProducts: () => api.get('/wallet/po/products'),
};

// Advanced Dividend APIs (배당 고급)
export const advancedDividendAPI = {
  getSchedule: () => api.get('/dividend/schedule'),
  setReinvestment: (stockId, enabled, percentage) => api.post('/dividend/reinvestment', { stockId, enabled, percentage }),
  updateRate: (newRate) => api.put('/dividend/rate', { newRate }),
  paySpecial: (amount, reason) => api.post('/dividend/special', { amount, reason }),
  getStats: (period = '30d') => api.get(`/dividend/stats?period=${period}`),
};

// Admin APIs (관리자)
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  sanctionUser: (userId, action, reason, duration) => api.post(`/admin/users/${userId}/sanction`, { action, reason, duration }),
  getStocks: (params) => api.get('/admin/stocks', { params }),
  updateStockStatus: (stockId, status, reason) => api.patch(`/admin/stocks/${stockId}/status`, { status, reason }),
  getPendingIPOs: () => api.get('/admin/ipo/pending'),
  reviewIPO: (stockId, approved, reason, initialPrice, lockupDays) => api.post(`/admin/ipo/${stockId}/review`, { approved, reason, initialPrice, lockupDays }),
  getAnomalyAlerts: (page = 1) => api.get(`/admin/anomaly-alerts?page=${page}`),
  createAnnouncement: (title, content, type) => api.post('/admin/announcements', { title, content, type }),
};

// === 바이럴/마케팅 기능 APIs ===

// 추천 코드 시스템
export const viralReferralAPI = {
  getMyCode: () => api.get('/viral/referral/code'),
  applyCode: (code) => api.post('/viral/referral/apply', { code }),
  getMyReferrals: () => api.get('/viral/referral/list'),
};

// 출석 체크 시스템
export const attendanceAPI = {
  checkIn: () => api.post('/viral/attendance/check-in'),
  getStatus: () => api.get('/viral/attendance/status'),
};

// 친구 랭킹
export const friendRankingAPI = {
  getRanking: () => api.get('/viral/friends/ranking'),
};

// 초대 리더보드
export const inviteLeaderboardAPI = {
  getWeekly: () => api.get('/viral/leaderboard/weekly'),
};

// 소셜 공유
export const shareAPI = {
  getShareCard: () => api.get('/viral/share/card'),
};

// 얼리버드 뱃지
export const earlyBirdAPI = {
  getMyBadges: () => api.get('/viral/badges/early-bird'),
};

// === 티어 시스템 APIs ===
export const tierAPI = {
  // 모든 티어 정보 조회
  getAllTiers: () => api.get('/tiers/all'),
  // 티어별 통계 조회
  getStatistics: () => api.get('/tiers/statistics'),
  // 티어별 주식 목록 조회
  getStocksByTier: (tier, params) => api.get(`/tiers/stocks${tier ? '/' + tier : ''}`, { params }),
  // 티어 랭킹 조회
  getRanking: (params) => api.get('/tiers/ranking', { params }),
  // 특정 티어 혜택 정보
  getTierBenefits: (tier) => api.get(`/tiers/benefits/${tier}`),
  // 주식의 티어 상세 정보
  getStockTierDetail: (stockId) => api.get(`/tiers/stock/${stockId}`),
  // 다음 티어까지 진행률
  getNextTierProgress: (stockId) => api.get(`/tiers/stock/${stockId}/progress`),
  // 내 티어 정보
  getMyTierInfo: () => api.get('/tiers/my'),
  // 티어 업데이트 요청
  requestTierUpdate: () => api.post('/tiers/my/update'),
};

// === 연속 로그인 보상 APIs ===
export const loginStreakAPI = {
  getStatus: () => api.get('/login-streak/status'),
  claimReward: () => api.post('/login-streak/claim'),
  getLeaderboard: (limit = 10) => api.get(`/login-streak/leaderboard?limit=${limit}`),
};

// === 장기 보유 보너스 APIs ===
export const holdingBonusAPI = {
  getMyStatus: () => api.get('/holding-bonus/status'),
  getStockStatus: (stockId) => api.get(`/holding-bonus/stock/${stockId}`),
  claimBonus: (stockId, milestoneDays) => api.post('/holding-bonus/claim', { stockId, milestoneDays }),
  getLeaderboard: (limit = 10) => api.get(`/holding-bonus/leaderboard?limit=${limit}`),
};

// === 크리에이터 수익 정산 APIs ===
export const settlementAPI = {
  getDashboard: () => api.get('/settlement/dashboard'),
  registerBankAccount: (data) => api.post('/settlement/bank-account', data),
  requestSettlement: (amount) => api.post('/settlement/request', { amount }),
  getHistory: (page = 1, limit = 20) => api.get(`/settlement/history?page=${page}&limit=${limit}`),
  cancelSettlement: (id) => api.post(`/settlement/${id}/cancel`),
};

// === 주주 전용 커뮤니티 APIs ===
export const shareholderCommunityAPI = {
  // 커뮤니티 관리
  create: (data) => api.post('/shareholder-community', data),
  getMyCommunities: () => api.get('/shareholder-community/my'),
  getByStock: (stockId) => api.get(`/shareholder-community/stock/${stockId}`),
  getDetail: (communityId) => api.get(`/shareholder-community/${communityId}`),
  updateSettings: (communityId, settings) => api.put(`/shareholder-community/${communityId}/settings`, settings),
  getStats: (communityId) => api.get(`/shareholder-community/${communityId}/stats`),

  // 멤버 관리
  join: (communityId) => api.post(`/shareholder-community/${communityId}/join`),
  leave: (communityId) => api.post(`/shareholder-community/${communityId}/leave`),
  getMembers: (communityId, params) => api.get(`/shareholder-community/${communityId}/members`, { params }),
  warnMember: (communityId, userId, reason) => api.post(`/shareholder-community/${communityId}/members/${userId}/warn`, { reason }),
  banMember: (communityId, userId, reason, hours) => api.post(`/shareholder-community/${communityId}/members/${userId}/ban`, { reason, hours }),

  // 채팅
  sendMessage: (communityId, content, isVipRoom = false) => api.post(`/shareholder-community/${communityId}/messages`, { content, isVipRoom }),
  getMessages: (communityId, params) => api.get(`/shareholder-community/${communityId}/messages`, { params }),
  getPinnedMessages: (communityId) => api.get(`/shareholder-community/${communityId}/messages/pinned`),
  pinMessage: (messageId) => api.post(`/shareholder-community/messages/${messageId}/pin`),

  // 공지사항
  createNotice: (communityId, data) => api.post(`/shareholder-community/${communityId}/notices`, data),
  getNotices: (communityId, params) => api.get(`/shareholder-community/${communityId}/notices`, { params }),
};

// === 가상 셀럽 사전상장 APIs ===
export const virtualCelebrityAPI = {
  // 공개 API
  browse: (params) => api.get('/virtual-celebrity/browse', { params }),
  getDetail: (id) => api.get(`/virtual-celebrity/${id}`),

  // 유저 API - 인수
  submitClaim: (virtualUserId, data) => api.post(`/virtual-celebrity/claim/${virtualUserId}`, data),
  getMyClaims: () => api.get('/virtual-celebrity/claim/my-claims'),

  // 유저 API - 상장 요청 / 기대 표시
  submitSuggestion: (data) => api.post('/virtual-celebrity/suggest', data),
  getSuggestions: (params) => api.get('/virtual-celebrity/suggestions', { params }),
  /**
   * "이 사람 상장되면 좋겠다" 표시.
   * 취소 API 는 의도적으로 없다 — 기대지수는 내려가지 않는다.
   * (내려가면 그 하락 자체가 해당 인물에 대한 부정적 평가의 공표가 된다)
   */
  expectListing: (id) => api.post(`/virtual-celebrity/suggest/${id}/upvote`),

  // 관리자 API - 가상 셀럽 관리
  create: (data) => api.post('/virtual-celebrity/admin/create', data),
  createBulk: (celebrities) => api.post('/virtual-celebrity/admin/bulk-create', { celebrities }),
  adminList: (params) => api.get('/virtual-celebrity/admin/list', { params }),

  // 관리자 API - 인수 관리
  adminListClaims: (params) => api.get('/virtual-celebrity/admin/claims', { params }),
  approveClaim: (claimId, data) => api.post(`/virtual-celebrity/admin/claims/${claimId}/approve`, data),
  rejectClaim: (claimId, data) => api.post(`/virtual-celebrity/admin/claims/${claimId}/reject`, data),

  // 관리자 API - 추천 관리
  adminListSuggestions: (params) => api.get('/virtual-celebrity/admin/suggestions', { params }),
  approveSuggestion: (id, data) => api.post(`/virtual-celebrity/admin/suggestions/${id}/approve`, data),
  rejectSuggestion: (id, data) => api.post(`/virtual-celebrity/admin/suggestions/${id}/reject`, data),
};

// === 푸시 알림 토큰 APIs ===
export const pushNotificationAPI = {
  registerToken: (token, platform) => api.post('/notifications/push-token', { token, platform }),
  removeToken: (token) => api.delete('/notifications/push-token', { data: { token } }),
};

// === 카피 트레이딩 / 인기 투자자 APIs ===
export const copyTradingAPI = {
  getTopInvestors: (params) => api.get('/rankings/top-investors', { params }),
  followInvestor: (userId) => api.post(`/users/${userId}/follow`),
  unfollowInvestor: (userId) => api.delete(`/users/${userId}/follow`),
  getInvestorPortfolio: (userId) => api.get(`/users/${userId}/portfolio`),
};

// === 실시간 거래 피드 APIs ===
export const tradeFeedAPI = {
  getRecent: (limit = 20) => api.get(`/trades/recent?limit=${limit}`),
};

export default api;
