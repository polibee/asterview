
// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { ExchangeComparisonSummary } from '@/components/exchange-comparison-summary';
import { AssetDataTable } from '@/components/asset-data-table';
import type { ExchangeData, ExchangeAssetDetail, ExchangeAggregatedMetrics } from '@/types';
import { getAsterProcessedData } from '@/lib/aster-api';
import { Waves, ServerCrash, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdSenseAdUnit } from '@/components/ads/adsense-ad-unit';

// IMPORTANT: Replace with your actual AdSense Publisher ID
const ADSENSE_PUBLISHER_ID = "ca-pub-YOUR_PUBLISHER_ID";
// IMPORTANT: Replace with your actual Ad Slot IDs
const MID_PAGE_AD_SLOT_ID_HOME = "YOUR_MID_PAGE_AD_SLOT_ID_HOME";
const FOOTER_AD_SLOT_ID_HOME = "YOUR_FOOTER_AD_SLOT_ID_HOME";

export default function HomePage() {
  const [asterData, setAsterData] = useState<ExchangeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const asterResult = await getAsterProcessedData();
        setAsterData({
          name: 'Aster',
          metrics: asterResult.metrics,
          assets: asterResult.assets,
        });
        if (asterResult.assets.length === 0 && asterResult.metrics.totalDailyVolume === 0) {
            console.warn("Homepage: No assets returned from getAsterProcessedData.");
        }
      } catch (err: any) {
        console.error("Error loading exchange data for homepage:", err);
        setError(err.message || "An unknown error occurred while fetching data.");
        setAsterData(null); // Clear data on error
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading && !error) {
    return (
      <div className="space-y-10">
        <header className="pb-6 mb-6 border-b">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Waves className="h-10 w-10 text-primary" />
            EdgeView Market Overview
          </h1>
          <p className="text-muted-foreground mt-2">Comparing key metrics and assets from leading exchanges.</p>
        </header>
        <Skeleton className="h-40 w-full rounded-lg" /> {/* Placeholder for Comparison Summary */}
        <Skeleton className="h-[400px] w-full rounded-lg" /> {/* Placeholder for Aster Table */}
      </div>
    );
  }


  return (
    <div className="space-y-10">
      <header className="pb-6 mb-6 border-b">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <Waves className="h-10 w-10 text-primary" />
          EdgeView Market Overview
        </h1>
        <p className="text-muted-foreground mt-2">Comparing key metrics and assets from leading exchanges.</p>
      </header>

      {error && !isLoading && (
        <Card className="shadow-lg rounded-lg border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ServerCrash className="h-6 w-6" /> API Error
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-lg font-semibold text-destructive mb-2">Failed to Load Exchange Data</p>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page. Some data might not be available.</p>
          </CardContent>
        </Card>
      )}

      {!error && asterData && (
        <ExchangeComparisonSummary asterMetrics={asterData.metrics} />
      )}
      
      <AdSenseAdUnit adClient={ADSENSE_PUBLISHER_ID} adSlotId={MID_PAGE_AD_SLOT_ID_HOME} className="my-8" />

      {!error && asterData && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mt-8 mb-4">AsterDex Assets</h2>
          {asterData.assets.length > 0 ? (
            <AssetDataTable initialAssets={asterData.assets} exchangeName="Aster" />
          ) : (
            !isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Asset Data Available</h3>
                        <p className="text-muted-foreground">Could not retrieve asset details for AsterDex at this time.</p>
                    </CardContent>
                </Card>
            )
          )}
        </section>
      )}

      <AdSenseAdUnit adClient={ADSENSE_PUBLISHER_ID} adSlotId={FOOTER_AD_SLOT_ID_HOME} className="my-8" />

      <footer className="text-center py-8 text-sm text-muted-foreground mt-12 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. All rights reserved.</p>
        <p className="mt-1">Data provided by respective exchanges. For informational purposes only.</p>
      </footer>
    </div>
  );
}

    