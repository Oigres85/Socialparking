'use client';

import { useEffect, useRef, memo } from 'react';

const SYMBOLS = [
  { proName: 'NASDAQ:NVDA',  title: 'NVDA'    },
  { proName: 'NASDAQ:AMD',   title: 'AMD'     },
  { proName: 'NASDAQ:MU',    title: 'MU'      },
  { proName: 'NASDAQ:INTC',  title: 'INTC'    },
  { proName: 'NASDAQ:TSLA',  title: 'TSLA'    },
  { proName: 'NASDAQ:MSTR',  title: 'MSTR'    },
  { proName: 'NASDAQ:RGTI',  title: 'RGTI'    },
  { proName: 'NYSE:OKLO',    title: 'OKLO'    },
  { proName: 'NASDAQ:ARBE',  title: 'ARBE'    },
  { proName: 'CBOE:VIX',     title: 'VIX'     },
  { proName: 'TVC:US10Y',    title: 'US10Y'   },
  { proName: 'FX_IDC:USDJPY',title: 'USD/JPY' },
  { proName: 'INDEX:KOSPI',  title: 'KOSPI'   },
  { proName: 'SP:SPX',       title: 'S&P500'  },
  { proName: 'NASDAQ:QQQ',   title: 'QQQ'     },
  { proName: 'TVC:GOLD',     title: 'GOLD'    },
  { proName: 'CRYPTOCAP:BTC',title: 'BTC'     },
];

function TickerTapeWidget() {
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
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      symbols: SYMBOLS,
      showSymbolLogo: false,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'en',
    });
    el.appendChild(script);

    return () => { el.innerHTML = ''; };
  }, []);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container w-full"
      style={{ height: 46 }}
    />
  );
}

export default memo(TickerTapeWidget);
