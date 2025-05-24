
'use client'; 

import React, { useState, useEffect, useMemo } from 'react';
import { getEdgeXProcessedData, fetchEdgeXLongShortRatio, fetchEdgeXOrderBook } from '@/lib/edgex-api';
import type { ExchangeAssetDetail, EdgeXLongShortRatioData, EdgeXOrderBookData, EdgeXOrderBookEntryRaw } from '@/types';
import { AssetDataTable } from '@/components/asset-data-table';
import { OrderBookDisplay } from '@/components/order-book-display';
import { LongShortRatioDisplay } from '@/components/long-short-ratio-display';
import { BarChart3, AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function EdgeXPage() {
  const [exchangeData, setExchangeData] = useState<{ assets: ExchangeAssetDetail[] } | null>(null);
  const [longShortRatio, setLongShortRatio] = useState<EdgeXLongShortRatioData | null>(null);
  const [selectedRangeForRatio, setSelectedRangeForRatio] = useState<string>('1h');
  const [orderBook, setOrderBook] = useState<EdgeXOrderBookData | null>(null);
  const [selectedContractForOrderBook, setSelectedContractForOrderBook] = useState<string | null>(null);
  
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isLoadingRatio, setIsLoadingRatio] = useState(false);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingPageData(true);
      setPageError(null);
      try {
        const processedData = await getEdgeXProcessedData();
        // Check if metrics is null (indicating a critical failure like missing metadata)
        // or if assets array is present (even if empty, it means metadata was likely fetched)
        if (processedData && processedData.metrics && processedData.assets) {
          setExchangeData({ assets: processedData.assets });
          if (processedData.assets.length > 0 && processedData.assets[0]?.id) {
            setSelectedContractForOrderBook(processedData.assets[0].id);
          } else if (processedData.assets.length === 0 && processedData.metrics) {
            // Metadata might be fine, but no tradable assets returned. Not necessarily a page error yet.
            setExchangeData({ assets: [] });
          }
        } else {
           // This means getEdgeXProcessedData indicated a critical failure (e.g. by returning metrics: null)
          console.error("Failed to load critical EdgeX data in page component.");
          setPageError("Could not load essential exchange data. The EdgeX API might be temporarily unavailable or experiencing issues.");
          setExchangeData({ assets: [] });
        }
      } catch (error: any) { // Catch any unexpected errors from getEdgeXProcessedData
        console.error("Error loading initial EdgeX page data:", error);
        setPageError(error.message || "Could not load essential exchange data. The EdgeX API might be temporarily unavailable or experiencing issues.");
        setExchangeData({ assets: [] }); 
      } finally {
        setIsLoadingPageData(false);
      }
    }
    loadInitialData();
  }, []); 

  useEffect(() => {
    if (pageError) { 
      setLongShortRatio(null);
      setIsLoadingRatio(false);
      return;
    }

    async function loadRatioData() {
      setIsLoadingRatio(true);
      try {
        const ratioDataResult = await fetchEdgeXLongShortRatio(selectedRangeForRatio);
        setLongShortRatio(ratioDataResult);
      } catch (error) { 
        console.warn(`Error loading EdgeX long/short ratio for range ${selectedRangeForRatio}:`, error);
        setLongShortRatio(null); 
      } finally {
        setIsLoadingRatio(false);
      }
    }
    loadRatioData();
  }, [selectedRangeForRatio, pageError]);

  useEffect(() => {
    if (pageError || !selectedContractForOrderBook) { 
        setOrderBook(null); 
        setIsLoadingOrderBook(false);
        return;
    }

    async function loadOrderBookData() {
      setIsLoadingOrderBook(true);
      setOrderBook(null); 
      try {
        const obDataArray = await fetchEdgeXOrderBook(selectedContractForOrderBook, 15); 
        setOrderBook(obDataArray && obDataArray.length > 0 ? obDataArray[0] : null);
      } catch (error) {
        console.warn(`Error loading EdgeX order book for ${selectedContractForOrderBook}:`, error);
        setOrderBook(null);
      } finally {
        setIsLoadingOrderBook(false);
      }
    }
    loadOrderBookData();
  }, [selectedContractForOrderBook, pageError]);
  
  const aggregatedRatioItem = useMemo(() => {
    return longShortRatio?.exchangeLongShortRatioList?.find(item => item.exchange === '_total_') || longShortRatio?.exchangeLongShortRatioList?.[0] || null;
  }, [longShortRatio]);

  const availableSymbolsForOrderBook = useMemo(() => {
    return exchangeData?.assets.map(asset => ({ id: asset.id, name: asset.symbol })) || [];
  }, [exchangeData]);

  if (isLoadingPageData && !pageError) {
    return (
      <div className="space-y-8">
        <header className="pb-4 mb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            EdgeX Exchange Data
          </h1>
           <p className="text-muted-foreground mt-1">Detailed asset information from EdgeX.</p>
        </header>
        <Skeleton className="h-32 w-full mb-6 rounded-lg" />
        <Skeleton className="h-64 w-full mb-6 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (pageError && !isLoadingPageData) { 
    return (
      <div className="space-y-8">
        <header className="pb-4 mb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            EdgeX Exchange Data
          </h1>
        </header>
        <Card className="shadow-lg rounded-lg border-destructive">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Error Fetching Data</h2>
            <p className="text-muted-foreground">{pageError}</p>
            <p className="text-sm text-muted-foreground mt-2">Please try again later or check API status.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <header className="pb-4 mb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          EdgeX Exchange Data
        </h1>
        <p className="text-muted-foreground mt-1">Detailed asset information from EdgeX.</p>
      </header>

      <section>
        <LongShortRatioDisplay
          ratioData={aggregatedRatioItem}
          exchangeName="EdgeX"
          availableRanges={longShortRatio?.allRangeList || ['30m', '1h', '4h', '12h', '24h']}
          selectedRange={selectedRangeForRatio}
          onRangeChange={setSelectedRangeForRatio}
          isLoading={isLoadingRatio}
        />
      </section>
      
      <section>
        <OrderBookDisplay
          bidsRaw={orderBook?.bids as EdgeXOrderBookEntryRaw[] | null}
          asksRaw={orderBook?.asks as EdgeXOrderBookEntryRaw[] | null}
          exchangeName="EdgeX"
          selectedSymbol={selectedContractForOrderBook}
          availableSymbols={availableSymbolsForOrderBook}
          onSymbolChange={setSelectedContractForOrderBook}
          isLoading={isLoadingOrderBook}
        />
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Asset Details</h2>
        <AssetDataTable 
          initialAssets={exchangeData?.assets ?? []} 
          exchangeName="EdgeX" 
        />
      </section>

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data fetched from EdgeX API.</p>
      </footer>
    </div>
  );
}
