import Link from 'next/link';
import type { ReactNode } from 'react';

/** Layout comune per le pagine legali (Privacy, Termini, Eliminazione dati). */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-black text-white/80 px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-block mb-8 text-xs font-black uppercase tracking-widest text-blue-400">← Social Parking</Link>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{title}</h1>
        <p className="text-xs text-white/40 font-bold mb-10">Ultimo aggiornamento: {updated}</p>
        <div className="space-y-6 text-sm leading-relaxed [&_h2]:text-white [&_h2]:font-black [&_h2]:text-lg [&_h2]:mt-10 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-blue-400 [&_a]:underline">
          {children}
        </div>
      </div>
    </div>
  );
}
