'use client';

import type { StockQuote } from '@/types/trading';

interface Props {
  macroData?: Record<string, StockQuote>;
  loading: boolean;
}

const MACRO_ORDER = [
  { key: '^VIX', label: 'VIX', desc: 'Fear Index', decimals: 2, unit: '' },
  { key: '^TNX', label: 'US 10Y', desc: 'Treasury Yield', decimals: 3, unit: '%' },
  { key: '^KS11', label: 'KOSPI', desc: 'Korea Composite', decimals: 0, unit: '' },
  { key: 'JPY=X', label: 'USD/JPY', desc: 'Dollar-Yen', decimals: 2, unit: '' },
];

function fmt(n: number, decimals: number) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function MacroBar({ macroData, loading }: Props) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f]">
      <div className="px-3 py-1.5 border-b border-[#1f1f1f]">
        <span className="text-[#ff6600] font-mono text-xs font-bold tracking-widest">
          ▸ MACRO INDICATORS
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#1f1f1f]">
        {MACRO_ORDER.map(({ key, label, desc, decimals, unit }) => {
          const q = macroData?.[key];
          const isUp = (q?.change ?? 0) >= 0;

          return (
            <div key={key} className="px-4 py-3">
              {loading || !q ? (
                <div className="space-y-1.5 animate-pulse">
                  <div className="h-3 bg-[#1f1f1f] rounded w-16" />
                  <div className="h-5 bg-[#1f1f1f] rounded w-24" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#888] font-mono text-[10px] tracking-widest uppercase">
                      {label}
                    </span>
                    <span className="text-[#444] font-mono text-[9px]">{desc}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-white font-mono text-lg font-bold">
                      {fmt(q.price, decimals)}
                      {unit}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        isUp ? 'text-[#00e676]' : 'text-[#ff1744]'
                      }`}
                    >
                      {isUp ? '▲' : '▼'} {Math.abs(q.changePercent).toFixed(2)}%
                    </span>
                  </div>
                  {q.error && (
                    <span className="text-[#ff8800] text-[9px] font-mono">DATA ERROR</span>
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
