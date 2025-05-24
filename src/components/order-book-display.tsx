
'use client';

import React, { useMemo } from 'react';
import type { AsterOrderBookEntry, EdgeXOrderBookEntryRaw, UnifiedOrderBookEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Info } from 'lucide-react';

interface OrderBookDisplayProps {
  bidsRaw: AsterOrderBookEntry[] | EdgeXOrderBookEntryRaw[] | null;
  asksRaw: AsterOrderBookEntry[] | EdgeXOrderBookEntryRaw[] | null;
  exchangeName: 'Aster' | 'EdgeX';
  selectedSymbol: string | null;
  availableSymbols: { id: string; name: string }[];
  onSymbolChange: (symbolId: string) => void;
  isLoading: boolean;
}

const parseFloatSafe = (value: string | number | undefined, defaultValue = 0): number => {
  if (value === undefined) return defaultValue;
  const num = parseFloat(String(value));
  return isNaN(num) ? defaultValue : num;
};

const processOrderBookData = (
  data: AsterOrderBookEntry[] | EdgeXOrderBookEntryRaw[] | null,
  isBid: boolean,
  exchangeName: 'Aster' | 'EdgeX'
): UnifiedOrderBookEntry[] => {
  if (!data) return [];

  let cumulativeQty = 0;
  const processed = data.map(item => {
    let price: number, quantity: number;
    if (exchangeName === 'Aster') {
      const [priceStr, qtyStr] = item as AsterOrderBookEntry;
      price = parseFloatSafe(priceStr);
      quantity = parseFloatSafe(qtyStr);
    } else { // EdgeX
      const { price: priceStr, size: qtyStr } = item as EdgeXOrderBookEntryRaw;
      price = parseFloatSafe(priceStr);
      quantity = parseFloatSafe(qtyStr);
    }
    cumulativeQty += quantity;
    return { price, quantity, total: cumulativeQty };
  });

  return isBid ? processed : processed.sort((a, b) => a.price - b.price); // Asks: lowest price at top of visual list
};


export function OrderBookDisplay({
  bidsRaw,
  asksRaw,
  exchangeName,
  selectedSymbol,
  availableSymbols,
  onSymbolChange,
  isLoading
}: OrderBookDisplayProps) {

  const bids = useMemo(() => processOrderBookData(bidsRaw, true, exchangeName), [bidsRaw, exchangeName]);
  // For asks, ensure they are sorted ascending by price for typical display (lowest ask at the "bottom" of its list, visually closer to bids)
  const asks = useMemo(() => processOrderBookData(asksRaw, false, exchangeName), [asksRaw, exchangeName]);


  const maxCumulative = Math.max(
    bids[bids.length - 1]?.total || 0,
    asks[asks.length - 1]?.total || 0 
  );
  
  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  }

  const renderOrderBookRows = (orders: UnifiedOrderBookEntry[], isBid: boolean) => {
    // For asks, we want to display them traditionally: lowest ask price at the "bottom" of the asks list (top of the table segment)
    // and highest ask price at the "top" of the asks list (bottom of the table segment).
    // The `processOrderBookData` already sorts asks by price ascending.
    // If displaying asks in a list that grows upwards from the spread, iterate normally.
    // If displaying asks in a list that grows downwards (like bids), reverse asks.
    // Current setup for asks: lowest price at top (index 0), highest at bottom.
    const displayOrders = isBid ? orders : [...orders].reverse(); // Reverse asks for typical top-down display starting with lowest ask

    return displayOrders.map((order, index) => (
      <TableRow key={`${order.price}-${index}-${isBid}`} className="relative hover:bg-muted/20 h-7">
        {isBid ? (
          <>
            <TableCell className="text-green-500 text-xs md:text-sm py-1 px-2 text-right font-mono w-1/3 relative z-[1]">
              {formatPrice(order.price)}
            </TableCell>
            <TableCell className="text-xs md:text-sm py-1 px-2 text-right font-mono w-1/3 relative z-[1]">
              {order.quantity.toFixed(4)}
            </TableCell>
            <TableCell className="text-xs md:text-sm py-1 px-2 text-right font-mono w-1/3 relative z-[1]">
              {order.total?.toFixed(4)}
               {/* Bar for Bids (right-aligned) - now child of last cell for bids */}
              <div
                className="absolute top-0 right-0 h-full bg-opacity-20 transition-all duration-100 pointer-events-none"
                style={{
                  width: `${((order.total || 0) / maxCumulative) * 100}%`,
                  backgroundColor: 'hsl(var(--chart-1))', // Using chart-1 for bids
                  zIndex: 0, 
                }}
              />
            </TableCell>
          </>
        ) : (
          <>
            <TableCell className="text-red-500 text-xs md:text-sm py-1 px-2 text-left font-mono w-1/3 relative z-[1]">
              {formatPrice(order.price)}
            </TableCell>
            <TableCell className="text-xs md:text-sm py-1 px-2 text-left font-mono w-1/3 relative z-[1]">
              {order.quantity.toFixed(4)}
            </TableCell>
            <TableCell className="text-xs md:text-sm py-1 px-2 text-left font-mono w-1/3 relative z-[1]">
              {order.total?.toFixed(4)}
              {/* Bar for Asks (left-aligned) - now child of last cell for asks */}
              <div
                className="absolute top-0 left-0 h-full bg-opacity-20 transition-all duration-100 pointer-events-none"
                style={{
                  width: `${((order.total || 0) / maxCumulative) * 100}%`,
                  backgroundColor: 'hsl(var(--chart-2))', // Using chart-2 for asks
                  zIndex: 0, 
                }}
              />
            </TableCell>
          </>
        )}
      </TableRow>
    ));
  };


  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
            <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Order Book
            </CardTitle>
            <CardDescription>{exchangeName} - {selectedSymbol || 'Select a symbol'}</CardDescription>
        </div>
        <Select onValueChange={onSymbolChange} value={selectedSymbol || ""}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Select Symbol" />
          </SelectTrigger>
          <SelectContent>
            {availableSymbols.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading && selectedSymbol && (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <Info size={16} className="mr-2" /> Loading order book for {selectedSymbol}...
            </div>
        )}
        {!selectedSymbol && !isLoading && (
             <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <Info size={16} className="mr-2" /> Please select a symbol to view its order book.
            </div>
        )}
        {selectedSymbol && !isLoading && (!bidsRaw || !asksRaw || bidsRaw.length === 0 || asksRaw.length === 0) && (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <Info size={16} className="mr-2" /> No order book data available for {selectedSymbol}.
            </div>
        )}

        {selectedSymbol && !isLoading && bidsRaw && asksRaw && bidsRaw.length > 0 && asksRaw.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-x-1">
            {/* Bids Table */}
            <div className="md:border-r md:pr-0.5">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="h-9">
                    <TableHead className="text-right py-1 px-2 text-xs md:text-sm w-1/3">Price (USD)</TableHead>
                    <TableHead className="text-right py-1 px-2 text-xs md:text-sm w-1/3">Quantity</TableHead>
                    <TableHead className="text-right py-1 px-2 text-xs md:text-sm w-1/3">Total</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <ScrollArea className="h-[300px] md:h-[400px]">
                <Table className="w-full">
                  <TableBody>{renderOrderBookRows(bids, true)}</TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Asks Table */}
            <div className="mt-4 md:mt-0 md:border-l md:pl-0.5">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="h-9">
                    <TableHead className="py-1 px-2 text-xs md:text-sm w-1/3">Price (USD)</TableHead>
                    <TableHead className="py-1 px-2 text-xs md:text-sm w-1/3">Quantity</TableHead>
                    <TableHead className="py-1 px-2 text-xs md:text-sm w-1/3">Total</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <ScrollArea className="h-[300px] md:h-[400px]">
                <Table className="w-full">
                  {/* For asks, reverse the array for typical display (lowest ask price at top) */}
                  <TableBody>{renderOrderBookRows(asks, false)}</TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

