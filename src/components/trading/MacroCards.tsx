'use client';

import type { StockQuote } from '@/types/trading';

interface Props {
  macroData?: Record<string, StockQuote>;
  loading: boolean;
}

const MACRO = [
  {
    key: '^VIX',  label: 'VIX',     desc: 'Volatility Index',  decimals: 2,
    badge: (v: number) => v > 30 ? ['PANIC',   'text-[#ff1744]'] : v > 20 ? ['FEARFUL', 'text-[#ffaa00]'] : ['CALM',   'text-[#00e676]'],
  },
  {
    key: '^TNX',  label: 'US 10Y',  desc: 'Treasury Yield',    decimals: 3, suffix: '%',
    badge: (v: number) => v > 4.5 ? ['HAWKISH', 'text-[#ff1744]'] : v > 4   ? ['NEUTRAL', 'text-[#ffaa00]'] : ['DOVISH', 'text-[#00e676]'],
  },
  {
    key: '^KS11', label: 'KOSPI',   desc: 'Korea Composite',   decimals: 0,
    badge: () => ['', ''] as [string, string],
  },
  {
    key: 'JPY=X', label: 'USD/JPY', desc: 'Dollar / Yen',      decimals: 2,
    badge: (v: number) => v > 150 ? ['WEAK ¥',  'text-[#ff1744]'] : v > 145 ? ['SOFT ¥',  'text-[#ffaa00]'] : ['FIRM ¥', 'text-[#00e676]'],
  },
] as const;

function fmt(n: number, d: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function MacroCards({ macroData, loading }: Props) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e]">
      <div className="px-3 py-1.5 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center gap-2">
        <div className="w-0.5 h-3 bg-[#ff6600]" />
        <span className="text-[#ff6600] font-mono text-[10px] font-bold tracking-widest">
          MACRO INDICATORS — REAL TIME
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4">
        {MACRO.map(({ key, label, desc, decimals, badge, ...rest }, idx) => {
          const q = macroData?.[key];
          const isUp = (q?.change ?? 0) >= 0;
          const [badgeLabel, badgeCls] = q && !q.error ? badge(q.price) : ['', ''];

          return (
            <div
              key={key}
              className={`relative px-5 py-5 ${idx < 3 ? 'border-r border-[#1e1e1e]' : ''} ${idx < 2 ? 'border-b lg:border-b-0 border-[#1e1e1e]' : ''}`}
            >
              {loading || !q ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-[#1a1a1a] rounded w-14" />
                  <div className="h-10 bg-[#1a1a1a] rounded w-32" />
                  <div className="h-3 bg-[#1a1a1a] rounded w-20" />
                </div>
              ) : (
                <>
                  {/* Label row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#ff8800] font-mono text-xs font-bold tracking-[0.15em]">
                      {label}
                    </span>
                    {badgeLabel && (
                      <span className={`font-mono text-[8px] font-bold tracking-widest ${badgeCls}`}>
                        {badgeLabel}
                      </span>
                    )}
                  </div>

                  {/* Value */}
                  <div className="font-mono font-bold text-white">
                    {q.error ? (
                      <span className="text-[#333] text-2xl">N / D</span>
                    ) : (
                      <span className="text-3xl xl:text-4xl tracking-tight">
                        {fmt(q.price, decimals)}
                        {'suffix' in rest && (rest as any).suffix && (
                          <span className="text-xl text-[#888] ml-0.5">{(rest as any).suffix}</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Change */}
                  {!q.error && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`font-mono text-sm font-bold ${isUp ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                        {isUp ? '▲' : '▼'} {Math.abs(q.changePercent).toFixed(2)}%
                      </span>
                      <span className={`font-mono text-[10px] ${isUp ? 'text-[#00e676]/50' : 'text-[#ff1744]/50'}`}>
                        {isUp ? '+' : ''}{fmt(q.change, decimals)}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  <div className="mt-1.5 text-[#444] font-mono text-[8px] uppercase tracking-widest">
                    {desc}
                  </div>

                  {/* Bottom colour bar */}
                  {!q.error && (
                    <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${isUp ? 'bg-[#00e676]/25' : 'bg-[#ff1744]/25'}`} />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
