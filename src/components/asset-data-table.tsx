
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, Search, Info } from 'lucide-react';

interface AssetDataTableProps {
  assets: ExchangeAssetDetail[] | null; // Can be null while loading
  exchangeName: string;
}

type SortKey = keyof ExchangeAssetDetail | '';
type SortOrder = 'asc' | 'desc';

const formatPrice = (price: number) => {
  if (price < 0.001 && price > 0) return `$${price.toPrecision(3)}`;
  if (price < 0.1) return `$${price.toFixed(4)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const formatLargeNumber = (num: number) => {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};


export function AssetDataTable({ assets, exchangeName }: AssetDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dailyVolume');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedAndFilteredData = useMemo(() => {
    if (!assets) return [];
    let filtered = assets.filter(item =>
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortKey) {
      filtered.sort((a, b) => {
        const valA = a[sortKey as keyof ExchangeAssetDetail];
        const valB = b[sortKey as keyof ExchangeAssetDetail];

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
  }, [assets, searchTerm, sortKey, sortOrder]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ?
      <ArrowUpDown className="ml-2 h-4 w-4 text-primary" /> :
      <ArrowUpDown className="ml-2 h-4 w-4 text-primary" />; // TODO: Better icons for asc/desc
  };

  const columns: { key: SortKey; label: string; className?: string, numeric?: boolean }[] = [
    { key: '', label: '#', className: "w-[50px] text-center" },
    { key: 'symbol', label: 'Symbol', className: "w-[180px]" },
    { key: 'price', label: 'Price', numeric: true },
    { key: 'dailyVolume', label: 'Daily Volume (USD)', numeric: true },
    { key: 'openInterest', label: 'Open Interest (USD)', numeric: true },
    { key: 'dailyTrades', label: 'Daily Trades', numeric: true },
  ];

  if (!isClient || !assets) {
    return (
      <Card className="shadow-lg rounded-lg overflow-hidden">
        <CardHeader>
          <CardTitle>{exchangeName} Assets</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="flex items-center text-muted-foreground">
            <Info size={16} className="mr-2" /> Loading asset data...
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{exchangeName} Assets</CardTitle>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Symbol..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead
                    key={col.key || col.label}
                    className={`${col.className || ''} ${col.key ? 'cursor-pointer hover:bg-muted/50' : ''} ${col.numeric ? 'text-right' : 'text-left'} py-3 px-4`}
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
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-muted-foreground py-3 px-4">{index + 1}</TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {item.iconUrl && <Image data-ai-hint="coin logo" src={item.iconUrl} alt={item.symbol} width={20} height={20} className="rounded-full" />}
                      <span className="font-medium">{item.symbol}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono py-3 px-4">{formatPrice(item.price)}</TableCell>
                  <TableCell className="text-right font-mono py-3 px-4">{formatLargeNumber(item.dailyVolume)}</TableCell>
                  <TableCell className="text-right font-mono py-3 px-4">{formatLargeNumber(item.openInterest)}</TableCell>
                  <TableCell className="text-right font-mono py-3 px-4">{formatLargeNumber(item.dailyTrades)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground py-3 px-4">
                    {assets.length === 0 ? `No data available for ${exchangeName}.` : `No assets match "${searchTerm}".`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
       {assets.length > 0 && sortedAndFilteredData.length > 0 && (
         <div className="p-4 text-xs text-muted-foreground border-t">
           Showing {sortedAndFilteredData.length} of {assets.length} assets.
         </div>
       )}
    </Card>
  );
}
