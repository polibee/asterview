
import { getAsterProcessedData } from '@/lib/aster-api';
import { getEdgeXProcessedData } from '@/lib/edgex-api';
import type { ExchangeData } from '@/types';
import { ExchangeComparisonSummary } from '@/components/exchange-comparison-summary';
import { AssetDataTable } from '@/components/asset-data-table';
import { Waves } from 'lucide-react';

export default async function HomePage() {
  // Fetch data in parallel
  const [asterResult, edgeXResult] = await Promise.allSettled([
    getAsterProcessedData(),
    getEdgeXProcessedData()
  ]);

  const asterExchangeData: ExchangeData | null = asterResult.status === 'fulfilled' 
    ? { name: 'Aster', metrics: asterResult.value.metrics, assets: asterResult.value.assets } 
    : null;
  
  const edgeXExchangeData: ExchangeData | null = edgeXResult.status === 'fulfilled'
    ? { name: 'EdgeX', metrics: edgeXResult.value.metrics, assets: edgeXResult.value.assets }
    : null;

  if (asterResult.status === 'rejected') {
    console.error("Failed to fetch Aster data:", asterResult.reason);
  }
  if (edgeXResult.status === 'rejected') {
    console.error("Failed to fetch EdgeX data:", edgeXResult.reason);
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-10">
       <header className="pb-2 mb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          Exchanges Overview
        </h1>
        <p className="text-muted-foreground mt-1">A comparative glance at AsterDex and EdgeX.</p>
      </header>

      <ExchangeComparisonSummary 
        asterData={asterExchangeData?.metrics ?? null} 
        edgeXData={edgeXExchangeData?.metrics ?? null} 
      />

      <section>
        <AssetDataTable 
          initialAssets={asterExchangeData?.assets ?? null} 
          exchangeName="Aster" 
        />
      </section>

      <section>
        <AssetDataTable 
          initialAssets={edgeXExchangeData?.assets ?? null} 
          exchangeName="EdgeX" 
        />
      </section>

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data fetched from public APIs.</p>
        <p>All data is for informational purposes only.</p>
      </footer>
    </div>
  );
}

// Helper icon for the header, if not already imported by layout
import { LayoutDashboard } from 'lucide-react';
