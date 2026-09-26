import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  theme: 'retro' | 'arcade' | 'modern';
  adFreeUnlocked: boolean;
  soundEnabled: boolean;
}

const SETTINGS_KEY = 'app_settings';
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'modern',
  adFreeUnlocked: false,
  soundEnabled: true,
};

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  const updated: AppSettings = { ...current, ...partial };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
}
