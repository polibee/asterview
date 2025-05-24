
import type { AsterTicker24hr, AsterOpenInterest, AsterExchangeInfo, ExchangeAssetDetail, ExchangeAggregatedMetrics, AsterExchangeSymbol, AsterOrderBookData } from '@/types';

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
      if (response.status !== 400) {
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

export async function fetchAsterOrderBook(symbol: string, limit: number = 20): Promise<AsterOrderBookData | null> {
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/depth?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) {
      console.error(`Aster API error (depth for ${symbol}): ${response.status} ${await response.text()}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch Aster order book for ${symbol}:`, error);
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

  const tickerMap = new Map<string, AsterTicker24hr>();
  allTickers.forEach(ticker => tickerMap.set(ticker.symbol, ticker));

  for (const symbolInfo of symbolsInfo) {
    const ticker = tickerMap.get(symbolInfo.symbol);
    if (!ticker) continue; 

    const price = parseFloatSafe(ticker.lastPrice);
    const dailyVolumeQuote = parseFloatSafe(ticker.quoteVolume); 
    const dailyTrades = ticker.count;

    totalDailyVolume += dailyVolumeQuote;
    totalDailyTrades += dailyTrades;
    
    let openInterestValue = 0;
    // Add a delay before fetching OI to respect rate limits even during initial load.
    await new Promise(resolve => setTimeout(resolve, 50)); // Increased delay
    const oiData = await fetchAsterOpenInterest(symbolInfo.symbol);
    if (oiData) {
      const oiBase = parseFloatSafe(oiData.openInterest);
      openInterestValue = oiBase * price; 
      totalOpenInterest += openInterestValue;
    }

    assets.push({
      id: symbolInfo.symbol,
      symbol: symbolInfo.symbol, 
      price: price,
      dailyVolume: dailyVolumeQuote,
      openInterest: openInterestValue,
      dailyTrades: dailyTrades,
      exchange: 'Aster',
      iconUrl: `https://placehold.co/32x32.png?text=${symbolInfo.baseAsset}`,
    });
  }
  
  return {
    metrics: {
      totalDailyVolume,
      totalOpenInterest,
      totalDailyTrades,
    },
    assets: assets.sort((a, b) => b.dailyVolume - a.dailyVolume),
  };
}
