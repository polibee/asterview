
'use client'; // Required for useState, useEffect

import React, { useState, useEffect, useMemo } from 'react';
import { getAsterProcessedData, fetchAsterOrderBook } from '@/lib/aster-api';
import type { ExchangeAssetDetail, AsterOrderBookData, AsterOrderBookEntry } from '@/types';
import { AssetDataTable } from '@/components/asset-data-table';
import { OrderBookDisplay } from '@/components/order-book-display';
import { LongShortRatioDisplay } from '@/components/long-short-ratio-display'; 
import { CandlestickChart, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AsterDexPage() {
  const [exchangeData, setExchangeData] = useState<{ assets: ExchangeAssetDetail[] } | null>(null);
  const [orderBook, setOrderBook] = useState<AsterOrderBookData | null>(null);
  const [selectedSymbolForOrderBook, setSelectedSymbolForOrderBook] = useState<string | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoadingPageData(true);
      try {
        const result = await getAsterProcessedData();
        setExchangeData({ assets: result.assets });
        if (result.assets.length > 0 && result.assets[0]?.id) {
          setSelectedSymbolForOrderBook(result.assets[0].id);
        }
      } catch (error) {
        console.error("Error loading initial AsterDex page data:", error);
        setExchangeData({ assets: [] }); // Fallback to empty data
      } finally {
        setIsLoadingPageData(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSymbolForOrderBook) {
      async function loadOrderBook() {
        setIsLoadingOrderBook(true);
        setOrderBook(null); // Clear previous order book
        try {
          const obData = await fetchAsterOrderBook(selectedSymbolForOrderBook, 50); // Limit to 50 levels
          setOrderBook(obData);
        } catch (error) {
          console.error(`Error loading AsterDex order book for ${selectedSymbolForOrderBook}:`, error);
          setOrderBook(null); // Fallback
        } finally {
          setIsLoadingOrderBook(false);
        }
      }
      loadOrderBook();
    }
  }, [selectedSymbolForOrderBook]);

  const availableSymbolsForOrderBook = useMemo(() => {
    return exchangeData?.assets.map(asset => ({ id: asset.id, name: asset.symbol })) || [];
  }, [exchangeData]);

  if (isLoadingPageData && !exchangeData) { // Show skeleton only if no data yet
    return (
      <div className="container mx-auto px-4 md:px-6 py-8 space-y-8">
        <header className="pb-4 mb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CandlestickChart className="h-8 w-8 text-primary" />
            AsterDex Exchange Data
          </h1>
          <p className="text-muted-foreground mt-1">Detailed asset information from AsterDex.</p>
        </header>
        <Skeleton className="h-24 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-8">
      <header className="pb-4 mb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CandlestickChart className="h-8 w-8 text-primary" />
          AsterDex Exchange Data
        </h1>
        <p className="text-muted-foreground mt-1">Detailed asset information from AsterDex.</p>
      </header>

      <section>
        <LongShortRatioDisplay
          ratioData={null} 
          exchangeName="Aster"
          isLoading={false} 
        />
      </section>

      <section>
        <OrderBookDisplay
          bidsRaw={orderBook?.bids as AsterOrderBookEntry[] | null}
          asksRaw={orderBook?.asks as AsterOrderBookEntry[] | null}
          exchangeName="Aster"
          selectedSymbol={selectedSymbolForOrderBook}
          availableSymbols={availableSymbolsForOrderBook}
          onSymbolChange={setSelectedSymbolForOrderBook}
          isLoading={isLoadingOrderBook}
        />
      </section>
      
      <section>
        <AssetDataTable 
          initialAssets={exchangeData?.assets ?? []} 
          exchangeName="Aster" 
        />
      </section>

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data fetched from AsterDex API.</p>
      </footer>
    </div>
  );
}
