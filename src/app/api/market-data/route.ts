import { NextResponse } from 'next/server';
import type { StockQuote } from '@/types/trading';

let cache: { data: unknown; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 60_000;

const PORTFOLIO = ['NVDA', 'MU', 'AMD', 'INTC', 'TSLA', 'MSTR'];
const MACRO = ['^VIX', '^TNX', '^KS11', 'JPY=X'];

const LABELS: Record<string, string> = {
  '^VIX': 'VIX',
  '^TNX': 'US 10Y',
  '^KS11': 'KOSPI',
  'JPY=X': 'USD/JPY',
};

// stooq.com symbol mapping (fallback source, no API key, no Cloudflare)
const STOOQ: Record<string, string> = {
  NVDA: 'nvda.us', MU: 'mu.us', AMD: 'amd.us',
  INTC: 'intc.us', TSLA: 'tsla.us', MSTR: 'mstr.us',
  '^VIX': '^vix', '^TNX': 'tnx', '^KS11': '^ks11', 'JPY=X': 'usdjpy',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function fromYahoo(symbol: string): Promise<StockQuote> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://finance.yahoo.com/',
      Origin: 'https://finance.yahoo.com',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(9_000),
  });

  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error('No Yahoo price');

  const price: number = meta.regularMarketPrice;
  const prev: number = meta.previousClose ?? meta.chartPreviousClose ?? price;
  const change = price - prev;

  return {
    symbol, label: LABELS[symbol] ?? symbol,
    name: meta.shortName ?? meta.longName ?? symbol,
    price, change,
    changePercent: prev ? (change / prev) * 100 : 0,
    volume: meta.regularMarketVolume ?? 0,
    dayHigh: meta.regularMarketDayHigh ?? 0,
    dayLow: meta.regularMarketDayLow ?? 0,
    previousClose: prev,
    currency: meta.currency ?? 'USD',
    marketState: meta.marketState ?? 'CLOSED',
  };
}

async function fromStooq(symbol: string): Promise<StockQuote> {
  const s = STOOQ[symbol];
  if (!s) throw new Error(`No stooq map for ${symbol}`);

  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcvn&h&e=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    cache: 'no-store',
    signal: AbortSignal.timeout(9_000),
  });

  if (!res.ok) throw new Error(`Stooq ${res.status}`);
  const data = await res.json();
  const sym = data?.symbols?.[0];

  if (!sym || sym.d === 'N/D' || !sym.c || sym.c === '-') {
    throw new Error(`Stooq N/D for ${symbol}`);
  }

  const close = parseFloat(sym.c) || 0;
  const open = parseFloat(sym.o) || close;
  const change = close - open;

  return {
    symbol, label: LABELS[symbol] ?? symbol,
    name: sym.n || symbol, price: close, change,
    changePercent: open ? (change / open) * 100 : 0,
    volume: parseInt(sym.v) || 0,
    dayHigh: parseFloat(sym.h) || 0,
    dayLow: parseFloat(sym.l) || 0,
    previousClose: open,
    currency: symbol === 'JPY=X' ? 'JPY' : 'USD',
    marketState: 'REGULAR',
  };
}

async function fetchQuote(symbol: string): Promise<StockQuote> {
  try { return await fromYahoo(symbol); } catch { /* fall through */ }
  try { return await fromStooq(symbol); } catch { /* fall through */ }

  return {
    symbol, label: LABELS[symbol] ?? symbol, name: symbol,
    price: 0, change: 0, changePercent: 0, volume: 0,
    dayHigh: 0, dayLow: 0, previousClose: 0,
    currency: 'USD', marketState: 'CLOSED', error: true,
  };
}

export async function GET() {
  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_TTL) return NextResponse.json(cache.data);

  const all = [...PORTFOLIO, ...MACRO];
  const results = await Promise.allSettled(all.map(fetchQuote));

  const portfolio: Record<string, StockQuote> = {};
  const macro: Record<string, StockQuote> = {};

  results.forEach((r, i) => {
    const sym = all[i];
    const q =
      r.status === 'fulfilled'
        ? r.value
        : ({
            symbol: sym, label: LABELS[sym] ?? sym, name: sym,
            price: 0, change: 0, changePercent: 0, volume: 0,
            dayHigh: 0, dayLow: 0, previousClose: 0,
            currency: 'USD', marketState: 'CLOSED', error: true,
          } as StockQuote);
    if (PORTFOLIO.includes(sym)) portfolio[sym] = q;
    else macro[sym] = q;
  });

  const payload = { portfolio, macro, timestamp: new Date().toISOString() };
  cache = { data: payload, ts: now };
  return NextResponse.json(payload);
}
