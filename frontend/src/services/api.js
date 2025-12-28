import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API URL - Fly.io deployment
const API_URL = 'https://hipo-backend.fly.dev/api';

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
  getHoldings: () => api.get('/stocks/holdings'),
  getTransactions: () => api.get('/stocks/transactions'),
  getChart: (id, period) => api.get(`/stocks/${id}/chart?period=${period}`),
  issue: (data) => api.post('/stocks/issue', data),
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
  updateProfile: (data) => api.put('/users/profile', data),
  follow: (userId) => api.post(`/users/${userId}/follow`),
  unfollow: (userId) => api.delete(`/users/${userId}/follow`),
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
  unlike: (id) => api.delete(`/posts/${id}/like`),
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
  getUpcoming: () => api.get('/dividend/upcoming'),
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

export default api;
