export interface StockQuote {
  symbol: string;
  label: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  currency: string;
  marketState: string;
  error?: boolean;
}

export interface MarketDataResponse {
  portfolio: Record<string, StockQuote>;
  macro: Record<string, StockQuote>;
  timestamp: string;
  error?: string;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
}

export interface NewsFeed {
  id: string;
  name: string;
  emoji: string;
  items: NewsItem[];
  error: boolean;
}

export interface NewsResponse {
  feeds: NewsFeed[];
  timestamp: string;
  error?: string;
}
