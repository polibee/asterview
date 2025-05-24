import type { MarketData, GlobalMetrics } from '@/types';

const mockMarketData: MarketData[] = [
  { id: 'bitcoin', symbol: 'BTC/USD', name: 'Bitcoin', price: 60000, volume24h: 25000000000, change24h: 1.5, high24h: 61000, low24h: 59000, marketCap: 1180000000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=BTC' },
  { id: 'ethereum', symbol: 'ETH/USD', name: 'Ethereum', price: 3000, volume24h: 15000000000, change24h: -0.5, high24h: 3050, low24h: 2950, marketCap: 360000000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=ETH' },
  { id: 'solana', symbol: 'SOL/USD', name: 'Solana', price: 150, volume24h: 2000000000, change24h: 3.2, high24h: 155, low24h: 145, marketCap: 67000000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=SOL' },
  { id: 'cardano', symbol: 'ADA/USD', name: 'Cardano', price: 0.45, volume24h: 500000000, change24h: 0.8, high24h: 0.46, low24h: 0.44, marketCap: 16000000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=ADA' },
  { id: 'dogecoin', symbol: 'DOGE/USD', name: 'Dogecoin', price: 0.15, volume24h: 1000000000, change24h: -2.1, high24h: 0.155, low24h: 0.145, marketCap: 21000000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=DOGE' },
  { id: 'ripple', symbol: 'XRP/USD', name: 'Ripple', price: 0.50, volume24h: 1200000000, change24h: 1.0, high24h: 0.51, low24h: 0.49, marketCap: 27000000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=XRP' },
  { id: 'polkadot', symbol: 'DOT/USD', name: 'Polkadot', price: 7.00, volume24h: 300000000, change24h: 2.5, high24h: 7.20, low24h: 6.80, marketCap: 9800000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=DOT' },
  { id: 'litecoin', symbol: 'LTC/USD', name: 'Litecoin', price: 80.00, volume24h: 600000000, change24h: -1.2, high24h: 82.00, low24h: 78.00, marketCap: 5900000000, lastUpdated: new Date().toISOString(), iconUrl: 'https://placehold.co/32x32.png?text=LTC' },
];

const mockGlobalMetrics: GlobalMetrics = {
  totalMarketCap: mockMarketData.reduce((sum, asset) => sum + asset.marketCap, 0),
  totalVolume24h: mockMarketData.reduce((sum, asset) => sum + asset.volume24h, 0),
  activeCurrencies: mockMarketData.length,
  btcDominance: (mockMarketData.find(asset => asset.id === 'bitcoin')?.marketCap || 0) / mockMarketData.reduce((sum, asset) => sum + asset.marketCap, 0) * 100,
};

export async function fetchMarketData(): Promise<MarketData[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real app, this would be an actual API call:
  // const response = await fetch('https://api.edgex.exchange/v1/markets');
  // if (!response.ok) {
  //   throw new Error('Failed to fetch market data');
  // }
  // const data = await response.json();
  // return data;
  return JSON.parse(JSON.stringify(mockMarketData)); // Deep copy to avoid mutation issues if data is modified
}

export async function fetchGlobalMetrics(): Promise<GlobalMetrics> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  // In a real app, this would be an actual API call:
  // const response = await fetch('https://api.edgex.exchange/v1/global');
  // if (!response.ok) {
  //   throw new Error('Failed to fetch global metrics');
  // }
  // const data = await response.json();
  // return data;
  return JSON.parse(JSON.stringify(mockGlobalMetrics));
}
