import AsyncStorage from '@react-native-async-storage/async-storage';
import cacheService from './cacheService';

const API_BASE_URL = 'http://localhost:3000/api';
const TOKEN_KEY = '@hipo_auth_token';

/**
 * APIService
 *
 * Centralized API service with:
 * - Automatic authentication
 * - Request/response caching
 * - Error handling
 * - Retry logic
 * - Request deduplication
 */
class APIService {
  constructor() {
    this.pendingRequests = new Map(); // For request deduplication
    this.authToken = null;
  }

  /**
   * Initialize service - load auth token
   */
  async initialize() {
    try {
      this.authToken = await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error loading auth token:', error);
    }
  }

  /**
   * Set authentication token
   */
  async setAuthToken(token) {
    this.authToken = token;

    try {
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error saving auth token:', error);
    }
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    return this.authToken;
  }

  /**
   * Build request headers
   */
  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP request
   */
  async request(
    method,
    endpoint,
    options = {}
  ) {
    const {
      data = null,
      headers = {},
      cache = false,
      cacheTTL = 5 * 60 * 1000,
      cacheKey = null,
      retries = 0,
      timeout = 10000,
    } = options;

    const url = `${API_BASE_URL}${endpoint}`;
    const requestKey = `${method}:${endpoint}${data ? ':' + JSON.stringify(data) : ''}`;

    // Check cache for GET requests
    if (method === 'GET' && cache) {
      const key = cacheKey || `api:${endpoint}`;
      const cached = await cacheService.get(key);

      if (cached !== null) {
        return cached;
      }
    }

    // Request deduplication - prevent multiple identical requests
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    // Create request promise
    const requestPromise = this._executeRequest(
      method,
      url,
      data,
      headers,
      timeout,
      retries
    );

    // Store pending request
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const response = await requestPromise;

      // Cache successful GET responses
      if (method === 'GET' && cache && response) {
        const key = cacheKey || `api:${endpoint}`;
        await cacheService.set(key, response, cacheTTL);
      }

      return response;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Execute HTTP request with retry logic
   */
  async _executeRequest(method, url, data, customHeaders, timeout, retries) {
    const headers = this.getHeaders(customHeaders);

    const fetchOptions = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw {
            status: response.status,
            message: errorData.error || errorData.message || 'Request failed',
            data: errorData,
          };
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, { ...options, cache: options.cache !== false });
  }

  /**
   * POST request
   */
  async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, { ...options, data });
  }

  /**
   * PUT request
   */
  async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, { ...options, data });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }

  /**
   * Invalidate cache for specific endpoint or pattern
   */
  async invalidateCache(pattern) {
    if (pattern) {
      await cacheService.remove(`api:${pattern}`);
    } else {
      // Clear all API cache
      await cacheService.clear();
    }
  }

  /**
   * Upload file
   */
  async uploadFile(endpoint, file, fieldName = 'file', options = {}) {
    const formData = new FormData();
    formData.append(fieldName, file);

    const headers = this.getHeaders({
      'Content-Type': 'multipart/form-data',
    });

    delete headers['Content-Type']; // Let browser set it with boundary

    return this.request('POST', endpoint, {
      ...options,
      data: formData,
      headers,
    });
  }
}

// Singleton instance
const apiService = new APIService();

// Initialize on import
apiService.initialize();

export default apiService;
