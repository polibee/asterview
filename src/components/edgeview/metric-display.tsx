
// This component is likely superseded by ExchangeComparisonSummary.
// It was designed for the old mock global metrics.
// Keeping for reference or if a simpler global metric display is needed later.
import type { GlobalMetrics } from '@/types'; // Uses old GlobalMetrics type
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BarChartBig, Coins, Bitcoin } from 'lucide-react';

interface MetricDisplayProps {
  metrics: GlobalMetrics;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
}

export function MetricDisplay({ metrics }: MetricDisplayProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Market Cap</CardTitle>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalMarketCap)}</div>
          <p className="text-xs text-muted-foreground">Current total market capitalization</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
          <BarChartBig className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalVolume24h)}</div>
          <p className="text-xs text-muted-foreground">Total trading volume in last 24 hours</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Currencies</CardTitle>
          <Coins className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.activeCurrencies)}</div>
          <p className="text-xs text-muted-foreground">Number of active trading pairs</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">BTC Dominance</CardTitle>
          <Bitcoin className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.btcDominance ? metrics.btcDominance.toFixed(1) + '%' : 'N/A'}</div>
          <p className="text-xs text-muted-foreground">Bitcoin's share of total market cap</p>
        </CardContent>
      </Card>
    </div>
  );
}

