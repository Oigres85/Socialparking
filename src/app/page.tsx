'use client';

/**
 * @fileOverview Pagina principale Social Parking Italia - Versione 6.3 Stable.
 * Ottimizzata per prevenire errori di idratazione e cicli di render.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { signInAnonymously } from 'firebase/auth';
import { collection, increment } from 'firebase/firestore';

import { useAuth, useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useUser } from '@/firebase/auth/use-user';
import {
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  serverTimestamp,
} from '@/firebase/non-blocking-updates';
import { notifyNearby } from '@/ai/flows/notify-nearby-flow';

import { getHaversineDistance, generateBookingCode } from '@/lib/utils';
import {
  PARKING_EXPIRY_MS,
  PARKING_EXPIRY_SECS,
  NOTIFY_THROTTLE_MS,
  NEARBY_SEARCH_RADIUS_M,
} from '@/lib/constants';

import { useGps } from '@/hooks/use-gps';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { useParkingDetection } from '@/hooks/use-parking-detection';
import { useGeofence } from '@/hooks/use-geofence';
import { Analytics } from '@/lib/analytics';
import { useAudio } from '@/hooks/use-audio';
import { cn } from "@/lib/utils";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Crosshair, Clock, CheckCircle2, Maximize2, Share2, Bell, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { MapRef } from 'react-map-gl';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-screen w-screen animate-pulse bg-slate-900" />,
});

const translations = {
  it: {
    unpark: "Libera parcheggio",
    searchTitle: "Ricerca parcheggi",
    parkingFreed: "Parcheggio liberato",
    bookingCancelled: "Prenotazione annullata",
    spotUnavailable: "IL PARCHEGGIO NON È PIÙ DISPONIBILE",
    noParking: "Nessun parcheggio disponibile",
    freeSpot: "Parcheggio libero",
    book: "Prenota",
    matchCodeLabel: "Codice prenotazione",
    matchCodeTitle: "CODICE PRENOTAZIONE",
    getDirections: "OTTIENI INDICAZIONI",
    cancelBooking: "ANNULLA PRENOTAZIONE",
    cancelShort: "ANNULLA",
    waitUser: "Attendi utente con codice",
    waitingForBooking: "In attesa di prenotazione",
    spotBooked: "Parcheggio Prenotato!",
    cancelFreeing: "Annulla segnalazione",
    residueTime: "TEMPO RESIDUO",
    navActive: "NAVIGAZIONE ATTIVA",
    share: "Condividi",
    todayFreed: "Parcheggi liberati oggi",
    notifNudge: "🔔 Vuoi essere avvisato quando si libera un posto vicino a te?",
    notifYes: "SÌ, ATTIVA",
    notifLater: "Dopo",
    personalStats: "Il tuo contributo",
    newHero: "Inizia ad aiutare la community! 🅿️",
    veteranHero: "Hai già aiutato {count} persone! 🏆"
  },
  en: {
    unpark: "Free parking",
    searchTitle: "Search for parking",
    parkingFreed: "Parking freed",
    bookingCancelled: "Booking cancelled",
    spotUnavailable: "PARKING NO LONGER AVAILABLE",
    noParking: "No parking available",
    freeSpot: "Free parking",
    book: "Book",
    matchCodeLabel: "Booking code",
    matchCodeTitle: "BOOKING CODE",
    getDirections: "GET DIRECTIONS",
    cancelBooking: "CANCEL BOOKING",
    cancelShort: "CANCEL",
    waitUser: "Wait for user with code",
    waitingForBooking: "Waiting for booking",
    spotBooked: "Parking Booked!",
    cancelFreeing: "Cancel alert",
    residueTime: "TIME LEFT",
    navActive: "ACTIVE NAVIGATION",
    share: "Share",
    todayFreed: "Parkings freed today",
    notifNudge: "🔔 Want to be notified when a spot opens up near you?",
    notifYes: "YES, ACTIVATE",
    notifLater: "Later",
    personalStats: "Your contribution",
    newHero: "Start helping the community! 🅿️",
    veteranHero: "You helped {count} people! 🏆"
  }
};

const ItalyFlag = ({ onClick }: { onClick: () => void }) => (
  <svg width="24" height="18" viewBox="0 0 3 2" className="cursor-pointer shadow-sm rounded-sm" onClick={onClick}>
    <rect width="1" height="2" fill="#009246" />
    <rect width="1" height="2" x="1" fill="#fff" />
    <rect width="1" height="2" x="2" fill="#ce2b37" />
  </svg>
);

const UKFlag = ({ onClick }: { onClick: () => void }) => (
  <svg width="24" height="18" viewBox="0 0 60 30" className="cursor-pointer shadow-sm rounded-sm" onClick={onClick}>
    <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
    <path d="M30,0 v30" stroke="#C8102E" strokeWidth="6" />
  </svg>
);

const OnboardingScreen = ({ onFinish }: { onFinish: () => void }) => (
  <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 overflow-y-auto">
    <div className="mb-8 relative">
      <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
      <div className="relative bg-blue-600 w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white/20">
        <span className="text-6xl font-black text-white leading-none">P</span>
      </div>
    </div>
    
    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Social Parking</h1>
    <p className="text-lg text-white/60 font-bold mb-12 leading-tight">Libera il tuo posto.<br/>Trova un posto libero.</p>
    
    <div className="space-y-6 text-left w-full max-w-xs mb-16">
      <div className="flex items-start gap-4">
        <span className="text-3xl" role="img" aria-label="car">🚗</span>
        <div>
          <p className="text-white font-black text-sm uppercase tracking-wide none">Stai lasciando?</p>
          <p className="text-white/50 text-xs font-bold mt-1">Premi LIBERA PARCHEGGIO</p>
        </div>
      </div>
      <div className="flex items-start gap-4">
        <span className="text-3xl" role="img" aria-label="search">🔍</span>
        <div>
          <p className="text-white font-black text-sm uppercase tracking-wide leading-none">Stai cercando?</p>
          <p className="text-white/50 text-xs font-bold mt-1">Attiva la RICERCA</p>
        </div>
      </div>
      <div className="flex items-start gap-4">
        <span className="text-3xl" role="img" aria-label="check">✅</span>
        <div>
          <p className="text-white font-black text-sm uppercase tracking-wide leading-none">Prenota con un tap</p>
          <p className="text-white/50 text-xs font-bold mt-1">Scambia il codice.</p>
        </div>
      </div>
    </div>
    
    <button 
      onClick={onFinish}
      className="w-full max-w-xs bg-white text-black hover:bg-white/90 active:scale-95 transition-all h-16 rounded-full font-black text-xl uppercase tracking-widest shadow-2xl shadow-white/10 shrink-0"
    >
      INIZIA
    </button>
    
    <p className="mt-8 text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
      © 2026 SOCIAL PARKING
    </p>
  </div>
);

const CountdownTimer = ({ timestamp, now, label, compact = false }: {
  timestamp: any,
  now: number,
  label?: string,
  compact?: boolean
}) => {
  const pTime = timestamp?.toDate ? timestamp.toDate().getTime() : now;
  const expiryTime = pTime + PARKING_EXPIRY_MS;
  const remainingMs = expiryTime - now;
  const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
  const progress = Math.min(100, (remainingSecs / PARKING_EXPIRY_SECS) * 100);

  const minutes = Math.floor(remainingSecs / 60);
  const seconds = remainingSecs % 60;
  const displayTime = `${minutes}.${seconds.toString().padStart(2, '0')}`;

  const progressColor = remainingSecs > 60 ? "bg-green-500" : remainingSecs > 30 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className={compact ? "w-full space-y-1" : "w-full space-y-4"}>
      <div className={cn("flex items-end gap-2", compact ? "justify-start" : "justify-between")}>
        {label && <span className={cn("text-white/50 font-black uppercase tracking-widest pb-0.5", compact ? "text-[7px]" : "text-sm")}>{label}</span>}
        <span className={cn("font-black leading-none text-orange-500", compact ? "text-lg" : "text-3xl")}>{displayTime}</span>
      </div>
      <div className={cn("relative w-full overflow-hidden rounded-full", compact ? "h-1 bg-white/10" : "h-3 bg-white/10")}>
        <div
          className={cn("h-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)]", progressColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [lang, setLang] = useState<'it' | 'en'>('it');
  const [isSearching, setIsSearching] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [now, setNow] = useState(0);
  const [showFreedBanner, setShowFreedBanner] = useState(false);
  const [showCancelledBanner, setShowCancelledBanner] = useState(false);
  const [showUnavailableBanner, setShowUnavailableBanner] = useState(false);
  const [showParkingDetectedPopup, setShowParkingDetectedPopup] = useState(false);
  const [parkingDetectionCountdown, setParkingDetectionCountdown] = useState(90);

  // Hydration guard per localStorage
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [showNotifNudge, setShowNotifNudge] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
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
  const { data: parkingsData } = useCollection<any>(
    !userLoading && currentUser ? 'parkings' : null
  );
  const { data: userData } = useDoc<any>(currentUser ? `users/${currentUser.uid}` : null);
  const { playSound } = useAudio();

  const mapRef = useRef<MapRef | null>(null);
  const prevParkingsCount = useRef(0);
  const lastActiveBookingId = useRef<string | null>(null);
  const lastNotifyTime = useRef<number>(0);

  // --- CUSTOM HOOKS ---
  const handleLocationUpdate = useCallback((loc: any) => {
    if (currentUser && firestore) {
      updateDocumentNonBlocking(firestore, `users/${currentUser.uid}`, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        lastLocationUpdate: serverTimestamp()
      });
    }

    if (!hasInitialCentered.current) {
      setViewState(prev => ({
        ...prev,
        latitude: loc.latitude,
        longitude: loc.longitude,
        zoom: 16.5,
        transitionDuration: 1000
      }));
      hasInitialCentered.current = true;
    }
  }, [currentUser, firestore]);

  const { userLocation, startGps, hasInitialCentered } = useGps(handleLocationUpdate);
  const { ensurePushSubscription } = usePushSubscription(firestore, currentUser?.uid);
  const { isParkingDetected, parkingLocation, timeRemainingForAlert, resetParking } = useParkingDetection(userLocation);
  const { isInsideGeofence, hasExited, hasReentered } = useGeofence(userLocation, parkingLocation);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      const patterns = { light: 10, medium: 30, heavy: 60 };
      navigator.vibrate(patterns[style]);
    }
  };

  useEffect(() => {
    setIsClient(true);
    setNow(Date.now());
    
    // Inizializza onboarding solo sul client
    const hasSeen = localStorage.getItem('sp-onboarded');
    if (!hasSeen) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    if (!isClient || userLoading || !currentUser) return;
    
    const hasAsked = localStorage.getItem('sp-notif-asked') === 'true';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

    if (!hasAsked && !isStandalone && permission === 'default') {
      const timer = setTimeout(() => setShowNotifNudge(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isClient, userLoading, currentUser]);

  useEffect(() => {
    if (isClient) startGps();
  }, [isClient, startGps]);

  useEffect(() => {
    if (isClient && auth && !userLoading && !currentUser) {
      signInAnonymously(auth).catch(() => {});
    }
  }, [isClient, auth, currentUser, userLoading]);

  // Mostra pop-up quando viene rilevato il parcheggio
  useEffect(() => {
    if (isParkingDetected && !showParkingDetectedPopup) {
      setShowParkingDetectedPopup(true);
      triggerHaptic('heavy');
      playSound('notification');
    }
  }, [isParkingDetected, showParkingDetectedPopup, playSound]);

  // Aggiorna il countdown per il rilevamento parcheggio
  useEffect(() => {
    if (isParkingDetected) {
      setParkingDetectionCountdown(0);
    } else {
      setParkingDetectionCountdown(Math.ceil(timeRemainingForAlert));
    }
  }, [isParkingDetected, timeRemainingForAlert]);

  const activeBooking = useMemo(() => {
    if (!currentUser || !Array.isArray(parkingsData) || now === 0) return null;
    const threeMinutesAgo = new Date(now - PARKING_EXPIRY_MS);
    return parkingsData.find((p: any) => {
      const pTime = p.timestamp?.toDate ? p.timestamp.toDate() : null;
      const isMine = p.reservedById === currentUser.uid && p.status === 'in arrivo';
      return isMine && (pTime && pTime > threeMinutesAgo);
    });
  }, [parkingsData, currentUser, now]);

  const myActiveSpot = useMemo(() => {
    if (!isClient || !currentUser || !Array.isArray(parkingsData) || now === 0) return null;
    const threeMinutesAgo = new Date(now - PARKING_EXPIRY_MS);
    return parkingsData.find(p =>
      p.userId === currentUser.uid &&
      p.timestamp?.toDate &&
      p.timestamp.toDate() > threeMinutesAgo
    );
  }, [isClient, currentUser, parkingsData, now]);

  const allAvailableSpots = useMemo(() => {
    if (!isClient || !Array.isArray(parkingsData) || now === 0) return [];
    const threeMinutesAgo = new Date(now - PARKING_EXPIRY_MS);
    return parkingsData.filter(p => {
      const pTime = p.timestamp?.toDate ? p.timestamp.toDate() : null;
      return pTime && pTime > threeMinutesAgo;
    });
  }, [parkingsData, now, isClient]);

  const dailyFreedCount = useMemo(() => {
    if (!Array.isArray(parkingsData)) return 0;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return parkingsData.filter(p => p.timestamp?.toDate && p.timestamp.toDate() > startOfDay).length;
  }, [parkingsData]);

  const myTodayCount = useMemo(() => {
    if (!Array.isArray(parkingsData) || !currentUser) return 0;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return parkingsData.filter(p =>
      p.userId === currentUser.uid &&
      p.timestamp?.toDate &&
      p.timestamp.toDate() > startOfDay
    ).length;
  }, [parkingsData, currentUser]);

  const nearbyListSpots = useMemo(() => {
    if (!isClient || !userLocation || !allAvailableSpots) return [];
    return allAvailableSpots.filter(s =>
      s.status === 'libero' && getHaversineDistance(userLocation, s) < NEARBY_SEARCH_RADIUS_M
    );
  }, [userLocation, allAvailableSpots, isClient]);

  const weeklyLeaderboard = useMemo(() => {
    if (!Array.isArray(parkingsData)) return [];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const counts: Record<string, number> = {};
    parkingsData.forEach(p => {
      if (p.userId && p.timestamp?.toDate && p.timestamp.toDate() > weekAgo) {
        counts[p.userId] = (counts[p.userId] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 5)
      .map(([userId, count], i) => ({
        rank: i + 1,
        userId,
        count,
        isMe: userId === currentUser?.uid,
        label: userId === currentUser?.uid ? 'Tu' : `Utente ${userId.slice(-4).toUpperCase()}`,
      }));
  }, [parkingsData, currentUser]);

  const hasActiveTimer = !!activeBooking || !!myActiveSpot;
  useEffect(() => {
    if (!hasActiveTimer) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => interval && clearInterval(interval);
  }, [hasActiveTimer]);

  useEffect(() => {
    if (activeBooking) {
      lastActiveBookingId.current = activeBooking.id;
    } else if (lastActiveBookingId.current && !userLoading) {
      const stillExists = parkingsData?.find(p => p.id === lastActiveBookingId.current);
      if (!stillExists && !showCancelledBanner) {
        setShowUnavailableBanner(true);
        playSound('cancellation');
        triggerHaptic('heavy');
        setTimeout(() => setShowUnavailableBanner(false), 6000);
      }
      lastActiveBookingId.current = null;
    }
  }, [activeBooking, parkingsData, showCancelledBanner, userLoading, playSound]);

  useEffect(() => {
    if (isSearching && parkingsData && isClient) {
      const availableCount = parkingsData.filter((p: any) => p.status === 'libero').length;
      if (availableCount > prevParkingsCount.current) {
        playSound('notification');
        triggerHaptic('light');
      }
      prevParkingsCount.current = availableCount;
    }
  }, [parkingsData, isSearching, isClient, playSound]);

  const handleCenterMap = useCallback(() => {
    triggerHaptic('light');
    if (!userLocation) { startGps(); return; }
    setViewState(v => ({
      ...v,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      zoom: 16.5,
      transitionDuration: 1000
    }));
  }, [userLocation, startGps]);

  const handleToggleSearching = async (checked: boolean) => {
    triggerHaptic('light');
    setIsSearching(checked);
    Analytics.searchToggled(checked).catch(()=>{});
    if (checked) ensurePushSubscription();
    if (currentUser && firestore) {
      updateDocumentNonBlocking(firestore, `users/${currentUser.uid}`, {
        isSearching: checked,
      });
    }
  };

  const handleUnpark = useCallback(async () => {
    if (!userLocation || !currentUser || !firestore || isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('medium');
    ensurePushSubscription();
    resetParking(); // Reset il rilevamento parcheggio

    const parkingsCol = collection(firestore, 'parkings');
    const parkingData = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      status: 'libero',
      timestamp: serverTimestamp(),
      userId: currentUser.uid,
      // Salva coordinate per geofencing (200m di raggio)
      geofenceLatitude: userLocation.latitude,
      geofenceLongitude: userLocation.longitude,
      geofenceRadius: 200,
    };

    addDocumentNonBlocking(parkingsCol, parkingData);

    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
    const currentStreak = userData?.streak || 0;
    const lastFreedDate = userData?.lastFreedDate || '';

    let newStreak = currentStreak;
    if (lastFreedDate !== todayStr) {
      newStreak = lastFreedDate === yesterdayStr ? currentStreak + 1 : 1;
    }

    updateDocumentNonBlocking(firestore, `users/${currentUser.uid}`, {
      lastFreedDate: todayStr,
      streak: newStreak,
      bestStreak: Math.max(newStreak, userData?.bestStreak || 0),
      'stats.parkingsFreed': increment(1)
    });

    Analytics.parkingFreed(newStreak).catch(()=>{});

    const nowTs = Date.now();
    if (nowTs - lastNotifyTime.current > NOTIFY_THROTTLE_MS) {
      lastNotifyTime.current = nowTs;
      notifyNearby({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        excludeUserId: currentUser.uid,
      }).catch(() => {});
    }

    setShowFreedBanner(true);
    setTimeout(() => {
      setShowFreedBanner(false);
      setIsSubmitting(false);
    }, 5000);
  }, [currentUser, firestore, userLocation, isSubmitting, userData, ensurePushSubscription, resetParking]);

  const handleBookSpot = useCallback((spot: any) => {
    if (!currentUser || !firestore || activeBooking) return;
    const code = generateBookingCode(4);
    playSound('booking');
    triggerHaptic('heavy');
    Analytics.parkingBooked().catch(()=>{});

    updateDocumentNonBlocking(firestore, `parkings/${spot.id}`, {
      status: 'in arrivo',
      reservedById: currentUser.uid,
      reservedByName: currentUser.displayName || 'Utente',
      bookingCode: code,
    });

    updateDocumentNonBlocking(firestore, `users/${currentUser.uid}`, {
      'stats.bookingsMade': increment(1)
    });

    setIsSearching(false);
    setIsNavigating(false);
  }, [currentUser, firestore, activeBooking, playSound]);

  const handleCancelBooking = useCallback((spot: any) => {
    if (!currentUser || !firestore) return;
    playSound('cancellation');
    triggerHaptic('medium');
    Analytics.bookingCancelled().catch(()=>{});
    updateDocumentNonBlocking(firestore, `parkings/${spot.id}`, {
      status: 'libero',
      reservedById: null,
      reservedByName: null,
      bookingCode: null
    });
    setIsNavigating(false);
    setShowCancelledBanner(true);
    setTimeout(() => setShowCancelledBanner(false), 5000);
  }, [currentUser, firestore, playSound]);

  const handleShare = useCallback(async (spot?: any) => {
    const appUrl = 'https://www.siigep.tech/come-funziona';
    const streak = userData?.streak || 0;
    const streakText = streak > 2 ? ` Sono a ${streak} giorni di fila 🔥` : '';

    Analytics.shareTriggered(spot ? 'found' : 'freed').catch(()=>{});

    const message = spot
      ? `🅿️ Ho trovato parcheggio in meno di un minuto su Social Parking!${streakText} È gratis: ${appUrl}`
      : `🅿️ Ho appena liberato un posto su Social Parking!${streakText} Trova parcheggio vicino a te: ${appUrl}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: '🅿️ Social Parking',
          text: message,
          url: appUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        toast({ title: '✅ Link copiato negli appunti!' });
      }
    } catch {
      // User cancelled
    }
  }, [toast, userData]);

  const handleFinishOnboarding = () => {
    localStorage.setItem('sp-onboarded', 'true');
    setShowOnboarding(false);
    triggerHaptic('heavy');
    Analytics.onboardingCompleted().catch(()=>{});
  };

  const handleNotifNudge = async (active: boolean) => {
    triggerHaptic('light');
    localStorage.setItem('sp-notif-asked', 'true');
    setShowNotifNudge(false);
    if (active) {
      await ensurePushSubscription();
    }
  };

  const parkingsFreedByUser = userData?.stats?.parkingsFreed || 0;
  const isFirstSession = typeof window !== 'undefined' && !localStorage.getItem('sp-onboarded');

  const unparkLabel = isSubmitting ? (
    <span className="flex items-center gap-2 italic">
      <Loader2 className="h-5 w-5 animate-spin" /> Segnalazione in corso...
    </span>
  ) : !userLocation ? (
    <span className="flex items-center gap-2">
      <span className="animate-pulse">📍</span> Attendi GPS...
    </span>
  ) : (
    t.unpark
  );

  if (!isClient) return <div className="h-screen w-screen bg-slate-950" />;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {showOnboarding && <OnboardingScreen onFinish={handleFinishOnboarding} />}
      
      <Map
        ref={mapRef}
        viewState={viewState}
        setViewState={setViewState}
        userLocation={userLocation}
        mapParkingSpots={allAvailableSpots}
        navigationTarget={isNavigating && activeBooking ? activeBooking : null}
      />

      <div className="absolute top-16 right-4 z-[50] flex flex-col items-center gap-4">
        <Button
          size="icon"
          onClick={handleCenterMap}
          className="rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] h-12 w-12 bg-blue-600 text-white pointer-events-auto border-2 border-white/20 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Crosshair className="h-6 w-6" />
        </Button>
        <div className="flex flex-col gap-4 pointer-events-auto bg-black/40 p-2.5 rounded-2xl backdrop-blur-xl border border-white/10">
          <ItalyFlag onClick={() => { triggerHaptic(); setLang('it'); }} />
          <UKFlag onClick={() => { triggerHaptic(); setLang('en'); }} />
        </div>
      </div>

      <div className="absolute top-16 left-4 z-[50] flex flex-col gap-3 pointer-events-none w-72 max-w-[90vw]">
        {!activeBooking && !myActiveSpot && (
          <div className="flex flex-col gap-3 pointer-events-auto">
            {isParkingDetected && (
              <div className="w-full flex flex-col items-center mb-1">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                  {parkingsFreedByUser > 0
                    ? t.veteranHero.replace('{count}', parkingsFreedByUser.toString())
                    : t.newHero}
                </p>
              </div>
            )}
            {isParkingDetected && (
              <Button
                onClick={handleUnpark}
                className={cn(
                  "w-full font-black text-lg h-13 rounded-[1.5rem] shadow-2xl bg-black text-white border-2 border-white/10 hover:bg-slate-900 active:bg-slate-800 disabled:opacity-100 transition-all uppercase tracking-tight animate-in fade-in slide-in-from-left-4 duration-500",
                  (!userLocation || isSubmitting) && "opacity-70 cursor-not-allowed"
                )}
                disabled={!userLocation || isSubmitting}
              >
                {unparkLabel}
              </Button>
            )}

            <Card className="w-full shadow-2xl rounded-[1.5rem] border-2 border-white/10 max-h-[45vh] overflow-hidden flex flex-col bg-black text-white">
              <CardContent className="p-3 flex flex-col gap-2 overflow-y-auto">
                <div className="flex flex-col gap-1 shrink-0">
                  <div className="flex items-center justify-between h-8">
                    <Label className="font-black text-lg text-white uppercase tracking-tight">{t.searchTitle}</Label>
                    <Switch checked={isSearching} onCheckedChange={handleToggleSearching} className="data-[state=checked]:bg-blue-600 h-6 w-11" />
                  </div>
                  {!isSearching && (
                    <p className="text-[10px] text-white/30 font-bold mt-1 animate-in fade-in slide-in-from-top-1 duration-300">
                      Attiva per vedere i posti liberi vicino a te 📍
                    </p>
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
                              {Math.round(getHaversineDistance(userLocation, spot))}m da te
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleShare(spot)}
                              className="h-8 w-8 text-white/40 hover:text-white"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleBookSpot(spot)}
                              className="rounded-lg h-8 px-4 text-[10px] font-black bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white border-none"
                            >
                              {t.book}
                            </Button>
                          </div>
                        </div>
                        <CountdownTimer timestamp={spot.timestamp} now={now} compact={true} />
                      </div>
                    )) : <p className="text-[10px] text-center text-white/40 italic py-4 font-medium tracking-wide">{t.noParking}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {myActiveSpot && !activeBooking && (
          <Card className="w-full shadow-2xl rounded-[2.5rem] bg-black border-2 border-white/10 text-white pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-left-6 duration-500">
            <CardContent className="p-8 space-y-7 text-center">
              <div className="flex items-center justify-center gap-4">
                {myActiveSpot.status === 'in arrivo'
                  ? <CheckCircle2 className="text-green-500 h-10 w-10 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  : <Clock className="text-orange-500 h-10 w-10 animate-pulse" />
                }
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
              <div className="pt-4 flex flex-col gap-2">
                <Button
                  onClick={() => handleShare(myActiveSpot)}
                  variant="outline"
                  className="w-full text-white font-black h-12 rounded-2xl border-white/10 bg-white/5 uppercase text-xs tracking-widest"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {t.share}
                </Button>
                <Button
                  onClick={() => { triggerHaptic(); deleteDocumentNonBlocking(firestore!, `parkings/${myActiveSpot.id}`); }}
                  variant="ghost"
                  className="w-full text-white/40 font-black h-10 rounded-2xl hover:text-white uppercase text-[9px] tracking-widest"
                >
                  {t.cancelFreeing}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeBooking && (
          <Card className={cn(
            "w-full shadow-2xl rounded-[1.5rem] bg-black border-2 border-white/10 text-white pointer-events-auto transition-all duration-700 overflow-hidden",
            isNavigating ? 'max-h-[250px]' : 'max-h-[550px]'
          )}>
            <CardContent className={cn("transition-all duration-500", isNavigating ? "p-3" : "p-8")}>
              {!isNavigating ? (
                <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="text-center space-y-2">
                    <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em]">{t.matchCodeTitle}</p>
                    <p className="text-7xl font-black text-orange-500 drop-shadow-[0_0_25px_rgba(249,115,22,0.5)]">
                      {activeBooking.bookingCode}
                    </p>
                  </div>
                  <div className="w-full space-y-4 pt-2">
                    <Button
                      onClick={() => { triggerHaptic(); setIsNavigating(true); }}
                      className="w-full bg-white text-black font-black rounded-[1.5rem] h-16 hover:bg-white/90 active:scale-95 transition-all text-lg uppercase tracking-tight"
                    >
                      {t.getDirections}
                    </Button>
                    <Button
                      onClick={() => handleCancelBooking(activeBooking)}
                      className="w-full bg-[#3d0a0a] text-white font-black rounded-[1.5rem] h-16 border-2 border-[#5c1212] hover:bg-[#4d0d0d] active:scale-95 transition-all text-base uppercase tracking-tighter"
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
                    <span className="text-[7px] font-black uppercase text-white/40 tracking-[0.2em] leading-none">
                      {t.navActive}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { triggerHaptic(); setIsNavigating(false); }}
                      className="h-5 w-5 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative flex items-center justify-between bg-white/5 p-2 py-1 rounded-[1.2rem] border border-white/10 gap-2 shadow-inner">
                    <div className="flex flex-col min-w-[70px] text-left">
                      <span className="text-[6px] font-black text-white/40 uppercase tracking-widest leading-none">CODICE</span>
                      <span className="text-[6px] font-black text-white/40 uppercase tracking-widest leading-tight">PRENOTAZIONE</span>
                    </div>
                    <span className="text-3xl font-black text-orange-500 tracking-tighter leading-none flex-1 text-center drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">
                      {activeBooking.bookingCode}
                    </span>
                  </div>
                  <div className="px-1">
                    <CountdownTimer timestamp={activeBooking.timestamp} now={now} label={t.residueTime} compact />
                  </div>
                  <div className="pt-1">
                    <Button
                      onClick={() => handleCancelBooking(activeBooking)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-black rounded-[0.8rem] h-9 active:scale-95 transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/30"
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

      {showParkingDetectedPopup && isParkingDetected && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-black border-2 border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl animate-bounce">🅿️</div>
              <div className="space-y-2">
                <p className="text-white font-black text-2xl uppercase tracking-tight">
                  PARCHEGGIO RILEVATO!
                </p>
                <p className="text-white/60 text-sm font-bold">
                  Sei fermo da 90 secondi
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-white/70 text-xs font-black uppercase tracking-widest">Posizione salvata</span>
                <span className="text-green-400 text-lg">✓</span>
              </div>
              <p className="text-white/40 text-xs font-bold">
                Geofencing attivo: 200m da qui
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowParkingDetectedPopup(false);
                  resetParking();
                }}
                variant="outline"
                className="flex-1 border-white/10 bg-white/5 text-white/70 font-black rounded-2xl h-12 hover:text-white"
              >
                NON ORA
              </Button>
              <Button
                onClick={() => {
                  setShowParkingDetectedPopup(false);
                  handleUnpark();
                }}
                className="flex-1 bg-white text-black font-black rounded-2xl h-12 hover:bg-white/90 active:scale-95 transition-all"
              >
                LIBERA PARCHEGGIO
              </Button>
            </div>
          </div>
        </div>
      )}

      {showNotifNudge && (
        <div className="absolute bottom-20 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 border-2 border-blue-600/30 rounded-[1.5rem] p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="bg-blue-600/20 p-2.5 rounded-xl">
                <Bell className="h-5 w-5 text-blue-400" />
              </div>
              <p className="flex-1 text-sm font-bold leading-tight pt-1">
                {t.notifNudge}
              </p>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleNotifNudge(false)}
                className="h-8 w-8 text-white/40 hover:text-white rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleNotifNudge(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl h-11 text-xs uppercase tracking-wider"
              >
                {t.notifYes}
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleNotifNudge(false)}
                className="flex-1 border-white/10 bg-white/5 text-white/70 font-bold rounded-xl h-11 text-xs uppercase tracking-wider"
              >
                {t.notifLater}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showFreedBanner && (
        <div className="absolute bottom-16 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="bg-black/95 text-white p-6 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.6)] font-black text-xl text-center border-2 border-white/10 backdrop-blur-xl uppercase tracking-tight">
            <div className="flex flex-col items-center gap-1">
              <span>{t.parkingFreed}</span>
              {(userData?.streak || 0) > 1 && (
                <span className="text-orange-400 text-sm">
                  🔥 {userData?.streak} giorni di fila!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {showCancelledBanner && (
        <div className="absolute bottom-16 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="bg-black/95 text-white p-6 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.6)] font-black text-xl text-center border-2 border-white/10 backdrop-blur-xl uppercase tracking-tight">
            {t.bookingCancelled}
          </div>
        </div>
      )}

      {showUnavailableBanner && (
        <div className="absolute bottom-16 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="bg-black/95 text-white p-8 rounded-[2.5rem] shadow-[0_15px_60px_rgba(0,0,0,0.8)] font-black text-2xl text-center border-2 border-red-900/50 backdrop-blur-2xl uppercase tracking-tight leading-tight">
            {t.spotUnavailable}
          </div>
        </div>
      )}

      {weeklyLeaderboard.length > 1 && (
        <div className="absolute bottom-16 right-4 z-[50]">
          <button
            onClick={() => setShowLeaderboard(v => !v)}
            className="bg-black/80 border border-white/10 rounded-full px-3 py-2 text-[10px] font-black text-white/60 uppercase tracking-widest backdrop-blur-md"
          >
            🏆 Top 5
          </button>
          
          {showLeaderboard && (
            <div className="absolute bottom-10 right-0 w-52 bg-black/95 border border-white/10 rounded-2xl p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">
                Classifica settimana
              </p>
              {weeklyLeaderboard.map(entry => (
                <div key={entry.userId} className={`flex items-center justify-between py-1.5 ${entry.isMe ? 'text-orange-400' : 'text-white/70'}`}>
                  <span className="text-xs font-black">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}.`} {entry.label}
                  </span>
                  <span className="text-xs font-black">{entry.count} 🅿️</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 left-0 right-0 z-[50] text-center pointer-events-none px-6 space-y-1">
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[10px] text-white/60 font-black uppercase tracking-widest bg-black/60 inline-block px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
            {dailyFreedCount} {t.todayFreed}
            {myTodayCount > 0 && ` · Tu: ${myTodayCount} 🏆`}
          </p>
          {parkingsFreedByUser > 0 && (
            <p className="text-[9px] text-orange-400 font-bold uppercase tracking-wider bg-orange-400/10 px-3 py-1 rounded-full border border-orange-400/20 backdrop-blur-sm">
              {t.personalStats}: {parkingsFreedByUser} 🅿️
            </p>
          )}
        </div>
        <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black opacity-60 pt-2">
          © 2026 SOCIAL PARKING – ALL RIGHTS RESERVED. WWW.SIIGEP.TECH
        </p>
      </div>
    </div>
  );
}
