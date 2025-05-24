
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
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="bg-background border-b text-foreground shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <Waves className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Exchange Data Comparator</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 md:px-6 py-8 space-y-10">
        <ExchangeComparisonSummary 
          asterData={asterExchangeData?.metrics ?? null} 
          edgeXData={edgeXExchangeData?.metrics ?? null} 
        />

        <section>
          <AssetDataTable 
            assets={asterExchangeData?.assets ?? null} 
            exchangeName="AsterDex" 
          />
        </section>

        <section>
          <AssetDataTable 
            assets={edgeXExchangeData?.assets ?? null} 
            exchangeName="EdgeX" 
          />
        </section>
      </main>

      <footer className="bg-card border-t border-border text-center py-6 text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Exchange Comparator. Data fetched from public APIs.</p>
          <p>All data is for informational purposes only.</p>
        </div>
      </footer>
    </div>
  );
}
