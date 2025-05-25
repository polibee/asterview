
import { getAsterProcessedData } from '@/lib/aster-api';
import type { ExchangeData } from '@/types';
import { ExchangeComparisonSummary } from '@/components/exchange-comparison-summary';
import { AssetDataTable } from '@/components/asset-data-table';
import { LayoutDashboard } from 'lucide-react';
import { AdSenseAdUnit } from '@/components/ads/adsense-ad-unit';

// IMPORTANT: Replace with your actual AdSense Publisher ID
const ADSENSE_PUBLISHER_ID = "ca-pub-8597282005680903"; 
// IMPORTANT: Replace with your actual Ad Slot IDs
const MID_PAGE_AD_SLOT_ID_OVERVIEW = "YOUR_MID_PAGE_AD_SLOT_ID_OVERVIEW";
const FOOTER_AD_SLOT_ID_OVERVIEW = "YOUR_FOOTER_AD_SLOT_ID_OVERVIEW";

export default async function HomePage() {
  const asterResult = await getAsterProcessedData();

  const asterExchangeData: ExchangeData | null = asterResult 
    ? { name: 'Aster', metrics: asterResult.metrics, assets: asterResult.assets } 
    : null;
  
  return (
    <div className="space-y-10">
       <header className="pb-2 mb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          Exchange Overview
        </h1>
        <p className="text-muted-foreground mt-1">A comparative glance at AsterDex.</p>
      </header>

      <ExchangeComparisonSummary 
        asterData={asterExchangeData?.metrics ?? null} 
      />

      {/* Mid-Page Ad Placeholder */}
      <AdSenseAdUnit adClient={ADSENSE_PUBLISHER_ID} adSlotId={MID_PAGE_AD_SLOT_ID_OVERVIEW} className="my-8" />


      <section>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">AsterDex Assets</h2>
        <AssetDataTable 
          initialAssets={asterExchangeData?.assets ?? null} 
          exchangeName="Aster" 
        />
      </section>

      {/* Footer Ad Placeholder */}
      <AdSenseAdUnit adClient={ADSENSE_PUBLISHER_ID} adSlotId={FOOTER_AD_SLOT_ID_OVERVIEW} className="my-8" />

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data fetched from public APIs.</p>
        <p>All data is for informational purposes only.</p>
      </footer>
    </div>
  );
}
