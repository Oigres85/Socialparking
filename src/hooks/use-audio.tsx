
"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';

type AudioType = 'notification' | 'booking' | 'cancellation' | 'directions';

const audioFiles: Record<AudioType, string> = {
  notification: 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3',
  booking: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3069.mp3',
  cancellation: 'https://assets.mixkit.co/sfx/preview/mixkit-game-show-wrong-answer-2550.mp3',
  directions: 'https://assets.mixkit.co/sfx/preview/mixkit-interface-hint-notification-911.mp3',
};

interface AudioContextType {
  playSound: (type: AudioType) => void;
}

const AudioSystemContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    
    const unlockAudio = () => {
      if (typeof window !== 'undefined') {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    
    return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const playSound = (type: AudioType) => {
    if (typeof window === 'undefined' || !isReady) return;
    try {
      const audio = new Audio(audioFiles[type]);
      audio.volume = 1.0;
      audio.play().catch(error => {
        console.warn(`Audio play for "${type}" prevented:`, error);
      });
    } catch (error) {
      console.error(`Failed to play sound "${type}":`, error);
    }
  };

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
