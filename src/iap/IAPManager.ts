import AsyncStorage from '@react-native-async-storage/async-storage';

const IAP_AD_FREE_KEY = 'iap_ad_free_purchased';

/**
 * Mock IAP manager that persists purchase state in AsyncStorage.
 *
 * Replace the mock purchase/restore flows with real RevenueCat (or
 * expo-in-app-purchases) calls when you move to a native build.
 */
export class IAPManager {
  private static initialized = false;

  /**
   * Initialize the IAP SDK (mock).
   * Call once at app startup.
   */
  static async initialize(): Promise<void> {
    if (IAPManager.initialized) return;
    IAPManager.initialized = true;
    console.log('[IAPManager] Initialized (mock)');
  }

  /**
   * Check whether the ad-free IAP has been purchased.
   */
  static async checkAdFreePurchased(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(IAP_AD_FREE_KEY);
      return value === 'true';
    } catch (err) {
      console.warn('[IAPManager] Failed to check purchase status:', err);
      return false;
    }
  }

  /**
   * Simulate purchasing the ad-free upgrade.
   * In production this would open the native purchase flow.
   */
  static async purchaseAdFree(): Promise<boolean> {
    try {
      console.log('[IAPManager] Starting ad-free purchase (mock)...');

      // Simulate a short network round-trip
      await new Promise((resolve) => setTimeout(resolve, 800));

      await AsyncStorage.setItem(IAP_AD_FREE_KEY, 'true');
      console.log('[IAPManager] Ad-free purchase successful (mock)');
      return true;
    } catch (err) {
      console.warn('[IAPManager] Purchase failed:', err);
      return false;
    }
  }

  /**
   * Simulate restoring previous purchases.
   * Returns `true` if the ad-free entitlement was found.
   */
  static async restorePurchases(): Promise<boolean> {
    try {
      console.log('[IAPManager] Restoring purchases (mock)...');

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      const purchased = await IAPManager.checkAdFreePurchased();
      console.log(
        `[IAPManager] Restore complete (mock) — ad-free: ${purchased}`
      );
      return purchased;
    } catch (err) {
      console.warn('[IAPManager] Restore failed:', err);
      return false;
    }
  }

  /**
   * Clear the mock purchase (useful for testing).
   */
  static async clearPurchase(): Promise<void> {
    try {
      await AsyncStorage.removeItem(IAP_AD_FREE_KEY);
      console.log('[IAPManager] Purchase cleared (mock)');
    } catch (err) {
      console.warn('[IAPManager] Failed to clear purchase:', err);
    }
  }
}
