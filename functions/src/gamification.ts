/**
 * Copia server-side di src/lib/gamification.ts (le Functions hanno un build separato).
 * ⚠️ Tenere allineate: scripts/test-gamification.ts verifica che coincidano.
 */

export const POINTS = { FREED: 10, HANDOVER: 15, INVITE: 25, BOOKED: 2 } as const;
export const INVITEE_BONUS = 10;

export interface UserStats {
  parkingsFreed?: number;
  bookingsMade?: number;
  handovers?: number;
  invites?: number;
}

const BADGE_RULES: Array<[string, (s: Required<UserStats>, best: number) => boolean]> = [
  ['first_free', s => s.parkingsFreed >= 1],
  ['handover', s => s.handovers >= 1],
  ['streak_3', (_s, b) => b >= 3],
  ['freed_10', s => s.parkingsFreed >= 10],
  ['inviter', s => s.invites >= 1],
  ['inviter_5', s => s.invites >= 5],
  ['streak_7', (_s, b) => b >= 7],
  ['freed_50', s => s.parkingsFreed >= 50],
];

export const LEVEL_THRESHOLDS = [0, 30, 100, 250, 600];

export function normalizeStats(s?: UserStats | null): Required<UserStats> {
  return {
    parkingsFreed: s?.parkingsFreed ?? 0,
    bookingsMade: s?.bookingsMade ?? 0,
    handovers: s?.handovers ?? 0,
    invites: s?.invites ?? 0,
  };
}

export function computePoints(s?: UserStats | null): number {
  const n = normalizeStats(s);
  return n.parkingsFreed * POINTS.FREED + n.handovers * POINTS.HANDOVER + n.invites * POINTS.INVITE + n.bookingsMade * POINTS.BOOKED;
}

export function unlockedBadges(s?: UserStats | null, bestStreak = 0): string[] {
  const n = normalizeStats(s);
  return BADGE_RULES.filter(([, test]) => test(n, bestStreak)).map(([id]) => id);
}

export function levelFor(points: number): number {
  let level = 1;
  LEVEL_THRESHOLDS.forEach((min, i) => { if (points >= min) level = i + 1; });
  return level;
}
