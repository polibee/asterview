
'use client';

import React from 'react';
import type { EdgeXLongShortRatioItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Info, TrendingUp, TrendingDown, Users } from 'lucide-react';

interface LongShortRatioDisplayProps {
  ratioData: EdgeXLongShortRatioItem | null; // Expecting a single item for the selected range (e.g., _total_)
  exchangeName: 'Aster' | 'EdgeX';
  availableRanges?: string[];
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  isLoading: boolean;
}

const parseFloatSafe = (value: string | undefined, defaultValue = 0): number => {
  if (value === undefined) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const formatLargeNumber = (num: number | undefined) => {
  if (num === undefined) return 'N/A';
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
};

export function LongShortRatioDisplay({
  ratioData,
  exchangeName,
  availableRanges,
  selectedRange,
  onRangeChange,
  isLoading,
}: LongShortRatioDisplayProps) {
  if (exchangeName === 'Aster') {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Overall Long/Short Ratio</CardTitle>
          <CardDescription>AsterDex Exchange</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-muted-foreground">
            <Info size={16} className="mr-2" />
            Long/Short ratio data is not directly available for AsterDex via its public API.
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = ratioData
    ? [
        { name: 'Longs', value: parseFloatSafe(ratioData.buyRatio), volume: parseFloatSafe(ratioData.buyVolUsd), fill: 'hsl(var(--chart-1))' },
        { name: 'Shorts', value: parseFloatSafe(ratioData.sellRatio), volume: parseFloatSafe(ratioData.sellVolUsd), fill: 'hsl(var(--chart-2))' },
      ]
    : [];

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
            <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Overall Long/Short Ratio
            </CardTitle>
            <CardDescription>{exchangeName} - Data for range: {selectedRange || 'N/A'}</CardDescription>
        </div>
        {availableRanges && onRangeChange && selectedRange && (
          <Select value={selectedRange} onValueChange={onRangeChange}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {availableRanges.map(range => (
                <SelectItem key={range} value={range}>
                  {range}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
             <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <Info size={16} className="mr-2" /> Loading ratio data...
            </div>
        )}
        {!isLoading && !ratioData && (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <Info size={16} className="mr-2" /> No ratio data available for the selected range.
            </div>
        )}
        {!isLoading && ratioData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Long Ratio</span>
                </div>
                <span className="text-lg font-bold">{parseFloatSafe(ratioData.buyRatio).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Short Ratio</span>
                </div>
                <span className="text-lg font-bold">{parseFloatSafe(ratioData.sellRatio).toFixed(2)}%</span>
              </div>
               <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Long Volume (USD)</span>
                </div>
                <span className="text-lg font-bold">${formatLargeNumber(parseFloatSafe(ratioData.buyVolUsd))}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                 <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Short Volume (USD)</span>
                </div>
                <span className="text-lg font-bold">${formatLargeNumber(parseFloatSafe(ratioData.sellVolUsd))}</span>
              </div>
            </div>
            <div className="h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={60} />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend formatter={(value, entry) => <span className="text-muted-foreground">{entry?.payload?.name === 'Longs' ? 'Long %' : 'Short %'}</span>} />
                  <Bar dataKey="value" name="Ratio" barSize={30} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
