'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { MarketDataResponse } from '@/types/trading';
import PortfolioTable from '@/components/trading/PortfolioTable';
import AINotesPanel from '@/components/trading/AINotesPanel';
import ClaudeAIBridge from '@/components/trading/ClaudeAIBridge';

// All TradingView widgets must be client-only (no SSR)
const TickerTapeWidget     = dynamic(() => import('@/components/trading/TickerTapeWidget'),     { ssr: false });
const MarketOverviewWidget = dynamic(() => import('@/components/trading/MarketOverviewWidget'), { ssr: false });
const AdvancedChartWidget  = dynamic(() => import('@/components/trading/AdvancedChartWidget'),  { ssr: false });
const NewsPanel            = dynamic(() => import('@/components/trading/NewsPanel'),            { ssr: false });

interface NewsItem { title: string; link: string; pubDate: string; }
interface NewsFeed { id: string; name: string; items: NewsItem[]; }

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'America/New_York',
        }) + ' ET'
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-[#444] font-mono text-[10px] tabular-nums">{time}</span>;
}

export default function TradingDashboard() {
  const [marketData, setMarketData] = useState<MarketDataResponse | undefined>();
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [aiNotes, setAiNotes] = useState('');
  // Shared news state lifted up for Claude Bridge
  const [newsFeeds, setNewsFeeds] = useState<NewsFeed[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('trading-ai-notes');
    if (saved) setAiNotes(saved);
  }, []);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market-data');
      const data: MarketDataResponse = await res.json();
      setMarketData(data);
      setLastUpdate(new Date().toLocaleTimeString('it-IT'));
    } catch { /* silently fail — TradingView widgets still show live data */ }
    finally { setLoadingMarket(false); }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMarket();
    setRefreshing(false);
  }, [fetchMarket]);

  useEffect(() => {
    fetchMarket();
    const id = setInterval(fetchMarket, 60_000);
    return () => clearInterval(id);
  }, [fetchMarket]);

  const isOpen = marketData?.portfolio?.['NVDA']?.marketState === 'REGULAR';

  return (
    <div
      className="min-h-screen bg-[#060606] text-[#e0e0e0] overflow-x-hidden"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* ════ TICKER TAPE (sticky) ════ */}
      <div className="sticky top-0 z-50 bg-[#060606] border-b border-[#1a1a1a]">
        <TickerTapeWidget />
      </div>

      {/* ════ HEADER ════ */}
      <header className="border-b border-[#1a1a1a] bg-[#080808] px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col gap-0.5">
              <div className="h-0.5 w-5 bg-[#ff6600]" />
              <div className="h-0.5 w-3 bg-[#ff6600]/60" />
              <div className="h-0.5 w-4 bg-[#ff6600]/30" />
            </div>
            <span className="text-[#ff6600] font-mono font-bold tracking-[0.25em] text-sm">
              TRADING TERMINAL
            </span>
          </div>

          <span className="text-[#1e1e1e] hidden sm:block">│</span>
          <span className="text-[#333] font-mono text-[10px] tracking-widest hidden sm:block">
            INSTITUTIONAL DASHBOARD
          </span>
          <span className="text-[#1e1e1e] hidden md:block">│</span>
          <span className="text-[#2a2a2a] font-mono text-[10px] hidden md:block">
            TECH / SEMICONDUCTORS · NVDA MU AMD INTC TSLA MSTR
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <Clock />
          {lastUpdate && (
            <span className="text-[#2a2a2a] font-mono text-[9px] hidden sm:block">
              UPD {lastUpdate}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                isOpen ? 'bg-[#00e676] animate-pulse' : 'bg-[#333]'
              }`}
            />
            <span className="font-mono text-[9px] text-[#444]">
              {isOpen ? 'MARKET OPEN' : 'AFTER HOURS'}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="font-mono text-[10px] border border-[#ff6600]/40 text-[#ff6600]/70 px-3 py-1 tracking-widest hover:bg-[#ff6600]/10 hover:text-[#ff6600] hover:border-[#ff6600] transition-all disabled:opacity-30"
          >
            {refreshing ? '↻ …' : '↻ REFRESH'}
          </button>
        </div>
      </header>

      <main className="p-3 space-y-3">
        {/* ════ UPPER SECTION: Left column | Advanced Chart ════ */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
          {/* Left column: Portfolio table + Market Overview */}
          <div className="flex flex-col gap-3">
            <PortfolioTable marketData={marketData} loading={loadingMarket} />
            <div className="flex-1" style={{ minHeight: 360 }}>
              <MarketOverviewWidget />
            </div>
          </div>

          {/* Advanced chart with symbol + interval selector */}
          <div style={{ minHeight: 540 }}>
            <AdvancedChartWidget />
          </div>
        </div>

        {/* ════ LOWER SECTION: News | Claude Bridge + AI Notes ════ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {/* News panel (client-side rss2json) */}
          <div style={{ minHeight: 520 }}>
            <NewsPanel />
          </div>

          {/* Right column: Claude Bridge + AI Notes */}
          <div className="flex flex-col gap-3">
            <ClaudeAIBridge marketData={marketData} newsFeeds={newsFeeds} />
            <AINotesPanel notes={aiNotes} onChange={setAiNotes} />
          </div>
        </div>
      </main>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-[#0f0f0f] mt-4 px-4 py-3">
        <p className="text-[#1a1a1a] font-mono text-[8px] text-center tracking-widest">
          CHARTS & PRICES: TRADINGVIEW FREE WIDGET · DELAYED QUOTES: YAHOO FINANCE / STOOQ.COM
          &nbsp;│&nbsp;NEWS: API.RSS2JSON.COM · FOR INFORMATIONAL PURPOSES ONLY · NOT FINANCIAL ADVICE
        </p>
      </footer>
    </div>
  );
}
