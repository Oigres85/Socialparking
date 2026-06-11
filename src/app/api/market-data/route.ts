import { NextResponse } from 'next/server';
import type { StockQuote } from '@/types/trading';

const DATA_TTL    = 60_000;      // 1 min
const SESSION_TTL = 25 * 60_000; // 25 min

let dataCache: { data: unknown; ts: number } = { data: null, ts: 0 };
let yahooSession: { crumb: string; cookies: string; ts: number } | null = null;

const PORTFOLIO = ['NVDA', 'AMD', 'MU', 'INTC', 'TSLA', 'MSTR', 'RGTI', 'OKLO', 'ARBE'];
const MACRO     = ['^VIX', '^TNX', '^KS11', 'JPY=X'];

const LABELS: Record<string, string> = {
  '^VIX': 'VIX', '^TNX': 'US 10Y', '^KS11': 'KOSPI', 'JPY=X': 'USD/JPY',
};

const STOOQ: Record<string, string> = {
  NVDA: 'nvda.us', AMD: 'amd.us', MU: 'mu.us',
  INTC: 'intc.us', TSLA: 'tsla.us', MSTR: 'mstr.us',
  RGTI: 'rgti.us', OKLO: 'oklo.us', ARBE: 'arbe.us',
  '^VIX': '^vix', '^TNX': 'tnx', '^KS11': '^ks11', 'JPY=X': 'usdjpy',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function empty(symbol: string): StockQuote {
  return { symbol, label: LABELS[symbol] ?? symbol, name: symbol, price: 0, change: 0, changePercent: 0, volume: 0, dayHigh: 0, dayLow: 0, previousClose: 0, currency: 'USD', marketState: 'CLOSED', error: true };
}

// ── Yahoo Finance: get crumb/cookie session ───────────────────────
async function getYahooSession(): Promise<{ crumb: string; cookies: string }> {
  const now = Date.now();
  if (yahooSession && now - yahooSession.ts < SESSION_TTL) return yahooSession;

  const initRes = await fetch('https://finance.yahoo.com/quote/NVDA/', {
    headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  });

  // Extract name=value pairs from all Set-Cookie headers (undici joins with \n)
  const rawCookies = initRes.headers.get('set-cookie') ?? '';
  const cookies = rawCookies
    .split(/\n|,(?=[^,]+=)/)
    .map((c) => c.split(';')[0].trim())
    .filter((c) => c.includes('=') && /^[A-Za-z]/.test(c))
    .join('; ');

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookies, Accept: '*/*' },
    signal: AbortSignal.timeout(6_000),
  });
  const crumb = (await crumbRes.text()).trim();

  if (!crumb || crumb.length < 3 || crumb.includes('<') || crumb.includes('Unauthorized')) {
    throw new Error(`Bad crumb: "${crumb.slice(0, 40)}"`);
  }

  yahooSession = { crumb, cookies, ts: now };
  return yahooSession;
}

// ── Yahoo Finance v7 batch quote ──────────────────────────────────
async function fromYahooBatch(symbols: string[]): Promise<Map<string, StockQuote>> {
  const { crumb, cookies } = await getYahooSession();
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}&crumb=${encodeURIComponent(crumb)}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: cookies, Accept: 'application/json', Referer: 'https://finance.yahoo.com/' },
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Yahoo v7 HTTP ${res.status}`);

  const data = await res.json();
  const results: any[] = data?.quoteResponse?.result ?? [];

  const map = new Map<string, StockQuote>();
  for (const q of results) {
    const price = q.regularMarketPrice ?? 0;
    const prev  = q.regularMarketPreviousClose ?? price;
    const change = price - prev;
    map.set(q.symbol, {
      symbol: q.symbol, label: LABELS[q.symbol] ?? q.symbol,
      name: q.shortName ?? q.longName ?? q.symbol,
      price, change,
      changePercent: prev ? (change / prev) * 100 : 0,
      volume: q.regularMarketVolume ?? 0,
      dayHigh: q.regularMarketDayHigh ?? 0,
      dayLow: q.regularMarketDayLow ?? 0,
      previousClose: prev, currency: q.currency ?? 'USD',
      marketState: q.marketState ?? 'CLOSED',
    });
  }
  return map;
}

// ── Stooq fallback (per-symbol) ───────────────────────────────────
async function fromStooq(symbol: string): Promise<StockQuote> {
  const s = STOOQ[symbol];
  if (!s) throw new Error(`No stooq map for ${symbol}`);
  const res = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcvn&h&e=json`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    signal: AbortSignal.timeout(8_000), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Stooq ${res.status}`);
  const data = await res.json();
  const sym = data?.symbols?.[0];
  if (!sym || sym.d === 'N/D' || !sym.c || sym.c === '-') throw new Error('Stooq N/D');
  const close = parseFloat(sym.c) || 0;
  const open  = parseFloat(sym.o) || close;
  const change = close - open;
  return {
    symbol, label: LABELS[symbol] ?? symbol, name: sym.n || symbol,
    price: close, change, changePercent: open ? (change / open) * 100 : 0,
    volume: parseInt(sym.v) || 0, dayHigh: parseFloat(sym.h) || 0,
    dayLow: parseFloat(sym.l) || 0, previousClose: open,
    currency: symbol === 'JPY=X' ? 'JPY' : 'USD', marketState: 'REGULAR',
  };
}

export async function GET() {
  const now = Date.now();
  if (dataCache.data && now - dataCache.ts < DATA_TTL) return NextResponse.json(dataCache.data);

  const allSymbols = [...PORTFOLIO, ...MACRO];
  let yahooMap = new Map<string, StockQuote>();

  try {
    yahooMap = await fromYahooBatch(allSymbols);
  } catch (err) {
    console.warn('[market-data] Yahoo batch failed, using stooq fallback:', String(err));
    yahooSession = null; // force re-auth next time
  }

  const portfolio: Record<string, StockQuote> = {};
  const macro:     Record<string, StockQuote> = {};

  await Promise.all(
    allSymbols.map(async (symbol) => {
      let q = yahooMap.get(symbol);
      if (!q || (q.price === 0 && !q.error)) {
        try { q = await fromStooq(symbol); } catch { q = empty(symbol); }
      }
      if (PORTFOLIO.includes(symbol)) portfolio[symbol] = q!;
      else                            macro[symbol] = q!;
    })
  );

  const payload = { portfolio, macro, timestamp: new Date().toISOString() };
  dataCache = { data: payload, ts: now };
  return NextResponse.json(payload);
}
