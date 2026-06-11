'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { MarketDataResponse, NewsResponse } from '@/types/trading';

import MacroBar from '@/components/trading/MacroBar';
import PortfolioCards from '@/components/trading/PortfolioCards';
import AINotesPanel from '@/components/trading/AINotesPanel';
import ClaudeAIBridge from '@/components/trading/ClaudeAIBridge';

const TradingViewGrid = dynamic(() => import('@/components/trading/TradingViewGrid'), {
  ssr: false,
});
const NewsAggregator = dynamic(() => import('@/components/trading/NewsAggregator'), {
  ssr: false,
});

export default function TradingDashboard() {
  const [marketData, setMarketData] = useState<MarketDataResponse | undefined>();
  const [newsData, setNewsData] = useState<NewsResponse | undefined>();
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [aiNotes, setAiNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('trading-ai-notes');
    if (saved) setAiNotes(saved);
  }, []);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market-data');
      const data = await res.json();
      setMarketData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Market fetch error', err);
    } finally {
      setLoadingMarket(false);
    }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      setNewsData(data);
    } catch (err) {
      console.error('News fetch error', err);
    } finally {
      setLoadingNews(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMarket(), fetchNews()]);
    setRefreshing(false);
  }, [fetchMarket, fetchNews]);

  useEffect(() => {
    fetchMarket();
    fetchNews();
    const interval = setInterval(fetchMarket, 60_000);
    return () => clearInterval(interval);
  }, [fetchMarket, fetchNews]);

  const isMarketOpen =
    marketData?.portfolio?.['NVDA']?.marketState === 'REGULAR';

  return (
    <div
      className="min-h-screen bg-[#080808] text-[#e0e0e0]"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-[#1a1a1a] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#ff6600] font-bold text-base tracking-[0.2em] shrink-0">
            ◉ TRADING TERMINAL
          </span>
          <span className="text-[#333] hidden sm:block">│</span>
          <span className="text-[#444] text-[10px] tracking-widest hidden sm:block">
            INSTITUTIONAL DASHBOARD v1.0
          </span>
          <span className="text-[#333] hidden md:block">│</span>
          <span className="text-[#444] text-[10px] hidden md:block">
            TECH / SEMICONDUCTORS
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {lastUpdate && (
            <span className="text-[#333] text-[9px] font-mono hidden sm:block">
              UPD {lastUpdate.toLocaleTimeString('it-IT')}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isMarketOpen ? 'bg-[#00e676] animate-pulse' : 'bg-[#444]'
              }`}
            />
            <span className="text-[9px] font-mono text-[#444]">
              {isMarketOpen ? 'MARKET OPEN' : 'AFTER HOURS'}
            </span>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="text-[10px] font-mono border border-[#ff6600]/60 text-[#ff6600] px-2.5 py-1 hover:bg-[#ff6600] hover:text-black transition-colors disabled:opacity-50 tracking-widest"
          >
            {refreshing ? '↻ …' : '↻ REFRESH'}
          </button>
        </div>
      </header>

      <main className="p-3 space-y-3">
        {/* ── MACRO BAR ── */}
        <MacroBar macroData={marketData?.macro} loading={loadingMarket} />

        {/* ── PORTFOLIO CARDS ── */}
        <PortfolioCards portfolioData={marketData?.portfolio} loading={loadingMarket} />

        {/* ── CHARTS + NEWS ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
          <div className="xl:col-span-3">
            <TradingViewGrid />
          </div>
          <div className="xl:col-span-2 min-h-[600px]">
            <NewsAggregator newsData={newsData} loading={loadingNews} />
          </div>
        </div>

        {/* ── CLAUDE AI BRIDGE + AI NOTES ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <ClaudeAIBridge marketData={marketData} newsData={newsData} />
          <AINotesPanel notes={aiNotes} onChange={setAiNotes} />
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#111] px-4 py-3 mt-4">
        <p className="text-[#222] font-mono text-[9px] text-center tracking-wider">
          DATA: YAHOO FINANCE (DELAYED) — NEWS: RSS PUBLIC FEEDS — CHARTS: TRADINGVIEW FREE WIDGET
          &nbsp;│&nbsp;
          FOR INFORMATIONAL PURPOSES ONLY — NOT FINANCIAL ADVICE
        </p>
      </footer>
    </div>
  );
}
