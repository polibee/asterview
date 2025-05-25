// src/app/asterdex/page.tsx
'use client';

import React from 'react';
// import { getAsterProcessedData, fetchAsterOrderBook } from '@/lib/aster-api'; // Combined getAsterProcessedData
import { getAsterProcessedData, fetchAsterOrderBook } from '@/lib/aster-api';
import type { ExchangeAssetDetail, ExchangeData, AsterOrderBookData } from '@/types';
import { AssetDataTable } from '@/components/asset-data-table';
// import { LongShortRatioDisplay } from '@/components/long-short-ratio-display'; // Aster doesn't have this
import { OrderBookDisplay } from '@/components/order-book-display';
import { AsterdexAccountCenter } from '@/components/asterdex-account-center';
import { CandlestickChart, AlertTriangle, ServerCrash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function AsterDexPage() {
  // State for initial page data (assets for the table)
  const [exchangeData, setExchangeData] = React.useState<Partial<ExchangeData>>({ name: 'Aster', metrics: null, assets: [] });

  // State for order book
  const [orderBook, setOrderBook] = React.useState<AsterOrderBookData | null>(null);
  const [selectedSymbolForOrderBook, setSelectedSymbolForOrderBook] = React.useState<string | null>(null);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = React.useState(false);

  // General page loading and error states
  const [isLoadingPageData, setIsLoadingPageData] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);

  // Effect for loading initial asset data for the AssetDataTable
  React.useEffect(() => {
    async function loadInitialData() {
      // This guard helps prevent re-fetching if data is already present from a successful load
      if (exchangeData.assets && exchangeData.assets.length > 0 && !pageError && !isLoadingPageData) {
        return;
      }

      setIsLoadingPageData(true);
      setPageError(null); // Clear previous errors

      try {
        const processedData = await getAsterProcessedData();
        if (processedData && processedData.assets) {
          setExchangeData({ name: 'Aster', metrics: processedData.metrics, assets: processedData.assets });
          if (processedData.assets.length > 0 && processedData.assets[0]?.id) {
            setSelectedSymbolForOrderBook(processedData.assets[0].id);
          } else if (processedData.assets.length === 0) {
             console.warn("AsterDex: No assets returned from getAsterProcessedData.");
          }
        } else {
           // This means getAsterProcessedData indicated a critical failure (e.g. by returning metrics: null)
           console.warn("Failed to load critical AsterDex data in page component.");
           setPageError("Could not load essential exchange data. The AsterDex API might be temporarily unavailable or experiencing issues.");
           setExchangeData({ name: 'Aster', metrics: null, assets: [] });
        }
      } catch (error: any) {
        console.error("Error loading initial AsterDex page data:", error);
        setPageError(error.message || "Could not load essential exchange data. The AsterDex API might be temporarily unavailable or experiencing issues.");
        setExchangeData({ name: 'Aster', metrics: null, assets: [] });
      } finally {
        setIsLoadingPageData(false);
      }
    }

    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount to fetch initial data

  // Effect for loading order book data when selectedSymbolForOrderBook changes or pageError is cleared
  React.useEffect(() => {
    if (pageError || !selectedSymbolForOrderBook) {
      setOrderBook(null);
      setIsLoadingOrderBook(false);
      return;
    }

    async function loadOrderBook() {
      setIsLoadingOrderBook(true);
      setOrderBook(null); // Clear previous order book data
      try {
        const obData = await fetchAsterOrderBook(selectedSymbolForOrderBook!, 50); // Fetching 50 levels
        setOrderBook(obData);
      } catch (error) {
        console.warn(`Error loading AsterDex order book for ${selectedSymbolForOrderBook}:`, error);
        setOrderBook(null); // Set to null on error to clear display
      } finally {
        setIsLoadingOrderBook(false);
      }
    }

    loadOrderBook();
  }, [selectedSymbolForOrderBook, pageError]); // Re-run if selected symbol changes or pageError is resolved

  const availableSymbolsForOrderBook = React.useMemo(() => {
    return exchangeData.assets?.map(asset => ({ id: asset.id, name: asset.symbol })) || [];
  }, [exchangeData.assets]);


  if (isLoadingPageData && !pageError) {
    return (
      <div className="space-y-8">
        <header className="pb-4 mb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CandlestickChart className="h-8 w-8 text-primary" />
            AsterDex Exchange
          </h1>
        </header>
        <Skeleton className="h-64 w-full mb-6 rounded-lg" /> {/* Skeleton for Account Center */}
        <Skeleton className="h-32 w-full mb-6 rounded-lg" /> {/* Skeleton for Order Book */}
        <Skeleton className="h-96 w-full rounded-lg" /> {/* Skeleton for Asset Table */}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="pb-4 mb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CandlestickChart className="h-8 w-8 text-primary" />
          AsterDex Exchange
        </h1>
        <p className="text-muted-foreground mt-1">Detailed market data and account overview for AsterDex.</p>
      </header>

      {pageError && !isLoadingPageData && (
         <Card className="shadow-lg rounded-lg border-destructive my-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCrash className="h-6 w-6 text-destructive" />
              API Error
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-lg font-semibold text-destructive mb-2">Failed to Load AsterDex Data</p>
            <p className="text-muted-foreground">{pageError}</p>
            <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page later. Some components might not load correctly.</p>
          </CardContent>
        </Card>
      )}

      <section>
        {/* The AsterdexAccountCenter component has its own internal title */}
        <h2 className="text-xl font-semibold tracking-tight mb-3 sr-only">Account Center</h2>
        <AsterdexAccountCenter />
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight mt-8 mb-3">Order Book</h2>
        <OrderBookDisplay
          bidsRaw={orderBook?.bids ?? null}
          asksRaw={orderBook?.asks ?? null}
          exchangeName="Aster"
          selectedSymbol={selectedSymbolForOrderBook}
          availableSymbols={availableSymbolsForOrderBook}
          onSymbolChange={setSelectedSymbolForOrderBook}
          isLoading={isLoadingOrderBook}
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight mt-8 mb-3">Market Asset Details</h2>
         {pageError && !isLoadingPageData && (
            <Card className="shadow-lg rounded-lg border-destructive my-4">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-semibold text-destructive mb-2">Market Data Unavailable</h3>
                <p className="text-muted-foreground">Asset details could not be loaded due to the API error.</p>
            </CardContent>
            </Card>
        )}
        {!pageError && (
            <AssetDataTable
                initialAssets={exchangeData.assets ?? []}
                exchangeName="Aster"
            />
        )}
      </section>

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data from AsterDex API.</p>
      </footer>
    </div>
  );
}
