'use client';

import type { MarketData } from '@/types';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTheme } from 'next-themes'; // Assuming next-themes is or will be installed for theme awareness. If not, remove this and hardcode colors or pass them.
import { themes } from 'tailwind.config'; // This is a hypothetical import, adjust if your tailwind config is structured differently or colors are directly in globals.css

// Helper to get HSL values from CSS variables
const getCssVarValue = (varName: string): string => {
  if (typeof window === 'undefined') return 'hsl(0 0% 0%)'; // Default for SSR
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};


export function AssetPriceChart({ data }: { data: MarketData[] }) {
  const { resolvedTheme } = useTheme() || { resolvedTheme: 'light' }; // Default to light if useTheme is not available

  const chartData = data
    .sort((a, b) => b.marketCap - a.marketCap) // Sort by market cap
    .slice(0, 5) // Take top 5
    .map(asset => ({
      name: asset.symbol.split('/')[0], // Show only base currency e.g. BTC from BTC/USD
      price: asset.price,
    }));
  
  // Define colors based on theme. These should match your globals.css theme variables.
  // Note: Recharts uses direct color strings.
  const primaryColor = React.useMemo(() => getCssVarValue('--primary'), [resolvedTheme]);
  const foregroundColor = React.useMemo(() => getCssVarValue('--foreground'), [resolvedTheme]);
  const mutedForegroundColor = React.useMemo(() => getCssVarValue('--muted-foreground'), [resolvedTheme]);
  const cardBackgroundColor = React.useMemo(() => getCssVarValue('--card'), [resolvedTheme]);


  if (!chartData || chartData.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Top Asset Prices</CardTitle>
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
        <CardTitle>Top 5 Assets by Market Cap</CardTitle>
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
