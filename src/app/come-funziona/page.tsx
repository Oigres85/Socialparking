
'use client';

/**
 * @fileOverview Landing page ad alta conversione per utenti da link condivisi.
 * Design premium, social proof e istruzioni chiare per massimizzare l'onboarding.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ComeFunziona() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(ua));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Decorative Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <header className="relative w-full max-w-xl px-6 pt-16 pb-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-8 duration-1000">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-full mb-8">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <span className="text-blue-400 font-black text-[10px] uppercase tracking-widest">
            1.247 parcheggi liberati questa settimana
          </span>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-20 rounded-full" />
          <div className="relative bg-blue-600 w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)] border-4 border-white/10">
            <span className="text-7xl font-black text-white leading-none">P</span>
          </div>
        </div>

        <h1 className="text-5xl font-black tracking-tighter leading-[0.9] mb-4">
          Trova parcheggio <br />
          <span className="text-blue-500">in tempo reale</span>
        </h1>
        <p className="text-lg text-white/50 font-bold max-w-xs leading-tight">
          La community italiana che condivide i posti liberi. <span className="text-white">Gratis.</span>
        </p>
      </header>

      {/* Steps Section */}
      <main className="w-full max-w-md px-6 space-y-6 mb-16 relative z-10">
        {[
          {
            num: "1",
            emoji: "🚗",
            title: "Qualcuno sta uscendo",
            desc: "Premi LIBERA PARCHEGGIO e avvisa chi sta cercando in zona."
          },
          {
            num: "2",
            emoji: "🔍",
            title: "Notifica Istantanea",
            desc: "Ricevi un avviso sul telefono appena si libera un posto vicino a te."
          },
          {
            num: "3",
            emoji: "✅",
            title: "Prenota con un tap",
            desc: "Assicurati il posto e scambia il codice di 4 lettere con chi esce."
          }
        ].map((step, i) => (
          <div 
            key={i}
            className="group bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex items-start gap-5 hover:bg-white/[0.07] transition-colors duration-500 animate-in fade-in slide-in-from-bottom-8"
            style={{ animationDelay: `${(i + 1) * 150}ms` }}
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-black text-xl text-blue-500 group-hover:scale-110 transition-transform">
              {step.num}
            </div>
            <div>
              <h3 className="font-black text-xl uppercase tracking-tighter leading-none mb-2">
                {step.title}
              </h3>
              <p className="text-white/60 text-sm font-medium leading-tight">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </main>

      {/* Social Proof Bar */}
      <section className="w-full max-w-md px-6 mb-20 animate-in fade-in duration-1000 delay-700">
        <div className="grid grid-cols-3 gap-1 py-6 border-y border-white/10">
          <div className="text-center">
            <p className="text-xl font-black text-white">0€</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Costo</p>
          </div>
          <div className="text-center border-x border-white/10 px-2">
            <p className="text-xl font-black text-white">&lt; 60s</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Tempo Medio</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-white">PWA</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">iOS & Android</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="w-full max-w-xs pb-16 flex flex-col items-center mt-auto">
        <button
          onClick={() => router.push('/')}
          className="w-full bg-white text-black font-black text-xl h-16 rounded-full shadow-[0_20px_40px_rgba(255,255,255,0.15)] hover:bg-white/90 active:scale-95 transition-all uppercase tracking-widest mb-4"
        >
          APRI LA MAPPA →
        </button>
        <p className="text-[11px] text-white/40 font-black uppercase tracking-widest mb-8">
          Nessuna registrazione. Funziona subito.
        </p>

        {isMobile && (
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
            <span className="text-2xl">📲</span>
            <p className="text-[10px] text-orange-400 font-black uppercase leading-tight tracking-wide">
              Aggiungi alla schermata Home <br />
              <span className="text-white/60">per le notifiche push</span>
            </p>
          </div>
        )}

        <footer className="mt-12 text-center">
          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
            Gratuito · Anonimo · Immediato
          </p>
        </footer>
      </div>
    </div>
  );
}
