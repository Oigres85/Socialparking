"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, ReactNode } from 'react';

type AudioType = 'notification' | 'booking' | 'cancellation' | 'directions';

/**
 * Suoni sintetizzati con Web Audio: nessun file remoto (funziona offline nelle app native,
 * nessuna dipendenza da CDN esterni e nessun problema di licenza).
 * Ogni suono è una sequenza di note [frequenza Hz, durata s].
 */
const MELODIES: Record<AudioType, Array<[number, number]>> = {
  notification: [[880, 0.09], [1320, 0.14]],
  booking: [[660, 0.08], [880, 0.08], [1175, 0.16]],
  cancellation: [[440, 0.14], [330, 0.22]],
  directions: [[990, 0.1]],
};

interface AudioContextType {
  playSound: (type: AudioType) => void;
}

const AudioSystemContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    return ctxRef.current;
  }, []);

  // iOS richiede un gesto dell'utente per sbloccare l'audio
  useEffect(() => {
    const unlock = () => {
      getCtx()?.resume().catch(() => {});
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [getCtx]);

  const playSound = useCallback((type: AudioType) => {
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'running') return;
    let t = ctx.currentTime;
    for (const [freq, dur] of MELODIES[type]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur;
    }
  }, [getCtx]);

  return (
    <AudioSystemContext.Provider value={{ playSound }}>
      {children}
    </AudioSystemContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioSystemContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
