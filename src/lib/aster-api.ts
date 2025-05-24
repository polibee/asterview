
import type { AsterTicker24hr, AsterOpenInterest, AsterExchangeInfo, ExchangeAssetDetail, ExchangeAggregatedMetrics, AsterExchangeSymbol } from '@/types';

const ASTER_API_BASE_URL = 'https://fapi.asterdex.com/fapi/v1';

// Helper to safely parse numbers, returning 0 if NaN or invalid
const parseFloatSafe = (value: string | number | undefined, defaultValue = 0): number => {
  if (value === undefined) return defaultValue;
  const num = parseFloat(String(value));
  return isNaN(num) ? defaultValue : num;
};

export async function fetchAsterExchangeInfo(): Promise<AsterExchangeSymbol[]> {
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/exchangeInfo`);
    if (!response.ok) {
      console.error(`Aster API error (exchangeInfo): ${response.status} ${await response.text()}`);
      return [];
    }
    const data: AsterExchangeInfo = await response.json();
    return data.symbols.filter(s => s.status === 'TRADING'); // Filter for trading symbols
  } catch (error) {
    console.error('Failed to fetch Aster exchange info:', error);
    return [];
  }
}

export async function fetchAsterAllTickers24hr(): Promise<AsterTicker24hr[]> {
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/ticker/24hr`);
    if (!response.ok) {
      console.error(`Aster API error (ticker/24hr): ${response.status} ${await response.text()}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Aster 24hr tickers:', error);
    return [];
  }
}

export async function fetchAsterOpenInterest(symbol: string): Promise<AsterOpenInterest | null> {
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/openInterest?symbol=${symbol}`);
    if (!response.ok) {
      // Some symbols might not have OI data, treat 400 as potentially "no data"
      if (response.status !== 400) { // Log other errors
         console.error(`Aster API error (openInterest for ${symbol}): ${response.status} ${await response.text()}`);
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch Aster open interest for ${symbol}:`, error);
    return null;
  }
}

export async function getAsterProcessedData(): Promise<{ metrics: ExchangeAggregatedMetrics, assets: ExchangeAssetDetail[] }> {
  const symbolsInfo = await fetchAsterExchangeInfo();
  const allTickers = await fetchAsterAllTickers24hr();

  let totalDailyVolume = 0;
  let totalOpenInterest = 0;
  let totalDailyTrades = 0;
  const assets: ExchangeAssetDetail[] = [];

  // Create a map for quick ticker lookup
  const tickerMap = new Map<string, AsterTicker24hr>();
  allTickers.forEach(ticker => tickerMap.set(ticker.symbol, ticker));

  for (const symbolInfo of symbolsInfo) {
    const ticker = tickerMap.get(symbolInfo.symbol);
    if (!ticker) continue;

    const price = parseFloatSafe(ticker.lastPrice);
    const dailyVolumeQuote = parseFloatSafe(ticker.quoteVolume); // Use quoteVolume for USD equivalent
    const dailyTrades = ticker.count;

    totalDailyVolume += dailyVolumeQuote;
    totalDailyTrades += dailyTrades;
    
    let openInterestValue = 0;
    // Fetch OI only for relevant symbols to manage API calls
    // For futures, OI is usually quoted in base currency amount or contracts. To sum it up in quote currency: OI_base * price
    const oiData = await fetchAsterOpenInterest(symbolInfo.symbol);
    if (oiData) {
      const oiBase = parseFloatSafe(oiData.openInterest);
      openInterestValue = oiBase * price; // OI in quote currency
      totalOpenInterest += openInterestValue;
    }

    assets.push({
      id: symbolInfo.symbol,
      symbol: symbolInfo.symbol, // Assuming symbol is like BTCUSDT
      price: price,
      dailyVolume: dailyVolumeQuote,
      openInterest: openInterestValue,
      dailyTrades: dailyTrades,
      exchange: 'Aster',
      iconUrl: `https://placehold.co/32x32.png?text=${symbolInfo.baseAsset}`,
    });
  }
  
  // Simulate delay for rate limiting awareness for Aster, actual calls are spaced by await
  await new Promise(resolve => setTimeout(resolve, 25)); // Small delay between OI fetches (inside loop implicitly)


  return {
    metrics: {
      totalDailyVolume,
      totalOpenInterest,
      totalDailyTrades,
    },
    assets: assets.sort((a, b) => b.dailyVolume - a.dailyVolume), // Sort by volume desc
  };
}
