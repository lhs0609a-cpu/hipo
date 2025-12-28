import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useTimeout Hook
 * Auto-cleanup timeout on unmount
 */
export const useTimeout = (callback, delay) => {
  const savedCallback = useRef(callback);
  const timeoutRef = useRef(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      timeoutRef.current = setTimeout(() => savedCallback.current(), delay);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [delay]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return clear;
};

/**
 * useInterval Hook
 * Auto-cleanup interval on unmount
 */
export const useInterval = (callback, delay) => {
  const savedCallback = useRef(callback);
  const intervalRef = useRef(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      intervalRef.current = setInterval(() => savedCallback.current(), delay);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [delay]);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return clear;
};

/**
 * useIsMounted Hook
 * Track component mount status to prevent state updates after unmount
 */
export const useIsMounted = () => {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
};

/**
 * useSafeState Hook
 * Only update state if component is still mounted
 */
export const useSafeState = (initialState) => {
  const [state, setState] = useState(initialState);
  const isMounted = useIsMounted();

  const setSafeState = useCallback(
    (value) => {
      if (isMounted()) {
        setState(value);
      }
    },
    [isMounted]
  );

  return [state, setSafeState];
};

/**
 * useAsyncEffect Hook
 * Handle async operations with automatic cleanup
 */
export const useAsyncEffect = (asyncFunction, dependencies = []) => {
  const isMounted = useIsMounted();

  useEffect(() => {
    let isCancelled = false;

    const runAsync = async () => {
      try {
        await asyncFunction(isCancelled);
      } catch (error) {
        if (isMounted() && !isCancelled) {
          console.error('Async effect error:', error);
        }
      }
    };

    runAsync();

    return () => {
      isCancelled = true;
    };
  }, dependencies);
};

/**
 * useDebounce Hook
 * Debounce value changes for performance
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useThrottle Hook
 * Throttle function calls for performance
 */
export const useThrottle = (callback, delay = 300) => {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, delay]
  );
};

/**
 * useEventListener Hook
 * Add event listener with automatic cleanup
 */
export const useEventListener = (eventName, handler, element = null) => {
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = element || window;

    if (!targetElement?.addEventListener) {
      return;
    }

    const eventListener = (event) => savedHandler.current(event);

    targetElement.addEventListener(eventName, eventListener);

    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
};

/**
 * usePrevious Hook
 * Get previous value for comparison
 */
export const usePrevious = (value) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

/**
 * useUnmountEffect Hook
 * Run cleanup only on unmount
 */
export const useUnmountEffect = (cleanup) => {
  useEffect(() => {
    return cleanup;
  }, []);
};
