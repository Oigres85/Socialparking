import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

let cache: { data: unknown; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 300_000; // 5 min

const parser = new Parser({
  timeout: 12_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; TradingDashboard/1.0; +https://github.com)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

const FEEDS = [
  {
    id: 'reddit-investing',
    name: 'r/investing',
    emoji: '📈',
    url: 'https://www.reddit.com/r/investing/.rss',
  },
  {
    id: 'reddit-wsb',
    name: 'r/WallStreetBets',
    emoji: '🐂',
    url: 'https://www.reddit.com/r/wallstreetbets/.rss',
  },
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance',
    emoji: '📰',
    url: 'https://finance.yahoo.com/news/rssindex',
  },
  {
    id: 'cnbc',
    name: 'CNBC Markets',
    emoji: '📺',
    url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  },
];

export async function GET() {
  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return {
          id: feed.id,
          name: feed.name,
          emoji: feed.emoji,
          error: false,
          items: parsed.items.slice(0, 8).map((item) => ({
            title: item.title?.trim() ?? 'No title',
            link: item.link ?? '#',
            pubDate: item.pubDate ?? item.isoDate ?? '',
            snippet: (item.contentSnippet ?? item.content ?? '').slice(0, 280),
          })),
        };
      } catch {
        return { id: feed.id, name: feed.name, emoji: feed.emoji, error: true, items: [] };
      }
    })
  );

  const feeds = results.map((r, idx) =>
    r.status === 'fulfilled'
      ? r.value
      : { id: FEEDS[idx].id, name: FEEDS[idx].name, emoji: FEEDS[idx].emoji, error: true, items: [] }
  );

  const payload = { feeds, timestamp: new Date().toISOString() };
  cache = { data: payload, ts: now };
  return NextResponse.json(payload);
}
