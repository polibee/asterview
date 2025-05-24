
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
import { ArrowUpDown, Search, Info, Percent, CalendarClock, TrendingUp, TrendingDown, Target, GanttChartSquare } from 'lucide-react';
// Removed ScrollArea import as we'll rely on Table's internal scroll
import { cn } from '@/lib/utils';
import { format, fromUnixTime } from 'date-fns';


interface AssetDataTableProps {
  initialAssets: ExchangeAssetDetail[] | null; 
  exchangeName: 'Aster' | 'EdgeX';
}

type SortKey = keyof ExchangeAssetDetail | '';
type SortOrder = 'asc' | 'desc';

const parseFloatSafe = (value: string | number | undefined | null, defaultValue = 0): number => {
    if (value === undefined || value === null) return defaultValue;
    const num = parseFloat(String(value));
    return isNaN(num) ? defaultValue : num;
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

  if (price > 0 && price < 0.000001) { 
    return `$${price.toExponential(2)}`;
  } else if (price > 0 && price < highPrecisionThreshold / 1000) {
    minimumFractionDigits = 6;
    maximumFractionDigits = 8;
  } else if (price > 0 && price < highPrecisionThreshold / 100) {
    minimumFractionDigits = 5;
    maximumFractionDigits = 6;
  } else if (price > 0 && price < highPrecisionThreshold / 10) {
    minimumFractionDigits = 4;
    maximumFractionDigits = 5;
  } else if (price > 0 && price < highPrecisionThreshold) {
    minimumFractionDigits = 3;
    maximumFractionDigits = 4;
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
  return `${percentage.toFixed(2)}%`;
};

const formatFundingRate = (rate: number | null | undefined) => {
  if (rate === null || rate === undefined || isNaN(rate)) return 'N/A';
  return `${(rate * 100).toFixed(4)}%`;
};

const formatUnixTimestamp = (timestamp: number | null | undefined) => {
  if (timestamp === null || timestamp === undefined || isNaN(timestamp)) return 'N/A';
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
    if (!isClient || internalAssets.length === 0) return;

    const endpoint = exchangeName === 'Aster' 
        ? 'wss://fstream.asterdex.com/stream?streams=!ticker@arr' 
        : 'wss://pro.edgex.exchange/api/v1/public/ws';

    const ws = new WebSocket(endpoint);

    ws.onopen = () => {
      if (exchangeName === 'EdgeX') {
        ws.send(JSON.stringify({ type: "subscribe", channel: "ticker.all" }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        
        let priceUpdates: { id: string, price: number }[] = [];

        if (exchangeName === 'Aster' && message.stream === '!ticker@arr' && Array.isArray(message.data)) {
          priceUpdates = message.data.map((ticker: any) => ({
            id: ticker.s, 
            price: parseFloatSafe(ticker.c) 
          }));
        } else if (exchangeName === 'EdgeX' && message.type === 'payload' && message.channel === 'ticker.all' && message.content?.dataType === "Changed" && Array.isArray(message.content?.data) ) {
           priceUpdates = message.content.data.map((ticker: any) => ({
            id: ticker.contractId,
            price: parseFloatSafe(ticker.lastPrice)
          }));
        } else if (exchangeName === 'EdgeX' && message.type === 'payload' && message.channel === 'ticker.all' && message.content?.dataType === "Snapshot" && Array.isArray(message.content?.data) ) {
          priceUpdates = message.content.data.map((ticker: any) => ({
            id: ticker.contractId,
            price: parseFloatSafe(ticker.lastPrice)
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

  const columns: { key: SortKey; label: string; icon?: React.ElementType; className?: string, numeric?: boolean, sticky?: 'left' | 'right', stickyOffset?: string }[] = [
    { key: '', label: '#', className: "w-[40px] text-center", sticky: 'left', stickyOffset: '0px' },
    { key: 'symbol', label: 'Symbol', className: "w-[150px]", sticky: 'left', stickyOffset: '40px' },
    { key: 'price', label: 'Price', numeric: true },
    { key: 'priceChangePercent24h', label: '24h Chg %', icon: Percent, numeric: true, className: "w-[120px]" },
    { key: 'high24h', label: '24h High', icon: TrendingUp, numeric: true, className: "w-[130px]" },
    { key: 'low24h', label: '24h Low', icon: TrendingDown, numeric: true, className: "w-[130px]" },
    { key: 'dailyVolume', label: 'Volume (24h)', numeric: true, className: "w-[150px]" },
    { key: 'openInterest', label: 'Open Interest', numeric: true, className: "w-[150px]" },
    { key: 'markPrice', label: 'Mark Price', icon: Target, numeric: true, className: "w-[130px]" },
    { key: 'indexPrice', label: 'Index Price', icon: GanttChartSquare, numeric: true, className: "w-[130px]" },
    { key: 'fundingRate', label: 'Funding Rate', numeric: true, className: "w-[130px]" },
    { key: 'nextFundingTime', label: 'Next Funding', icon: CalendarClock, numeric: false, className: "w-[150px]" },
    { key: 'dailyTrades', label: 'Trades (24h)', numeric: true, className: "w-[130px]" },
  ];

  if (!isClient || !initialAssets) { 
    return (
      <Card className="shadow-lg rounded-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {exchangeName} Assets <Percent className="h-5 w-5 text-muted-foreground" />
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
            {exchangeName} Assets <Percent className="h-5 w-5 text-primary" />
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
      <CardContent className="p-0 h-[600px]"> {/* Added fixed height for vertical scroll */}
          <Table className="min-w-full"> {/* Table itself handles overflow due to its wrapper */}
            <TableHeader className="sticky top-0 bg-card z-20"> {/* Sticky header */}
              <TableRow>
                {columns.map(col => (
                  <TableHead
                    key={col.key || col.label}
                    className={cn(
                        "py-2 px-3 text-xs sm:text-sm bg-card", // Ensure background for sticky
                        col.className || '', 
                        col.key ? 'cursor-pointer hover:bg-muted/50' : '', 
                        col.numeric ? 'text-right' : 'text-left',
                        col.sticky === 'left' ? 'sticky z-10' : '' // Apply sticky class
                    )}
                    style={col.sticky === 'left' ? { left: col.stickyOffset } : {}}
                    onClick={() => col.key && handleSort(col.key)}
                  >
                    <div className={`flex items-center ${col.numeric ? 'justify-end' : 'justify-start'}`}>
                      {col.icon && <col.icon className="mr-1 h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      {col.label}
                      {col.key && renderSortIcon(col.key)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredData.length > 0 ? sortedAndFilteredData.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-muted/20 h-10 group">
                  {columns.map(col => (
                    <TableCell
                      key={`${item.id}-${col.key || col.label}`}
                      className={cn(
                        "py-1.5 px-3 text-xs sm:text-sm whitespace-nowrap bg-card group-hover:bg-muted/20", // Ensure background for sticky, add whitespace-nowrap
                        col.className,
                        col.numeric ? 'text-right font-mono' : 'text-left',
                        col.key === 'priceChangePercent24h' && (parseFloatSafe(item.priceChangePercent24h) < 0 ? 'text-red-500' : parseFloatSafe(item.priceChangePercent24h) > 0 ? 'text-green-500' : ''),
                        col.key === 'fundingRate' && (parseFloatSafe(item.fundingRate) < 0 ? 'text-red-500' : parseFloatSafe(item.fundingRate) > 0 ? 'text-green-500' : ''),
                        col.sticky === 'left' ? 'sticky z-10' : '' // Apply sticky class
                      )}
                      style={col.sticky === 'left' ? { left: col.stickyOffset } : {}}
                    >
                      {col.key === '' ? index + 1 :
                       col.key === 'symbol' ? (
                        <div className="flex items-center gap-2">
                          {item.iconUrl && <Image data-ai-hint={`${item.symbol.split('/')[0]} logo`} src={item.iconUrl} alt={item.symbol} width={18} height={18} className="rounded-full shrink-0" />}
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
           Showing {sortedAndFilteredData.length} of {internalAssets.length} assets. Price is updated in real-time via WebSocket. Other metrics update on page load or interaction.
         </div>
       )}
    </Card>
  );
}

