import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://backend-seven-psi-91.vercel.app/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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
  like: (id) => api.post(`/posts/${id}/like`),
  unlike: (id) => api.delete(`/posts/${id}/like`),
  comment: (id, content) => api.post(`/posts/${id}/comments`, { content }),
};

// Community APIs
export const communityAPI = {
  getAll: () => api.get('/communities'),
  getById: (id) => api.get(`/communities/${id}`),
  join: (id) => api.post(`/communities/${id}/join`),
  leave: (id) => api.delete(`/communities/${id}/leave`),
  getMessages: (id) => api.get(`/communities/${id}/messages`),
};

// Notification APIs
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Wallet APIs
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: () => api.get('/wallet/transactions'),
  deposit: (amount) => api.post('/wallet/deposit', { amount }),
  withdraw: (amount) => api.post('/wallet/withdraw', { amount }),
};

export default api;
