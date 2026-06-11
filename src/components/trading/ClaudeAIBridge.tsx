'use client';

import { useState } from 'react';
import type { MarketDataResponse, NewsResponse } from '@/types/trading';

interface Props {
  marketData?: MarketDataResponse;
  newsData?: NewsResponse;
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function fmtPrice(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildPrompt(market: MarketDataResponse, news: NewsResponse): string {
  const ts = new Date().toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' });

  const portfolioLines = ['NVDA', 'MU', 'AMD', 'INTC', 'TSLA', 'MSTR']
    .map((sym) => {
      const q = market.portfolio[sym];
      if (!q || q.error) return `  ${sym}: N/A`;
      return `  ${sym.padEnd(6)} $${fmtPrice(q.price).padStart(9)}  ${fmtPct(q.changePercent).padStart(8)}  Vol: ${q.volume.toLocaleString()}`;
    })
    .join('\n');

  const macroMap: Record<string, string> = {
    '^VIX': 'VIX (Fear Index)',
    '^TNX': 'US 10Y Yield',
    '^KS11': 'KOSPI (Korea)',
    'JPY=X': 'USD/JPY',
  };
  const macroLines = Object.entries(macroMap)
    .map(([key, label]) => {
      const q = market.macro[key];
      if (!q || q.error) return `  ${label}: N/A`;
      return `  ${label.padEnd(20)} ${fmtPrice(q.price).padStart(10)}  ${fmtPct(q.changePercent).padStart(8)}`;
    })
    .join('\n');

  const topNews = news.feeds
    .flatMap((f) => f.items.map((i) => ({ ...i, source: f.name })))
    .slice(0, 6)
    .map((item, i) => `  ${i + 1}. [${item.source}] ${item.title}`)
    .join('\n');

  return `════════════════════════════════════════════════════════════
  ANALISI PORTAFOGLIO TECH / SEMICONDUTTORI — RICHIESTA AI
  Data e ora: ${ts}
════════════════════════════════════════════════════════════

▸ PREZZI PORTAFOGLIO (live)
${portfolioLines}

▸ DATI MACRO
${macroLines}

▸ ULTIME NEWS (${news.feeds.length} fonti aggregate)
${topNews || '  Nessuna news disponibile'}

════════════════════════════════════════════════════════════
RICHIESTA DI ANALISI — rispondi in italiano, stile report analitico

1. SENTIMENT DI MERCATO
   Sulla base dei movimenti macro (VIX, US10Y, KOSPI, USD/JPY) e delle
   news elencate, qual è il sentiment prevalente? Risk-on o risk-off?
   Quali catalizzatori macro sono dominanti oggi?

2. ANALISI DEL PORTAFOGLIO TECH/SEMI
   Commenta la performance relativa dei titoli (NVDA, MU, AMD, INTC, TSLA, MSTR).
   Chi sta outperformando/underperformando e perché, alla luce delle news?
   Ci sono divergenze intra-settoriali significative?

3. RISCHI E CATALIZZATORI DA MONITORARE
   Identifica i 3 principali rischi (downside) e i 3 principali catalizzatori
   (upside) per il portafoglio nelle prossime 1-5 sessioni di trading.

4. TRADE IDEA OPERATIVA
   Suggerisci UNA trade idea concreta su uno dei titoli del portafoglio:
   - Ticker e direzione (Long/Short)
   - Entry price range
   - Target price (T1, T2)
   - Stop loss
   - Timeframe operativo
   - Razionale tecnico + fondamentale in 2-3 frasi

DISCLAIMER: Questa è un'analisi puramente educativa/informativa.
════════════════════════════════════════════════════════════`;
}

export default function ClaudeAIBridge({ marketData, newsData }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error' | 'no-data'>('idle');
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    if (!marketData || !newsData) {
      setStatus('no-data');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    try {
      const prompt = buildPrompt(marketData, newsData);
      setLastPrompt(prompt);
      await navigator.clipboard.writeText(prompt);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 4000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const btnClass =
    status === 'copied'
      ? 'bg-[#00e676] text-black border-[#00e676]'
      : status === 'error' || status === 'no-data'
      ? 'bg-[#ff1744]/20 text-[#ff1744] border-[#ff1744]'
      : 'bg-[#ff6600]/10 text-[#ff6600] border-[#ff6600] hover:bg-[#ff6600] hover:text-black';

  const btnLabel =
    status === 'copied'
      ? '✓ COPIATO NEGLI APPUNTI!'
      : status === 'error'
      ? '✕ ERRORE CLIPBOARD'
      : status === 'no-data'
      ? '⚠ DATI NON ANCORA CARICATI'
      : '⚡ GENERA PROMPT PER CLAUDE PRO';

  return (
    <div className="bg-[#0d0d0d] border border-[#1f1f1f] flex flex-col">
      <div className="px-3 py-1.5 border-b border-[#1f1f1f]">
        <span className="text-[#ff6600] font-mono text-xs font-bold tracking-widest">
          ▸ CLAUDE AI BRIDGE
        </span>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-[#666] font-mono text-[11px] leading-relaxed">
          Raccoglie prezzi live, dati macro e ultime news → formatta un prompt analitico
          completo → copia negli appunti → incolla su{' '}
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#ff6600] hover:underline"
          >
            claude.ai
          </a>{' '}
          (abbonamento Claude Pro gratuito necessario).
        </p>

        <button
          onClick={handleGenerate}
          className={`w-full py-4 font-mono text-sm font-bold tracking-widest border-2 transition-all duration-200 ${btnClass}`}
        >
          {btnLabel}
        </button>

        {lastPrompt && (
          <div>
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="text-[#444] hover:text-[#888] font-mono text-[10px] transition-colors"
            >
              {showPreview ? '▾ NASCONDI PROMPT' : '▸ ANTEPRIMA PROMPT GENERATO'}
            </button>
            {showPreview && (
              <pre className="mt-2 p-3 bg-[#080808] border border-[#1a1a1a] text-[#555] font-mono text-[9px] overflow-auto max-h-64 leading-relaxed whitespace-pre-wrap">
                {lastPrompt}
              </pre>
            )}
          </div>
        )}

        <div className="border border-[#1a1a1a] bg-[#080808] p-3 space-y-1">
          <p className="text-[#333] font-mono text-[9px] font-bold uppercase tracking-widest">
            Come funziona
          </p>
          <ol className="text-[#333] font-mono text-[9px] space-y-0.5 list-decimal list-inside">
            <li>Clicca il pulsante → il prompt viene copiato in automatico</li>
            <li>Apri claude.ai nel browser</li>
            <li>Incolla (Ctrl+V / Cmd+V) e invia</li>
            <li>Copia la risposta nel pannello "AI Notes" a fianco</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
