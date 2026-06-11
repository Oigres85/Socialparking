'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const TradingViewWidget = dynamic(() => import('./TradingViewWidget'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#111] animate-pulse flex items-center justify-center">
      <span className="text-[#444] text-xs font-mono">LOADING CHART…</span>
    </div>
  ),
});

const TICKERS = [
  { symbol: 'NASDAQ:NVDA', label: 'NVDA' },
  { symbol: 'NASDAQ:MU', label: 'MU' },
  { symbol: 'NASDAQ:AMD', label: 'AMD' },
  { symbol: 'NASDAQ:INTC', label: 'INTC' },
  { symbol: 'NASDAQ:TSLA', label: 'TSLA' },
  { symbol: 'NASDAQ:MSTR', label: 'MSTR' },
];

export default function TradingViewGrid() {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (expanded) {
    const ticker = TICKERS.find((t) => t.symbol === expanded)!;
    return (
      <div className="bg-[#0d0d0d] border border-[#1f1f1f] h-full flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f]">
          <span className="text-[#ff6600] font-mono text-sm font-bold tracking-widest">
            {ticker.label} — FULL VIEW
          </span>
          <button
            onClick={() => setExpanded(null)}
            className="text-xs font-mono text-[#888] border border-[#333] px-2 py-0.5 hover:border-[#ff6600] hover:text-[#ff6600] transition-colors"
          >
            ✕ GRID
          </button>
        </div>
        <div className="flex-1" style={{ minHeight: 500 }}>
          <TradingViewWidget symbol={expanded} height={520} compact={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f]">
      <div className="px-3 py-2 border-b border-[#1f1f1f] flex items-center gap-2">
        <span className="text-[#ff6600] font-mono text-xs font-bold tracking-widest">
          ▸ CHARTS — TECH/SEMI PORTFOLIO
        </span>
        <span className="text-[#444] text-xs font-mono ml-auto">click to expand</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-[#1a1a1a]">
        {TICKERS.map((ticker) => (
          <div
            key={ticker.symbol}
            className="bg-[#0d0d0d] relative group cursor-pointer"
            onClick={() => setExpanded(ticker.symbol)}
          >
            <div className="absolute top-1 left-2 z-10 flex items-center gap-1">
              <span className="text-[#ff6600] text-[10px] font-mono font-bold bg-[#0d0d0d]/80 px-1">
                {ticker.label}
              </span>
            </div>
            <TradingViewWidget symbol={ticker.symbol} height={290} compact />
            <div className="absolute inset-0 border border-transparent group-hover:border-[#ff6600]/40 pointer-events-none transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}
