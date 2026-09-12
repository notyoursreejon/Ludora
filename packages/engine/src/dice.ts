export interface DiceRng {
  next(): number; // Returns float [0, 1)
}

/**
 * Standard crypto-secure RNG for production server-authoritative rolls.
 */
export class CryptoRng implements DiceRng {
  next(): number {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0] / (0xffffffff + 1);
    }
    return Math.random();
  }
}

/**
 * Simple pseudo-random generator with seed for deterministic replays & test assertions.
 */
export class SeededRng implements DiceRng {
  private s: number;

  constructor(seed = 123456789) {
    this.s = seed;
  }

  next(): number {
    // Lehmer LCG algorithm
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
}

export function rollDice(count = 1, rng: DiceRng = new CryptoRng()): { rolls: number[]; total: number } {
  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const val = Math.floor(rng.next() * 6) + 1;
    rolls.push(val);
    total += val;
  }
  return { rolls, total };
}
