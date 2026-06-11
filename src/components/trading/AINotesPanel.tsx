'use client';

import { useState } from 'react';

interface Props {
  notes: string;
  onChange: (v: string) => void;
}

export default function AINotesPanel({ notes, onChange }: Props) {
  const [saved, setSaved] = useState(false);

  const handleClear = () => {
    if (confirm('Cancellare tutte le note?')) {
      onChange('');
    }
  };

  const handleSave = () => {
    localStorage.setItem('trading-ai-notes', notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLoad = () => {
    const saved = localStorage.getItem('trading-ai-notes');
    if (saved) onChange(saved);
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] flex flex-col">
      <div className="px-3 py-1.5 border-b border-[#1f1f1f] flex items-center justify-between">
        <span className="text-[#ff6600] font-mono text-xs font-bold tracking-widest">
          ▸ AI NOTES &amp; THOUGHTS
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLoad}
            className="text-[9px] font-mono text-[#444] hover:text-[#888] border border-[#222] px-1.5 py-0.5 transition-colors"
          >
            LOAD
          </button>
          <button
            onClick={handleSave}
            className={`text-[9px] font-mono border px-1.5 py-0.5 transition-colors ${
              saved
                ? 'text-[#00e676] border-[#00e676]'
                : 'text-[#444] hover:text-[#888] border-[#222]'
            }`}
          >
            {saved ? 'SAVED ✓' : 'SAVE'}
          </button>
          <button
            onClick={handleClear}
            className="text-[9px] font-mono text-[#444] hover:text-[#ff4444] border border-[#222] hover:border-[#ff4444] px-1.5 py-0.5 transition-colors"
          >
            CLEAR
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-[#333] font-mono text-[10px]">
          Incolla qui la risposta di Claude Pro per leggerla direttamente sulla dashboard.
          Le note vengono salvate localmente nel browser.
        </p>

        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`── RISPOSTA CLAUDE AI ──\n\nIncolla qui l'analisi generata da Claude Pro...\n\nPuoi anche usare questo spazio come scratch-pad\nper appunti di trading e idee operative.`}
          className="flex-1 w-full min-h-[280px] bg-[#080808] border border-[#1a1a1a] text-[#aaa] font-mono text-[11px] p-3 resize-none focus:outline-none focus:border-[#ff6600] placeholder:text-[#222] leading-relaxed"
          spellCheck={false}
        />

        <div className="flex items-center justify-between text-[9px] font-mono text-[#333]">
          <span>{notes.length} chars</span>
          <span>{notes.split('\n').length} lines</span>
        </div>
      </div>
    </div>
  );
}
