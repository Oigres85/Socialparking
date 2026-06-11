'use client';

import { useState, useRef } from 'react';

interface Props {
  notes: string;
  onChange: (v: string) => void;
}

export default function AINotesPanel({ notes, onChange }: Props) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const save = () => {
    localStorage.setItem('trading-ai-notes', notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const load = () => {
    const s = localStorage.getItem('trading-ai-notes');
    if (s) onChange(s);
  };

  const copy = async () => {
    if (!notes) return;
    await navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => {
    if (confirm('Cancellare tutte le note AI?')) onChange('');
  };

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] flex flex-col">
      <div className="px-3 py-1.5 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center gap-2">
        <div className="w-0.5 h-3 bg-[#ff6600]" />
        <span className="text-[#ff6600] font-mono text-[10px] font-bold tracking-widest">
          AI NOTES &amp; THOUGHTS
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {[
            ['LOAD', load, false],
            [copied ? 'COPY ✓' : 'COPY', copy, copied],
            [saved ? 'SAVED ✓' : 'SAVE', save, saved],
            ['CLEAR', clear, false],
          ].map(([label, fn, active]) => (
            <button
              key={label as string}
              onClick={fn as () => void}
              className={`text-[8px] font-mono border px-1.5 py-0.5 tracking-wider transition-all ${
                active
                  ? 'text-[#00e676] border-[#00e676]'
                  : 'text-[#333] border-[#1e1e1e] hover:text-[#888] hover:border-[#444]'
              }`}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-[#222] font-mono text-[9px]">
          Incolla qui la risposta di Claude Pro · le note sono salvate localmente nel browser
        </p>

        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`── RISPOSTA CLAUDE AI ──────────────────────\n\nIncolla qui l'analisi di Claude Pro...\n\nPuoi usare questo spazio anche come\nscratch-pad per appunti operativi,\nlivelli tecnici, idee di trade.\n\n────────────────────────────────────────`}
          className="flex-1 w-full min-h-[240px] bg-[#060606] border border-[#151515] text-[#999] font-mono text-[10px] p-3 resize-none focus:outline-none focus:border-[#ff6600]/50 placeholder:text-[#1e1e1e] leading-relaxed"
          spellCheck={false}
        />

        <div className="flex items-center justify-between text-[8px] font-mono text-[#222]">
          <span>{notes.length.toLocaleString()} chars</span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>{notes.split('\n').length} lines</span>
        </div>
      </div>
    </div>
  );
}
