'use client';

import { useState, useEffect, useCallback } from 'react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  thumbnail?: string;
}

interface FeedState {
  id: string;
  name: string;
  emoji: string;
  items: NewsItem[];
  loading: boolean;
  error: boolean;
}

const RSS2JSON = 'https://api.rss2json.com/v1/api.json';

const SOURCES = [
  {
    id: 'cnbc',
    name: 'CNBC Markets',
    emoji: '📺',
    url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Finance',
    emoji: '📰',
    url: 'https://finance.yahoo.com/news/rssindex',
  },
  {
    id: 'investing',
    name: 'r/investing',
    emoji: '📈',
    url: 'https://www.reddit.com/r/investing/.rss',
  },
  {
    id: 'wsb',
    name: 'r/WSB',
    emoji: '🐂',
    url: 'https://www.reddit.com/r/wallstreetbets/.rss',
  },
];

const PLACEHOLDERS = [
  { id: 'x-twitter', name: 'X / Twitter', emoji: '𝕏' },
  { id: 'truth-social', name: 'Truth Social', emoji: '🔵' },
];

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  } catch { return ''; }
}

export default function NewsPanel() {
  const [activeId, setActiveId] = useState('cnbc');
  const [feeds, setFeeds] = useState<Record<string, FeedState>>(() =>
    Object.fromEntries(
      SOURCES.map((s) => [
        s.id,
        { id: s.id, name: s.name, emoji: s.emoji, items: [], loading: true, error: false },
      ])
    )
  );

  const fetchFeed = useCallback(async (source: typeof SOURCES[number]) => {
    const url = `${RSS2JSON}?rss_url=${encodeURIComponent(source.url)}&count=12`;
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'ok' || !Array.isArray(data.items)) {
        throw new Error('Bad response');
      }

      setFeeds((prev) => ({
        ...prev,
        [source.id]: {
          ...prev[source.id],
          loading: false,
          error: false,
          items: data.items.map((item: any) => ({
            title: item.title?.trim() ?? 'No title',
            link: item.link ?? '#',
            pubDate: item.pubDate ?? '',
            thumbnail: item.thumbnail,
          })),
        },
      }));
    } catch {
      setFeeds((prev) => ({
        ...prev,
        [source.id]: { ...prev[source.id], loading: false, error: true },
      }));
    }
  }, []);

  useEffect(() => {
    SOURCES.forEach((s) => fetchFeed(s));
  }, [fetchFeed]);

  const activeFeed = feeds[activeId];

  const allTabs = [
    ...SOURCES.map((s) => ({ id: s.id, label: s.name, emoji: s.emoji, placeholder: false })),
    ...PLACEHOLDERS.map((p) => ({ id: p.id, label: p.name, emoji: p.emoji, placeholder: true })),
  ];

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] flex flex-col h-full">
      {/* Panel header */}
      <div className="px-3 py-1.5 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center gap-2 shrink-0">
        <div className="w-0.5 h-3 bg-[#ff6600]" />
        <span className="text-[#ff6600] font-mono text-[10px] font-bold tracking-widest">
          NEWS AGGREGATOR
        </span>
        <span className="ml-auto text-[#333] font-mono text-[9px]">rss2json</span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#1a1a1a] bg-[#080808] overflow-x-auto shrink-0">
        {allTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.placeholder && setActiveId(tab.id)}
            disabled={tab.placeholder}
            className={`flex items-center gap-1 px-3 py-2 font-mono text-[9px] whitespace-nowrap border-b-2 transition-all ${
              tab.placeholder
                ? 'text-[#2a2a2a] border-transparent cursor-not-allowed'
                : activeId === tab.id
                ? 'border-[#ff6600] text-[#ff6600]'
                : 'border-transparent text-[#444] hover:text-[#777]'
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            {tab.placeholder && (
              <span className="text-[7px] text-[#222] ml-1">[no RSS]</span>
            )}
          </button>
        ))}
      </div>

      {/* Feed content */}
      <div className="flex-1 overflow-y-auto">
        {PLACEHOLDERS.some((p) => p.id === activeId) ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-[#2a2a2a] font-mono text-[11px]">
              Nessun feed RSS pubblico disponibile per questa fonte.
            </p>
            <p className="text-[#1a1a1a] font-mono text-[9px] mt-1">
              Usa l&apos;app ufficiale o una browser extension per seguire questi feed.
            </p>
          </div>
        ) : activeFeed?.loading ? (
          <div className="p-4 space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-2.5 bg-[#151515] rounded w-full" />
                <div className="h-2.5 bg-[#151515] rounded w-3/4" />
                <div className="h-2 bg-[#111] rounded w-20 mt-0.5" />
              </div>
            ))}
          </div>
        ) : activeFeed?.error ? (
          <div className="p-4 text-center">
            <p className="text-[#ff4444] font-mono text-[10px]">
              ⚠ Feed temporaneamente non disponibile
            </p>
            <button
              onClick={() => {
                const src = SOURCES.find((s) => s.id === activeId)!;
                setFeeds((p) => ({
                  ...p,
                  [activeId]: { ...p[activeId], loading: true, error: false },
                }));
                fetchFeed(src);
              }}
              className="mt-2 text-[9px] font-mono text-[#444] border border-[#222] px-2 py-0.5 hover:text-[#888] transition-colors"
            >
              ↻ RETRY
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#0f0f0f]">
            {activeFeed?.items.map((item, i) => (
              <li key={i} className="hover:bg-[#0f0f0f] transition-colors group">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2.5"
                >
                  <p className="text-[#bbb] font-mono text-[11px] leading-snug group-hover:text-white transition-colors line-clamp-2">
                    {item.title}
                  </p>
                  <p className="text-[#333] font-mono text-[8px] mt-1">
                    {timeAgo(item.pubDate)}
                    {item.pubDate && ' ago'}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
