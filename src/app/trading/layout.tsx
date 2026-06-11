import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trading Terminal — Institutional Dashboard',
  description:
    'Real-time institutional trading dashboard: Tech/Semi portfolio, macro indicators, news aggregator and Claude AI bridge.',
};

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
