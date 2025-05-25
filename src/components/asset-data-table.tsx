
'use client';

import type { ExchangeAssetDetail } from '@/types';
import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, Search, Info, Percent, CalendarClock, TrendingUp, TrendingDown, Target, GanttChartSquare, BookOpen, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, fromUnixTime } from 'date-fns';

// HMR Recovery comment
interface AssetDataTableProps {
  initialAssets: ExchangeAssetDetail[] | null;
  exchangeName: 'Aster'; // Only Aster is supported now
}

type SortKey = keyof ExchangeAssetDetail | '';
type SortOrder = 'asc' | 'desc';

const parseFloatSafe = (value: string | number | undefined | null, returnNullOnNaN = false): number | null => {
    if (value === undefined || value === null || String(value).trim() === '') {
      return returnNullOnNaN ? null : 0;
    }
    const num = parseFloat(String(value));
    if (isNaN(num)) {
      return returnNullOnNaN ? null : 0;
    }
    return num;
};

const parseIntSafe = (value: string | number | undefined | null, returnNullOnNaN = false): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return returnNullOnNaN ? null : 0;
  }
  const num = parseInt(String(value), 10);
  if (isNaN(num)) {
    return returnNullOnNaN ? null : 0;
  }
  return num;
}

const formatPrice = (price: number | undefined | null, defaultPrecision = 2, highPrecisionThreshold = 0.1) => {
  if (price === undefined || price === null || isNaN(price)) return 'N/A';

  let minimumFractionDigits = defaultPrecision;
  let maximumFractionDigits = defaultPrecision;

  if (price > 0 && Math.abs(price) < 0.000001) { 
    return `$${price.toExponential(2)}`;
  } else if (price > 0 && Math.abs(price) < highPrecisionThreshold / 1000) {
    minimumFractionDigits = Math.min(8, defaultPrecision + 4); 
    maximumFractionDigits = Math.min(8, defaultPrecision + 4);
  } else if (price > 0 && Math.abs(price) < highPrecisionThreshold / 100) {
    minimumFractionDigits = Math.min(6, defaultPrecision + 3);
    maximumFractionDigits = Math.min(6, defaultPrecision + 3);
  } else if (price > 0 && Math.abs(price) < highPrecisionThreshold / 10) {
    minimumFractionDigits = Math.min(5, defaultPrecision + 2);
    maximumFractionDigits = Math.min(5, defaultPrecision + 2);
  } else if (price > 0 && Math.abs(price) < highPrecisionThreshold) {
    minimumFractionDigits = Math.min(4, defaultPrecision + 1);
    maximumFractionDigits = Math.min(4, defaultPrecision + 1);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(price);
};

const formatLargeNumber = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
};

const formatPercentage = (percentage: number | undefined | null) => {
  if (percentage === undefined || percentage === null || isNaN(percentage)) return 'N/A';
  const num = parseFloatSafe(percentage);
  if (num === null) return 'N/A';
  return `${num.toFixed(2)}%`;
};

const formatFundingRate = (rate: number | null | undefined) => {
  if (rate === null || rate === undefined || isNaN(rate)) return 'N/A';
  const num = parseFloatSafe(rate);
  if (num === null) return 'N/A';
  return `${(num * 100).toFixed(4)}%`;
};

const formatUnixTimestamp = (timestamp: number | null | undefined) => {
  if (timestamp === null || timestamp === undefined || isNaN(timestamp) || timestamp === 0) return 'N/A';
  const date = (String(timestamp).length === 10) ? fromUnixTime(timestamp) : new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return format(date, 'MMM d, HH:mm');
};


export function AssetDataTable({ initialAssets, exchangeName }: AssetDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dailyVolume');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isClient, setIsClient] = useState(false);
  const [internalAssets, setInternalAssets] = useState<ExchangeAssetDetail[]>(initialAssets || []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setInternalAssets(initialAssets || []);
  }, [initialAssets]);


  useEffect(() => {
    if (!isClient || internalAssets.length === 0 || exchangeName !== 'Aster') return;

    const endpoint = 'wss://fstream.asterdex.com/stream?streams=!ticker@arr';
    const ws = new WebSocket(endpoint);

    ws.onopen = () => {
      // console.log(`${exchangeName} price WebSocket connected`);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        let priceUpdates: { id: string, price: number }[] = [];

        if (message.stream === '!ticker@arr' && Array.isArray(message.data)) {
          priceUpdates = message.data.map((ticker: any) => ({
            id: ticker.s,
            price: parseFloatSafe(ticker.c) ?? 0
          }));
        }

        if (priceUpdates.length > 0) {
          setInternalAssets(prevAssets => {
            const newAssets = [...prevAssets];
            let updated = false;
            priceUpdates.forEach(update => {
              const assetIndex = newAssets.findIndex(asset => asset.id === update.id);
              if (assetIndex !== -1 && newAssets[assetIndex].price !== update.price) {
                newAssets[assetIndex] = { ...newAssets[assetIndex], price: update.price };
                updated = true;
              }
            });
            return updated ? newAssets : prevAssets;
          });
        }
      } catch (error) {
        // console.error(`${exchangeName} WebSocket error processing message:`, error);
      }
    };

    ws.onerror = (error) => {
      // console.error(`${exchangeName} WebSocket error:`, error);
    };

    ws.onclose = () => {
      // console.log(`${exchangeName} WebSocket disconnected`);
    };

    return () => {
      ws.close();
    };
  }, [isClient, exchangeName, internalAssets.length]); 

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedAndFilteredData = useMemo(() => {
    if (!internalAssets) return [];
    let filtered = internalAssets.filter(item =>
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortKey) {
      filtered.sort((a, b) => {
        const valA = a[sortKey as keyof ExchangeAssetDetail];
        const valB = b[sortKey as keyof ExchangeAssetDetail];

        if (valA === null || valA === undefined) return sortOrder === 'asc' ? 1 : -1;
        if (valB === null || valB === undefined) return sortOrder === 'asc' ? -1 : 1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
    }
    return filtered;
  }, [internalAssets, searchTerm, sortKey, sortOrder]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30 shrink-0" />;
    return sortOrder === 'asc' ?
      <ArrowUpDown className="ml-2 h-3 w-3 text-primary shrink-0" /> :
      <ArrowUpDown className="ml-2 h-3 w-3 text-primary shrink-0" />;
  };

  const columns: { key: SortKey; label: string; icon?: React.ElementType; className?: string; numeric?: boolean; sticky?: 'left'; stickyOffset?: string; minWidth?: string, width?: string; }[] = [
    { key: '', label: '#', className: "w-[40px] text-center", sticky: 'left', stickyOffset: '0px', minWidth: '40px', width: '40px' },
    { key: 'symbol', label: 'Symbol', className: "w-[180px] md:w-[200px]", sticky: 'left', stickyOffset: '40px', minWidth: '180px', width: '180px' },
    { key: 'price', label: 'Price', numeric: true, minWidth: '120px' },
    { key: 'priceChangePercent24h', label: '24h Chg %', icon: Percent, numeric: true, minWidth: '100px' },
    { key: 'fundingRate', label: 'Funding Rate', numeric: true, minWidth: '120px' },
    { key: 'nextFundingTime', label: 'Next Funding', icon: CalendarClock, numeric: false, minWidth: '140px' },
    { key: 'dailyVolume', label: 'Volume (24h)', numeric: true, minWidth: '130px' },
    { key: 'openInterest', label: 'Open Interest', icon: BookOpen, numeric: true, minWidth: '140px' },
    { key: 'dailyTrades', label: 'Trades (24h)', numeric: true, minWidth: '100px' },
    { key: 'high24h', label: '24h High', icon: TrendingUp, numeric: true, minWidth: '120px' },
    { key: 'low24h', label: '24h Low', icon: TrendingDown, numeric: true, minWidth: '120px' },
    { key: 'markPrice', label: 'Mark Price', icon: Target, numeric: true, minWidth: '120px' },
    { key: 'indexPrice', label: 'Index Price', icon: GanttChartSquare, numeric: true, minWidth: '120px' },
  ];

  if (!isClient || !initialAssets) {
    return (
      <Card className="shadow-lg rounded-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {exchangeName} Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[600px] flex items-center justify-center">
          <div className="flex items-center text-muted-foreground">
            <Info size={16} className="mr-2" /> Loading asset data...
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <BookOpen className="h-5 w-5 text-primary" />
            {exchangeName} Assets
        </CardTitle>
        <div className="relative w-full sm:w-auto sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Symbol..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 h-9 w-full"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[600px] overflow-y-auto">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-20 shadow-sm bg-card">
            <TableRow>{columns.map((col, colIndex) => (
                <TableHead
                  key={col.key || col.label}
                  className={cn(
                      "py-2 px-3 text-xs sm:text-sm whitespace-nowrap",
                      col.className || '',
                      col.key ? 'cursor-pointer hover:bg-muted/50' : '',
                      col.numeric ? 'text-right' : 'text-left',
                      col.sticky === 'left' ? 'sticky z-10' : '',
                      colIndex === 1 ? 'border-r' : '' 
                  )}
                  style={{ 
                      left: col.sticky === 'left' ? col.stickyOffset : undefined, 
                      minWidth: col.minWidth,
                      width: col.width,
                      backgroundColor: 'hsl(var(--card))',
                  }}
                  onClick={() => col.key && handleSort(col.key)}
                >
                  <div className={`flex items-center ${col.numeric ? 'justify-end' : 'justify-start'}`}>
                    {col.icon && <col.icon className="mr-1 h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {col.label}
                    {col.key && renderSortIcon(col.key)}
                  </div>
                </TableHead>
              ))}</TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredData.length > 0 ? sortedAndFilteredData.map((item, index) => (
              <TableRow key={item.id} className="hover:bg-muted/20 h-10 group">
                {columns.map((col, colIndex) => (
                  <TableCell
                    key={`${item.id}-${col.key || col.label}`}
                    className={cn(
                      "py-1.5 px-3 text-xs sm:text-sm whitespace-nowrap group-hover:bg-muted/20",
                      col.className,
                      col.numeric ? 'text-right font-mono' : 'text-left',
                      col.key === 'priceChangePercent24h' && (parseFloatSafe(item.priceChangePercent24h) ?? 0) < 0 ? 'text-red-500 dark:text-red-400' : (parseFloatSafe(item.priceChangePercent24h) ?? 0) > 0 ? 'text-green-500 dark:text-green-400' : '',
                      col.key === 'fundingRate' && (parseFloatSafe(item.fundingRate) ?? 0) < 0 ? 'text-red-500 dark:text-red-400' : (parseFloatSafe(item.fundingRate) ?? 0) > 0 ? 'text-green-500 dark:text-green-400' : '',
                      col.sticky === 'left' ? 'sticky z-10' : '',
                      colIndex === 1 ? 'border-r' : ''
                    )}
                     style={{
                      left: col.sticky === 'left' ? col.stickyOffset : undefined, 
                      backgroundColor: 'hsl(var(--card))', 
                      minWidth: col.minWidth,
                      width: col.width,
                     }}
                  >
                    {col.key === '' ? index + 1 :
                     col.key === 'symbol' ? (
                      <div className="flex items-center gap-2">
                        {item.iconUrl && <Image data-ai-hint={`${item.symbol?.replace(/USDT$/, '').replace(/PERP$/, '').substring(0,10) || 'crypto'} logo`} src={item.iconUrl} alt={item.symbol || 'asset icon'} width={18} height={18} className="rounded-full shrink-0" />}
                        <span className="font-medium truncate" title={item.symbol}>{item.symbol}</span>
                      </div>
                     ) :
                     col.key === 'price' ? formatPrice(item.price) :
                     col.key === 'priceChangePercent24h' ? formatPercentage(item.priceChangePercent24h) :
                     col.key === 'high24h' ? formatPrice(item.high24h) :
                     col.key === 'low24h' ? formatPrice(item.low24h) :
                     col.key === 'dailyVolume' ? formatLargeNumber(item.dailyVolume) :
                     col.key === 'openInterest' ? formatLargeNumber(item.openInterest) :
                     col.key === 'markPrice' ? formatPrice(item.markPrice) :
                     col.key === 'indexPrice' ? formatPrice(item.indexPrice) :
                     col.key === 'fundingRate' ? formatFundingRate(item.fundingRate) :
                     col.key === 'nextFundingTime' ? formatUnixTimestamp(item.nextFundingTime) :
                     col.key === 'dailyTrades' ? formatLargeNumber(item.dailyTrades) :
                     (item[col.key as keyof ExchangeAssetDetail] === null || item[col.key as keyof ExchangeAssetDetail] === undefined) ? 'N/A' : String(item[col.key as keyof ExchangeAssetDetail])
                    }
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground py-3 px-4 text-xs sm:text-sm">
                  {initialAssets && initialAssets.length === 0 ? `No data available for ${exchangeName}.` : `No assets match "${searchTerm}".`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
       {(initialAssets && initialAssets.length > 0 && sortedAndFilteredData.length > 0) && (
         <div className="p-3 text-xs text-muted-foreground border-t">
           Showing {sortedAndFilteredData.length} of {internalAssets.length} assets. Price is updated in real-time. Other metrics update on page load or main account refresh.
         </div>
       )}
    </Card>
  );
}

    
