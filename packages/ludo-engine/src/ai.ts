import {
  LudoGameState,
  LudoLegalMove,
  LudoAIPersonality,
  LudoAIDifficulty,
  LudoPlayer
} from '@snakes/shared';
import { LudoRuleEngine } from './rules.js';

export class LudoAIEngine {
  constructor(private ruleEngine: LudoRuleEngine) {}

  /**
   * Evaluates legal moves and selects the best move for the AI player.
   */
  public selectMove(
    state: LudoGameState,
    player: LudoPlayer,
    legalMoves: LudoLegalMove[]
  ): LudoLegalMove | null {
    if (legalMoves.length === 0) return null;
    if (legalMoves.length === 1) return legalMoves[0];

    const difficulty = player.aiDifficulty || 'normal';
    const personality = player.aiPersonality || 'strategist';

    // Easy AI or Chaos personality: uniform random choice
    if (difficulty === 'easy' || personality === 'chaos') {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      return legalMoves[randomIndex];
    }

    // Score each legal move
    let bestScore = -Infinity;
    let bestMove = legalMoves[0];

    for (const move of legalMoves) {
      const score = this.evaluateMove(state, player, move, difficulty, personality);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Scores a move based on heuristics, difficulty, and personality weights.
   */
  private evaluateMove(
    state: LudoGameState,
    player: LudoPlayer,
    move: LudoLegalMove,
    difficulty: LudoAIDifficulty,
    personality: LudoAIPersonality
  ): number {
    let score = 0;

    // Weight coefficients adjusted by personality
    let captureWeight = 100;
    let finishWeight = 150;
    let leaveYardWeight = 80;
    let homePathWeight = 60;
    let progressWeight = 1.0;
    let safeSquareWeight = 40;
    let threatRiskPenalty = -50;

    switch (personality) {
      case 'aggressor':
        captureWeight = 250;
        threatRiskPenalty = -20; // more reckless
        break;
      case 'defender':
        safeSquareWeight = 120;
        threatRiskPenalty = -120; // highly risk averse
        captureWeight = 60;
        break;
      case 'runner':
        progressWeight = 3.0; // loves pushing the leading token
        finishWeight = 220;
        break;
      case 'strategist':
        captureWeight = 120;
        safeSquareWeight = 70;
        threatRiskPenalty = -70;
        break;
      case 'master':
        captureWeight = 160;
        finishWeight = 180;
        leaveYardWeight = 90;
        safeSquareWeight = 80;
        threatRiskPenalty = -90;
        progressWeight = 1.5;
        break;
    }

    // 1. Finishing a token
    if (move.actionType === 'FINISH_TOKEN') {
      score += finishWeight;
    }

    // 2. Capturing opponent tokens
    if (move.wouldCapture.length > 0) {
      score += captureWeight * move.wouldCapture.length;
    }

    // 3. Leaving the yard
    if (move.actionType === 'LEAVE_YARD') {
      score += leaveYardWeight;
      // Bonus if yard is full
      const tokensInYard = player.tokens.filter(t => t.state === 'YARD').length;
      score += tokensInYard * 15;
    }

    // 4. Entering or progressing in home path (immune to capture)
    if (move.actionType === 'ENTER_HOME_PATH' || move.actionType === 'ADVANCE_HOME_PATH') {
      score += homePathWeight;
    }

    // 5. Landing on a safe star / start square
    if (move.isSafe) {
      score += safeSquareWeight;
    }

    // 6. Forward progress
    score += (move.newStepCount - (move.fromPosition === -1 ? 0 : move.fromPosition)) * progressWeight;

    // 7. Threat analysis (for Hard and Expert AI)
    if (difficulty === 'hard' || difficulty === 'expert') {
      if (move.toState === 'TRACK' && !move.isSafe) {
        const isThreatened = this.isCellThreatened(state, player.id, move.toPosition);
        if (isThreatened) {
          score += threatRiskPenalty;
        }
      }

      // Escaping from existing threat
      if (move.fromState === 'TRACK') {
        const wasThreatened = this.isCellThreatened(state, player.id, move.fromPosition);
        if (wasThreatened) {
          score += 45; // escaping reward
        }
      }
    }

    // Add tiny deterministic tie-breaker based on token ID
    score += (move.tokenId.charCodeAt(move.tokenId.length - 1) % 5) * 0.1;

    return score;
  }

  /**
   * Helper: Check if an opponent token could potentially land on target trackIndex on their next roll (within 1..6 squares).
   */
  private isCellThreatened(state: LudoGameState, myPlayerId: string, trackIndex: number): boolean {
    const totalTrack = this.ruleEngine.layout.totalTrackCells;
    for (const opponent of state.players) {
      if (opponent.id === myPlayerId || opponent.rank != null) continue;
      for (const token of opponent.tokens) {
        if (token.state === 'TRACK') {
          // Distance behind targetIndex
          const dist = (trackIndex - token.position + totalTrack) % totalTrack;
          if (dist >= 1 && dist <= 6) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
