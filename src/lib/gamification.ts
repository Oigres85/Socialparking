/**
 * @fileOverview Gamification: punti, livelli, badge e impatto.
 * Funzioni pure condivise (stessa logica usata dalle Cloud Functions per assegnare i punti).
 */

export const POINTS = {
  FREED: 10,
  HANDOVER: 15, // bonus quando qualcuno prenota il posto che hai liberato
  INVITE: 25,
  BOOKED: 2,
} as const;

/** Stima prudente dei minuti risparmiati da chi trova un posto grazie a una segnalazione. */
export const MINUTES_SAVED_PER_SPOT = 8;
/** Stima prudente dei kg di CO₂ evitati (≈ 3 km di giri a vuoto in città). */
export const CO2_KG_PER_SPOT = 0.4;

export interface Level {
  level: number;
  minPoints: number;
  it: string;
  en: string;
  emoji: string;
}

export const LEVELS: Level[] = [
  { level: 1, minPoints: 0, it: 'Pedone', en: 'Pedestrian', emoji: '🚶' },
  { level: 2, minPoints: 30, it: 'Neopatentato', en: 'New Driver', emoji: '🚗' },
  { level: 3, minPoints: 100, it: 'Buon Samaritano', en: 'Good Samaritan', emoji: '😇' },
  { level: 4, minPoints: 250, it: 'Re del Parcheggio', en: 'Parking King', emoji: '👑' },
  { level: 5, minPoints: 600, it: 'Leggenda della Strada', en: 'Street Legend', emoji: '🏆' },
];

export function getLevel(points: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (points >= l.minPoints) current = l;
  const next = LEVELS.find(l => l.minPoints > points) ?? null;
  const progress = next ? (points - current.minPoints) / (next.minPoints - current.minPoints) : 1;
  return { current, next, progress: Math.max(0, Math.min(1, progress)) };
}

export interface UserStats {
  parkingsFreed?: number;
  bookingsMade?: number;
  handovers?: number;
  invites?: number;
}

export interface Badge {
  id: string;
  emoji: string;
  it: string;
  en: string;
  descIt: string;
  descEn: string;
  test: (s: Required<UserStats>, bestStreak: number) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first_free', emoji: '🅿️', it: 'Primo posto', en: 'First spot', descIt: 'Libera il tuo primo parcheggio', descEn: 'Free your first spot', test: s => s.parkingsFreed >= 1 },
  { id: 'handover', emoji: '🤝', it: 'Passaggio di chiavi', en: 'Handover', descIt: 'Qualcuno ha preso il tuo posto', descEn: 'Someone took your spot', test: s => s.handovers >= 1 },
  { id: 'streak_3', emoji: '🔥', it: 'In serie', en: 'On a roll', descIt: '3 giorni di fila', descEn: '3 days in a row', test: (_s, b) => b >= 3 },
  { id: 'freed_10', emoji: '⭐', it: 'Generoso', en: 'Generous', descIt: '10 posti liberati', descEn: '10 spots freed', test: s => s.parkingsFreed >= 10 },
  { id: 'inviter', emoji: '📣', it: 'Ambasciatore', en: 'Ambassador', descIt: 'Invita un amico', descEn: 'Invite a friend', test: s => s.invites >= 1 },
  { id: 'inviter_5', emoji: '🚀', it: 'Influencer', en: 'Influencer', descIt: '5 amici invitati', descEn: '5 friends invited', test: s => s.invites >= 5 },
  { id: 'streak_7', emoji: '💎', it: 'Settimana perfetta', en: 'Perfect week', descIt: '7 giorni di fila', descEn: '7 days in a row', test: (_s, b) => b >= 7 },
  { id: 'freed_50', emoji: '🦸', it: 'Supereroe urbano', en: 'Urban hero', descIt: '50 posti liberati', descEn: '50 spots freed', test: s => s.parkingsFreed >= 50 },
];

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
  return BADGES.filter(b => b.test(n, bestStreak)).map(b => b.id);
}

export function impact(s?: UserStats | null) {
  const freed = normalizeStats(s).parkingsFreed;
  return { minutes: freed * MINUTES_SAVED_PER_SPOT, co2Kg: Math.round(freed * CO2_KG_PER_SPOT * 10) / 10 };
}
