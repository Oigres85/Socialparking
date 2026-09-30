'use client';

/**
 * @fileOverview Pagina principale Social Parking – v7 (App Store / Play Store ready).
 * Novità: rilevamento auto "intelligente", profilo con livelli/badge, inviti con codice,
 * card condivisibili per le Storie, statistiche calcolate lato server.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { signInAnonymously } from 'firebase/auth';
import { collection, Timestamp, getDocs, query, where, deleteDoc, doc, setDoc } from 'firebase/firestore';

import { useAuth, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useUser } from '@/firebase/auth/use-user';
import {
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  mergeUserDoc,
  serverTimestamp,
} from '@/firebase/non-blocking-updates';

import { getHaversineDistance, generateBookingCode, romeDateKey, cn } from '@/lib/utils';
import {
  PARKING_EXPIRY_MS,
  PARKING_EXPIRY_SECS,
  NEARBY_SEARCH_RADIUS_M,
  LIVE_QUERY_WINDOW_MS,
} from '@/lib/constants';
import { translations, detectLang, saveLang, fmt, type Lang, type Dict } from '@/lib/i18n';
import { computePoints, getLevel, impact, normalizeStats, BADGES } from '@/lib/gamification';
import { referralCodeFor, consumePendingReferral, inviteUrl } from '@/lib/referral';
import { renderShareCard } from '@/lib/share-card';
import { haptic, shareContent } from '@/lib/native';
import { getPlatform, isNative } from '@/lib/platform';

import { useGps } from '@/hooks/use-gps';
import { usePush } from '@/hooks/use-push';
import { useParkingDetection } from '@/hooks/use-parking-detection';
import { Analytics } from '@/lib/analytics';
import { useAudio } from '@/hooks/use-audio';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ProfileSheet from '@/components/ProfileSheet';
import { Crosshair, Clock, CheckCircle2, Maximize2, Share2, Bell, X, Loader2, Navigation, UserPlus, MapPinOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { MapRef } from 'react-map-gl';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-screen w-screen animate-pulse bg-slate-900" />,
});

type T = Dict;

const OnboardingScreen = ({ t, lang, setLang, invited, onFinish }: {
  t: T; lang: Lang; setLang: (l: Lang) => void; invited: boolean; onFinish: () => void;
}) => (
  <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center p-8 pt-[max(2rem,env(safe-area-inset-top))] text-center animate-in fade-in duration-500 overflow-y-auto">
    <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex gap-1 bg-white/5 p-1 rounded-full border border-white/10">
      {(['it', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase', lang === l ? 'bg-white text-black' : 'text-white/60')}>
          {l}
        </button>
      ))}
    </div>

    <div className="mb-8 relative">
      <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
      <div className="relative bg-blue-600 w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white/20">
        <span className="text-6xl font-black text-white leading-none">P</span>
      </div>
    </div>

    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Social Parking</h1>
    <p className="text-lg text-white/60 font-bold mb-10 leading-tight whitespace-pre-line">{t.onbTagline}</p>

    {invited && (
      <p className="mb-8 max-w-xs text-sm font-black text-orange-300 bg-orange-500/10 border border-orange-400/30 rounded-2xl px-4 py-3">{t.onbInvited}</p>
    )}

    <div className="space-y-6 text-left w-full max-w-xs mb-10">
      {[
        ['🚗', t.onb1Title, t.onb1Desc],
        ['🔍', t.onb2Title, t.onb2Desc],
        ['✅', t.onb3Title, t.onb3Desc],
      ].map(([emoji, title, desc]) => (
        <div key={title} className="flex items-start gap-4">
          <span className="text-3xl" aria-hidden>{emoji}</span>
          <div>
            <p className="text-white font-black text-sm uppercase tracking-wide leading-none">{title}</p>
            <p className="text-white/50 text-xs font-bold mt-1">{desc}</p>
          </div>
        </div>
      ))}
    </div>

    <p className="text-[11px] text-white/40 font-bold max-w-xs mb-6">📍 {t.onbPermission}</p>

    <button
      onClick={onFinish}
      className="w-full max-w-xs bg-white text-black hover:bg-white/90 active:scale-95 transition-all h-16 rounded-full font-black text-xl uppercase tracking-widest shadow-2xl shadow-white/10 shrink-0"
    >
      {t.start}
    </button>
  </div>
);

const CountdownTimer = ({ timestamp, now, label, compact = false }: {
  timestamp: any,
  now: number,
  label?: string,
  compact?: boolean
}) => {
  const pTime = timestamp?.toDate ? timestamp.toDate().getTime() : now;
  const remainingSecs = Math.max(0, Math.floor((pTime + PARKING_EXPIRY_MS - now) / 1000));
  const progress = Math.min(100, (remainingSecs / PARKING_EXPIRY_SECS) * 100);
  const displayTime = `${Math.floor(remainingSecs / 60)}.${(remainingSecs % 60).toString().padStart(2, '0')}`;
  const progressColor = remainingSecs > 60 ? "bg-green-500" : remainingSecs > 30 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className={compact ? "w-full space-y-1" : "w-full space-y-4"}>
      <div className={cn("flex items-end gap-2", compact ? "justify-start" : "justify-between")}>
        {label && <span className={cn("text-white/50 font-black uppercase tracking-widest pb-0.5", compact ? "text-[7px]" : "text-sm")}>{label}</span>}
        <span className={cn("font-black leading-none text-orange-500", compact ? "text-lg" : "text-3xl")}>{displayTime}</span>
      </div>
      <div className={cn("relative w-full overflow-hidden rounded-full", compact ? "h-1 bg-white/10" : "h-3 bg-white/10")}>
        <div className={cn("h-full transition-all duration-1000", progressColor)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

const BottomBanner = ({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'danger' }) => (
  <div className="absolute bottom-[max(4rem,calc(env(safe-area-inset-bottom)+3.5rem))] left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-6 duration-500">
    <div className={cn(
      "text-white p-5 rounded-[2rem] shadow-[0_12px_40px_rgba(0,0,0,0.3)] text-center border-2 backdrop-blur-lg",
      tone === 'danger' ? 'bg-gradient-to-br from-red-950/90 to-black/90 border-red-500/30' : 'bg-gradient-to-br from-slate-900/90 to-black/90 border-white/20'
    )}>
      {children}
    </div>
  </div>
);

function mapsUrl(lat: number, lng: number) {
  return getPlatform() === 'ios'
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [lang, setLangState] = useState<Lang>('it');
  const [isSearching, setIsSearching] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [now, setNow] = useState(0);
  const [showFreedBanner, setShowFreedBanner] = useState(false);
  const [showCancelledBanner, setShowCancelledBanner] = useState(false);
  const [showUnavailableBanner, setShowUnavailableBanner] = useState(false);
  const [showCarSaved, setShowCarSaved] = useState(false);
  const [showReturningPopup, setShowReturningPopup] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [invited, setInvited] = useState(false);
  const [showNotifNudge, setShowNotifNudge] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [celebration, setCelebration] = useState<{ title: string; emoji: string; label: string } | null>(null);
  const [viewState, setViewState] = useState({
    latitude: 41.9027835,
    longitude: 12.4963655,
    zoom: 16.5,
    pitch: 0,
    bearing: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = translations[lang] || translations.it;
  const { toast } = useToast();

  const { user: currentUser, loading: userLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { playSound } = useAudio();

  // Query "live": solo gli ultimi minuti, non l'intera collezione storica.
  const liveBucket = now ? Math.floor(now / LIVE_QUERY_WINDOW_MS) : 0;
  const liveWhere = useMemo(
    () => (liveBucket ? [['timestamp', '>=', Timestamp.fromMillis((liveBucket - 1) * LIVE_QUERY_WINDOW_MS)] as [string, '>=', Timestamp]] : undefined),
    [liveBucket]
  );
  const { data: parkingsData } = useCollection<any>(
    !userLoading && currentUser && liveWhere ? 'parkings' : null,
    { where: liveWhere }
  );
  const { data: userData, loading: userDocLoading } = useDoc<any>(currentUser ? `users/${currentUser.uid}` : null);
  const { data: dayStats } = useDoc<any>(currentUser && now ? `stats/day_${romeDateKey(new Date(now))}` : null);

  const mapRef = useRef<MapRef | null>(null);
  const prevParkingsCount = useRef(0);
  const lastActiveBookingId = useRef<string | null>(null);
  const prevMyStatus = useRef<string | null>(null);
  const prevBadges = useRef<string[] | null>(null);
  const prevLevel = useRef<number | null>(null);
  const hasBootstrappedUser = useRef(false);

  const referralCode = useMemo(() => (currentUser ? referralCodeFor(currentUser.uid) : '------'), [currentUser]);
  const stats = normalizeStats(userData?.stats);
  const points: number = typeof userData?.points === 'number' ? userData.points : computePoints(userData?.stats);
  const badges: string[] = Array.isArray(userData?.badges) ? userData.badges : [];

  const setLang = useCallback((l: Lang) => {
    haptic();
    setLangState(l);
    saveLang(l);
  }, []);

  // --- GPS ---
  const handleLocationUpdate = useCallback((loc: { latitude: number; longitude: number }) => {
    if (currentUser && firestore) {
      mergeUserDoc(firestore, currentUser.uid, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        lastLocationUpdate: serverTimestamp(),
      });
    }
    if (!hasInitialCentered.current) {
      setViewState(prev => ({ ...prev, latitude: loc.latitude, longitude: loc.longitude, zoom: 16.5 }));
      hasInitialCentered.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, firestore]);

  const { userLocation, startGps, hasInitialCentered, permission: gpsPermission } = useGps(handleLocationUpdate);

  const handleNotificationOpen = useCallback(() => {
    setIsSearching(true);
  }, []);
  const { ensurePush } = usePush(firestore, currentUser?.uid, handleNotificationOpen);

  // --- Rilevamento auto ---
  const handleParkingEvent = useCallback((e: 'parked' | 'returning' | 'drove-away') => {
    if (e === 'parked') {
      setShowCarSaved(true);
      haptic('medium');
      setTimeout(() => setShowCarSaved(false), 9000);
    } else if (e === 'returning') {
      setShowReturningPopup(true);
      haptic('heavy');
      playSound('notification');
      Analytics.returnToCarDetected().catch(() => {});
    } else {
      setShowReturningPopup(false);
    }
  }, [playSound]);
  const { phase: parkingPhase, car, resetParking } = useParkingDetection(userLocation, handleParkingEvent);

  // --- Bootstrap ---
  useEffect(() => {
    setIsClient(true);
    setNow(Date.now());
    setLangState(detectLang());
    try {
      if (!localStorage.getItem('sp-onboarded')) {
        setShowOnboarding(true);
        setInvited(!!localStorage.getItem('sp-ref'));
      }
    } catch { /* storage non disponibile */ }
  }, []);

  useEffect(() => {
    if (isClient && !showOnboarding) startGps();
  }, [isClient, showOnboarding, startGps]);

  useEffect(() => {
    if (isClient && auth && !userLoading && !currentUser) {
      signInAnonymously(auth).catch(() => {});
    }
  }, [isClient, auth, currentUser, userLoading]);

  // Crea il profilo utente al primo accesso (prima nessuno lo creava: statistiche e push non funzionavano)
  useEffect(() => {
    if (!currentUser || !firestore || userDocLoading || hasBootstrappedUser.current) return;
    hasBootstrappedUser.current = true;
    const base: Record<string, unknown> = { referralCode, lang, platform: getPlatform() };
    if (!userData) base.createdAt = serverTimestamp();
    if (!userData?.referralCode) {
      setDoc(doc(firestore, 'referrals', referralCode), { uid: currentUser.uid }).catch(() => {});
    }
    // Invito: la Cloud Function onReferralClaimed accredita i punti a entrambi
    const ref = !userData?.referredBy ? consumePendingReferral(referralCode) : null;
    if (ref) setDoc(doc(firestore, 'referralClaims', currentUser.uid), { code: ref }).catch(() => {});
    mergeUserDoc(firestore, currentUser.uid, base);
  }, [currentUser, firestore, userDocLoading, userData, referralCode, lang]);

  // Nudge notifiche
  useEffect(() => {
    if (!isClient || !currentUser || showOnboarding) return;
    let asked = false;
    try { asked = localStorage.getItem('sp-notif-asked') === 'true'; } catch { /* ignore */ }
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    if (!asked && (isNative() || permission === 'default')) {
      const timer = setTimeout(() => setShowNotifNudge(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [isClient, currentUser, showOnboarding]);

  // --- Dati derivati ---
  const isFresh = useCallback((p: any) => {
    const pTime = p.timestamp?.toDate ? p.timestamp.toDate().getTime() : 0;
    return pTime > now - PARKING_EXPIRY_MS;
  }, [now]);

  const activeBooking = useMemo(() => {
    if (!currentUser || !Array.isArray(parkingsData) || !now) return null;
    return parkingsData.find((p: any) => p.reservedById === currentUser.uid && p.status === 'in arrivo' && isFresh(p)) ?? null;
  }, [parkingsData, currentUser, now, isFresh]);

  const myActiveSpot = useMemo(() => {
    if (!currentUser || !Array.isArray(parkingsData) || !now) return null;
    return parkingsData.find((p: any) => p.userId === currentUser.uid && isFresh(p)) ?? null;
  }, [currentUser, parkingsData, now, isFresh]);

  const allAvailableSpots = useMemo(() => {
    if (!Array.isArray(parkingsData) || !now) return [];
    return parkingsData.filter(isFresh);
  }, [parkingsData, now, isFresh]);

  const nearbyListSpots = useMemo(() => {
    if (!userLocation) return [];
    return allAvailableSpots
      .filter(s => s.status === 'libero' && s.userId !== currentUser?.uid && getHaversineDistance(userLocation, s) < NEARBY_SEARCH_RADIUS_M)
      .sort((a, b) => getHaversineDistance(userLocation, a) - getHaversineDistance(userLocation, b));
  }, [userLocation, allAvailableSpots, currentUser]);

  const dailyFreedCount: number = dayStats?.freed ?? 0;

  // Timer: 1s quando serve un countdown, altrimenti 10s
  const needsFastTick = !!activeBooking || !!myActiveSpot || isSearching;
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), needsFastTick ? 1000 : 10000);
    return () => clearInterval(interval);
  }, [needsFastTick]);

  // Prenotazione sparita
  useEffect(() => {
    if (activeBooking) {
      lastActiveBookingId.current = activeBooking.id;
    } else if (lastActiveBookingId.current && !userLoading) {
      const stillExists = parkingsData?.find(p => p.id === lastActiveBookingId.current);
      if (!stillExists && !showCancelledBanner) {
        setShowUnavailableBanner(true);
        playSound('cancellation');
        haptic('heavy');
        setTimeout(() => setShowUnavailableBanner(false), 6000);
      }
      lastActiveBookingId.current = null;
    }
  }, [activeBooking, parkingsData, showCancelledBanner, userLoading, playSound]);

  // Il mio posto è stato prenotato
  useEffect(() => {
    const status = myActiveSpot?.status ?? null;
    if (status === 'in arrivo' && prevMyStatus.current === 'libero') {
      playSound('booking');
      haptic('success');
    }
    prevMyStatus.current = status;
  }, [myActiveSpot, playSound]);

  // Nuovi posti mentre cerco
  useEffect(() => {
    if (!isSearching) return;
    const count = nearbyListSpots.length;
    if (count > prevParkingsCount.current) {
      playSound('notification');
      haptic('light');
    }
    prevParkingsCount.current = count;
  }, [nearbyListSpots, isSearching, playSound]);

  // Celebrazioni: nuovo badge o nuovo livello (momento perfetto per condividere)
  useEffect(() => {
    if (!userData) return;
    const level = getLevel(points).current;
    if (prevBadges.current && prevLevel.current !== null) {
      const newBadgeId = badges.find(b => !prevBadges.current!.includes(b));
      if (level.level > prevLevel.current) {
        setCelebration({ title: t.levelUp, emoji: level.emoji, label: level[lang] });
        playSound('booking');
        haptic('success');
      } else if (newBadgeId) {
        const b = BADGES.find(x => x.id === newBadgeId);
        if (b) {
          setCelebration({ title: t.newBadge, emoji: b.emoji, label: lang === 'it' ? b.it : b.en });
          playSound('booking');
          haptic('success');
        }
      }
    }
    prevBadges.current = badges;
    prevLevel.current = level.level;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.badges, points]);

  // --- Azioni ---
  const handleCenterMap = useCallback(() => {
    haptic('light');
    if (!userLocation) { startGps(); return; }
    setViewState(v => ({ ...v, latitude: userLocation.latitude, longitude: userLocation.longitude, zoom: 16.5 }));
  }, [userLocation, startGps]);

  const handleToggleSearching = (checked: boolean) => {
    haptic('light');
    setIsSearching(checked);
    Analytics.searchToggled(checked).catch(() => {});
    if (checked) ensurePush();
    if (currentUser && firestore) {
      mergeUserDoc(firestore, currentUser.uid, { isSearching: checked });
    }
  };

  const handleUnpark = useCallback(() => {
    if (!userLocation || !currentUser || !firestore || isSubmitting) return;
    setIsSubmitting(true);
    haptic('medium');
    ensurePush();
    setShowReturningPopup(false);

    // Se l'utente è vicino all'auto salvata usiamo quella posizione (più precisa del GPS in movimento)
    const spot = car && getHaversineDistance(car, userLocation) < 80 ? car : userLocation;
    addDocumentNonBlocking(collection(firestore, 'parkings'), {
      latitude: spot.latitude,
      longitude: spot.longitude,
      status: 'libero',
      timestamp: serverTimestamp(),
      userId: currentUser.uid,
    });
    resetParking();

    // Punti, streak e badge vengono calcolati dalla Cloud Function onParkingCreated
    Analytics.parkingFreed(userData?.streak || 0).catch(() => {});

    setShowFreedBanner(true);
    setTimeout(() => {
      setShowFreedBanner(false);
      setIsSubmitting(false);
    }, 7000);
  }, [currentUser, firestore, userLocation, isSubmitting, userData, ensurePush, resetParking, car]);

  const handleBookSpot = useCallback((spot: any) => {
    if (!currentUser || !firestore || activeBooking) return;
    playSound('booking');
    haptic('heavy');
    Analytics.parkingBooked().catch(() => {});
    updateDocumentNonBlocking(firestore, `parkings/${spot.id}`, {
      status: 'in arrivo',
      reservedById: currentUser.uid,
      bookingCode: generateBookingCode(4),
    });
    setIsSearching(false);
    setIsNavigating(false);
  }, [currentUser, firestore, activeBooking, playSound]);

  const handleCancelBooking = useCallback((spot: any) => {
    if (!currentUser || !firestore) return;
    playSound('cancellation');
    haptic('medium');
    Analytics.bookingCancelled().catch(() => {});
    updateDocumentNonBlocking(firestore, `parkings/${spot.id}`, {
      status: 'libero',
      reservedById: null,
      bookingCode: null,
    });
    setIsNavigating(false);
    setShowCancelledBanner(true);
    setTimeout(() => setShowCancelledBanner(false), 5000);
  }, [currentUser, firestore, playSound]);

  const buildCard = useCallback(() => {
    const lvl = getLevel(points).current;
    const freed = stats.parkingsFreed;
    return renderShareCard({
      headline: freed > 0 ? fmt(t.cardHeadline, { n: freed }) : t.cardHeadlineZero,
      subline: freed > 0 ? fmt(t.cardSub, { min: impact(userData?.stats).minutes }) : t.cardSubZero,
      levelLabel: `${lvl.emoji} ${lvl[lang]}`,
      inviteLabel: t.cardInvite,
      inviteCode: referralCode,
      footer: 'www.siigep.tech',
    });
  }, [points, stats.parkingsFreed, t, userData, lang, referralCode]);

  const doShare = useCallback(async (kind: 'freed' | 'found' | 'invite' | 'card') => {
    haptic('light');
    Analytics.shareTriggered(kind).catch(() => {});
    const text = fmt(kind === 'found' ? t.shareFoundText : kind === 'freed' ? t.shareFreedText : t.shareInviteText, { code: referralCode });
    let imageDataUrl: string | undefined;
    if (kind !== 'invite') {
      try { imageDataUrl = buildCard(); } catch { /* canvas non disponibile */ }
    }
    const res = await shareContent({ title: 'Social Parking', text, url: inviteUrl(referralCode), imageDataUrl });
    if (res === 'copied') toast({ title: t.linkCopied });
    if (res === 'downloaded') toast({ title: t.imageSaved });
  }, [t, referralCode, buildCard, toast]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl(referralCode));
      toast({ title: t.linkCopied });
    } catch { /* ignore */ }
  }, [referralCode, t, toast]);

  const handleDeleteData = useCallback(async () => {
    if (!currentUser || !firestore || !auth) return;
    try {
      const mine = await getDocs(query(collection(firestore, 'parkings'), where('userId', '==', currentUser.uid)));
      await Promise.all(mine.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(firestore, 'referrals', referralCode)).catch(() => {});
      await deleteDoc(doc(firestore, 'users', currentUser.uid));
      await currentUser.delete().catch(() => auth.signOut());
    } finally {
      try {
        Object.keys(localStorage).filter(k => k.startsWith('sp-') || k === 'pwa-prompt-seen').forEach(k => localStorage.removeItem(k));
      } catch { /* ignore */ }
      toast({ title: t.deleted });
      setTimeout(() => window.location.reload(), 1200);
    }
  }, [currentUser, firestore, auth, referralCode, t, toast]);

  const handleFinishOnboarding = () => {
    try { localStorage.setItem('sp-onboarded', 'true'); } catch { /* ignore */ }
    setShowOnboarding(false);
    haptic('heavy');
    Analytics.onboardingCompleted().catch(() => {});
  };

  const handleNotifNudge = async (active: boolean) => {
    haptic('light');
    try { localStorage.setItem('sp-notif-asked', 'true'); } catch { /* ignore */ }
    setShowNotifNudge(false);
    if (active) await ensurePush();
  };

  const openProfile = () => {
    haptic('light');
    setShowProfile(true);
    Analytics.profileOpened().catch(() => {});
  };

  if (!isClient) return <div className="h-screen w-screen bg-slate-950" />;

  const level = getLevel(points).current;
  const isReturning = parkingPhase === 'returning';

  const unparkLabel = isSubmitting ? (
    <span className="flex items-center gap-2 italic"><Loader2 className="h-5 w-5 animate-spin" /> {t.submitting}</span>
  ) : !userLocation ? (
    <span className="flex items-center gap-2"><span className="animate-pulse">📍</span> {t.waitGps}</span>
  ) : t.unpark;

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-slate-950">
      {showOnboarding && <OnboardingScreen t={t} lang={lang} setLang={setLang} invited={invited} onFinish={handleFinishOnboarding} />}

      <Map
        ref={mapRef}
        viewState={viewState}
        setViewState={setViewState}
        userLocation={userLocation}
        mapParkingSpots={allAvailableSpots}
        navigationTarget={isNavigating && activeBooking ? activeBooking : null}
        car={car}
        carLabel={t.myCar}
        onSpotClick={() => { if (!activeBooking && !myActiveSpot) handleToggleSearching(true); }}
      />

      {/* Colonna destra: profilo, centra mappa, libera parcheggio */}
      <div className="absolute top-[max(4rem,calc(env(safe-area-inset-top)+1rem))] right-4 z-[50] flex flex-col items-end gap-3 pointer-events-none">
        <button
          onClick={openProfile}
          className="pointer-events-auto flex items-center gap-2 h-12 pl-2 pr-4 rounded-full bg-gradient-to-br from-slate-900/90 to-black/90 border-2 border-white/20 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md active:scale-95 transition-all"
          aria-label={t.profile}
        >
          <span className="text-2xl leading-none">{level.emoji}</span>
          <span className="font-black text-sm">{points}</span>
        </button>
        <Button
          size="icon"
          onClick={handleCenterMap}
          aria-label="Center"
          className="rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-700 text-white pointer-events-auto border-2 border-white/20 hover:bg-blue-700 active:scale-95 transition-all backdrop-blur-md"
        >
          <Crosshair className="h-6 w-6" />
        </Button>
        {!myActiveSpot && !activeBooking && (
          <Button
            onClick={handleUnpark}
            className={cn(
              "pointer-events-auto font-black text-sm h-12 px-5 rounded-[1.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-gradient-to-br from-slate-900 to-black text-white border-2 border-white/20 hover:bg-slate-800 active:scale-95 disabled:opacity-100 transition-all uppercase tracking-tight backdrop-blur-md",
              isReturning && "from-green-600 to-green-700 border-green-300/50 animate-pulse",
              (!userLocation || isSubmitting) && "opacity-70 cursor-not-allowed"
            )}
            disabled={!userLocation || isSubmitting}
          >
            {unparkLabel}
          </Button>
        )}
      </div>

      <div className="absolute top-[max(4rem,calc(env(safe-area-inset-top)+1rem))] left-4 z-[50] flex flex-col gap-3 pointer-events-none w-[min(18rem,calc(100vw-9rem))]">
        {!activeBooking && !myActiveSpot && (
          <Card className="pointer-events-auto w-full shadow-[0_12px_40px_rgba(0,0,0,0.3)] rounded-[2rem] border-2 border-white/20 max-h-[45vh] overflow-hidden flex flex-col bg-gradient-to-br from-slate-900/90 to-black/90 text-white backdrop-blur-lg">
            <CardContent className="p-3 flex flex-col gap-2 overflow-y-auto">
              <div className="flex flex-col gap-1 shrink-0">
                <div className="flex items-center justify-between h-8 gap-2">
                  <Label htmlFor="search-toggle" className="font-black text-base text-white uppercase tracking-tight leading-none">{t.searchTitle}</Label>
                  <Switch id="search-toggle" checked={isSearching} onCheckedChange={handleToggleSearching} className="data-[state=checked]:bg-blue-600 h-6 w-11 shrink-0" />
                </div>
                {!isSearching && (
                  <p className="text-[10px] text-white/30 font-bold mt-1 animate-in fade-in slide-in-from-top-1 duration-300">{t.searchHint}</p>
                )}
              </div>
              {isSearching && (
                <div className="space-y-3">
                  {nearbyListSpots.length > 0 ? nearbyListSpots.map((spot) => (
                    <div key={spot.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-2 animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-green-400 font-black text-xs uppercase leading-none">{t.freeSpot}</p>
                          <p className="text-[9px] text-white/50 font-bold mt-1 uppercase tracking-wider">
                            {Math.round(getHaversineDistance(userLocation, spot))}{t.metersAway}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleBookSpot(spot)}
                          className="rounded-lg h-8 px-4 text-[10px] font-black bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white border-none"
                        >
                          {t.book}
                        </Button>
                      </div>
                      <CountdownTimer timestamp={spot.timestamp} now={now} compact />
                    </div>
                  )) : (
                    <div className="py-3 text-center space-y-2">
                      <p className="text-[11px] text-white/60 font-black">{t.noParking}</p>
                      <p className="text-[10px] text-white/40 font-bold leading-snug">{t.noParkingInvite}</p>
                      <Button onClick={() => doShare('invite')} size="sm" className="rounded-xl h-9 px-4 text-[10px] font-black uppercase bg-white text-black hover:bg-white/90">
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" /> {t.inviteFriends}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {myActiveSpot && !activeBooking && (
          <Card className="w-[min(18rem,calc(100vw-2rem))] shadow-[0_12px_40px_rgba(0,0,0,0.3)] rounded-[2.5rem] bg-gradient-to-br from-slate-900/90 to-black/90 border-2 border-white/20 text-white pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-left-6 duration-500 backdrop-blur-lg">
            <CardContent className="p-7 space-y-6 text-center">
              <div className="flex items-center justify-center gap-4">
                {myActiveSpot.status === 'in arrivo'
                  ? <CheckCircle2 className="text-green-500 h-10 w-10 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  : <Clock className="text-orange-500 h-10 w-10 animate-pulse" />}
                <p className="font-black text-xl leading-tight text-left uppercase tracking-tighter">
                  {myActiveSpot.status === 'in arrivo' ? t.spotBooked : t.waitingForBooking}
                </p>
              </div>
              {myActiveSpot.status === 'in arrivo' && myActiveSpot.bookingCode && (
                <div className="space-y-2 bg-white/5 p-5 rounded-[2rem] border border-white/10 shadow-inner">
                  <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">{t.matchCodeLabel}</p>
                  <p className="text-5xl font-black text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">{myActiveSpot.bookingCode}</p>
                  <p className="text-sm text-white/90 font-bold">{t.waitUser}</p>
                </div>
              )}
              <CountdownTimer timestamp={myActiveSpot.timestamp} now={now} label={t.residueTime} />
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={() => doShare('freed')}
                  variant="outline"
                  className="w-full text-white font-black h-12 rounded-2xl border-white/10 bg-white/5 uppercase text-xs tracking-widest hover:bg-white/10 hover:text-white"
                >
                  <Share2 className="h-4 w-4 mr-2" /> {t.share}
                </Button>
                <Button
                  onClick={() => { haptic(); deleteDocumentNonBlocking(firestore!, `parkings/${myActiveSpot.id}`); }}
                  variant="ghost"
                  className="w-full text-white/40 font-black h-10 rounded-2xl hover:text-white hover:bg-white/5 uppercase text-[9px] tracking-widest"
                >
                  {t.cancelFreeing}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeBooking && (
          <Card className={cn(
            "w-[min(18rem,calc(100vw-2rem))] shadow-[0_12px_40px_rgba(0,0,0,0.3)] rounded-[1.5rem] bg-gradient-to-br from-slate-900/90 to-black/90 border-2 border-white/20 text-white pointer-events-auto transition-all duration-700 overflow-hidden backdrop-blur-lg",
            isNavigating ? 'max-h-[260px]' : 'max-h-[600px]'
          )}>
            <CardContent className={cn("transition-all duration-500", isNavigating ? "p-3" : "p-7")}>
              {!isNavigating ? (
                <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500">
                  <div className="text-center space-y-2">
                    <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em]">{t.matchCodeTitle}</p>
                    <p className="text-7xl font-black text-orange-500 drop-shadow-[0_0_25px_rgba(249,115,22,0.5)]">{activeBooking.bookingCode}</p>
                  </div>
                  <div className="w-full space-y-3 pt-1">
                    <Button
                      onClick={() => { haptic(); setIsNavigating(true); playSound('directions'); }}
                      className="w-full bg-white text-black font-black rounded-[1.5rem] h-14 hover:bg-white/90 active:scale-95 transition-all text-base uppercase tracking-tight"
                    >
                      {t.getDirections}
                    </Button>
                    <Button
                      onClick={() => window.open(mapsUrl(activeBooking.latitude, activeBooking.longitude), '_blank')}
                      variant="outline"
                      className="w-full border-white/15 bg-white/5 text-white font-black rounded-[1.5rem] h-12 hover:bg-white/10 hover:text-white uppercase text-xs tracking-wider"
                    >
                      <Navigation className="h-4 w-4 mr-2" /> {t.openInMaps}
                    </Button>
                    <Button
                      onClick={() => handleCancelBooking(activeBooking)}
                      className="w-full bg-[#3d0a0a] text-white font-black rounded-[1.5rem] h-12 border-2 border-[#5c1212] hover:bg-[#4d0d0d] active:scale-95 transition-all text-sm uppercase tracking-tighter"
                    >
                      {t.cancelBooking}
                    </Button>
                  </div>
                  <div className="w-full px-2">
                    <CountdownTimer timestamp={activeBooking.timestamp} now={now} label={t.residueTime} compact />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[7px] font-black uppercase text-white/40 tracking-[0.2em] leading-none">{t.navActive}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { haptic(); setIsNavigating(false); }}
                      className="h-5 w-5 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative flex items-center justify-between bg-white/5 p-2 py-1 rounded-[1.2rem] border border-white/10 gap-2 shadow-inner">
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-widest leading-tight min-w-[70px]">{t.matchCodeLabel}</span>
                    <span className="text-3xl font-black text-orange-500 tracking-tighter leading-none flex-1 text-center drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">
                      {activeBooking.bookingCode}
                    </span>
                  </div>
                  <div className="px-1">
                    <CountdownTimer timestamp={activeBooking.timestamp} now={now} label={t.residueTime} compact />
                  </div>
                  <div className="pt-1 flex gap-2">
                    <Button
                      onClick={() => window.open(mapsUrl(activeBooking.latitude, activeBooking.longitude), '_blank')}
                      className="flex-1 bg-white text-black hover:bg-white/90 font-black rounded-[0.8rem] h-9 text-[10px] uppercase tracking-widest"
                    >
                      <Navigation className="h-3 w-3 mr-1" /> {t.openInMaps}
                    </Button>
                    <Button
                      onClick={() => handleCancelBooking(activeBooking)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black rounded-[0.8rem] h-9 active:scale-95 transition-all text-[10px] uppercase tracking-widest"
                    >
                      {t.cancelShort}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Popup: l'utente sta tornando all'auto → momento giusto per liberare il posto */}
      {showReturningPopup && isReturning && !myActiveSpot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-slate-900/95 to-black/95 border-2 border-white/20 rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-center space-y-7 animate-in zoom-in-95 duration-300 backdrop-blur-lg">
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl animate-bounce">🚗</div>
              <div className="space-y-2">
                <p className="text-white font-black text-2xl uppercase tracking-tight">{t.returningTitle}</p>
                <p className="text-white/60 text-sm font-bold">{t.returningSub}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowReturningPopup(false)}
                variant="outline"
                className="flex-1 border-white/10 bg-white/5 text-white/70 font-black rounded-2xl h-12 hover:text-white hover:bg-white/10"
              >
                {t.notNow}
              </Button>
              <Button
                onClick={handleUnpark}
                disabled={!userLocation || isSubmitting}
                className="flex-1 bg-white text-black font-black rounded-2xl h-12 hover:bg-white/90 active:scale-95 transition-all uppercase text-xs"
              >
                {t.unpark}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Celebrazione badge/livello */}
      {celebration && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setCelebration(null)}>
          <div className="bg-gradient-to-br from-slate-900 to-black border-2 border-orange-400/40 rounded-[2.5rem] p-8 max-w-sm w-full text-center space-y-5 animate-in zoom-in-90 duration-300" onClick={e => e.stopPropagation()}>
            <p className="text-orange-400 font-black text-xs uppercase tracking-[0.3em]">{celebration.title}</p>
            <div className="text-8xl animate-bounce">{celebration.emoji}</div>
            <p className="text-white font-black text-2xl uppercase tracking-tight">{celebration.label}</p>
            <Button onClick={() => { doShare('card'); setCelebration(null); }} className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase hover:bg-white/90">
              <Share2 className="h-5 w-5 mr-2" /> {t.share}
            </Button>
            <button onClick={() => setCelebration(null)} className="text-white/40 text-xs font-black uppercase tracking-widest">{t.close}</button>
          </div>
        </div>
      )}

      {showProfile && (
        <ProfileSheet
          t={t}
          lang={lang}
          setLang={setLang}
          points={points}
          stats={userData?.stats}
          streak={userData?.streak || 0}
          badges={badges}
          referralCode={referralCode}
          onClose={() => setShowProfile(false)}
          onInvite={() => doShare('invite')}
          onShareCard={() => doShare('card')}
          onCopyCode={handleCopyCode}
          onDeleteData={handleDeleteData}
        />
      )}

      {gpsPermission === 'denied' && (
        <BottomBanner tone="danger">
          <p className="flex items-center justify-center gap-2 text-sm font-black"><MapPinOff className="h-4 w-4" /> {t.gpsDenied}</p>
        </BottomBanner>
      )}

      {showNotifNudge && !showOnboarding && (
        <div className="absolute bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))] left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="bg-gradient-to-br from-slate-900/90 to-blue-950/80 border-2 border-blue-500/30 rounded-[2rem] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl flex flex-col gap-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="bg-blue-600/20 p-2.5 rounded-xl"><Bell className="h-5 w-5 text-blue-400" /></div>
              <p className="flex-1 text-sm font-bold leading-tight pt-1">{t.notifNudge}</p>
              <Button variant="ghost" size="icon" onClick={() => handleNotifNudge(false)} className="h-8 w-8 text-white/40 hover:text-white rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleNotifNudge(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl h-11 text-xs uppercase tracking-wider">
                {t.notifYes}
              </Button>
              <Button variant="outline" onClick={() => handleNotifNudge(false)} className="flex-1 border-white/10 bg-white/5 text-white/70 font-bold rounded-xl h-11 text-xs uppercase tracking-wider">
                {t.notifLater}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCarSaved && parkingPhase !== 'idle' && (
        <BottomBanner>
          <p className="font-black text-lg uppercase tracking-tight">{t.carSaved}</p>
          <p className="text-white/60 text-xs font-bold mt-1">{t.carSavedSub}</p>
          <button onClick={() => { resetParking(); setShowCarSaved(false); }} className="mt-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
            {t.notParked}
          </button>
        </BottomBanner>
      )}

      {showFreedBanner && (
        <BottomBanner>
          <p className="font-black text-xl uppercase tracking-tight">{t.parkingFreed}</p>
          <p className="text-white/60 text-xs font-bold mt-1">{t.parkingFreedSub}</p>
          {(userData?.streak || 0) > 1 && (
            <p className="text-orange-400 text-sm font-black mt-1">🔥 {fmt(t.streakDays, { n: userData.streak })}</p>
          )}
          <Button onClick={() => doShare('freed')} className="mt-3 h-10 rounded-xl bg-white text-black font-black uppercase text-xs hover:bg-white/90">
            <Share2 className="h-4 w-4 mr-2" /> {t.share}
          </Button>
        </BottomBanner>
      )}

      {showCancelledBanner && (
        <BottomBanner><p className="font-black text-xl uppercase tracking-tight">{t.bookingCancelled}</p></BottomBanner>
      )}

      {showUnavailableBanner && (
        <BottomBanner tone="danger"><p className="font-black text-2xl uppercase tracking-tight leading-tight">{t.spotUnavailable}</p></BottomBanner>
      )}

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 z-[40] text-center pointer-events-none px-24">
        <p className="text-[10px] text-white/80 font-black uppercase tracking-widest bg-black/40 inline-block px-4 py-1.5 rounded-full backdrop-blur-lg border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
          {dailyFreedCount} {t.todayFreed}
        </p>
      </div>
    </div>
  );
}
