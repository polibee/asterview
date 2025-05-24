
'use client';

import type { ExchangeAggregatedMetrics } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BarChart3, Users, Info } from 'lucide-react'; // Users for OI, BarChart3 for trades

interface ExchangeComparisonSummaryProps {
  asterData: ExchangeAggregatedMetrics | null;
  edgeXData: ExchangeAggregatedMetrics | null;
}

const formatNumber = (value: number | undefined, precision = 0) => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { 
    style: 'decimal', 
    minimumFractionDigits: precision, 
    maximumFractionDigits: precision 
  }).format(value);
};

const formatCurrencyShort = (value: number | undefined) => {
  if (value === undefined || value === null) return 'N/A';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(0)}`;
};


export function ExchangeComparisonSummary({ asterData, edgeXData }: ExchangeComparisonSummaryProps) {
  const metrics = [
    {
      title: 'Total Daily Volume',
      icon: TrendingUp,
      asterValue: asterData?.totalDailyVolume,
      edgeXValue: edgeXData?.totalDailyVolume,
      formatter: formatCurrencyShort,
    },
    {
      title: 'Total Open Interest',
      icon: Users, // Using Users icon for Open Interest
      asterValue: asterData?.totalOpenInterest,
      edgeXValue: edgeXData?.totalOpenInterest,
      formatter: formatCurrencyShort, // Assuming OI is in quote value
    },
    {
      title: 'Total Daily Trades',
      icon: BarChart3, // Using BarChart3 for trades count
      asterValue: asterData?.totalDailyTrades,
      edgeXValue: edgeXData?.totalDailyTrades,
      formatter: (val: number | undefined) => formatNumber(val, 0),
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold tracking-tight mb-4">Exchange Comparison</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title} className="shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">{metric.title}</CardTitle>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">AsterDex</p>
                  <p className="text-xl font-bold">{asterData ? metric.formatter(metric.asterValue) : 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">EdgeX</p>
                  <p className="text-xl font-bold">{edgeXData ? metric.formatter(metric.edgeXValue) : 'Loading...'}</p>
                </div>
              </div>
              {!asterData && !edgeXData && (
                 <div className="mt-4 text-xs text-muted-foreground flex items-center">
                    <Info size={14} className="mr-1" /> Fetching data...
                 </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
