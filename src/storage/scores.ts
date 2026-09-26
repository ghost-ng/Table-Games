import AsyncStorage from '@react-native-async-storage/async-storage';

const SCORES_KEY = 'game_scores';

export interface GameResult {
  game: string;
  mode: 'single' | 'multiplayer';
  player: string;
  score: number;
  result: 'win' | 'loss' | 'draw';
  durationSeconds: number;
  createdAt?: string;
}

export interface GameStats {
  game: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  bestScore: number;
  avgDuration: number;
  currentStreak: number;
  bestStreak: number;
}

// --- Private helpers ---

async function loadAllResults(): Promise<GameResult[]> {
  try {
    const raw = await AsyncStorage.getItem(SCORES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveAllResults(results: GameResult[]): Promise<void> {
  await AsyncStorage.setItem(SCORES_KEY, JSON.stringify(results));
}

function computeStreaks(results: GameResult[]): { currentStreak: number; bestStreak: number } {
  let bestStreak = 0;
  let streak = 0;

  for (const row of results) {
    if (row.result === 'win') {
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
  }

  return { currentStreak: streak, bestStreak };
}

// --- Public API ---

export async function initDatabase(): Promise<void> {
  // No-op: AsyncStorage doesn't need initialization
}

export async function recordGameResult(result: GameResult): Promise<void> {
  const results = await loadAllResults();
  results.push({
    ...result,
    createdAt: new Date().toISOString(),
  });
  await saveAllResults(results);
}

export async function getGameStats(game: string): Promise<GameStats> {
  const all = await loadAllResults();
  const gameResults = all.filter((r) => r.game === game);

  const wins = gameResults.filter((r) => r.result === 'win').length;
  const losses = gameResults.filter((r) => r.result === 'loss').length;
  const draws = gameResults.filter((r) => r.result === 'draw').length;
  const totalGames = gameResults.length;
  const bestScore = gameResults.length > 0 ? Math.max(...gameResults.map((r) => r.score)) : 0;
  const avgDuration =
    totalGames > 0
      ? gameResults.reduce((sum, r) => sum + r.durationSeconds, 0) / totalGames
      : 0;
  const { currentStreak, bestStreak } = computeStreaks(gameResults);

  return {
    game,
    totalGames,
    wins,
    losses,
    draws,
    winRate: totalGames > 0 ? wins / totalGames : 0,
    bestScore,
    avgDuration,
    currentStreak,
    bestStreak,
  };
}

export async function getAllGameStats(): Promise<GameStats[]> {
  const all = await loadAllResults();
  const gameNames = [...new Set(all.map((r) => r.game))].sort();
  return Promise.all(gameNames.map((game) => getGameStats(game)));
}

export async function getRecentGames(limit: number): Promise<GameResult[]> {
  const all = await loadAllResults();
  return all.slice(-limit).reverse();
}
