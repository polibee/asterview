
// src/app/asterdex/page.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import type { ExchangeAssetDetail, AsterOrderBookData, AsterOrderBookEntry } from '@/types';
import { getAsterProcessedData } from '@/lib/aster-api';
import { AssetDataTable } from '@/components/asset-data-table';
import { OrderBookDisplay } from '@/components/order-book-display';
import { AsterdexAccountCenter } from '@/components/asterdex-account-center';
import { CandlestickChart, AlertTriangle, ServerCrash, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdSenseAdUnit } from '@/components/ads/adsense-ad-unit';

// IMPORTANT: Replace with your actual AdSense Publisher ID
const ADSENSE_PUBLISHER_ID = "ca-pub-YOUR_PUBLISHER_ID"; 
// IMPORTANT: Replace with your actual Ad Slot IDs
const MID_PAGE_AD_SLOT_ID_ASTERDEX = "YOUR_MID_PAGE_AD_SLOT_ID_ASTERDEX";
const FOOTER_AD_SLOT_ID_ASTERDEX = "YOUR_FOOTER_AD_SLOT_ID_ASTERDEX";

interface AsterOrderBookWebSocketMessage {
  e: "depthUpdate"; // Event type for diffs, snapshots might not have 'e' if directly the book data
  E: number; // Event time
  T: number; // Transaction time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  pu: number; // Final update Id in last stream(ie `u` in last stream)
  b: AsterOrderBookEntry[]; // Bids to be updated
  a: AsterOrderBookEntry[]; // Asks to be updated
}


export default function AsterDexPage() {
  const [exchangeData, setExchangeData] = React.useState<{ assets: ExchangeAssetDetail[] }>({ assets: [] });
  const [orderBook, setOrderBook] = React.useState<AsterOrderBookData | null>(null);
  const [selectedSymbolForOrderBook, setSelectedSymbolForOrderBook] = React.useState<string | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = React.useState(true);
  const [isLoadingOrderBook, setIsLoadingOrderBook] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const orderBookWsRef = useRef<WebSocket | null>(null);
  // Added comment to potentially help with HMR if it was stuck

  useEffect(() => {
    async function loadInitialData() {
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
           console.error("Failed to load critical AsterDex data in page component.");
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
  }, []); 

  useEffect(() => {
    if (pageError || !selectedSymbolForOrderBook) {
      if (orderBookWsRef.current) {
        orderBookWsRef.current.close();
        orderBookWsRef.current = null;
      }
      setOrderBook(null);
      setIsLoadingOrderBook(false);
      return;
    }

    setIsLoadingOrderBook(true);
    setOrderBook(null); 

    if (orderBookWsRef.current) {
      orderBookWsRef.current.close();
    }

    // Using @depth20@100ms for a balance of detail and update frequency
    const wsUrl = `wss://fstream.asterdex.com/ws/${selectedSymbolForOrderBook.toLowerCase()}@depth20@100ms`;
    const newWs = new WebSocket(wsUrl);
    orderBookWsRef.current = newWs;

    newWs.onopen = () => {
      console.log(`AsterDex OrderBook WebSocket connected for ${selectedSymbolForOrderBook}`);
    };

    newWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as AsterOrderBookWebSocketMessage;
        // The `@depth<levels>@<speed>` stream sends snapshots directly.
        // The structure directly gives bids (b) and asks (a).
        if (data.b && data.a) { 
          setOrderBook({
            bids: data.b,
            asks: data.a,
            lastUpdateId: data.u, 
            E: data.E,
            T: data.T,
          });
          if (isLoadingOrderBook) setIsLoadingOrderBook(false);
        } else if (data.e === 'depthUpdate') { // Fallback for general depthUpdate event structure (less likely for snapshot stream)
           setOrderBook({
            bids: data.b,
            asks: data.a,
            lastUpdateId: data.u,
            E: data.E,
            T: data.T,
          });
          if (isLoadingOrderBook) setIsLoadingOrderBook(false);
        }
      } catch (e) {
        console.error("Error processing AsterDex OrderBook WebSocket message:", e);
      }
    };

    newWs.onerror = (error) => {
      console.warn(`AsterDex OrderBook WebSocket error for ${selectedSymbolForOrderBook}:`, error);
      setIsLoadingOrderBook(false);
      setOrderBook(null); 
    };

    newWs.onclose = (event) => {
      console.log(`AsterDex OrderBook WebSocket disconnected for ${selectedSymbolForOrderBook}. Code: ${event.code}, Reason: ${event.reason}`);
      if (orderBookWsRef.current === newWs) { 
        orderBookWsRef.current = null;
      }
    };

    return () => {
      if (newWs) {
        newWs.close();
        if (orderBookWsRef.current === newWs) {
          orderBookWsRef.current = null;
        }
      }
    };
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
        <Skeleton className="h-64 w-full mb-6 rounded-lg" /> 
        <Skeleton className="h-[400px] w-full mb-6 rounded-lg" /> 
        <Skeleton className="h-96 w-full rounded-lg" /> 
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
      
      <AdSenseAdUnit adClient={ADSENSE_PUBLISHER_ID} adSlotId={MID_PAGE_AD_SLOT_ID_ASTERDEX} className="my-8" />

      <section>
        <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-grow md:w-full"> {/* Changed to full width for better display on medium screens */}
                <h2 className="text-xl font-semibold tracking-tight mt-8 mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Order Book
                </h2>
                <OrderBookDisplay
                  bidsRaw={orderBook?.bids ?? null}
                  asksRaw={orderBook?.asks ?? null}
                  exchangeName="Aster"
                  selectedSymbol={selectedSymbolForOrderBook}
                  availableSymbols={availableSymbolsForOrderBook}
                  onSymbolChange={setSelectedSymbolForOrderBook}
                  isLoading={isLoadingOrderBook}
                />
            </div>
        </div>
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

      <AdSenseAdUnit adClient={ADSENSE_PUBLISHER_ID} adSlotId={FOOTER_AD_SLOT_ID_ASTERDEX} className="my-8" />

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data from AsterDex API.</p>
      </footer>
    </div>
  );
}

