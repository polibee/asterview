
'use client';

import * as React from 'react';
// This component might need to be adapted or removed if it doesn't fit the new data structure.
// It currently expects MarketData[] which was from the old mock API.
// For now, I'll leave it as is, but it might not be used on the new homepage.
import type { MarketData } from '@/types'; // Uses old MarketData type
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTheme } from 'next-themes';

const getCssVarValue = (varName: string): string => {
  if (typeof window === 'undefined') return 'hsl(0 0% 0%)';
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};


export function AssetPriceChart({ data }: { data: MarketData[] }) {
  const { resolvedTheme } = useTheme() || { resolvedTheme: 'light' }; 

  const chartData = data
    .sort((a, b) => b.marketCap - a.marketCap) 
    .slice(0, 5) 
    .map(asset => ({
      name: asset.symbol.split('/')[0], 
      price: asset.price,
    }));
  
  const primaryColor = React.useMemo(() => getCssVarValue('--primary'), [resolvedTheme]);
  const foregroundColor = React.useMemo(() => getCssVarValue('--foreground'), [resolvedTheme]);
  const mutedForegroundColor = React.useMemo(() => getCssVarValue('--muted-foreground'), [resolvedTheme]);
  const cardBackgroundColor = React.useMemo(() => getCssVarValue('--card'), [resolvedTheme]);


  if (!chartData || chartData.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Top Asset Prices (Mock Data)</CardTitle>
          <CardDescription>No data available to display chart.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Asset price data will appear here.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg rounded-lg overflow-hidden">
      <CardHeader>
        <CardTitle>Top 5 Assets by Market Cap (Mock Data)</CardTitle>
        <CardDescription>Current prices in USD</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke={mutedForegroundColor}
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke={mutedForegroundColor}
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              width={80} 
            />
            <Tooltip
              cursor={{ fill: 'hsla(var(--accent), 0.2)' }}
              contentStyle={{ 
                backgroundColor: cardBackgroundColor, 
                borderColor: 'hsla(var(--border))',
                borderRadius: '0.5rem',
                color: foregroundColor
              }}
              labelStyle={{ color: foregroundColor, fontWeight: 'bold' }}
            />
            <Bar dataKey="price" fill={primaryColor} radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
