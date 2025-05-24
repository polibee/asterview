
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
// import { Button } from '@/components/ui/button'; // Button removed as Clear Filters was removed
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, Search, Info, Percent } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';


interface AssetDataTableProps {
  initialAssets: ExchangeAssetDetail[] | null; 
  exchangeName: 'Aster' | 'EdgeX';
}

type SortKey = keyof ExchangeAssetDetail | '';
type SortOrder = 'asc' | 'desc';

const parseFloatSafe = (value: string | number | undefined, defaultValue = 0): number => {
    if (value === undefined || value === null) return defaultValue;
    const num = parseFloat(String(value));
    return isNaN(num) ? defaultValue : num;
};

const formatPrice = (price: number | undefined) => {
  if (price === undefined || price === null) return 'N/A';
  if (price < 0.0001 && price > 0) return `$${price.toPrecision(2)}`;
  if (price < 0.01 && price > 0) return `$${price.toPrecision(3)}`;
  if (price < 0.1) return `$${price.toFixed(4)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
};

const formatLargeNumber = (num: number | undefined) => {
  if (num === undefined || num === null) return 'N/A';
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
};

const formatFundingRate = (rate: number | null | undefined) => {
  if (rate === null || rate === undefined) return 'N/A';
  return `${(rate * 100).toFixed(4)}%`;
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
      // console.log(`${exchangeName} WebSocket connected`);
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
            id: ticker.s, // symbol
            price: parseFloatSafe(ticker.c) // last price
          }));
        } else if (exchangeName === 'EdgeX' && message.type === 'payload' && message.channel === 'ticker.all' && message.content?.dataType === "Changed" && Array.isArray(message.content?.data) ) {
           priceUpdates = message.content.data.map((ticker: any) => ({
            id: ticker.contractId,
            price: parseFloatSafe(ticker.lastPrice)
          }));
        } else if (exchangeName === 'EdgeX' && message.type === 'payload' && message.channel === 'ticker.all' && message.content?.dataType === "Snapshot" && Array.isArray(message.content?.data) ) {
          // EdgeX also sends Snapshots, handle them similarly
          priceUpdates = message.content.data.map((ticker: any) => ({
            id: ticker.contractId,
            price: parseFloatSafe(ticker.lastPrice)
          }));
        }


        if (priceUpdates.length > 0) {
          setInternalAssets(prevAssets => {
            const newAssets = [...prevAssets]; // Create a new array to trigger re-render
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
  }, [isClient, exchangeName, internalAssets.length]); // internalAssets.length to potentially re-init ws if assets get wiped

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

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
         if (valA === null && valB !== null) return sortOrder === 'asc' ? -1 : 1;
         if (valA !== null && valB === null) return sortOrder === 'asc' ? 1 : -1;
         if (valA === null && valB === null) return 0;

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
      <ArrowUpDown className="ml-2 h-3 w-3 text-primary shrink-0" /> : // Replace with ArrowUp when available
      <ArrowUpDown className="ml-2 h-3 w-3 text-primary shrink-0" />; // Replace with ArrowDown when available
  };

  const columns: { key: SortKey; label: string; className?: string, numeric?: boolean }[] = [
    { key: '', label: '#', className: "w-[40px] text-center sticky left-0 bg-card z-10" },
    { key: 'symbol', label: 'Symbol', className: "w-[150px] sticky left-[40px] bg-card z-10" },
    { key: 'price', label: 'Price', numeric: true },
    { key: 'fundingRate', label: 'Funding Rate', numeric: true, className: "w-[130px]" },
    { key: 'dailyVolume', label: 'Volume (24h)', numeric: true, className: "w-[150px]" },
    { key: 'openInterest', label: 'Open Interest', numeric: true, className: "w-[150px]" },
    { key: 'dailyTrades', label: 'Trades (24h)', numeric: true, className: "w-[130px]" },
  ];

  if (!isClient || !initialAssets) { // Still check initialAssets for skeleton
    return (
      <Card className="shadow-lg rounded-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {exchangeName} Assets <Percent className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
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
      <CardContent className="p-0">
        <ScrollArea className="w-full h-[500px] whitespace-nowrap">
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 bg-card z-20">
              <TableRow>
                {columns.map(col => (
                  <TableHead
                    key={col.key || col.label}
                    className={cn(
                        "py-2 px-3 text-xs sm:text-sm",
                        col.className || '', 
                        col.key ? 'cursor-pointer hover:bg-muted/50' : '', 
                        col.numeric ? 'text-right' : 'text-left'
                    )}
                    onClick={() => col.key && handleSort(col.key)}
                  >
                    <div className={`flex items-center ${col.numeric ? 'justify-end' : 'justify-start'}`}>
                      {col.label}
                      {col.key && renderSortIcon(col.key)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredData.length > 0 ? sortedAndFilteredData.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-muted/20 h-10">
                  <TableCell className="text-center text-muted-foreground py-1.5 px-3 text-xs sm:text-sm sticky left-0 bg-card group-hover:bg-muted/20 z-10">{index + 1}</TableCell>
                  <TableCell className="py-1.5 px-3 text-xs sm:text-sm sticky left-[40px] bg-card group-hover:bg-muted/20 z-10">
                    <div className="flex items-center gap-2">
                      {item.iconUrl && <Image data-ai-hint={`${item.symbol.split('/')[0]} logo`} src={item.iconUrl} alt={item.symbol} width={18} height={18} className="rounded-full shrink-0" />}
                      <span className="font-medium truncate" title={item.symbol}>{item.symbol}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono py-1.5 px-3 text-xs sm:text-sm">{formatPrice(item.price)}</TableCell>
                  <TableCell className={`text-right font-mono py-1.5 px-3 text-xs sm:text-sm ${item.fundingRate && item.fundingRate < 0 ? 'text-red-500' : item.fundingRate && item.fundingRate > 0 ? 'text-green-500' : ''}`}>
                    {formatFundingRate(item.fundingRate)}
                  </TableCell>
                  <TableCell className="text-right font-mono py-1.5 px-3 text-xs sm:text-sm">{formatLargeNumber(item.dailyVolume)}</TableCell>
                  <TableCell className="text-right font-mono py-1.5 px-3 text-xs sm:text-sm">{formatLargeNumber(item.openInterest)}</TableCell>
                  <TableCell className="text-right font-mono py-1.5 px-3 text-xs sm:text-sm">{formatLargeNumber(item.dailyTrades)}</TableCell>
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
        </ScrollArea>
      </CardContent>
       {(initialAssets && initialAssets.length > 0 && sortedAndFilteredData.length > 0) && (
         <div className="p-3 text-xs text-muted-foreground border-t">
           Showing {sortedAndFilteredData.length} of {internalAssets.length} assets. Prices are updated in real-time. Other metrics update on page load.
         </div>
       )}
    </Card>
  );
}
