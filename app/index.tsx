import { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  Image,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeProvider';
import { GAMES, GAME_THUMBNAILS, TOOLS } from '../src/utils/constants';
import { ModeSelector } from '../src/components/ui/ModeSelector';
import { ThemePicker } from '../src/components/ui/ThemePicker';
import { PwaBanner } from '../src/components/ui/PwaBanner';
import { useResponsive } from '../src/utils/layout';

const GRID_PADDING = 16;
const CARD_GAP = 12;

export default function HomeScreen() {
  const { theme, themeName } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet, contentMaxWidth, contentWidth } = useResponsive();
  // 12 games → 3 columns on phones, 4 on tablets/desktop; both fill whole rows.
  const numColumns = isTablet ? 4 : 3;
  const cardWidth =
    (contentWidth - GRID_PADDING * 2 - CARD_GAP * (numColumns - 1)) / numColumns;
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [themePickerVisible, setThemePickerVisible] = useState(false);

  const selectedGameData = GAMES.find((g) => g.id === selectedGame);

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
  };

  const handleModeSelect = (mode: 'single' | 'multiplayer') => {
    if (selectedGame) {
      router.push(`/games/${selectedGame}?mode=${mode}`);
      setSelectedGame(null);
    }
  };

  const renderGameCard = ({ item }: { item: (typeof GAMES)[number] }) => (
    <Pressable
      onPress={() => handleGameSelect(item.id)}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.lg,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Image
        source={GAME_THUMBNAILS[item.id]}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={[styles.cardLabel, { backgroundColor: theme.colors.surface + 'DD' }]}>
        <Text
          style={[
            styles.cardName,
            {
              color: theme.colors.text,
              fontFamily: theme.fonts.body,
              fontSize: isTablet ? 14 : 11,
            },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <ImageBackground
      source={theme.backgroundImage}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          maxWidth: contentMaxWidth,
        },
      ]}
      resizeMode="cover"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/settings')}
          style={[styles.headerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Text style={[styles.headerIcon, { color: theme.colors.text }]}>
            📊
          </Text>
        </Pressable>

        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              fontFamily: theme.fonts.heading,
            },
          ]}
        >
          Table Games
        </Text>

        <Pressable
          onPress={() => setThemePickerVisible(true)}
          style={[styles.headerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Text style={[styles.headerIcon, { color: theme.colors.text }]}>
            🎨
          </Text>
        </Pressable>
      </View>

      {/* Game Grid (tools follow as a footer section) */}
      <FlatList
        data={GAMES}
        renderItem={renderGameCard}
        keyExtractor={(item) => item.id}
        // FlatList can't change numColumns in place; remount when it changes.
        key={`grid-${numColumns}`}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.toolsSection}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text, fontFamily: theme.fonts.heading },
              ]}
            >
              Tools
            </Text>
            <View style={styles.row}>
              {TOOLS.map((tool) => (
                <Pressable
                  key={tool.id}
                  onPress={() => router.push(`/games/${tool.id}`)}
                  style={({ pressed }) => [
                    styles.toolCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.lg,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Image source={GAME_THUMBNAILS[tool.id]} style={styles.toolImage} resizeMode="cover" />
                  <Text
                    style={[
                      styles.toolName,
                      { color: theme.colors.text, fontFamily: theme.fonts.body, fontSize: isTablet ? 16 : 14 },
                    ]}
                  >
                    {tool.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />

      <PwaBanner />

      {/* Mode Selector */}
      <ModeSelector
        visible={selectedGame !== null}
        gameName={selectedGameData?.name ?? ''}
        onSelect={handleModeSelect}
        onClose={() => setSelectedGame(null)}
      />

      {/* Theme Picker */}
      <ThemePicker
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    alignSelf: 'center' as const,
    width: '100%' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  grid: {
    padding: GRID_PADDING,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardLabel: {
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  toolsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  toolCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    height: 64,
  },
  toolImage: {
    width: 64,
    height: 64,
  },
  toolName: {
    flex: 1,
    paddingHorizontal: 12,
    fontWeight: '600',
  },
  cardName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
