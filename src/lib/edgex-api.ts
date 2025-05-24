
import type { EdgeXMetaData, EdgeXTicker, EdgeXContract, ExchangeAssetDetail, ExchangeAggregatedMetrics } from '@/types';

const EDGEX_API_BASE_URL = 'https://pro.edgex.exchange/api/v1/public';

// Helper to safely parse numbers, returning 0 if NaN or invalid
const parseFloatSafe = (value: string | number | undefined, defaultValue = 0): number => {
  if (value === undefined) return defaultValue;
  const num = parseFloat(String(value));
  return isNaN(num) ? defaultValue : num;
};

export async function fetchEdgeXMetaData(): Promise<EdgeXContract[]> {
  try {
    const response = await fetch(`${EDGEX_API_BASE_URL}/meta/getMetaData`);
    if (!response.ok) {
      console.error(`EdgeX API error (getMetaData): ${response.status} ${await response.text()}`);
      return [];
    }
    const data: { data: EdgeXMetaData } = await response.json();
    return data.data.contractList.filter(c => c.enableDisplay && c.enableTrade);
  } catch (error) {
    console.error('Failed to fetch EdgeX metadata:', error);
    return [];
  }
}

export async function fetchEdgeXAllTickers(): Promise<EdgeXTicker[]> {
  try {
    const response = await fetch(`${EDGEX_API_BASE_URL}/quote/getTicker`);
    if (!response.ok) {
      console.error(`EdgeX API error (getTicker all): ${response.status} ${await response.text()}`);
      return [];
    }
    const data: { data: EdgeXTicker[] } = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to fetch EdgeX tickers:', error);
    return [];
  }
}

export async function getEdgeXProcessedData(): Promise<{ metrics: ExchangeAggregatedMetrics, assets: ExchangeAssetDetail[] }> {
  const allContractsMeta = await fetchEdgeXMetaData();
  const allTickers = await fetchEdgeXAllTickers();

  let totalDailyVolume = 0;
  let totalOpenInterest = 0; // EdgeX openInterest is often in base asset, convert to quote
  let totalDailyTrades = 0;
  const assets: ExchangeAssetDetail[] = [];

  const contractMetaMap = new Map<string, EdgeXContract>();
  allContractsMeta.forEach(contract => contractMetaMap.set(contract.contractId, contract));

  for (const ticker of allTickers) {
    const contractInfo = contractMetaMap.get(ticker.contractId);
    // Only include if we have metadata (e.g. baseCoinId for icon) and it's an active contract
    if (!contractInfo || !contractInfo.enableTrade || !contractInfo.enableDisplay) {
        continue;
    }

    const price = parseFloatSafe(ticker.lastPrice);
    const dailyVolumeQuote = parseFloatSafe(ticker.value); // 'value' is 24h trading value in quote asset
    const openInterestBase = parseFloatSafe(ticker.openInterest);
    const openInterestQuote = openInterestBase * price; // Convert OI to quote currency value
    const dailyTrades = parseInt(ticker.trades, 10) || 0;

    totalDailyVolume += dailyVolumeQuote;
    totalOpenInterest += openInterestQuote;
    totalDailyTrades += dailyTrades;

    assets.push({
      id: ticker.contractId,
      symbol: ticker.contractName, // e.g., BTCUSDT
      price,
      dailyVolume: dailyVolumeQuote,
      openInterest: openInterestQuote,
      dailyTrades,
      exchange: 'EdgeX',
      iconUrl: `https://placehold.co/32x32.png?text=${contractInfo.baseCoinId}`, // Placeholder, assuming baseCoinId is like 'BTC'
    });
  }

  return {
    metrics: {
      totalDailyVolume,
      totalOpenInterest,
      totalDailyTrades,
    },
    assets: assets.sort((a, b) => b.dailyVolume - a.dailyVolume), // Sort by volume desc
  };
}
