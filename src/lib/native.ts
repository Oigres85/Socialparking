import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNative } from './platform';

/**
 * @fileOverview Bridge unico verso le funzionalità del dispositivo.
 * Su app nativa usa i plugin Capacitor, sul web le API del browser.
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success';

export function haptic(style: HapticStyle = 'light') {
  if (isNative()) {
    const p =
      style === 'success'
        ? Haptics.notification({ type: NotificationType.Success })
        : Haptics.impact({
            style: style === 'heavy' ? ImpactStyle.Heavy : style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light,
          });
    p.catch(() => {});
    return;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = { light: 10, medium: 30, heavy: 60, success: [20, 60, 40] };
    try { navigator.vibrate(patterns[style]); } catch { /* non supportato */ }
  }
}

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'cancelled';

/**
 * Condivide testo/link e opzionalmente un'immagine (PNG come data URL).
 * Le immagini sono il formato più virale: finiscono direttamente nelle Storie di Instagram/WhatsApp.
 */
export async function shareContent(opts: {
  title: string;
  text: string;
  url: string;
  imageDataUrl?: string;
  imageName?: string;
}): Promise<ShareResult> {
  const { title, text, url, imageDataUrl, imageName = 'social-parking.png' } = opts;

  try {
    if (isNative()) {
      let files: string[] | undefined;
      if (imageDataUrl) {
        const saved = await Filesystem.writeFile({
          path: imageName,
          data: imageDataUrl.split(',')[1],
          directory: Directory.Cache,
        });
        files = [saved.uri];
      }
      await Share.share({ title, text, url, files, dialogTitle: title });
      return 'shared';
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      if (imageDataUrl) {
        const blob = await (await fetch(imageDataUrl)).blob();
        const file = new File([blob], imageName, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title, text: `${text} ${url}`, files: [file] });
          return 'shared';
        }
      }
      await navigator.share({ title, text, url });
      return 'shared';
    }

    if (imageDataUrl) {
      const a = document.createElement('a');
      a.href = imageDataUrl;
      a.download = imageName;
      a.click();
      return 'downloaded';
    }

    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
