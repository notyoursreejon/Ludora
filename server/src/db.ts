import { GameEvent, GameStateDTO, PlayerStats } from '@snakes/shared';

export interface StoredMatch {
  id: string;
  roomCode: string;
  startedAt: number;
  endedAt?: number;
  winnerId?: string;
  durationSec?: number;
  totalTurns: number;
  finalState: GameStateDTO;
  events: GameEvent[];
}

export interface UserStatsRecord {
  name: string;
  gamesPlayed: number;
  gamesWon: number;
  snakesHit: number;
  laddersClimbed: number;
  bestStreak: number;
  currentStreak: number;
}

/**
 * Clean data store for match history, replays, and leaderboards.
 * Designed to seamlessly synchronize to PostgreSQL/Prisma when DATABASE_URL is configured.
 */
export class GameDatabase {
  private matches: Map<string, StoredMatch> = new Map();
  private userStats: Map<string, UserStatsRecord> = new Map();

  recordMatch(match: StoredMatch): void {
    this.matches.set(match.id, match);

    // Update aggregate stats for players
    for (const player of match.finalState.players) {
      if (player.isSpectator || player.isAI) continue;

      const current = this.userStats.get(player.name) || {
        name: player.name,
        gamesPlayed: 0,
        gamesWon: 0,
        snakesHit: 0,
        laddersClimbed: 0,
        bestStreak: 0,
        currentStreak: 0
      };

      current.gamesPlayed += 1;
      current.snakesHit += player.stats.snakesHit;
      current.laddersClimbed += player.stats.laddersClimbed;

      if (match.winnerId === player.id) {
        current.gamesWon += 1;
        current.currentStreak += 1;
        if (current.currentStreak > current.bestStreak) {
          current.bestStreak = current.currentStreak;
        }
      } else {
        current.currentStreak = 0;
      }

      this.userStats.set(player.name, current);
    }
  }

  getMatch(id: string): StoredMatch | undefined {
    return this.matches.get(id);
  }

  getLeaderboard(limit = 10): UserStatsRecord[] {
    return Array.from(this.userStats.values())
      .sort((a, b) => b.gamesWon - a.gamesWon || b.gamesPlayed - a.gamesPlayed)
      .slice(0, limit);
  }
}

export const db = new GameDatabase();
