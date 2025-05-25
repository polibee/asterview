
// src/app/asterdex/page.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import type { ExchangeAssetDetail } from '@/types';
import { getAsterProcessedData } from '@/lib/aster-api';
import { AssetDataTable } from '@/components/asset-data-table';
import { AsterdexAccountCenter } from '@/components/asterdex-account-center';
import { CandlestickChart, AlertTriangle, ServerCrash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdSenseAdUnit } from '@/components/ads/adsense-ad-unit';

// IMPORTANT: Replace with your actual AdSense Publisher ID
const ADSENSE_PUBLISHER_ID = "ca-pub-YOUR_PUBLISHER_ID";
// IMPORTANT: Replace with your actual Ad Slot IDs
const MID_PAGE_AD_SLOT_ID_ASTERDEX = "YOUR_MID_PAGE_AD_SLOT_ID_ASTERDEX";
const FOOTER_AD_SLOT_ID_ASTERDEX = "YOUR_FOOTER_AD_SLOT_ID_ASTERDEX";


export default function AsterDexPage() {
  const [exchangeData, setExchangeData] = React.useState<{ assets: ExchangeAssetDetail[] }>({ assets: [] });
  const [isLoadingPageData, setIsLoadingPageData] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);
  // Removed Order Book related state and ref

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingPageData(true);
      setPageError(null);

      try {
        const processedData = await getAsterProcessedData();
        if (processedData && processedData.assets) {
          setExchangeData({ assets: processedData.assets });
          if (processedData.assets.length === 0) {
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
        <p className="text-muted-foreground mt-1">Live market data and account overview for AsterDex.</p>
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

      {/* Removed Order Book Display Section */}

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
