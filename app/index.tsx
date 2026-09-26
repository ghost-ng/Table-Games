import { useState } from 'react';
import { View, FlatList, StyleSheet, Text, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeProvider';
import { GAMES, GAME_THUMBNAILS, TOOLS } from '../src/utils/constants';
import { GameCard } from '../src/components/ui/GameCard';
import { Button } from '../src/components/ui/Button';
import { ModeSelector } from '../src/components/ui/ModeSelector';
import { ThemePicker } from '../src/components/ui/ThemePicker';
import { PwaBanner } from '../src/components/ui/PwaBanner';
import { useResponsive } from '../src/utils/layout';

const GRID_PADDING = 16;
const CARD_GAP = 16;

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet, isDesktop, contentMaxWidth, contentWidth } = useResponsive();
  const numColumns = isDesktop ? 4 : isTablet ? 3 : 2;
  const cardWidth = (contentWidth - GRID_PADDING * 2 - CARD_GAP * (numColumns - 1)) / numColumns;
  const toolWidth = cardWidth;
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const selectedGameData = GAMES.find((g) => g.id === selectedGame);

  const handleModeSelect = (mode: 'single' | 'multiplayer') => {
    if (selectedGame) {
      router.push('/games/' + selectedGame + '?mode=' + mode);
      setSelectedGame(null);
    }
  };

  return (
    <ImageBackground imageStyle={styles.backgroundImage} source={theme.backgroundImage} style={[styles.container, { backgroundColor: theme.colors.background }]} resizeMode="cover">
      <View style={[styles.content, { maxWidth: contentMaxWidth, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.heading }]}>Table Games</Text>
          <View style={styles.headerActions}>
            <Button title="Stats" onPress={() => router.push('/settings')} variant="ghost" size="sm" />
            <Button title="Theme" onPress={() => setThemePickerVisible(true)} variant="secondary" size="sm" />
          </View>
        </View>
        <FlatList
          data={GAMES}
          renderItem={({ item }) => <GameCard game={item} image={GAME_THUMBNAILS[item.id]} width={cardWidth} onPress={() => setSelectedGame(item.id)} />}
          keyExtractor={(item) => item.id}
          key={'grid-' + numColumns}
          numColumns={numColumns}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.fonts.heading }]}>Games</Text>}
          ListFooterComponent={
            <View style={[styles.toolsSection, { borderTopColor: theme.colors.border }]}>
              <Text accessibilityRole="header" style={[styles.toolsTitle, { color: theme.colors.textMuted, fontFamily: theme.fonts.heading }]}>Tools</Text>
              <View style={[styles.row, styles.toolsRow]}>
                {TOOLS.map((tool) => <GameCard key={tool.id} game={tool} image={GAME_THUMBNAILS[tool.id]} variant="tool" width={toolWidth} onPress={() => router.push('/games/' + tool.id)} />)}
              </View>
            </View>
          }
        />
        <PwaBanner />
      </View>
      <ModeSelector visible={selectedGame !== null} gameName={selectedGameData?.name ?? ''} onSelect={handleModeSelect} onClose={() => setSelectedGame(null)} />
      <ThemePicker visible={themePickerVisible} onClose={() => setThemePickerVisible(false)} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  backgroundImage: { width: '100%', height: '100%' },
  content: { flex: 1, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: GRID_PADDING, gap: 8, borderBottomWidth: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', flexShrink: 1 },
  grid: { padding: GRID_PADDING, paddingTop: 24, paddingBottom: 24 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  toolsRow: { flexDirection: 'row' },
  toolsSection: { marginTop: 8, paddingTop: 24, borderTopWidth: 1 },
  toolsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
});
