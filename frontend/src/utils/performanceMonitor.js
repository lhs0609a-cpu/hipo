/**
 * PerformanceMonitor
 *
 * Utility for monitoring and logging performance metrics:
 * - Component render times
 * - API call durations
 * - Memory usage
 * - Slow operations detection
 */
class PerformanceMonitor {
  constructor() {
    this.measurements = new Map();
    this.enabled = __DEV__; // Only in development by default
    this.slowThreshold = 100; // ms
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Start measuring an operation
   */
  start(key) {
    if (!this.enabled) return;

    this.measurements.set(key, {
      startTime: Date.now(),
      startMemory: this._getMemoryUsage(),
    });
  }

  /**
   * End measuring and log result
   */
  end(key, logToConsole = true) {
    if (!this.enabled) return null;

    const measurement = this.measurements.get(key);

    if (!measurement) {
      console.warn(`No measurement started for: ${key}`);
      return null;
    }

    const duration = Date.now() - measurement.startTime;
    const memoryDelta = this._getMemoryUsage() - measurement.startMemory;

    const result = {
      key,
      duration,
      memoryDelta,
      isSlow: duration > this.slowThreshold,
      timestamp: new Date().toISOString(),
    };

    this.measurements.delete(key);

    if (logToConsole) {
      if (result.isSlow) {
        console.warn(
          `⚠️ Slow operation detected: ${key} took ${duration}ms`,
          result
        );
      } else {
        console.log(`⏱️ ${key}: ${duration}ms`, result);
      }
    }

    return result;
  }

  /**
   * Measure async function
   */
  async measureAsync(key, fn) {
    if (!this.enabled) {
      return await fn();
    }

    this.start(key);

    try {
      const result = await fn();
      this.end(key);
      return result;
    } catch (error) {
      this.end(key);
      throw error;
    }
  }

  /**
   * Measure sync function
   */
  measure(key, fn) {
    if (!this.enabled) {
      return fn();
    }

    this.start(key);

    try {
      const result = fn();
      this.end(key);
      return result;
    } catch (error) {
      this.end(key);
      throw error;
    }
  }

  /**
   * Get current memory usage (approximation)
   */
  _getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get memory info
   */
  getMemoryInfo() {
    if (typeof performance !== 'undefined' && performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;

      return {
        used: this._formatBytes(usedJSHeapSize),
        total: this._formatBytes(totalJSHeapSize),
        limit: this._formatBytes(jsHeapSizeLimit),
        usagePercent: ((usedJSHeapSize / jsHeapSizeLimit) * 100).toFixed(2),
      };
    }

    return null;
  }

  /**
   * Format bytes to human-readable string
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Log current memory usage
   */
  logMemory() {
    if (!this.enabled) return;

    const info = this.getMemoryInfo();

    if (info) {
      console.log('💾 Memory Usage:', info);
    }
  }

  /**
   * Clear all measurements
   */
  clear() {
    this.measurements.clear();
  }

  /**
   * Set slow operation threshold
   */
  setSlowThreshold(ms) {
    this.slowThreshold = ms;
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component performance
 */
export const usePerformance = (componentName) => {
  const mountKey = `${componentName}_mount`;
  const renderKey = `${componentName}_render`;

  // Measure mount time
  React.useEffect(() => {
    performanceMonitor.start(mountKey);

    return () => {
      performanceMonitor.end(mountKey);
    };
  }, []);

  // Measure render time
  React.useEffect(() => {
    performanceMonitor.end(renderKey);
  });

  performanceMonitor.start(renderKey);
};

/**
 * Higher-order component for performance monitoring
 */
export const withPerformanceMonitoring = (Component, componentName) => {
  const displayName = componentName || Component.displayName || Component.name;

  return (props) => {
    usePerformance(displayName);
    return React.createElement(Component, props);
  };
};

/**
 * Decorator for measuring function performance
 */
export const measurePerformance = (target, propertyKey, descriptor) => {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args) {
    const key = `${target.constructor.name}.${propertyKey}`;
    return await performanceMonitor.measureAsync(key, () =>
      originalMethod.apply(this, args)
    );
  };

  return descriptor;
};

export default performanceMonitor;
