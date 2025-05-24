
'use client'; // Required for useState, useEffect

import React, { useState, useEffect, useMemo } from 'react';
import { getEdgeXProcessedData, fetchEdgeXLongShortRatio, fetchEdgeXOrderBook } from '@/lib/edgex-api';
import type { ExchangeAssetDetail, EdgeXLongShortRatioData, EdgeXLongShortRatioItem, EdgeXOrderBookData, EdgeXOrderBookEntryRaw } from '@/types';
import { AssetDataTable } from '@/components/asset-data-table';
import { OrderBookDisplay } from '@/components/order-book-display';
import { LongShortRatioDisplay } from '@/components/long-short-ratio-display';
import { BarChart3, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EdgeXPage() {
  const [exchangeData, setExchangeData] = useState<{ assets: ExchangeAssetDetail[] } | null>(null);
  const [longShortRatio, setLongShortRatio] = useState<EdgeXLongShortRatioData | null>(null);
  const [selectedRangeForRatio, setSelectedRangeForRatio] = useState<string>('1h');
  const [orderBook, setOrderBook] = useState<EdgeXOrderBookData | null>(null); // EdgeX API returns an array, but we'll take the first.
  const [selectedContractForOrderBook, setSelectedContractForOrderBook] = useState<string | null>(null);
  
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isLoadingRatio, setIsLoadingRatio] = useState(false);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingPageData(true);
      const processedData = await getEdgeXProcessedData();
      setExchangeData({ assets: processedData.assets });
      if (processedData.assets.length > 0) {
        setSelectedContractForOrderBook(processedData.assets[0].id); // Default to top asset
      }
      setIsLoadingPageData(false);
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadRatioData() {
      setIsLoadingRatio(true);
      const ratioDataResult = await fetchEdgeXLongShortRatio(selectedRangeForRatio);
      setLongShortRatio(ratioDataResult);
      setIsLoadingRatio(false);
    }
    loadRatioData();
  }, [selectedRangeForRatio]);

  useEffect(() => {
    if (selectedContractForOrderBook) {
      async function loadOrderBookData() {
        setIsLoadingOrderBook(true);
        setOrderBook(null); // Clear previous
        const obDataArray = await fetchEdgeXOrderBook(selectedContractForOrderBook, 20); // Level 20
        setOrderBook(obDataArray && obDataArray.length > 0 ? obDataArray[0] : null);
        setIsLoadingOrderBook(false);
      }
      loadOrderBookData();
    }
  }, [selectedContractForOrderBook]);
  
  const aggregatedRatioItem = useMemo(() => {
    // Find the '_total_' exchange item if available, otherwise use the first one as a fallback
    return longShortRatio?.exchangeLongShortRatioList?.find(item => item.exchange === '_total_') || longShortRatio?.exchangeLongShortRatioList?.[0] || null;
  }, [longShortRatio]);

  const availableSymbolsForOrderBook = useMemo(() => {
    return exchangeData?.assets.map(asset => ({ id: asset.id, name: asset.symbol })) || [];
  }, [exchangeData]);


  if (isLoadingPageData) {
     return (
      <div className="container mx-auto px-4 md:px-6 py-8 space-y-8">
        <header className="pb-4 mb-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            EdgeX Exchange Data
          </h1>
           <p className="text-muted-foreground mt-1">Detailed asset information from EdgeX.</p>
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
          <BarChart3 className="h-8 w-8 text-primary" />
          EdgeX Exchange Data
        </h1>
        <p className="text-muted-foreground mt-1">Detailed asset information from EdgeX.</p>
      </header>

      <section>
        <LongShortRatioDisplay
          ratioData={aggregatedRatioItem}
          exchangeName="EdgeX"
          availableRanges={longShortRatio?.allRangeList || []}
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
        <AssetDataTable 
          assets={exchangeData?.assets ?? []} 
          exchangeName="EdgeX" 
        />
      </section>

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data fetched from EdgeX API.</p>
      </footer>
    </div>
  );
}
