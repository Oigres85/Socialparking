'use client';

import { useState } from 'react';
import { PORTFOLIO, PORTFOLIO_ORDER } from './portfolioConfig';
import type { MarketDataResponse } from '@/types/trading';

interface NewsItem { title: string; link: string; pubDate: string; }
interface NewsFeed { id: string; name: string; items: NewsItem[]; }

interface Props {
  marketData?: MarketDataResponse;
  newsFeeds?: NewsFeed[];
}

function pad(s: string, w: number, right = false) {
  return right ? s.padStart(w) : s.padEnd(w);
}

function buildPrompt(market: MarketDataResponse, news?: NewsFeed[]): string {
  const ts = new Date().toLocaleString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  // ── Portfolio table ─────────────────────────────────────────────
  const sep = '├───────┼────────────────────────┼───────┼──────────┼───────────┼───────────┼─────────┤';
  const rows = PORTFOLIO_ORDER.map((sym) => {
    const cfg = PORTFOLIO[sym];
    const q   = market.portfolio[sym];
    const price = q?.price ?? 0;
    const chgPct = q?.changePercent ?? 0;
    const chgSign = chgPct >= 0 ? '+' : '';
    const hasPmc = cfg.qty > 0 && cfg.pmc > 0;

    const priceStr  = price > 0 ? `$${price.toFixed(2)}` : 'N/D';
    const pmcStr    = hasPmc ? `$${cfg.pmc.toFixed(2)}` : 'N/C';
    const qtyStr    = cfg.qty > 0 ? String(cfg.qty) : 'N/C';
    const pnlDolStr = hasPmc && price > 0
      ? `${(price - cfg.pmc) * cfg.qty >= 0 ? '+' : ''}$${Math.round((price - cfg.pmc) * cfg.qty).toLocaleString()}`
      : 'N/C';
    const pnlPctStr = hasPmc && price > 0
      ? `${((price - cfg.pmc) / cfg.pmc * 100) >= 0 ? '+' : ''}${((price - cfg.pmc) / cfg.pmc * 100).toFixed(1)}%`
      : 'N/C';

    return `│ ${pad(sym, 5)} │ ${pad(cfg.sector, 22)} │ ${pad(qtyStr, 5, true)} │ ${pad(pmcStr, 8, true)} │ ${pad(priceStr + ` ${chgSign}${chgPct.toFixed(1)}%`, 9, true)} │ ${pad(pnlDolStr, 9, true)} │ ${pad(pnlPctStr, 7, true)} │`;
  }).join('\n' + sep + '\n');

  const portfolioTable = `┌───────┬────────────────────────┬───────┬──────────┬───────────┬───────────┬─────────┐
│ TICK  │ SETTORE                │  QTY  │   PMC    │  PREZZO   │   P&L $   │  P&L %  │
${sep}
${rows}
└───────┴────────────────────────┴───────┴──────────┴───────────┴───────────┴─────────┘`;

  // ── Macro ────────────────────────────────────────────────────────
  const MACRO_KEYS: [string, string, string][] = [
    ['^VIX', 'VIX (Fear Index)', 'Regola R/R e hedging'],
    ['^TNX', 'US 10Y Yield %', 'Costo capitale, rotazione growth→value'],
    ['^KS11', 'KOSPI (Korea)', 'Proxy ciclo semis e memoria'],
    ['JPY=X', 'USD/JPY', 'Risk-on/off, carry trade, Fed posture'],
  ];

  const macroLines = MACRO_KEYS.map(([key, label, hint]) => {
    const q = market.macro[key];
    if (!q || q.error) return `  ${pad(label, 22)}: N/D`;
    const sign = q.change >= 0 ? '+' : '';
    return `  ${pad(label, 22)}: ${pad(q.price.toFixed(2), 10, true)}  (${sign}${q.changePercent.toFixed(2)}%)  │ ${hint}`;
  }).join('\n');

  // ── News ─────────────────────────────────────────────────────────
  const newsLines = news
    ?.flatMap((f) => f.items.slice(0, 3).map((i) => ({ ...i, source: f.name })))
    ?.slice(0, 8)
    ?.map((item, i) => `  ${i + 1}. [${item.source}] ${item.title}`)
    ?.join('\n') ?? '  Nessuna news disponibile';

  return `
████████████████████████████████████████████████████████████████████████
  ANALISI PORTAFOGLIO TECH/SEMIS — HEDGE FUND BRIEF
  ${ts}
  Generato da: Trading Terminal Istituzionale
████████████████████████████████████████████████████████████████████████

◉ COMPOSIZIONE PORTAFOGLIO & P&L
${portfolioTable}

◉ INDICI MACRO — CONTESTO OPERATIVO
${macroLines}

◉ ULTIME NEWS (fonti aggregate)
${newsLines}

════════════════════════════════════════════════════════════════════════
ISTRUZIONI: Sei un Hedge Fund Manager senior con 20 anni di esperienza
sui mercati tech e semiconductor. Rispondi in italiano con linguaggio
tecnico, direttivo e senza diplomazia. Ogni risposta deve contenere
livelli di prezzo espliciti e azioni concrete. Non dare risposte vaghe.
════════════════════════════════════════════════════════════════════════

─── 1. ANALISI TECNICA PER SINGOLO TITOLO ───────────────────────────
Per ciascuno dei 6 titoli del portafoglio (NVDA, MU, AMD, INTC, TSLA, MSTR):
  a) Trend dominante (daily/weekly): bull, bear o lateral?
  b) Supporto chiave da difendere (livello $) e resistenza da superare
  c) RSI e MACD: condizione attuale, divergenze bullish/bearish?
  d) Setup operativo: potenziale breakout/breakdown? Entry point suggerito?
  e) Volume: conferma o diverge dal movimento di prezzo?

─── 2. CICLO SEMICONDUTTORI & FONDAMENTALI ──────────────────────────
  a) Fase corrente del ciclo chip (upcycle/inventory correction/downcycle)?
  b) Chi beneficia e chi soffre di più in questo contesto (AI vs legacy)?
  c) Impatto delle news recenti sui fondamentali dei singoli titoli
  d) Catalizzatori prossimi (earnings date, guidance revision, eventi macro)
  e) Rischi strutturali: export controls USA-Cina, TSMC/Taiwan, AI bubble?

─── 3. TAX-LOSS HARVESTING — OTTIMIZZAZIONE FISCALE ─────────────────
  Dato il portafoglio con i PMC indicati sopra:
  a) Quali posizioni presentano una minusvalenza fiscalmente realizzabile?
  b) Strategia TLH: quale titolo vendere, su quale strumento rientrare
     (ETF settoriale, simile non identico) per mantenere l'esposizione
  c) Finestra temporale ottimale per l'operazione (considerando calendario
     fiscale italiano: chiusura posizione entro 31/12)
  d) Stima del risparmio fiscale netto (aliquota 26% regime dichiarativo)
  e) Come evitare la wash-sale rule e mantenere l'esposizione settoriale

─── 4. DIRETTIVE OPERATIVE — NESSUNA DIPLOMAZIA ─────────────────────
  Per ogni titolo, SCEGLI UNA sola direttiva:
  ■ TAGLIA IMMEDIATAMENTE → motivo + dove ricollocare il capitale
  ■ MANTIENI con trailing stop → livello stop esplicito ($)
  ■ AGGIUNGI → livello entry, size aggiuntiva (% del portafoglio)

  TRADE ASIMMETRICO DELLA SETTIMANA:
  Identifica 1 operazione ad alto conviction con R/R ≥ 1:3:
  → Ticker + direzione (Long/Short)
  → Entry: $___  Target 1: $___  Target 2: $___  Stop: $___
  → Sizing suggerito (% portafoglio)
  → Timeframe e catalizzatore principale (2-3 frasi max)

─── 5. RISK MATRIX — PROSSIME 4 SETTIMANE ──────────────────────────
  ┌──────────────┬───────┬───────────────────────────────────────────┐
  │ SCENARIO     │ PROB. │ IMPLICAZIONE SUL PORTAFOGLIO              │
  ├──────────────┼───────┼───────────────────────────────────────────┤
  │ Bull Case    │  ?%   │ [target, cosa acquistare, driver chiave]  │
  │ Base Case    │  ?%   │ [range atteso, gestione posizioni]        │
  │ Bear Case    │  ?%   │ [drawdown max stimato, hedge da attivare] │
  └──────────────┴───────┴───────────────────────────────────────────┘

  Indica anche: 1 rischio tail che il mercato sta sottovalutando.

████████████████████████████████████████████████████████████████████████
NOTA: Se PMC/QTY mostrano "N/C" → aggiorna portfolioConfig.ts nel progetto.
████████████████████████████████████████████████████████████████████████
`.trim();
}

export default function ClaudeAIBridge({ marketData, newsFeeds }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error' | 'no-data'>('idle');
  const [prompt, setPrompt] = useState('');
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    if (!marketData) { setStatus('no-data'); setTimeout(() => setStatus('idle'), 3000); return; }
    try {
      const p = buildPrompt(marketData, newsFeeds);
      setPrompt(p);
      await navigator.clipboard.writeText(p);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 4500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const btnCls =
    status === 'copied'
      ? 'bg-[#00e676] text-black border-[#00e676] scale-[1.01]'
      : status === 'error' || status === 'no-data'
      ? 'bg-[#ff1744]/10 text-[#ff1744] border-[#ff1744]'
      : 'bg-transparent text-[#ff6600] border-[#ff6600] hover:bg-[#ff6600] hover:text-black hover:scale-[1.01]';

  const btnLabel =
    status === 'copied'
      ? '✓  PROMPT COPIATO NEGLI APPUNTI'
      : status === 'error'
      ? '✕  ERRORE — Controlla i permessi clipboard'
      : status === 'no-data'
      ? '⚠  ATTENDERE CARICAMENTO DATI...'
      : '⚡  GENERA PROMPT PER CLAUDE PRO';

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] flex flex-col">
      <div className="px-3 py-1.5 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center gap-2">
        <div className="w-0.5 h-3 bg-[#ff6600]" />
        <span className="text-[#ff6600] font-mono text-[10px] font-bold tracking-widest">
          CLAUDE AI BRIDGE
        </span>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-[#555] font-mono text-[10px] leading-relaxed">
          Raccoglie prezzi live + macro + news → genera un brief istituzionale completo con
          analisi tecnica, tax-loss harvesting e direttive operative → copia negli appunti →
          incolla su{' '}
          <a href="https://claude.ai" target="_blank" rel="noopener noreferrer"
            className="text-[#ff6600]/70 hover:text-[#ff6600]">
            claude.ai
          </a>
          .
        </p>

        <button
          onClick={handleGenerate}
          className={`w-full py-4 font-mono text-sm font-bold tracking-[0.2em] border-2 transition-all duration-150 ${btnCls}`}
        >
          {btnLabel}
        </button>

        {/* What's included */}
        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-[#333]">
          {[
            ['◉', 'Prezzi live (Yahoo + Stooq)'],
            ['◉', 'P&L vs PMC configurato'],
            ['◉', 'VIX · US10Y · KOSPI · USD/JPY'],
            ['◉', '6+ news da RSS aggregator'],
            ['◉', 'Analisi tecnica per titolo'],
            ['◉', 'Tax-Loss Harvesting (IT)'],
            ['◉', 'Direttive operative (R/R≥1:3)'],
            ['◉', 'Risk matrix 4 settimane'],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[#ff6600]/40">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {prompt && (
          <div>
            <button
              onClick={() => setOpen((p) => !p)}
              className="text-[#333] hover:text-[#666] font-mono text-[9px] transition-colors"
            >
              {open ? '▾ nascondi anteprima' : '▸ anteprima prompt generato'}
            </button>
            {open && (
              <pre className="mt-2 p-3 bg-[#050505] border border-[#151515] text-[#333] font-mono text-[8px] overflow-auto max-h-56 whitespace-pre-wrap leading-relaxed">
                {prompt}
              </pre>
            )}
          </div>
        )}

        <div className="border-t border-[#111] pt-3 space-y-1">
          <p className="text-[#222] font-mono text-[9px] font-bold tracking-widest">COME USARE</p>
          <ol className="text-[#222] font-mono text-[9px] space-y-0.5 list-decimal list-inside">
            <li>Clicca ⚡ → prompt copiato in automatico</li>
            <li>Apri claude.ai → incolla (Ctrl+V) → invia</li>
            <li>Copia la risposta nel pannello AI Notes →</li>
            <li>Aggiorna PMC/QTY in portfolioConfig.ts per P&L reale</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
