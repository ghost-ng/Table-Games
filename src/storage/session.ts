import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'session_data';
const AD_FREE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function startSession(): Promise<void> {
  const data = JSON.stringify({ startedAt: Date.now() });
  await AsyncStorage.setItem(SESSION_KEY, data);
}

export async function getAdFreeTimeRemaining(): Promise<number> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return 0;
  }
  try {
    const { startedAt } = JSON.parse(raw) as { startedAt: number };
    const elapsed = Date.now() - startedAt;
    const remaining = AD_FREE_DURATION_MS - elapsed;
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

export async function isAdFreeWindowActive(): Promise<boolean> {
  const remaining = await getAdFreeTimeRemaining();
  return remaining > 0;
}
