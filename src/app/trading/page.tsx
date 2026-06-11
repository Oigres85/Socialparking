'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { MarketDataResponse } from '@/types/trading';

import MacroCards    from '@/components/trading/MacroCards';
import PortfolioTable from '@/components/trading/PortfolioTable';
import AINotesPanel  from '@/components/trading/AINotesPanel';
import ClaudeAIBridge from '@/components/trading/ClaudeAIBridge';

const TickerTapeWidget     = dynamic(() => import('@/components/trading/TickerTapeWidget'),     { ssr: false });
const MiniChartGrid        = dynamic(() => import('@/components/trading/MiniChartGrid'),        { ssr: false });
const AdvancedChartWidget  = dynamic(() => import('@/components/trading/AdvancedChartWidget'),  { ssr: false });
const MarketOverviewWidget = dynamic(() => import('@/components/trading/MarketOverviewWidget'), { ssr: false });
const NewsPanel            = dynamic(() => import('@/components/trading/NewsPanel'),            { ssr: false });

interface NewsItem { title: string; link: string; pubDate: string; }
interface NewsFeed  { id: string; name: string; items: NewsItem[]; }

/* ── Live Clock ────────────────────────────────────────────────── */
function Clock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () =>
      setT(new Date().toLocaleTimeString('en-US', {
        hour12: false, timeZone: 'America/New_York',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[#555] text-[11px] tabular-nums hidden sm:block">
      {t}&nbsp;<span className="text-[#333]">ET</span>
    </span>
  );
}

/* ── Status Dot ────────────────────────────────────────────────── */
function MarketStatus({ open }: { open: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${open ? 'bg-[#00e676] animate-pulse' : 'bg-[#333]'}`} />
      <span className={`font-mono text-[9px] tracking-widest ${open ? 'text-[#00e676]' : 'text-[#444]'}`}>
        {open ? 'MARKET OPEN' : 'AFTER HOURS'}
      </span>
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────── */
export default function TradingDashboard() {
  const [market, setMarket] = useState<MarketDataResponse | undefined>();
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpd, setLastUpd]     = useState('');
  const [dataErr, setDataErr]     = useState(false);
  const [aiNotes, setAiNotes]     = useState('');
  const [newsFeeds, setNewsFeeds] = useState<NewsFeed[]>([]);

  useEffect(() => {
    const s = localStorage.getItem('trading-ai-notes');
    if (s) setAiNotes(s);
  }, []);

  const fetchMarket = useCallback(async () => {
    try {
      const res  = await fetch('/api/market-data');
      const data: MarketDataResponse = await res.json();
      setMarket(data);
      setLastUpd(new Date().toLocaleTimeString('it-IT'));
      setDataErr(false);
    } catch {
      setDataErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMarket();
    setRefreshing(false);
  }, [fetchMarket]);

  useEffect(() => {
    fetchMarket();
    const id = setInterval(fetchMarket, 60_000);
    return () => clearInterval(id);
  }, [fetchMarket]);

  const isOpen = market?.portfolio?.['NVDA']?.marketState === 'REGULAR';

  return (
    <div
      className="min-h-screen bg-[#060606] text-white overflow-x-hidden"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* ══ TICKER TAPE (sticky) ════════════════════════════════════ */}
      <div className="sticky top-0 z-50 bg-[#060606] border-b border-[#111]">
        <TickerTapeWidget />
      </div>

      {/* ══ HEADER ═════════════════════════════════════════════════ */}
      <header className="border-b border-[#111] bg-[#080808] px-4 py-2 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col gap-[3px]">
              <div className="h-[2px] w-6 bg-[#ff6600]" />
              <div className="h-[2px] w-4 bg-[#ff6600]/50" />
              <div className="h-[2px] w-5 bg-[#ff6600]/25" />
            </div>
            <span className="text-[#ff6600] font-mono font-bold tracking-[0.2em] text-sm">
              TRADING TERMINAL
            </span>
          </div>
          <span className="text-[#1f1f1f] hidden sm:block select-none">│</span>
          <span className="text-[#2a2a2a] font-mono text-[10px] tracking-widest hidden sm:block">
            INSTITUTIONAL · TECH / SEMI
          </span>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-4 shrink-0">
          {dataErr && (
            <span className="text-[#ff4444] font-mono text-[9px] tracking-wider hidden md:block">
              ⚠ API ERROR
            </span>
          )}
          {lastUpd && (
            <span className="text-[#333] font-mono text-[9px] hidden sm:block">UPD {lastUpd}</span>
          )}
          <Clock />
          <MarketStatus open={isOpen} />
          <button
            onClick={doRefresh}
            disabled={refreshing}
            className="font-mono text-[10px] border border-[#ff6600]/40 text-[#ff6600]/70 px-3 py-1 tracking-widest hover:bg-[#ff6600]/10 hover:text-[#ff6600] hover:border-[#ff6600] active:scale-95 transition-all disabled:opacity-30"
          >
            {refreshing ? '↻  …' : '↻  REFRESH'}
          </button>
        </div>
      </header>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════ */}
      <main className="p-3 space-y-3">

        {/* ─ ROW 1: MACRO CARDS ─────────────────────────────────── */}
        <MacroCards macroData={market?.macro} loading={loading} />

        {/* ─ ROW 2: PORTFOLIO TABLE  full width ────────────────── */}
        <PortfolioTable marketData={market} loading={loading} />

        {/* ─ ROW 3: MINI CHART GRID | ADVANCED CHART ───────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-3">
          {/* Left: 2×3 mini chart grid */}
          <MiniChartGrid />

          {/* Right: full interactive chart + symbol switcher */}
          <div style={{ minHeight: 520 }}>
            <AdvancedChartWidget />
          </div>
        </div>

        {/* ─ ROW 4: MARKET OVERVIEW | NEWS ─────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-3">
          <div style={{ minHeight: 400 }}>
            <MarketOverviewWidget />
          </div>
          <div style={{ minHeight: 400 }}>
            <NewsPanel />
          </div>
        </div>

        {/* ─ ROW 5: CLAUDE BRIDGE | AI NOTES ───────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <ClaudeAIBridge marketData={market} newsFeeds={newsFeeds} />
          <AINotesPanel notes={aiNotes} onChange={setAiNotes} />
        </div>

      </main>

      {/* ══ FOOTER ════════════════════════════════════════════════ */}
      <footer className="border-t border-[#0f0f0f] mt-3 px-4 py-3">
        <p className="text-[#1a1a1a] font-mono text-[8px] text-center tracking-widest uppercase">
          Charts & Live Prices: TradingView Free Widget · Quotes: Yahoo Finance v7 / Stooq.com · News: RSS2JSON
          &nbsp;│&nbsp; Not Financial Advice
        </p>
      </footer>
    </div>
  );
}
