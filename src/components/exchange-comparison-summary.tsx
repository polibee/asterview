
// src/components/exchange-comparison-summary.tsx
'use client';

import type { ExchangeAggregatedMetrics } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, BarChart3, BookOpen, Info } from 'lucide-react';

interface ExchangeComparisonSummaryProps {
  asterMetrics: ExchangeAggregatedMetrics | null;
  // edgexMetrics: ExchangeAggregatedMetrics | null; // Removed EdgeX
}

const formatLargeNumber = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  if (Math.abs(num) >= 1_000_000_000_000) return `${(num / 1_000_000_000_000).toFixed(2)}T`;
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
};

const MetricCard: React.FC<{ title: string; value: string; icon: React.ElementType; exchangeName: string, isLoading?: boolean }> = ({ title, value, icon: Icon, exchangeName, isLoading }) => (
  <Card className="flex-1 min-w-[200px] shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title} ({exchangeName})</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <div className="h-8 w-3/4 bg-muted animate-pulse rounded"></div> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

export function ExchangeComparisonSummary({ asterMetrics }: ExchangeComparisonSummaryProps) {
  const isLoading = !asterMetrics; // Simple loading state

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight mb-4">Exchange Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total Daily Volume"
          value={`$${formatLargeNumber(asterMetrics?.totalDailyVolume)}`}
          icon={DollarSign}
          exchangeName="Aster"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Open Interest"
          value={`$${formatLargeNumber(asterMetrics?.totalOpenInterest)}`}
          icon={BookOpen}
          exchangeName="Aster"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Daily Trades"
          value={formatLargeNumber(asterMetrics?.totalDailyTrades)}
          icon={BarChart3}
          exchangeName="Aster"
          isLoading={isLoading}
        />
      </div>
       {asterMetrics?.totalOpenInterest !== undefined && asterMetrics.totalOpenInterest !== null && asterMetrics.totalOpenInterest > 0 && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Info size={13}/> AsterDex Open Interest calculated for top 20 symbols by volume.
        </p>
      )}
    </section>
  );
}

    