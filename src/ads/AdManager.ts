const INTERSTITIAL_FREQUENCY = 3; // show every 3rd completed game

/**
 * Mock ad manager that simulates AdMob behavior.
 *
 * All ad loading/showing is logged to the console. When you move to a native
 * build with react-native-google-mobile-ads, replace the mock methods with
 * real AdMob calls while keeping the same public API.
 */
export class AdManager {
  private static gamesCompleted = 0;
  private static initialized = false;

  /**
   * Initialize the ad SDK (mock).
   * Call once at app startup.
   */
  static initialize(): void {
    if (AdManager.initialized) return;
    AdManager.initialized = true;
    console.log('[AdManager] Initialized (mock)');
  }

  /**
   * Call after every completed game.
   * Returns `true` when an interstitial should be shown (every Nth game).
   */
  static incrementGamesCompleted(): boolean {
    AdManager.gamesCompleted += 1;
    console.log(
      `[AdManager] Games completed: ${AdManager.gamesCompleted}`
    );
    return AdManager.shouldShowInterstitial();
  }

  /**
   * Reset the completed-games counter (e.g. after a purchase or session reset).
   */
  static resetCounter(): void {
    AdManager.gamesCompleted = 0;
    console.log('[AdManager] Counter reset');
  }

  /**
   * Returns `true` if the current count is a multiple of the interstitial
   * frequency, meaning an interstitial should be displayed.
   */
  static shouldShowInterstitial(): boolean {
    return (
      AdManager.gamesCompleted > 0 &&
      AdManager.gamesCompleted % INTERSTITIAL_FREQUENCY === 0
    );
  }

  /**
   * Simulate loading and showing an interstitial ad.
   * Returns a promise that resolves when the "ad" is dismissed.
   */
  static async showInterstitial(): Promise<void> {
    console.log('[AdManager] Loading interstitial ad (mock)...');

    // Simulate network delay for loading
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('[AdManager] Interstitial ad loaded (mock)');
    console.log('[AdManager] Showing interstitial ad (mock)');

    // Simulate the user watching / dismissing the ad
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('[AdManager] Interstitial ad dismissed (mock)');
  }

  /**
   * Get the current games-completed count (useful for debugging).
   */
  static getGamesCompleted(): number {
    return AdManager.gamesCompleted;
  }
}
