
import { getAsterProcessedData } from '@/lib/aster-api';
import type { ExchangeData } from '@/types';
import { AssetDataTable } from '@/components/asset-data-table';
import { CandlestickChart } from 'lucide-react';

export default async function AsterDexPage() {
  const asterResult = await getAsterProcessedData();
  // Ensure asterResult itself is not null before accessing its properties
  const asterExchangeData: ExchangeData | null = asterResult 
    ? { name: 'Aster', metrics: asterResult.metrics, assets: asterResult.assets } 
    : null;

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-8">
      <header className="pb-4 mb-6 border-b">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CandlestickChart className="h-8 w-8 text-primary" />
          AsterDex Exchange Data
        </h1>
        <p className="text-muted-foreground mt-1">Detailed asset information from AsterDex.</p>
      </header>

      <section>
        <AssetDataTable 
          initialAssets={asterExchangeData?.assets ?? null} 
          exchangeName="Aster" 
        />
      </section>

      <footer className="text-center py-6 text-sm text-muted-foreground mt-10 border-t">
        <p>&copy; {new Date().getFullYear()} EdgeView Comparator. Data fetched from AsterDex API.</p>
      </footer>
    </div>
  );
}
