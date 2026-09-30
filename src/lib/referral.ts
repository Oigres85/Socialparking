import { PUBLIC_SITE_URL } from './platform';

/**
 * @fileOverview Programma inviti: ogni utente ha un codice personale che viaggia nei link condivisi.
 * Quando un invitato apre l'app, il codice viene salvato in users/{uid}.referredBy e una Cloud Function
 * accredita i punti all'invitante (e gli manda una notifica: il loop virale si chiude).
 */

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PENDING_KEY = 'sp-ref';

/** Codice deterministico di 6 caratteri derivato dall'uid (stabile, niente scritture extra). */
export function referralCodeFor(uid: string): string {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[(h >>> (i * 5)) & 31];
  return code;
}

export function isValidReferralCode(code: string | null | undefined): code is string {
  return !!code && /^[2-9A-HJ-NP-Z]{6}$/.test(code);
}

export function inviteUrl(code: string, path = '/come-funziona/') {
  return `${PUBLIC_SITE_URL}${path}?ref=${code}`;
}

/** Legge ?ref= dall'URL corrente (o da un deep link) e lo conserva finché l'utente non è autenticato. */
export function capturePendingReferral(url?: string) {
  try {
    const u = new URL(url ?? window.location.href);
    const ref = u.searchParams.get('ref')?.toUpperCase();
    if (isValidReferralCode(ref)) localStorage.setItem(PENDING_KEY, ref);
  } catch { /* URL non valido */ }
}

export function consumePendingReferral(ownCode: string): string | null {
  try {
    const ref = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    return isValidReferralCode(ref) && ref !== ownCode ? ref : null;
  } catch {
    return null;
  }
}
