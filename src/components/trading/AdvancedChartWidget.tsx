'use client';

import { useState, useEffect, useRef, memo } from 'react';

const SYMBOLS = [
  { id: 'NASDAQ:NVDA',  label: 'NVDA' },
  { id: 'NASDAQ:AMD',   label: 'AMD'  },
  { id: 'NASDAQ:MU',    label: 'MU'   },
  { id: 'NASDAQ:INTC',  label: 'INTC' },
  { id: 'NASDAQ:TSLA',  label: 'TSLA' },
  { id: 'NASDAQ:MSTR',  label: 'MSTR' },
  { id: 'NASDAQ:RGTI',  label: 'RGTI' },
  { id: 'NYSE:OKLO',    label: 'OKLO' },
  { id: 'NASDAQ:ARBE',  label: 'ARBE' },
  { id: 'CBOE:VIX',     label: 'VIX'  },
  { id: 'TVC:US10Y',    label: 'US10Y'},
  { id: 'SP:SPX',       label: 'S&P'  },
];

const INTERVALS = [
  { id: '5', label: '5M' },
  { id: '15', label: '15M' },
  { id: '60', label: '1H' },
  { id: 'D', label: '1D' },
  { id: 'W', label: '1W' },
];

function AdvancedChartWidget() {
  const [symbol, setSymbol] = useState('NASDAQ:NVDA');
  const [interval, setInterval] = useState('D');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.height = '100%';
    el.appendChild(inner);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      backgroundColor: 'rgba(8,8,8,1)',
      gridColor: 'rgba(22,22,22,1)',
      studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
      hide_top_toolbar: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });
    el.appendChild(script);

    return () => { el.innerHTML = ''; };
  }, [symbol, interval]);

  return (
    <div className="bg-[#080808] border border-[#1e1e1e] flex flex-col h-full">
      {/* Symbol selector */}
      <div className="flex items-center border-b border-[#1e1e1e] bg-[#0a0a0a] shrink-0 overflow-x-auto">
        <div className="flex items-center px-3 border-r border-[#1e1e1e] shrink-0">
          <div className="w-0.5 h-3 bg-[#ff6600] mr-2" />
          <span className="text-[#ff6600] font-mono text-[10px] font-bold tracking-widest whitespace-nowrap">
            CHART
          </span>
        </div>
        <div className="flex">
          {SYMBOLS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSymbol(s.id)}
              className={`px-3 py-2 font-mono text-[11px] font-bold tracking-wider whitespace-nowrap border-r border-[#111] transition-all ${
                symbol === s.id
                  ? 'bg-[#ff6600] text-black'
                  : 'text-[#555] hover:text-[#aaa] hover:bg-[#111]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex ml-auto border-l border-[#1e1e1e]">
          {INTERVALS.map((iv) => (
            <button
              key={iv.id}
              onClick={() => setInterval(iv.id)}
              className={`px-2.5 py-2 font-mono text-[10px] font-bold tracking-wider whitespace-nowrap border-r border-[#111] transition-all ${
                interval === iv.id
                  ? 'bg-[#1e1e1e] text-[#ff6600]'
                  : 'text-[#333] hover:text-[#666]'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div ref={ref} className="tradingview-widget-container flex-1 min-h-[420px]" />
    </div>
  );
}

export default memo(AdvancedChartWidget);
