import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * ErrorLogger Service
 *
 * Centralized error logging with:
 * - Local error storage
 * - Error classification
 * - Error reporting to backend
 * - User context tracking
 * - Breadcrumb tracking
 */
class ErrorLogger {
  constructor() {
    this.errorQueue = [];
    this.breadcrumbs = [];
    this.maxBreadcrumbs = 50;
    this.maxQueueSize = 100;
    this.userContext = {};
    this.enabled = true;
    this.endpoint = '/api/errors/report'; // Backend endpoint for error reporting
  }

  /**
   * Set user context
   */
  setUserContext(context) {
    this.userContext = {
      ...this.userContext,
      ...context,
    };
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message, category = 'default', level = 'info', data = {}) {
    const breadcrumb = {
      message,
      category,
      level,
      data,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Log error
   */
  logError(error, context = {}) {
    if (!this.enabled) return;

    const errorData = this._formatError(error, context);

    // Add to queue
    this.errorQueue.push(errorData);

    // Keep queue size limited
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Log to console in development
    if (__DEV__) {
      console.error('Error logged:', errorData);
    }

    // Save to AsyncStorage
    this._saveErrorsToStorage();

    // Send to backend (fire and forget)
    this._sendToBackend(errorData).catch((err) => {
      console.warn('Failed to send error to backend:', err);
    });

    return errorData;
  }

  /**
   * Format error data
   */
  _formatError(error, context = {}) {
    const errorData = {
      id: this._generateId(),
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack || '',
      type: error.name || 'Error',
      level: this._classifyErrorLevel(error),
      platform: Platform.OS,
      platformVersion: Platform.Version,
      userContext: this.userContext,
      breadcrumbs: [...this.breadcrumbs],
      context: {
        ...context,
        url: context.url || null,
        component: context.component || null,
        action: context.action || null,
      },
    };

    return errorData;
  }

  /**
   * Classify error severity
   */
  _classifyErrorLevel(error) {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('fatal') || message.includes('critical')) {
      return 'critical';
    }

    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch')
    ) {
      return 'warning';
    }

    return 'error';
  }

  /**
   * Generate unique error ID
   */
  _generateId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save errors to AsyncStorage
   */
  async _saveErrorsToStorage() {
    try {
      // Keep only last 50 errors
      const errorsToSave = this.errorQueue.slice(-50);
      await AsyncStorage.setItem(
        '@hipo_errors',
        JSON.stringify(errorsToSave)
      );
    } catch (error) {
      console.warn('Failed to save errors to storage:', error);
    }
  }

  /**
   * Load errors from AsyncStorage
   */
  async loadErrorsFromStorage() {
    try {
      const errors = await AsyncStorage.getItem('@hipo_errors');
      if (errors) {
        this.errorQueue = JSON.parse(errors);
      }
    } catch (error) {
      console.warn('Failed to load errors from storage:', error);
    }
  }

  /**
   * Send error to backend
   */
  async _sendToBackend(errorData) {
    try {
      // Import apiService dynamically to avoid circular dependency
      const { default: apiService } = await import('./apiService');

      await apiService.post(this.endpoint, errorData, {
        retries: 1,
        timeout: 5000,
      });
    } catch (error) {
      // Silently fail - don't want error reporting to cause more errors
      if (__DEV__) {
        console.warn('Error reporting failed:', error);
      }
    }
  }

  /**
   * Get all logged errors
   */
  getErrors() {
    return [...this.errorQueue];
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10) {
    return this.errorQueue.slice(-count);
  }

  /**
   * Clear all errors
   */
  async clearErrors() {
    this.errorQueue = [];
    this.breadcrumbs = [];

    try {
      await AsyncStorage.removeItem('@hipo_errors');
    } catch (error) {
      console.warn('Failed to clear errors from storage:', error);
    }
  }

  /**
   * Log navigation event
   */
  logNavigation(screenName, params = {}) {
    this.addBreadcrumb(
      `Navigated to ${screenName}`,
      'navigation',
      'info',
      params
    );
  }

  /**
   * Log API call
   */
  logApiCall(method, endpoint, status, duration) {
    this.addBreadcrumb(
      `API ${method} ${endpoint} - ${status}`,
      'api',
      status >= 400 ? 'error' : 'info',
      { method, endpoint, status, duration }
    );
  }

  /**
   * Log user action
   */
  logUserAction(action, details = {}) {
    this.addBreadcrumb(
      action,
      'user_action',
      'info',
      details
    );
  }

  /**
   * Enable/disable error logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Get error statistics
   */
  getStats() {
    const stats = {
      total: this.errorQueue.length,
      critical: 0,
      error: 0,
      warning: 0,
    };

    this.errorQueue.forEach((err) => {
      stats[err.level] = (stats[err.level] || 0) + 1;
    });

    return stats;
  }
}

// Singleton instance
const errorLogger = new ErrorLogger();

// Load errors on initialization
errorLogger.loadErrorsFromStorage();

// Global error handler
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    errorLogger.logError(error, {
      isFatal,
      component: 'GlobalErrorHandler',
    });

    // Call default handler
    defaultHandler(error, isFatal);
  });
}

// Unhandled promise rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener?.('unhandledrejection', (event) => {
    errorLogger.logError(event.reason, {
      type: 'UnhandledPromiseRejection',
      promise: event.promise,
    });
  });
}

export default errorLogger;
