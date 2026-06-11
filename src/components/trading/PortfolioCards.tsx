'use client';

import type { StockQuote } from '@/types/trading';

interface Props {
  portfolioData?: Record<string, StockQuote>;
  loading: boolean;
}

const PORTFOLIO_ORDER = ['NVDA', 'MU', 'AMD', 'INTC', 'TSLA', 'MSTR'];

const SECTOR_LABELS: Record<string, string> = {
  NVDA: 'GPU/AI',
  MU: 'DRAM',
  AMD: 'CPU/GPU',
  INTC: 'CPU/FAB',
  TSLA: 'EV/TECH',
  MSTR: 'BTC PROXY',
};

function fmtPrice(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtVol(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function PortfolioCards({ portfolioData, loading }: Props) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f]">
      <div className="px-3 py-1.5 border-b border-[#1f1f1f]">
        <span className="text-[#ff6600] font-mono text-xs font-bold tracking-widest">
          ▸ PORTFOLIO — TECH / SEMICONDUCTORS
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 divide-x divide-y divide-[#1a1a1a]">
        {PORTFOLIO_ORDER.map((sym) => {
          const q = portfolioData?.[sym];
          const isUp = (q?.change ?? 0) >= 0;

          return (
            <div
              key={sym}
              className="px-3 py-3 hover:bg-[#111] transition-colors group"
            >
              {loading || !q ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-[#1f1f1f] rounded w-12" />
                  <div className="h-6 bg-[#1f1f1f] rounded w-20" />
                  <div className="h-3 bg-[#1f1f1f] rounded w-16" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[#ff8800] font-mono text-sm font-bold">{sym}</span>
                    <span className="text-[#444] font-mono text-[9px] uppercase">
                      {SECTOR_LABELS[sym]}
                    </span>
                  </div>

                  <div className="mt-1">
                    <span className="text-white font-mono text-xl font-bold">
                      ${fmtPrice(q.price)}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isUp ? 'text-[#00e676]' : 'text-[#ff1744]'
                      }`}
                    >
                      {isUp ? '▲' : '▼'} {Math.abs(q.changePercent).toFixed(2)}%
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        isUp ? 'text-[#00e676]/70' : 'text-[#ff1744]/70'
                      }`}
                    >
                      ({isUp ? '+' : ''}
                      {fmtPrice(q.change)})
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-0.5">
                    <div className="flex justify-between text-[9px] font-mono text-[#555]">
                      <span>H {fmtPrice(q.dayHigh)}</span>
                      <span>L {fmtPrice(q.dayLow)}</span>
                    </div>
                    <div className="text-[9px] font-mono text-[#444]">
                      VOL {fmtVol(q.volume)}
                    </div>
                  </div>

                  <div
                    className={`mt-2 h-0.5 w-full ${
                      q.marketState === 'REGULAR' ? 'bg-[#00e676]' : 'bg-[#333]'
                    }`}
                  />

                  {q.error && (
                    <div className="text-[9px] text-[#ff8800] font-mono mt-1">⚠ DATA ERR</div>
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
