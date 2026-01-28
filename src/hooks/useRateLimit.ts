import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRateLimitOptions {
  /** Minimum time between actions in milliseconds */
  minInterval?: number;
  /** Maximum number of actions in the time window */
  maxActions?: number;
  /** Time window for maxActions in milliseconds */
  windowMs?: number;
}

interface UseRateLimitReturn {
  /** Whether an action can be performed now */
  canPerform: boolean;
  /** Execute an action with rate limiting */
  performAction: <T>(action: () => Promise<T>) => Promise<T | null>;
  /** Time until next action is allowed (ms), 0 if allowed now */
  timeUntilAllowed: number;
  /** Reset the rate limiter */
  reset: () => void;
}

/**
 * Hook to rate limit user actions (e.g., button clicks)
 * Prevents spam by enforcing minimum intervals between actions
 */
export function useRateLimit(options: UseRateLimitOptions = {}): UseRateLimitReturn {
  const {
    minInterval = 1000, // 1 second between actions
    maxActions = 5,     // Max 5 actions
    windowMs = 60000,   // Per minute
  } = options;

  const [canPerform, setCanPerform] = useState(true);
  const [timeUntilAllowed, setTimeUntilAllowed] = useState(0);
  
  const lastActionTime = useRef<number>(0);
  const actionTimestamps = useRef<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const updateCanPerform = useCallback(() => {
    const now = Date.now();
    
    // Check minimum interval
    const timeSinceLastAction = now - lastActionTime.current;
    if (timeSinceLastAction < minInterval) {
      setCanPerform(false);
      setTimeUntilAllowed(minInterval - timeSinceLastAction);
      return false;
    }
    
    // Check rate limit window
    const windowStart = now - windowMs;
    const recentActions = actionTimestamps.current.filter(t => t > windowStart);
    
    if (recentActions.length >= maxActions) {
      const oldestInWindow = Math.min(...recentActions);
      const timeUntilExpiry = oldestInWindow + windowMs - now;
      setCanPerform(false);
      setTimeUntilAllowed(Math.max(timeUntilExpiry, 0));
      return false;
    }
    
    setCanPerform(true);
    setTimeUntilAllowed(0);
    return true;
  }, [minInterval, maxActions, windowMs]);

  const performAction = useCallback(async <T>(action: () => Promise<T>): Promise<T | null> => {
    if (!updateCanPerform()) {
      return null;
    }
    
    const now = Date.now();
    lastActionTime.current = now;
    actionTimestamps.current.push(now);
    
    // Clean old timestamps
    const windowStart = now - windowMs;
    actionTimestamps.current = actionTimestamps.current.filter(t => t > windowStart);
    
    setCanPerform(false);
    
    // Schedule re-enable
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      updateCanPerform();
    }, minInterval);
    
    try {
      return await action();
    } finally {
      // Update state after action completes
      updateCanPerform();
    }
  }, [updateCanPerform, minInterval, windowMs]);

  const reset = useCallback(() => {
    lastActionTime.current = 0;
    actionTimestamps.current = [];
    setCanPerform(true);
    setTimeUntilAllowed(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return {
    canPerform,
    performAction,
    timeUntilAllowed,
    reset,
  };
}

/**
 * Simpler hook for just debouncing a single action
 */
export function useDebounce(delayMs: number = 500) {
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const debounce = useCallback(<T>(action: () => Promise<T>): Promise<T | null> => {
    if (isDebouncing) {
      return Promise.resolve(null);
    }
    
    setIsDebouncing(true);
    
    return action().finally(() => {
      timerRef.current = setTimeout(() => {
        setIsDebouncing(false);
      }, delayMs);
    });
  }, [isDebouncing, delayMs]);

  return { isDebouncing, debounce };
}
