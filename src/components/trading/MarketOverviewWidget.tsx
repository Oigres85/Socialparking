'use client';

import { useEffect, useRef, memo } from 'react';

function MarketOverviewWidget() {
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
      'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '1D',
      showChart: true,
      locale: 'en',
      width: '100%',
      height: '100%',
      isTransparent: true,
      showSymbolLogo: false,
      showFloatingTooltip: false,
      plotLineColorGrowing: '#00e676',
      plotLineColorFalling: '#ff1744',
      gridLineColor: 'rgba(30, 30, 30, 0)',
      scaleFontColor: '#555',
      belowLineFillColorGrowing: 'rgba(0, 230, 118, 0.05)',
      belowLineFillColorFalling: 'rgba(255, 23, 68, 0.05)',
      belowLineFillColorGrowingBottom: 'rgba(0,0,0,0)',
      belowLineFillColorFallingBottom: 'rgba(0,0,0,0)',
      symbolActiveColor: 'rgba(255, 102, 0, 0.10)',
      tabs: [
        {
          title: 'Portfolio',
          symbols: [
            { s: 'NASDAQ:NVDA' },
            { s: 'NASDAQ:MU' },
            { s: 'NASDAQ:AMD' },
            { s: 'NASDAQ:INTC' },
            { s: 'NASDAQ:TSLA' },
            { s: 'NASDAQ:MSTR' },
          ],
          originalTitle: 'Portfolio',
        },
        {
          title: 'Macro',
          symbols: [
            { s: 'CBOE:VIX' },
            { s: 'TVC:US10Y' },
            { s: 'INDEX:KOSPI' },
            { s: 'FX_IDC:USDJPY' },
            { s: 'SP:SPX' },
            { s: 'NASDAQ:QQQ' },
          ],
          originalTitle: 'Macro',
        },
      ],
    });
    el.appendChild(script);

    return () => { el.innerHTML = ''; };
  }, []);

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] flex flex-col overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center gap-2 shrink-0">
        <div className="w-0.5 h-3 bg-[#ff6600]" />
        <span className="text-[#ff6600] font-mono text-[10px] font-bold tracking-widest">
          MARKET OVERVIEW — LIVE
        </span>
        <span className="ml-auto text-[#333] font-mono text-[9px]">TradingView</span>
      </div>
      <div
        ref={ref}
        className="tradingview-widget-container flex-1 w-full"
        style={{ minHeight: 340 }}
      />
    </div>
  );
}

export default memo(MarketOverviewWidget);
