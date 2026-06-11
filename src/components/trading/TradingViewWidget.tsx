'use client';

import { useEffect, useRef, memo } from 'react';

interface Props {
  symbol: string;
  height?: number;
  compact?: boolean;
}

function TradingViewWidget({ symbol, height = 290, compact = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    el.appendChild(inner);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval: compact ? '60' : 'D',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      withdateranges: !compact,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      save_image: false,
      backgroundColor: 'rgba(13,13,13,1)',
      gridColor: 'rgba(26,26,26,0.8)',
      studies: compact ? [] : ['RSI@tv-basicstudies'],
      hide_top_toolbar: compact,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });
    el.appendChild(script);

    return () => {
      el.innerHTML = '';
    };
  }, [symbol, compact]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container w-full overflow-hidden"
      style={{ height }}
    />
  );
}

export default memo(TradingViewWidget);
