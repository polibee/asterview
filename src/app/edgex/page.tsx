
import { getEdgeXProcessedData } from '@/lib/edgex-api';
import type { ExchangeData } from '@/types';
import { AssetDataTable } from '@/components/asset-data-table';
import { BarChart3 } from 'lucide-react';

export default async function EdgeXPage() {
  const edgeXResult = await getEdgeXProcessedData();
  // Ensure edgeXResult itself is not null before accessing its properties
  const edgeXExchangeData: ExchangeData | null = edgeXResult
    ? { name: 'EdgeX', metrics: edgeXResult.metrics, assets: edgeXResult.assets }
    : null;

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
        <AssetDataTable 
          initialAssets={edgeXExchangeData?.assets ?? null} 
          exchangeName="EdgeX" 
        />
      </section>

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data fetched from EdgeX API.</p>
      </footer>
    </div>
  );
}
