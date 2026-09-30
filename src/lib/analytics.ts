import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';
import { getFirebaseApp } from '@/firebase/config';

/**
 * @fileOverview Utility per il tracciamento degli eventi con Firebase Analytics.
 */

let analyticsInstance: any = null;

async function getAnalyticsInstance() {
  if (typeof window === 'undefined') return null;
  if (analyticsInstance) return analyticsInstance;
  
  const supported = await isSupported();
  if (supported) {
    analyticsInstance = getAnalytics(getFirebaseApp());
  }
  return analyticsInstance;
}

export async function trackEvent(name: string, params?: Record<string, any>) {
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, name, params);
    }
  } catch (e) {
    // Analytics non critico, fail silenzioso
    console.warn('Analytics event failed:', name, e);
  }
}

/**
 * Eventi predefiniti mappati sulle azioni chiave dell'utente.
 */
export const Analytics = {
  onboardingCompleted: () => trackEvent('onboarding_completed'),
  parkingFreed: (streak: number) => trackEvent('parking_freed', { streak }),
  parkingBooked: () => trackEvent('parking_booked'),
  bookingCancelled: () => trackEvent('booking_cancelled'),
  searchToggled: (on: boolean) => trackEvent('search_toggled', { enabled: on }),
  notifPermissionGranted: () => trackEvent('notification_permission_granted'),
  notifPermissionDenied: () => trackEvent('notification_permission_denied'),
  shareTriggered: (context: 'freed' | 'found' | 'invite' | 'card') => trackEvent('share_triggered', { context }),
  pwaInstalled: () => trackEvent('pwa_installed'),
  returnToCarDetected: () => trackEvent('return_to_car_detected'),
  profileOpened: () => trackEvent('profile_opened'),
  landingCta: (source: string) => trackEvent('landing_cta', { source }),
};
