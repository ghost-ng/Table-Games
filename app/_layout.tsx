import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { initDatabase } from '../src/storage/scores';
import { setWebThemeColor } from '../src/pwa/usePwa';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'arcade';

  useEffect(() => {
    setWebThemeColor(theme.colors.background);
  }, [theme.colors.background]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Fredoka: require('../assets/fonts/Fredoka-Regular.ttf'),
    'Fredoka-Medium': require('../assets/fonts/Fredoka-Medium.ttf'),
    'Fredoka-SemiBold': require('../assets/fonts/Fredoka-SemiBold.ttf'),
    PatrickHand: require('../assets/fonts/PatrickHand-Regular.ttf'),
    PressStart2P: require('../assets/fonts/PressStart2P-Regular.ttf'),
    SpaceGrotesk: require('../assets/fonts/SpaceGrotesk-Regular.ttf'),
    'SpaceGrotesk-Medium': require('../assets/fonts/SpaceGrotesk-Medium.ttf'),
    'SpaceGrotesk-Bold': require('../assets/fonts/SpaceGrotesk-Bold.ttf'),
    Inter: require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  });

  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
