/**
 * ─────────────────────────────────────────────────────────────────
 *  PORTFOLIO CONFIGURATION — DATI REALI
 * ─────────────────────────────────────────────────────────────────
 */

export interface PortfolioEntry {
  name: string;
  sector: string;
  tvSymbol: string;
  qty: number;
  pmc: number;
}

// Array format (usato dal Claude Bridge e dall'esterno)
export const portfolioData = [
  { ticker: 'NVDA',  qty: 270,  pmc:  87.17  },
  { ticker: 'AMD',   qty: 125,  pmc: 153.92  },
  { ticker: 'MU',    qty:  90,  pmc:  87.63  },
  { ticker: 'INTC',  qty: 380,  pmc:  25.75  },
  { ticker: 'TSLA',  qty:  60,  pmc: 358.22  },
  { ticker: 'MSTR',  qty: 123,  pmc: 210.22  },
  { ticker: 'RGTI',  qty: 515,  pmc:  27.30  },
  { ticker: 'OKLO',  qty: 120,  pmc:  72.43  },
  { ticker: 'ARBE',  qty: 1150, pmc:   3.35  },
];

// Record format (usato internamente da PortfolioTable e ClaudeAIBridge)
export const PORTFOLIO: Record<string, PortfolioEntry> = {
  NVDA: {
    name: 'NVIDIA Corporation',
    sector: 'GPU / AI Infrastructure',
    tvSymbol: 'NASDAQ:NVDA',
    qty: 270,
    pmc: 87.17,
  },
  AMD: {
    name: 'Advanced Micro Devices',
    sector: 'CPU / GPU / EPYC',
    tvSymbol: 'NASDAQ:AMD',
    qty: 125,
    pmc: 153.92,
  },
  MU: {
    name: 'Micron Technology',
    sector: 'DRAM / NAND Flash',
    tvSymbol: 'NASDAQ:MU',
    qty: 90,
    pmc: 87.63,
  },
  INTC: {
    name: 'Intel Corporation',
    sector: 'CPU / Foundry (IDM 2.0)',
    tvSymbol: 'NASDAQ:INTC',
    qty: 380,
    pmc: 25.75,
  },
  TSLA: {
    name: 'Tesla Inc.',
    sector: 'EV / AI / Robotics',
    tvSymbol: 'NASDAQ:TSLA',
    qty: 60,
    pmc: 358.22,
  },
  MSTR: {
    name: 'MicroStrategy Inc.',
    sector: 'Bitcoin Treasury / BI',
    tvSymbol: 'NASDAQ:MSTR',
    qty: 123,
    pmc: 210.22,
  },
  RGTI: {
    name: 'Rigetti Computing',
    sector: 'Quantum Computing',
    tvSymbol: 'NASDAQ:RGTI',
    qty: 515,
    pmc: 27.30,
  },
  OKLO: {
    name: 'Oklo Inc.',
    sector: 'Nuclear / SMR Energy',
    tvSymbol: 'NYSE:OKLO',
    qty: 120,
    pmc: 72.43,
  },
  ARBE: {
    name: 'Arbe Robotics',
    sector: 'Automotive Radar / AV',
    tvSymbol: 'NASDAQ:ARBE',
    qty: 1150,
    pmc: 3.35,
  },
};

export const PORTFOLIO_ORDER = [
  'NVDA', 'AMD', 'MU', 'INTC', 'TSLA', 'MSTR', 'RGTI', 'OKLO', 'ARBE',
] as const;

export type PortfolioTicker = typeof PORTFOLIO_ORDER[number];
