'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { isNative, getPlatform } from '@/lib/platform';
import { capturePendingReferral } from '@/lib/referral';

/**
 * Integrazione con il sistema operativo nelle app native:
 * status bar scura, chiusura splash screen e gestione dei deep link (Universal/App Links)
 * così i link d'invito https://www.siigep.tech/come-funziona/?ref=XXXX aprono direttamente l'app.
 */
export default function NativeSetup() {
  useEffect(() => {
    capturePendingReferral();
    if (!isNative()) return;

    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    if (getPlatform() === 'android') {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    }
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});

    const sub = App.addListener('appUrlOpen', ({ url }) => {
      capturePendingReferral(url);
      try {
        const u = new URL(url);
        const path = u.pathname && u.pathname !== '/' ? u.pathname : '/';
        if (path.startsWith('/come-funziona') || path === '/') {
          window.location.href = '/' + (u.search || '');
        } else {
          window.location.href = path + (u.search || '');
        }
      } catch { /* URL non valido */ }
    });
    return () => { sub.then(s => s.remove()).catch(() => {}); };
  }, []);

  return null;
}
