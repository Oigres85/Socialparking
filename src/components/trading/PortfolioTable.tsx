'use client';

import { PORTFOLIO, PORTFOLIO_ORDER } from './portfolioConfig';
import type { MarketDataResponse } from '@/types/trading';

interface Props {
  marketData?: MarketDataResponse;
  loading: boolean;
}

function fmt$(n: number, decimals = 2) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtVol(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function PortfolioTable({ marketData, loading }: Props) {
  const prices = marketData?.portfolio ?? {};

  const totalInvested = PORTFOLIO_ORDER.reduce((acc, sym) => {
    const cfg = PORTFOLIO[sym];
    return acc + (cfg.qty > 0 && cfg.pmc > 0 ? cfg.qty * cfg.pmc : 0);
  }, 0);

  const totalCurrentValue = PORTFOLIO_ORDER.reduce((acc, sym) => {
    const cfg = PORTFOLIO[sym];
    const price = prices[sym]?.price ?? 0;
    return acc + (cfg.qty > 0 && price > 0 ? cfg.qty * price : 0);
  }, 0);

  const totalPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const hasConfig = PORTFOLIO_ORDER.some((s) => PORTFOLIO[s].qty > 0 && PORTFOLIO[s].pmc > 0);

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e1e1e] bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3 bg-[#ff6600]" />
          <span className="text-[#ff6600] font-mono text-[10px] font-bold tracking-widest">
            PORTFOLIO — TECH / SEMI
          </span>
        </div>
        {hasConfig && totalInvested > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[#555] font-mono text-[9px]">
              INVESTED: ${fmt$(totalInvested, 0)}
            </span>
            <span
              className={`font-mono text-[10px] font-bold ${
                totalPnl >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'
              }`}
            >
              {totalPnl >= 0 ? '+' : ''}${fmt$(totalPnl, 0)} ({totalPnl >= 0 ? '+' : ''}
              {totalPnlPct.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
            <th className="text-left px-3 py-1.5 text-[#444] tracking-widest font-bold w-12">TICK</th>
            <th className="text-right px-2 py-1.5 text-[#444] tracking-widest font-bold">PRICE</th>
            <th className="text-right px-2 py-1.5 text-[#444] tracking-widest font-bold">Δ%</th>
            <th className="text-right px-2 py-1.5 text-[#444] tracking-widest font-bold hidden sm:table-cell">PMC</th>
            <th className="text-right px-2 py-1.5 text-[#444] tracking-widest font-bold hidden md:table-cell">QTY</th>
            <th className="text-right px-3 py-1.5 text-[#444] tracking-widest font-bold hidden sm:table-cell">P&amp;L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#111]">
          {PORTFOLIO_ORDER.map((sym) => {
            const cfg = PORTFOLIO[sym];
            const q = prices[sym];
            const price = q?.price ?? 0;
            const isUp = (q?.change ?? 0) >= 0;
            const hasPmc = cfg.qty > 0 && cfg.pmc > 0;
            const pnl = hasPmc && price > 0 ? (price - cfg.pmc) * cfg.qty : null;
            const pnlPct = hasPmc && price > 0 ? ((price - cfg.pmc) / cfg.pmc) * 100 : null;
            const isPnlUp = (pnl ?? 0) >= 0;

            return (
              <tr
                key={sym}
                className="hover:bg-[#0f0f0f] transition-colors group"
              >
                {/* Ticker */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-1 h-1 rounded-full shrink-0 ${
                        q?.marketState === 'REGULAR'
                          ? 'bg-[#00e676]'
                          : 'bg-[#333]'
                      }`}
                    />
                    <span className="text-[#ff8800] font-bold">{sym}</span>
                  </div>
                  <div className="text-[#333] text-[8px] mt-0.5 truncate max-w-[60px]">
                    {cfg.sector.split('/')[0].trim()}
                  </div>
                </td>

                {/* Price */}
                <td className="px-2 py-2.5 text-right">
                  {loading || !q ? (
                    <div className="h-3 bg-[#1a1a1a] rounded animate-pulse w-16 ml-auto" />
                  ) : q.error ? (
                    <span className="text-[#444]">N/D</span>
                  ) : (
                    <span className="text-white font-bold text-[11px]">
                      ${fmt$(price)}
                    </span>
                  )}
                </td>

                {/* Change % */}
                <td className="px-2 py-2.5 text-right">
                  {loading || !q ? (
                    <div className="h-3 bg-[#1a1a1a] rounded animate-pulse w-12 ml-auto" />
                  ) : q.error ? (
                    <span className="text-[#444]">—</span>
                  ) : (
                    <span
                      className={`font-bold text-[10px] ${
                        isUp ? 'text-[#00e676]' : 'text-[#ff1744]'
                      }`}
                    >
                      {isUp ? '▲' : '▼'} {Math.abs(q.changePercent).toFixed(2)}%
                    </span>
                  )}
                </td>

                {/* PMC */}
                <td className="px-2 py-2.5 text-right hidden sm:table-cell text-[#555]">
                  {hasPmc ? `$${fmt$(cfg.pmc)}` : <span className="text-[#222]">N/C</span>}
                </td>

                {/* Qty */}
                <td className="px-2 py-2.5 text-right hidden md:table-cell text-[#555]">
                  {cfg.qty > 0 ? cfg.qty : <span className="text-[#222]">N/C</span>}
                </td>

                {/* P&L */}
                <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                  {pnl === null ? (
                    <span className="text-[#222] text-[9px]">config</span>
                  ) : (
                    <div>
                      <div
                        className={`font-bold text-[10px] ${
                          isPnlUp ? 'text-[#00e676]' : 'text-[#ff1744]'
                        }`}
                      >
                        {isPnlUp ? '+' : ''}${fmt$(Math.abs(pnl), 0)}
                      </div>
                      <div
                        className={`text-[8px] ${
                          isPnlUp ? 'text-[#00e676]/60' : 'text-[#ff1744]/60'
                        }`}
                      >
                        {isPnlUp ? '+' : ''}
                        {pnlPct!.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!hasConfig && (
        <div className="border-t border-[#111] px-3 py-2 bg-[#0a0a0a]">
          <p className="text-[#333] font-mono text-[9px] text-center">
            ⚙ Configura PMC e QTY in{' '}
            <span className="text-[#555]">src/components/trading/portfolioConfig.ts</span>
            {' '}per attivare il calcolo P&amp;L
          </p>
        </div>
      )}
    </div>
  );
}
