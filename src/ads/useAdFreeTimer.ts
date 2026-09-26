import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AD_FREE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_KEY = 'ad_free_session_start';

export interface AdFreeTimerState {
  isAdFree: boolean;
  remainingMs: number;
  resetTimer: () => void;
}

export function useAdFreeTimer(): AdFreeTimerState {
  const [remainingMs, setRemainingMs] = useState<number>(AD_FREE_DURATION_MS);
  const sessionStartRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);

  const recalculate = useCallback(() => {
    if (sessionStartRef.current === null) return;

    const elapsed =
      elapsedBeforePauseRef.current +
      (pausedAtRef.current === null ? Date.now() - sessionStartRef.current : 0);

    const remaining = Math.max(0, AD_FREE_DURATION_MS - elapsed);
    setRemainingMs(remaining);

    if (remaining <= 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(recalculate, 1000);
  }, [recalculate]);

  const initSession = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SESSION_KEY);

      if (stored) {
        const startTime = parseInt(stored, 10);
        const elapsed = Date.now() - startTime;

        if (elapsed < AD_FREE_DURATION_MS) {
          // Resume existing session
          sessionStartRef.current = Date.now();
          elapsedBeforePauseRef.current = elapsed;
          pausedAtRef.current = null;
          setRemainingMs(AD_FREE_DURATION_MS - elapsed);
          startInterval();
          return;
        }
      }

      // No valid session -- start fresh
      const now = Date.now();
      sessionStartRef.current = now;
      elapsedBeforePauseRef.current = 0;
      pausedAtRef.current = null;
      await AsyncStorage.setItem(SESSION_KEY, now.toString());
      setRemainingMs(AD_FREE_DURATION_MS);
      startInterval();
    } catch (err) {
      console.warn('[useAdFreeTimer] Failed to init session:', err);
      // Fallback: start a new session in memory only
      sessionStartRef.current = Date.now();
      elapsedBeforePauseRef.current = 0;
      pausedAtRef.current = null;
      setRemainingMs(AD_FREE_DURATION_MS);
      startInterval();
    }
  }, [startInterval]);

  const resetTimer = useCallback(async () => {
    const now = Date.now();
    sessionStartRef.current = now;
    elapsedBeforePauseRef.current = 0;
    pausedAtRef.current = null;
    setRemainingMs(AD_FREE_DURATION_MS);
    try {
      await AsyncStorage.setItem(SESSION_KEY, now.toString());
    } catch (err) {
      console.warn('[useAdFreeTimer] Failed to save reset:', err);
    }
    startInterval();
  }, [startInterval]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Pause: record how much time elapsed so far
        if (sessionStartRef.current !== null && pausedAtRef.current === null) {
          elapsedBeforePauseRef.current += Date.now() - sessionStartRef.current;
          pausedAtRef.current = Date.now();
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } else if (nextState === 'active') {
        // Resume: reset the session start to now, keeping accumulated elapsed
        if (pausedAtRef.current !== null) {
          sessionStartRef.current = Date.now();
          pausedAtRef.current = null;
          recalculate();
          startInterval();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [recalculate, startInterval]);

  // Initialize on mount
  useEffect(() => {
    initSession();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [initSession]);

  return {
    isAdFree: remainingMs > 0,
    remainingMs,
    resetTimer,
  };
}
