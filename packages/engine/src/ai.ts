import { AIPersonality, GameStateDTO, PlayerDTO } from '@snakes/shared';

export interface AIDecisionContext {
  state: GameStateDTO;
  aiPlayer: PlayerDTO;
}

export interface AIDecision {
  action: 'ROLL';
  thinkingDelayMs: number;
  reasoning: string;
}

/**
 * Calculates simulated utility for a tile position.
 */
export function evaluateTileValue(position: number, state: GameStateDTO): number {
  const board = state.board;
  let score = position;

  // Check if tile is a ladder base
  const ladder = board.ladders.find(l => l.from === position);
  if (ladder) score = ladder.to + 10;

  // Check if tile is a snake head
  const snake = board.snakes.find(s => s.from === position);
  if (snake) score = snake.to - 10;

  return score;
}

/**
 * AI Engine to determine actions and simulate natural cognitive delays.
 */
export function decideAIAction(ctx: AIDecisionContext): AIDecision {
  const personality = ctx.aiPlayer.aiPersonality || 'casual';
  const state = ctx.state;
  const currentPos = ctx.aiPlayer.position;
  const distanceToFinish = state.board.totalTiles - currentPos;

  let delayMs = 600;
  let reasoning = 'Rolling standard die';

  switch (personality) {
    case 'casual': {
      delayMs = 400 + Math.floor(Math.random() * 400); // 400-800ms
      reasoning = 'Relaxed casual roll';
      break;
    }

    case 'aggressive': {
      delayMs = 300 + Math.floor(Math.random() * 300); // 300-600ms fast
      reasoning = 'Aggressive charge forward';
      break;
    }

    case 'strategist': {
      delayMs = 700 + Math.floor(Math.random() * 400); // 700-1100ms
      // Analyze upcoming snakes in 1-6 range
      const snakesAhead = state.board.snakes.filter(s => s.from > currentPos && s.from <= currentPos + 6);
      if (snakesAhead.length > 0) {
        reasoning = `Carefully navigating danger zone near snake at ${snakesAhead[0].from}`;
      } else {
        reasoning = `Aiming for safe ascent toward ${currentPos + 6}`;
      }
      break;
    }

    case 'lucky': {
      delayMs = 350 + Math.floor(Math.random() * 500);
      reasoning = 'Trusting in the dice spirits!';
      break;
    }

    case 'master': {
      delayMs = 800 + Math.floor(Math.random() * 400); // 800-1200ms deep contemplation
      if (distanceToFinish <= 6) {
        reasoning = `Calculating exact victory roll (${distanceToFinish}) probability: ${(1/6 * 100).toFixed(1)}%`;
      } else {
        reasoning = `Maximizing expected board position (current ${currentPos} / ${state.board.totalTiles})`;
      }
      break;
    }
  }

  return {
    action: 'ROLL',
    thinkingDelayMs: delayMs,
    reasoning
  };
}
