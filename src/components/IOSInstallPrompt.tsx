"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Analytics } from "@/lib/analytics";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
    if (!hasSeenPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

      if (isIOS && !isStandalone) {
        const timer = setTimeout(() => setShowIosPrompt(true), 5000);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (showIosPrompt) {
      const timer = setTimeout(() => {
        setShowIosPrompt(false);
        localStorage.setItem('pwa-prompt-seen', 'true');
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [showIosPrompt]);

  const handleInstallClick = () => {
    if (installPromptEvent) {
      Analytics.pwaInstalled().catch(()=>{});
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then(() => {
        setInstallPromptEvent(null);
        localStorage.setItem('pwa-prompt-seen', 'true');
      });
    }
  };

  const handleClose = () => {
    setShowIosPrompt(false);
    setInstallPromptEvent(null);
    localStorage.setItem('pwa-prompt-seen', 'true');
  };

  if (installPromptEvent) {
    return (
      <div className="fixed bottom-6 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-10">
        <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl border-2 border-blue-500/20 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-white/40"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl shrink-0">
              <Smartphone className="text-white h-6 w-6" />
            </div>
            <div className="flex-grow">
              <h3 className="font-bold text-sm text-white">Installa Social Parking</h3>
              <p className="text-xs text-white/50 mt-1">
                Accedi più velocemente e attiva le notifiche.
              </p>
            </div>
            <Button
              onClick={handleInstallClick}
              className="ml-2 font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 rounded-xl"
            >
              Installa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showIosPrompt) {
    return (
      <div className="fixed bottom-6 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-10">
        <div className="bg-slate-900 rounded-2xl p-5 shadow-2xl border-2 border-white/10 relative text-white">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-white/50"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-start gap-4 pr-6">
            <div className="bg-blue-600 p-2 rounded-xl shrink-0">
              <PlusSquare className="text-white h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Installa su iPhone</h3>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                Per attivare le notifiche, tocca{' '}
                <Share className="inline h-4 w-4 mx-1 text-blue-400" />{' '}
                e poi seleziona{' '}
                <span className="font-bold text-white">"Aggiungi alla schermata Home"</span>.
              </p>
            </div>
          </div>
        </div>
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-slate-900 mx-auto drop-shadow-md" />
      </div>
    );
  }

  return null;
}
