
'use client'; 

import React, { useState, useEffect, useMemo } from 'react';
import { getAsterProcessedData, fetchAsterOrderBook } from '@/lib/aster-api';
import type { ExchangeAssetDetail, AsterOrderBookData, AsterOrderBookEntry } from '@/types';
import { AssetDataTable } from '@/components/asset-data-table';
import { OrderBookDisplay } from '@/components/order-book-display';
import { LongShortRatioDisplay } from '@/components/long-short-ratio-display'; 
import { CandlestickChart, AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function AsterDexPage() {
  const [exchangeData, setExchangeData] = useState<{ assets: ExchangeAssetDetail[] } | null>(null);
  const [orderBook, setOrderBook] = useState<AsterOrderBookData | null>(null);
  const [selectedSymbolForOrderBook, setSelectedSymbolForOrderBook] = useState<string | null>(null);
  
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoadingPageData(true);
      setPageError(null);
      try {
        const result = await getAsterProcessedData();
        if (result && result.assets) {
          setExchangeData({ assets: result.assets });
          if (result.assets.length > 0 && result.assets[0]?.id) {
            setSelectedSymbolForOrderBook(result.assets[0].id);
          }
        } else {
          throw new Error("Failed to process AsterDex exchange data.");
        }
      } catch (error: any) {
        console.error("Error loading initial AsterDex page data:", error);
        setPageError(error.message || "Could not load essential exchange data. The AsterDex API might be temporarily unavailable or experiencing issues.");
        setExchangeData({ assets: [] }); 
      } finally {
        setIsLoadingPageData(false);
      }
    }
    loadData();
  }, []); 

  useEffect(() => {
    if (pageError || !selectedSymbolForOrderBook) return;

    async function loadOrderBook() {
      setIsLoadingOrderBook(true);
      setOrderBook(null); 
      try {
        const obData = await fetchAsterOrderBook(selectedSymbolForOrderBook, 50); 
        setOrderBook(obData);
      } catch (error) {
        console.error(`Error loading AsterDex order book for ${selectedSymbolForOrderBook}:`, error);
        setOrderBook(null);
      } finally {
        setIsLoadingOrderBook(false);
      }
    }
    loadOrderBook();
  }, [selectedSymbolForOrderBook, pageError]);

  const availableSymbolsForOrderBook = useMemo(() => {
    return exchangeData?.assets.map(asset => ({ id: asset.id, name: asset.symbol })) || [];
  }, [exchangeData]);

  if (isLoadingPageData && !pageError) {
    return (
      <div className="space-y-8">
        <header className="pb-4 mb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CandlestickChart className="h-8 w-8 text-primary" />
            AsterDex Exchange Data
          </h1>
          <p className="text-muted-foreground mt-1">Detailed asset information from AsterDex.</p>
        </header>
        <Skeleton className="h-32 w-full mb-6 rounded-lg" />
        <Skeleton className="h-64 w-full mb-6 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="space-y-8">
        <header className="pb-4 mb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CandlestickChart className="h-8 w-8 text-primary" />
            AsterDex Exchange Data
          </h1>
        </header>
        <Card className="shadow-lg rounded-lg border-destructive">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Error Fetching Data</h2>
            <p className="text-muted-foreground">{pageError}</p>
            <p className="text-sm text-muted-foreground mt-2">Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Asset Details</h2>
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
