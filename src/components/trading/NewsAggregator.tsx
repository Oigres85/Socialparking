'use client';

import { useState } from 'react';
import type { NewsResponse } from '@/types/trading';

interface Props {
  newsData?: NewsResponse;
  loading: boolean;
}

const PLACEHOLDER_FEEDS = [
  { id: 'x-twitter', name: 'X / Twitter', emoji: '𝕏', placeholder: true },
  { id: 'truth-social', name: 'Truth Social', emoji: '🔵', placeholder: true },
];

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return '';
  }
}

export default function NewsAggregator({ newsData, loading }: Props) {
  const [activeTab, setActiveTab] = useState<string>('all');

  const allFeeds = [
    ...(newsData?.feeds ?? []),
    ...PLACEHOLDER_FEEDS,
  ];

  const tabs = [{ id: 'all', name: 'ALL', emoji: '🗞' }, ...allFeeds.map((f) => ({ id: f.id, name: f.name, emoji: f.emoji }))];

  const visibleFeeds =
    activeTab === 'all'
      ? allFeeds
      : allFeeds.filter((f) => f.id === activeTab);

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] flex flex-col h-full">
      <div className="px-3 py-1.5 border-b border-[#1f1f1f]">
        <span className="text-[#ff6600] font-mono text-xs font-bold tracking-widest">
          ▸ NEWS AGGREGATOR
        </span>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[#1a1a1a] bg-[#0a0a0a] scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-[9px] font-mono whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-[#ff6600] text-[#ff6600]'
                : 'border-transparent text-[#555] hover:text-[#888]'
            }`}
          >
            {tab.emoji} {tab.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-0">
        {loading && (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-3 bg-[#1a1a1a] rounded w-full" />
                <div className="h-3 bg-[#1a1a1a] rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading &&
          visibleFeeds.map((feed) => (
            <div key={feed.id} className="border-b border-[#111]">
              <div className="px-3 py-1.5 bg-[#111] flex items-center gap-2">
                <span className="text-base leading-none">{feed.emoji}</span>
                <span className="text-[#888] font-mono text-[10px] font-bold tracking-wider uppercase">
                  {feed.name}
                </span>
                {'placeholder' in feed && (
                  <span className="ml-auto text-[8px] font-mono text-[#444] border border-[#222] px-1">
                    RSS N/A
                  </span>
                )}
              </div>

              {'placeholder' in feed ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-[#333] font-mono text-[10px]">
                    No public RSS feed available.
                  </p>
                  <p className="text-[#222] font-mono text-[9px] mt-1">
                    Use the official app or browser extension.
                  </p>
                </div>
              ) : feed.error ? (
                <div className="px-3 py-3 text-[#ff4444] font-mono text-[10px]">
                  ⚠ Feed unavailable — retry on next refresh
                </div>
              ) : feed.items.length === 0 ? (
                <div className="px-3 py-3 text-[#444] font-mono text-[10px]">No items.</div>
              ) : (
                <ul className="divide-y divide-[#111]">
                  {feed.items.map((item, i) => (
                    <li key={i} className="px-3 py-2.5 hover:bg-[#0f0f0f] transition-colors group">
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        <p className="text-[#ccc] font-mono text-[11px] leading-snug group-hover:text-white transition-colors line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-[#444] font-mono text-[9px] mt-1">
                          {timeAgo(item.pubDate)}
                        </p>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
