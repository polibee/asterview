
// src/app/asterdex/page.tsx
'use client';

import React from 'react';
import { getAsterProcessedData, fetchAsterOrderBook } from '@/lib/aster-api';
import type { ExchangeAssetDetail, AsterOrderBookData } from '@/types';
import { AssetDataTable } from '@/components/asset-data-table';
import { OrderBookDisplay } from '@/components/order-book-display';
import { AsterdexAccountCenter } from '@/components/asterdex-account-center';
import { CandlestickChart, AlertTriangle, ServerCrash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// HMR recovery attempt: adding a comment

export default function AsterDexPage() {
  const [exchangeData, setExchangeData] = React.useState<{ assets: ExchangeAssetDetail[] }>({ assets: [] });
  const [orderBook, setOrderBook] = React.useState<AsterOrderBookData | null>(null);
  const [selectedSymbolForOrderBook, setSelectedSymbolForOrderBook] = React.useState<string | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = React.useState(true);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadInitialData() {
      if (exchangeData.assets && exchangeData.assets.length > 0 && !pageError && !isLoadingPageData) {
        return;
      }
      setIsLoadingPageData(true);
      setPageError(null);

      try {
        const processedData = await getAsterProcessedData();
        if (processedData && processedData.assets) {
          setExchangeData({ assets: processedData.assets });
          if (processedData.assets.length > 0 && processedData.assets[0]?.id) {
            setSelectedSymbolForOrderBook(processedData.assets[0].id);
          } else if (processedData.assets.length === 0) {
             console.warn("AsterDex: No assets returned from getAsterProcessedData.");
          }
        } else {
           console.warn("Failed to load critical AsterDex data in page component.");
           setPageError("Could not load essential exchange data. The AsterDex API might be temporarily unavailable or experiencing issues.");
           setExchangeData({ assets: [] });
        }
      } catch (error: any) {
        console.error("Error loading initial AsterDex page data:", error);
        setPageError(error.message || "Could not load essential exchange data. The AsterDex API might be temporarily unavailable or experiencing issues.");
        setExchangeData({ assets: [] });
      } finally {
        setIsLoadingPageData(false);
      }
    }
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (pageError || !selectedSymbolForOrderBook) {
      setOrderBook(null);
      setIsLoadingOrderBook(false);
      return;
    }

    async function loadOrderBook() {
      setIsLoadingOrderBook(true);
      setOrderBook(null);
      try {
        const obData = await fetchAsterOrderBook(selectedSymbolForOrderBook!, 15); // Fetching 15 levels for consistency
        setOrderBook(obData);
      } catch (error) {
        console.warn(`Error loading AsterDex order book for ${selectedSymbolForOrderBook}:`, error);
        setOrderBook(null);
      } finally {
        setIsLoadingOrderBook(false);
      }
    }
    loadOrderBook();
  }, [selectedSymbolForOrderBook, pageError]);

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
        <p className="text-muted-foreground mt-1">Live market data, order book, and account overview for AsterDex.</p>
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
