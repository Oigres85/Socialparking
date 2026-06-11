'use client';

import { useEffect, useRef, memo } from 'react';

const TICKERS = [
  { symbol: 'NASDAQ:NVDA', label: 'NVDA', sector: 'GPU/AI' },
  { symbol: 'NASDAQ:AMD',  label: 'AMD',  sector: 'CPU/GPU' },
  { symbol: 'NASDAQ:MU',   label: 'MU',   sector: 'DRAM' },
  { symbol: 'NASDAQ:INTC', label: 'INTC', sector: 'CPU/FAB' },
  { symbol: 'NASDAQ:TSLA', label: 'TSLA', sector: 'EV/AI' },
  { symbol: 'NASDAQ:MSTR', label: 'MSTR', sector: 'BTC' },
];

function MiniChart({ symbol, label, sector }: { symbol: string; label: string; sector: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    el.appendChild(inner);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      symbol,
      width:       '100%',
      height:      '100%',
      locale:      'en',
      dateRange:   '1D',
      colorTheme:  'dark',
      isTransparent: true,
      autosize:    true,
      largeChartUrl: '',
      chartOnly:   false,
      noTimeScale: false,
    });
    el.appendChild(script);

    return () => { el.innerHTML = ''; };
  }, [symbol]);

  return (
    <div
      className="relative bg-[#0a0a0a] group hover:bg-[#0e0e0e] transition-colors overflow-hidden"
      style={{ height: 210 }}
    >
      {/* Label overlay */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 pointer-events-none">
        <span className="text-[#ff8800] font-mono text-[10px] font-bold bg-[#0a0a0a]/70 px-1 py-0.5">
          {label}
        </span>
        <span className="text-[#333] font-mono text-[8px] bg-[#0a0a0a]/70 px-1">
          {sector}
        </span>
      </div>
      <div ref={ref} className="w-full h-full" />
    </div>
  );
}

const MiniChartMemo = memo(MiniChart);

export default function MiniChartGrid() {
  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center gap-2">
        <div className="w-0.5 h-3 bg-[#ff6600]" />
        <span className="text-[#ff6600] font-mono text-[10px] font-bold tracking-widest">
          PORTFOLIO CHARTS — 1D
        </span>
        <span className="ml-auto text-[#333] font-mono text-[9px]">TradingView · click for detail</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-[#1a1a1a]">
        {TICKERS.map((t) => (
          <MiniChartMemo key={t.symbol} {...t} />
        ))}
      </div>
    </div>
  );
}
