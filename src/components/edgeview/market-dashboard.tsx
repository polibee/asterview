'use client';

import type { MarketData } from '@/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Search, Filter, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface MarketDashboardProps {
  initialData: MarketData[];
}

type SortKey = keyof MarketData | '';
type SortOrder = 'asc' | 'desc';

const formatPrice = (price: number) => {
  if (price < 0.01 && price > 0) return `$${price.toPrecision(4)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const formatPercentage = (change: number) => {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

export function MarketDashboard({ initialData }: MarketDashboardProps) {
  const [data, setData] = useState<MarketData[]>(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilterMin, setPriceFilterMin] = useState('');
  const [priceFilterMax, setPriceFilterMax] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Hydration safety for lastUpdated
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc'); // Default to descending for new column
    }
  };

  const sortedAndFilteredData = useMemo(() => {
    let filtered = initialData.filter(item =>
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.symbol.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (priceFilterMin === '' || item.price >= parseFloat(priceFilterMin)) &&
      (priceFilterMax === '' || item.price <= parseFloat(priceFilterMax))
    );

    if (sortKey) {
      filtered.sort((a, b) => {
        const valA = a[sortKey as keyof MarketData];
        const valB = b[sortKey as keyof MarketData];

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
  }, [initialData, searchTerm, priceFilterMin, priceFilterMax, sortKey, sortOrder]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' ? 
      <ArrowUpDown className="ml-2 h-4 w-4 text-accent" /> : // Using ArrowUpDown and coloring it for active sort
      <ArrowUpDown className="ml-2 h-4 w-4 text-accent" />; // Could use ArrowUp/ArrowDown if preferred
  };
  
  const columns: { key: SortKey; label: string; className?: string, numeric?: boolean }[] = [
    { key: '', label: '#', className: "w-[50px] text-center" },
    { key: 'name', label: 'Name', className: "w-[200px]" },
    { key: 'price', label: 'Price', numeric: true },
    { key: 'change24h', label: '24h %', numeric: true },
    { key: 'high24h', label: '24h High', numeric: true },
    { key: 'low24h', label: '24h Low', numeric: true },
    { key: 'volume24h', label: 'Volume (24h)', numeric: true },
    { key: 'marketCap', label: 'Market Cap', numeric: true },
    { key: 'lastUpdated', label: 'Last Updated', className: "w-[180px]" },
  ];


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center p-4 bg-card rounded-lg shadow">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Filter className="h-5 w-5 text-muted-foreground self-center" />
          <Input
            type="number"
            placeholder="Min Price"
            value={priceFilterMin}
            onChange={e => setPriceFilterMin(e.target.value)}
            className="w-full md:w-auto"
          />
          <Input
            type="number"
            placeholder="Max Price"
            value={priceFilterMax}
            onChange={e => setPriceFilterMax(e.target.value)}
            className="w-full md:w-auto"
          />
        </div>
         <Button 
            variant="outline" 
            onClick={() => {setSearchTerm(''); setPriceFilterMin(''); setPriceFilterMax(''); setSortKey('marketCap'); setSortOrder('desc');}}
            className="w-full md:w-auto"
          >
            Clear Filters
          </Button>
      </div>

      <Card className="shadow-lg rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead 
                  key={col.key || col.label} 
                  className={`${col.className || ''} ${col.key ? 'cursor-pointer hover:bg-muted/50' : ''} ${col.numeric ? 'text-right' : 'text-left'}`}
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
            {sortedAndFilteredData.map((item, index) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {item.iconUrl && <Image data-ai-hint="coin logo" src={item.iconUrl} alt={item.name} width={24} height={24} className="rounded-full" />}
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.symbol}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatPrice(item.price)}</TableCell>
                <TableCell className={`text-right font-mono ${item.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(item.change24h)}
                </TableCell>
                <TableCell className="text-right font-mono">{formatPrice(item.high24h)}</TableCell>
                <TableCell className="text-right font-mono">{formatPrice(item.low24h)}</TableCell>
                <TableCell className="text-right font-mono">{formatPrice(item.volume24h)}</TableCell>
                <TableCell className="text-right font-mono">{formatPrice(item.marketCap)}</TableCell>
                <TableCell className="text-left text-xs text-muted-foreground">
                  {isClient ? format(parseISO(item.lastUpdated), 'MMM d, yyyy HH:mm') : 'Loading...'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sortedAndFilteredData.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            No data matches your filters.
          </div>
        )}
      </Card>
    </div>
  );
}
