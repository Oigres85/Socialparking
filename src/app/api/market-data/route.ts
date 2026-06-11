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

async function fetchQuote(symbol: string): Promise<StockQuote> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No meta for ${symbol}`);

  const price: number = meta.regularMarketPrice ?? 0;
  const prevClose: number = meta.previousClose ?? meta.chartPreviousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    label: LABELS[symbol] ?? symbol,
    name: meta.shortName ?? meta.longName ?? symbol,
    price,
    change,
    changePercent,
    volume: meta.regularMarketVolume ?? 0,
    dayHigh: meta.regularMarketDayHigh ?? 0,
    dayLow: meta.regularMarketDayLow ?? 0,
    previousClose: prevClose,
    currency: meta.currency ?? 'USD',
    marketState: meta.marketState ?? 'CLOSED',
  };
}

export async function GET() {
  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const allSymbols = [...PORTFOLIO, ...MACRO];
  const results = await Promise.allSettled(allSymbols.map(fetchQuote));

  const portfolio: Record<string, StockQuote> = {};
  const macro: Record<string, StockQuote> = {};

  results.forEach((r, idx) => {
    const symbol = allSymbols[idx];
    const quote: StockQuote =
      r.status === 'fulfilled'
        ? r.value
        : {
            symbol,
            label: LABELS[symbol] ?? symbol,
            name: symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            dayHigh: 0,
            dayLow: 0,
            previousClose: 0,
            currency: 'USD',
            marketState: 'CLOSED',
            error: true,
          };

    if (PORTFOLIO.includes(symbol)) portfolio[symbol] = quote;
    else macro[symbol] = quote;
  });

  const payload = { portfolio, macro, timestamp: new Date().toISOString() };
  cache = { data: payload, ts: now };
  return NextResponse.json(payload);
}
