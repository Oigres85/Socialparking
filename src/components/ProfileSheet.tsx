'use client';

import Link from 'next/link';
import { X, Share2, UserPlus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BADGES, getLevel, impact, normalizeStats } from '@/lib/gamification';
import type { Dict, Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ProfileSheetProps {
  t: Dict;
  lang: Lang;
  setLang: (l: Lang) => void;
  points: number;
  stats: any;
  streak: number;
  badges: string[];
  referralCode: string;
  onClose: () => void;
  onInvite: () => void;
  onShareCard: () => void;
  onCopyCode: () => void;
  onDeleteData: () => void;
}

/**
 * Profilo utente: livello, impatto, badge e programma inviti.
 * È il "motore" della viralità: ogni sezione porta a una condivisione.
 */
export default function ProfileSheet(p: ProfileSheetProps) {
  const { t, lang } = p;
  const { current, next, progress } = getLevel(p.points);
  const s = normalizeStats(p.stats);
  const imp = impact(p.stats);

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={p.onClose}>
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-black border-t-2 sm:border-2 border-white/15 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white animate-in slide-in-from-bottom-10 duration-300"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={t.profile}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black text-xl uppercase tracking-tight">{t.profile}</h2>
          <Button variant="ghost" size="icon" onClick={p.onClose} aria-label={t.close} className="h-9 w-9 rounded-full text-white/50 hover:text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Livello */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{current.emoji}</div>
            <div className="flex-1">
              <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{t.level} {current.level}</p>
              <p className="font-black text-xl leading-tight">{current[lang]}</p>
              <p className="text-orange-400 font-black text-sm">{p.points} {t.points}</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-orange-400 transition-all duration-700" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="text-[10px] text-white/40 font-bold mt-2">
            {next ? `${next.minPoints - p.points} ${t.points} ${t.nextLevel} · ${next.emoji} ${next[lang]}` : t.maxLevel}
          </p>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            [s.parkingsFreed, t.statFreed],
            [s.handovers, t.statHandovers],
            [s.invites, t.statInvites],
            [p.streak, t.statStreak],
          ].map(([v, label]) => (
            <div key={label as string} className="bg-white/5 border border-white/10 rounded-2xl p-2 text-center">
              <p className="font-black text-xl">{v}</p>
              <p className="text-[8px] text-white/40 font-black uppercase leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Impatto */}
        {s.parkingsFreed > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-4">
            <p className="text-[10px] text-green-400 font-black uppercase tracking-widest mb-1">{t.impactTitle}</p>
            <p className="text-sm font-bold"><span className="text-green-400 font-black text-lg">{imp.minutes}</span> {t.impactMinutes}</p>
            <p className="text-sm font-bold"><span className="text-green-400 font-black text-lg">{imp.co2Kg}</span> {t.impactCo2}</p>
          </div>
        )}

        {/* Inviti */}
        <div className="bg-blue-600/15 border border-blue-500/30 rounded-[2rem] p-5 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest">{t.yourCode}</p>
              <p className="font-black text-3xl tracking-[0.2em]">{p.referralCode}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={p.onCopyCode} aria-label="Copy" className="h-10 w-10 rounded-full text-white/60 hover:text-white hover:bg-white/10">
              <Copy className="h-5 w-5" />
            </Button>
          </div>
          <Button onClick={p.onInvite} className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-wider">
            <UserPlus className="h-4 w-4 mr-2" /> {t.inviteCta}
          </Button>
          <Button onClick={p.onShareCard} variant="outline" className="w-full h-12 rounded-2xl border-white/15 bg-white/5 text-white font-black uppercase text-xs tracking-wider hover:bg-white/10 hover:text-white">
            <Share2 className="h-4 w-4 mr-2" /> {t.shareCard}
          </Button>
        </div>

        {/* Badge */}
        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">{t.badges}</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {BADGES.map(b => {
            const unlocked = p.badges.includes(b.id);
            return (
              <div key={b.id} className={cn('rounded-2xl p-2 text-center border', unlocked ? 'bg-orange-500/10 border-orange-400/30' : 'bg-white/[0.03] border-white/5 opacity-40 grayscale')} title={lang === 'it' ? b.descIt : b.descEn}>
                <p className="text-2xl">{b.emoji}</p>
                <p className="text-[8px] font-black uppercase leading-tight mt-1">{lang === 'it' ? b.it : b.en}</p>
              </div>
            );
          })}
        </div>

        {/* Impostazioni */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black uppercase text-white/50 tracking-widest">{t.language}</span>
          <div className="flex gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            {(['it', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => p.setLang(l)} className={cn('px-4 py-1.5 rounded-full text-xs font-black uppercase', lang === l ? 'bg-white text-black' : 'text-white/60')}>
                {l === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-white/40 border-t border-white/10 pt-4">
          <div className="flex gap-4">
            <Link href="/privacy/" className="hover:text-white">{t.privacy}</Link>
            <Link href="/termini/" className="hover:text-white">{t.terms}</Link>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-1 text-red-400/70 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" /> {t.deleteData}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-950 border-white/10 text-white rounded-3xl z-[400]">
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">{t.deleteConfirmDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-2xl bg-white/5 border-white/10 text-white">{t.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={p.onDeleteData} className="rounded-2xl bg-red-600 hover:bg-red-700 text-white">{t.deleteConfirm}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="text-[9px] text-white/20 text-center font-black uppercase tracking-[0.2em] mt-6">© 2026 Social Parking · siigep.tech</p>
      </div>
    </div>
  );
}
