import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeProvider';
import { getAllGameStats, type GameStats } from '../src/storage/scores';
import { GAMES } from '../src/utils/constants';
import { useResponsive } from '../src/utils/layout';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';

const SCORED_GAMES = ['boggle', 'word-search', 'crossword'];

function getGameInfo(gameId: string) {
  return GAMES.find((g) => g.id === gameId);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function GameStatCard({ stat }: { stat: GameStats }) {
  const { theme } = useTheme();
  const info = getGameInfo(stat.game);
  const displayName = info ? `${info.emoji} ${info.name}` : stat.game;
  const winPct = Math.round(stat.winRate * 100);
  const isScoredGame = SCORED_GAMES.includes(stat.game);

  return (
    <Card style={styles.card}>
      {/* Card header */}
      <Text
        style={[
          styles.cardTitle,
          { color: theme.colors.text, fontFamily: theme.fonts.heading },
        ]}
      >
        {displayName}
      </Text>

      <Text
        style={[
          styles.cardSubtitle,
          { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
        ]}
      >
        {stat.totalGames} {stat.totalGames === 1 ? 'game' : 'games'} played
        {stat.avgDuration > 0 ? `  ·  avg ${formatDuration(stat.avgDuration)}` : ''}
      </Text>

      {/* Win rate bar */}
      <View style={styles.statRow}>
        <Text
          style={[
            styles.statLabel,
            { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
          ]}
        >
          Win Rate
        </Text>
        <Text
          style={[
            styles.statValue,
            { color: theme.colors.text, fontFamily: theme.fonts.heading },
          ]}
        >
          {winPct}%
        </Text>
      </View>
      <View
        style={[
          styles.barTrack,
          {
            backgroundColor: theme.colors.border,
            borderRadius: theme.borderRadius.full,
          },
        ]}
      >
        <View
          style={[
            styles.barFill,
            {
              width: `${winPct}%`,
              backgroundColor:
                winPct >= 60
                  ? theme.colors.success
                  : winPct >= 40
                    ? theme.colors.primary
                    : theme.colors.error,
              borderRadius: theme.borderRadius.full,
            },
          ]}
        />
      </View>

      {/* W / L / D row */}
      <View style={styles.wldRow}>
        <View style={styles.wldItem}>
          <Text
            style={[
              styles.wldValue,
              { color: theme.colors.success, fontFamily: theme.fonts.heading },
            ]}
          >
            {stat.wins}
          </Text>
          <Text
            style={[
              styles.wldLabel,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Wins
          </Text>
        </View>
        <View style={styles.wldItem}>
          <Text
            style={[
              styles.wldValue,
              { color: theme.colors.error, fontFamily: theme.fonts.heading },
            ]}
          >
            {stat.losses}
          </Text>
          <Text
            style={[
              styles.wldLabel,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Losses
          </Text>
        </View>
        <View style={styles.wldItem}>
          <Text
            style={[
              styles.wldValue,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.heading },
            ]}
          >
            {stat.draws}
          </Text>
          <Text
            style={[
              styles.wldLabel,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Draws
          </Text>
        </View>
      </View>

      {/* Best score (only for scored games) */}
      {isScoredGame && stat.bestScore > 0 && (
        <View style={styles.statRow}>
          <Text
            style={[
              styles.statLabel,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Best Score
          </Text>
          <Text
            style={[
              styles.statValue,
              { color: theme.colors.primary, fontFamily: theme.fonts.heading },
            ]}
          >
            {stat.bestScore}
          </Text>
        </View>
      )}

      {/* Streaks */}
      <View style={[styles.streakRow, { borderTopColor: theme.colors.border }]}>
        <View style={styles.streakItem}>
          <Text
            style={[
              styles.streakValue,
              { color: theme.colors.text, fontFamily: theme.fonts.heading },
            ]}
          >
            {stat.currentStreak}
          </Text>
          <Text
            style={[
              styles.streakLabel,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Current Streak
          </Text>
        </View>
        <View
          style={[styles.streakDivider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.streakItem}>
          <Text
            style={[
              styles.streakValue,
              { color: theme.colors.text, fontFamily: theme.fonts.heading },
            ]}
          >
            {stat.bestStreak}
          </Text>
          <Text
            style={[
              styles.streakLabel,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Best Streak
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsive();

  const [stats, setStats] = useState<GameStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllGameStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const singlePlayerStats = stats.filter((s) =>
    ['hangman', 'word-search', 'crossword', 'boggle'].includes(s.game)
  );
  const multiplayerStats = stats.filter(
    (s) => !['hangman', 'word-search', 'crossword', 'boggle'].includes(s.game)
  );

  const handlePurchase = () => {
    console.log('[IAP] Purchase Remove Ads — $2.99');
  };

  const handleRestore = () => {
    console.log('[IAP] Restore Purchases');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          maxWidth: contentMaxWidth,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Button title="← Back" onPress={() => router.back()} variant="ghost" size="sm" />
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontFamily: theme.fonts.heading },
          ]}
        >
          Stats & Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Game Stats section */}
        <Text
          style={[
            styles.sectionHeader,
            { color: theme.colors.text, fontFamily: theme.fonts.heading },
          ]}
        >
          Game Stats
        </Text>

        {loading ? (
          <Card style={styles.emptySection}>
            <ActivityIndicator color={theme.colors.primary} />
          </Card>
        ) : stats.length === 0 ? (
          <Card style={styles.emptySection}>
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
              ]}
            >
              No scores yet. Go play something.
            </Text>
          </Card>
        ) : (
          <>
            {/* Multiplayer games */}
            {multiplayerStats.length > 0 && (
              <>
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
                  ]}
                >
                  Multiplayer
                </Text>
                {multiplayerStats.map((stat) => (
                  <GameStatCard key={stat.game} stat={stat} />
                ))}
              </>
            )}

            {/* Single player games */}
            {singlePlayerStats.length > 0 && (
              <>
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
                  ]}
                >
                  Single Player
                </Text>
                {singlePlayerStats.map((stat) => (
                  <GameStatCard key={stat.game} stat={stat} />
                ))}
              </>
            )}
          </>
        )}

        {/* Remove Ads section */}
        <Card style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, fontFamily: theme.fonts.heading },
            ]}
          >
            Remove Ads
          </Text>
          <Text
            style={[
              styles.bodyText,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Like it ad-free? $2.99, once, forever.
          </Text>
          <View style={styles.purchaseActions}>
            <Button title="Remove Ads — $2.99" onPress={handlePurchase} />
            <Button title="Restore Purchases" onPress={handleRestore} variant="ghost" size="sm" />
          </View>
        </Card>

        {/* About section */}
        <Card style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, fontFamily: theme.fonts.heading },
            ]}
          >
            About
          </Text>
          <Text
            style={[
              styles.appName,
              { color: theme.colors.text, fontFamily: theme.fonts.heading },
            ]}
          >
            Table Games
          </Text>
          <Text
            style={[
              styles.bodyText,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            v1.0.0
          </Text>
          <Text
            style={[
              styles.tagline,
              { color: theme.colors.textMuted, fontFamily: theme.fonts.body },
            ]}
          >
            Your board game drawer, in your pocket.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingTop: 24,
    gap: 16,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: -4,
    marginLeft: 4,
  },
  emptySection: {
    padding: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  // Stat card
  card: {
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    width: '100%',
    marginBottom: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    minWidth: 4,
  },
  wldRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  wldItem: {
    alignItems: 'center',
  },
  wldValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  wldLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  streakRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  // Sections
  section: {
    padding: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 20,
  },
  purchaseActions: { marginTop: 16, gap: 8 },
});
