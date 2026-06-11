/**
 * ─────────────────────────────────────────────────────────────────
 *  PORTFOLIO CONFIGURATION — AGGIORNA CON I TUOI DATI REALI
 *  Modifica qty e pmc per attivare il calcolo P&L e il prompt AI.
 * ─────────────────────────────────────────────────────────────────
 */

export interface PortfolioEntry {
  name: string;
  sector: string;
  tvSymbol: string;   // TradingView symbol format
  qty: number;        // ← QUANTITÀ: quante azioni possiedi
  pmc: number;        // ← PMC: Prezzo Medio Carico (costo medio di acquisto)
}

export const PORTFOLIO: Record<string, PortfolioEntry> = {
  NVDA: {
    name: 'NVIDIA Corporation',
    sector: 'GPU / AI Infrastructure',
    tvSymbol: 'NASDAQ:NVDA',
    qty: 0,     // es: 15
    pmc: 0,     // es: 480.50
  },
  MU: {
    name: 'Micron Technology',
    sector: 'DRAM / NAND Flash',
    tvSymbol: 'NASDAQ:MU',
    qty: 0,
    pmc: 0,
  },
  AMD: {
    name: 'Advanced Micro Devices',
    sector: 'CPU / GPU / EPYC',
    tvSymbol: 'NASDAQ:AMD',
    qty: 0,
    pmc: 0,
  },
  INTC: {
    name: 'Intel Corporation',
    sector: 'CPU / Foundry (IDM 2.0)',
    tvSymbol: 'NASDAQ:INTC',
    qty: 0,
    pmc: 0,
  },
  TSLA: {
    name: 'Tesla Inc.',
    sector: 'EV / AI / Robotics',
    tvSymbol: 'NASDAQ:TSLA',
    qty: 0,
    pmc: 0,
  },
  MSTR: {
    name: 'MicroStrategy Inc.',
    sector: 'Bitcoin Treasury / BI',
    tvSymbol: 'NASDAQ:MSTR',
    qty: 0,
    pmc: 0,
  },
};

export const PORTFOLIO_ORDER = ['NVDA', 'MU', 'AMD', 'INTC', 'TSLA', 'MSTR'] as const;
export type PortfolioTicker = typeof PORTFOLIO_ORDER[number];
