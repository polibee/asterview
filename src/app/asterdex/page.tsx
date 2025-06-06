
// src/app/asterdex/page.tsx
'use client';

import React from 'react';
import type { ExchangeAssetDetail, AsterOrderBookData } from '@/types';
import { getAsterProcessedData } from '@/lib/aster-api';
import { AssetDataTable } from '@/components/asset-data-table';
import { CandlestickChart, ServerCrash, AlertTriangle } from 'lucide-react';
// Removed direct import of AsterdexAccountCenter
// import { AsterdexAccountCenter } from '@/components/asterdex-account-center';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdSenseAdUnit } from '@/components/ads/adsense-ad-unit';
import dynamic from 'next/dynamic';

// IMPORTANT: Replace with your actual AdSense Publisher ID
const ADSENSE_PUBLISHER_ID = "ca-pub-8597282005680903";
// IMPORTANT: Replace with your actual Ad Slot IDs
const MID_PAGE_AD_SLOT_ID_ASTERDEX = "YOUR_MID_PAGE_AD_SLOT_ID_ASTERDEX";
const FOOTER_AD_SLOT_ID_ASTERDEX = "YOUR_FOOTER_AD_SLOT_ID_ASTERDEX";

// HMR Recovery comment 2
// Dynamically import AsterdexAccountCenter with SSR disabled
const AsterdexAccountCenter = dynamic(
  () => import('@/components/asterdex-account-center').then(mod => mod.AsterdexAccountCenter),
  { 
    ssr: false,
    loading: () => (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }
);


export default function AsterDexPage() {
  const [exchangeData, setExchangeData] = React.useState<{ assets: ExchangeAssetDetail[] }>({ assets: [] });
  const [isLoadingPageData, setIsLoadingPageData] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoadingPageData(true);
      setPageError(null);
      try {
        const processedData = await getAsterProcessedData();
        if (processedData && processedData.assets) {
          setExchangeData({ assets: processedData.assets });
           if (processedData.assets.length === 0) {
             console.warn("AsterDex: No assets returned from getAsterProcessedData for page display.");
          }
        } else {
           console.warn("Failed to load critical AsterDex data in page component.");
           setPageError("Could not load essential exchange data. The AsterDex API might be temporarily unavailable or experiencing issues.");
           setExchangeData({ assets: [] }); // Ensure assets is an empty array on error
        }
      } catch (error: any) {
        console.error("Error loading initial AsterDex page data:", error);
        setPageError(error.message || "An error occurred while fetching exchange data.");
        setExchangeData({ assets: [] }); // Ensure assets is an empty array on error
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
        {/* Skeleton for Account Center during dynamic load */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          </CardContent>
        </Card>
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
        <p className="text-muted-foreground mt-1">Live market data and account overview.</p>
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
