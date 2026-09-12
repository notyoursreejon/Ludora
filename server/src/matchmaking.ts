import { WebSocket } from 'ws';
import { GameMode } from '@snakes/shared';

export interface MatchmakingRequest {
  playerId: string;
  playerName: string;
  avatar: string;
  color: string;
  ws: WebSocket;
  mode: GameMode;
  targetPlayers: number; // e.g. 2 or 4
  joinedAt: number;
}

export class MatchmakingQueue {
  private queue: MatchmakingRequest[] = [];

  enqueue(req: MatchmakingRequest): MatchmakingRequest[] | null {
    // Clean up stale or disconnected sockets
    this.queue = this.queue.filter(r => r.ws.readyState === WebSocket.OPEN && r.playerId !== req.playerId);
    this.queue.push(req);

    // Check if match can form
    const compatible = this.queue.filter(r => r.mode === req.mode && r.targetPlayers === req.targetPlayers);

    if (compatible.length >= req.targetPlayers) {
      const matched = compatible.slice(0, req.targetPlayers);
      const matchedIds = new Set(matched.map(m => m.playerId));
      this.queue = this.queue.filter(r => !matchedIds.has(r.playerId));
      return matched;
    }

    return null;
  }

  leave(playerId: string): void {
    this.queue = this.queue.filter(r => r.playerId !== playerId);
  }
}

export const matchmakingQueue = new MatchmakingQueue();
