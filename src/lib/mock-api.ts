
// This file is no longer the primary source of data for the main page.
// It can be kept for testing individual components or as a reference.
// Real data is now fetched via aster-api.ts and edgex-api.ts.

import type { MarketData, GlobalMetrics } from '@/types';

const mockMarketData: MarketData[] = [
  { id: 'bitcoin', symbol: 'BTC/USD', name: 'Bitcoin', price: 60000, volume24h: 25000000000, change24h: 1.5, high24h: 61000, low24h: 59000, marketCap: 1180000000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=BTC' },
  { id: 'ethereum', symbol: 'ETH/USD', name: 'Ethereum', price: 3000, volume24h: 15000000000, change24h: -0.5, high24h: 3050, low24h: 2950, marketCap: 360000000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=ETH' },
  // Add more mock assets if needed for other tests
];

const mockGlobalMetrics: GlobalMetrics = {
  totalMarketCap: mockMarketData.reduce((sum, asset) => sum + asset.marketCap, 0),
  totalVolume24h: mockMarketData.reduce((sum, asset) => sum + asset.volume24h, 0),
  activeCurrencies: mockMarketData.length,
  btcDominance: (mockMarketData.find(asset => asset.id === 'bitcoin')?.marketCap || 0) / mockMarketData.reduce((sum, asset) => sum + asset.marketCap, 0) * 100,
};

export async function fetchMockMarketData(): Promise<MarketData[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return JSON.parse(JSON.stringify(mockMarketData));
}

export async function fetchMockGlobalMetrics(): Promise<GlobalMetrics> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return JSON.parse(JSON.stringify(mockGlobalMetrics));
}
