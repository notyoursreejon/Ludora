import crypto from 'crypto';

export interface PlayerSession {
  token: string;
  playerId: string;
  roomCode: string;
  playerName: string;
  avatar: string;
  color: string;
  createdAt: number;
}

export class SessionManager {
  private sessions: Map<string, PlayerSession> = new Map(); // token -> session
  private playerToToken: Map<string, string> = new Map(); // playerId -> token

  createSession(playerId: string, roomCode: string, playerName: string, avatar: string, color: string): string {
    const token = crypto.randomBytes(24).toString('hex');
    const session: PlayerSession = {
      token,
      playerId,
      roomCode,
      playerName,
      avatar,
      color,
      createdAt: Date.now()
    };

    this.sessions.set(token, session);
    this.playerToToken.set(playerId, token);
    return token;
  }

  getSession(token: string): PlayerSession | undefined {
    return this.sessions.get(token);
  }

  getTokenForPlayer(playerId: string): string | undefined {
    return this.playerToToken.get(playerId);
  }

  removeSession(token: string): void {
    const s = this.sessions.get(token);
    if (s) {
      this.playerToToken.delete(s.playerId);
      this.sessions.delete(token);
    }
  }
}

export const sessionManager = new SessionManager();
