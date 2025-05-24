import { fetchMarketData, fetchGlobalMetrics } from '@/lib/mock-api';
import { MarketDashboard } from '@/components/edgeview/market-dashboard';
import { MetricDisplay } from '@/components/edgeview/metric-display';
import { AssetPriceChart } from '@/components/edgeview/asset-price-chart';
import { Waves } from 'lucide-react';

export default async function HomePage() {
  const marketData = await fetchMarketData();
  const globalMetrics = await fetchGlobalMetrics();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background border-b text-foreground shadow-sm">
        <div className="container mx-auto px-4 py-6 flex items-center gap-3">
          <Waves className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">EdgeView</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <MetricDisplay metrics={globalMetrics} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-3"> {/* Changed from col-span-2 to col-span-3 to take full width */}
             <AssetPriceChart data={marketData} />
          </div>
        </div>
        
        <MarketDashboard initialData={marketData} />
      </main>

      <footer className="bg-card border-t border-border text-center py-6 text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} EdgeView. Data provided for informational purposes only.</p>
          <p>Powered by Mock Exchange Data</p>
        </div>
      </footer>
    </div>
  );
}
