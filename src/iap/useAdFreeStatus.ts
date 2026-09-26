import { useState, useEffect, useCallback } from 'react';
import { useAdFreeTimer } from '../ads/useAdFreeTimer';
import { IAPManager } from './IAPManager';

export interface AdFreeStatus {
  /** True when the user should NOT see ads (timer active OR purchased). */
  isAdFree: boolean;
  /** True when the user has purchased the permanent ad-free upgrade. */
  isPurchased: boolean;
  /** Milliseconds remaining in the free ad-free window. */
  remainingMs: number;
  /** Trigger the ad-free purchase flow. Returns true on success. */
  purchase: () => Promise<boolean>;
  /** Restore a previous purchase. Returns true if entitlement found. */
  restore: () => Promise<boolean>;
}

export function useAdFreeStatus(): AdFreeStatus {
  const { isAdFree: isTimerAdFree, remainingMs, resetTimer } = useAdFreeTimer();
  const [isPurchased, setIsPurchased] = useState<boolean>(false);

  // Check purchase status on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await IAPManager.initialize();
      const purchased = await IAPManager.checkAdFreePurchased();
      if (!cancelled) {
        setIsPurchased(purchased);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const purchase = useCallback(async (): Promise<boolean> => {
    const success = await IAPManager.purchaseAdFree();
    if (success) {
      setIsPurchased(true);
    }
    return success;
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    const found = await IAPManager.restorePurchases();
    if (found) {
      setIsPurchased(true);
    }
    return found;
  }, []);

  return {
    isAdFree: isPurchased || isTimerAdFree,
    isPurchased,
    remainingMs,
    purchase,
    restore,
  };
}
