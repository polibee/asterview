
import type { AsterTicker24hr, AsterOpenInterest, AsterExchangeInfo, ExchangeAssetDetail, ExchangeAggregatedMetrics, AsterExchangeSymbol, AsterOrderBookData, AsterPremiumIndex } from '@/types';

const ASTER_API_BASE_URL = 'https://fapi.asterdex.com/fapi/v1';

// Helper to safely parse numbers, returning 0 if NaN or invalid, or null if specified
const parseFloatSafe = (value: string | number | undefined, returnNullOnNaN = false): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return returnNullOnNaN ? null : 0;
  }
  const num = parseFloat(String(value));
  if (isNaN(num)) {
    return returnNullOnNaN ? null : 0;
  }
  return num;
};

const parseIntSafe = (value: string | number | undefined, returnNullOnNaN = false): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return returnNullOnNaN ? null : 0;
  }
  const num = parseInt(String(value), 10);
  if (isNaN(num)) {
    return returnNullOnNaN ? null : 0;
  }
  return num;
}

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

export async function fetchAsterAllPremiumIndex(): Promise<AsterPremiumIndex[]> {
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/premiumIndex`);
    if (!response.ok) {
      console.error(`Aster API error (premiumIndex all): ${response.status} ${await response.text()}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Aster premium index data for all symbols:', error);
    return [];
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
  const allPremiumIndices = await fetchAsterAllPremiumIndex();

  let totalDailyVolume = 0;
  let totalOpenInterest = 0;
  let totalDailyTrades = 0;
  const assets: ExchangeAssetDetail[] = [];

  const tickerMap = new Map<string, AsterTicker24hr>();
  allTickers.forEach(ticker => tickerMap.set(ticker.symbol, ticker));

  const premiumIndexMap = new Map<string, AsterPremiumIndex>();
  allPremiumIndices.forEach(pi => premiumIndexMap.set(pi.symbol, pi));

  for (const symbolInfo of symbolsInfo) {
    const ticker = tickerMap.get(symbolInfo.symbol);
    if (!ticker) continue; 

    const price = parseFloatSafe(ticker.lastPrice) ?? 0;
    const dailyVolumeQuote = parseFloatSafe(ticker.quoteVolume) ?? 0; 
    const dailyTrades = parseIntSafe(ticker.count) ?? 0;

    totalDailyVolume += dailyVolumeQuote;
    totalDailyTrades += dailyTrades;
    
    let openInterestValue = 0;
    // Add a delay before fetching OI to respect rate limits.
    await new Promise(resolve => setTimeout(resolve, 30)); // 30ms delay
    const oiData = await fetchAsterOpenInterest(symbolInfo.symbol);
    if (oiData) {
      const oiBase = parseFloatSafe(oiData.openInterest) ?? 0;
      openInterestValue = oiBase * price; 
      totalOpenInterest += openInterestValue;
    }

    const premiumIndex = premiumIndexMap.get(symbolInfo.symbol);
    
    assets.push({
      id: symbolInfo.symbol,
      symbol: symbolInfo.symbol, 
      price: price,
      dailyVolume: dailyVolumeQuote,
      baseAssetVolume24h: parseFloatSafe(ticker.volume),
      openInterest: openInterestValue,
      dailyTrades: dailyTrades,
      fundingRate: premiumIndex ? parseFloatSafe(premiumIndex.lastFundingRate, true) : null,
      nextFundingTime: premiumIndex ? premiumIndex.nextFundingTime : null,
      priceChangePercent24h: parseFloatSafe(ticker.priceChangePercent, true),
      high24h: parseFloatSafe(ticker.highPrice, true),
      low24h: parseFloatSafe(ticker.lowPrice, true),
      markPrice: premiumIndex ? parseFloatSafe(premiumIndex.markPrice, true) : null,
      indexPrice: premiumIndex ? parseFloatSafe(premiumIndex.indexPrice, true) : null,
      exchange: 'Aster',
      iconUrl: `https://placehold.co/32x32.png?text=${symbolInfo.baseAsset.substring(0,3)}`,
    });
  }
  
  return {
    metrics: {
      totalDailyVolume,
      totalOpenInterest,
      totalDailyTrades,
    },
    assets: assets.sort((a, b) => (b.dailyVolume ?? 0) - (a.dailyVolume ?? 0)),
  };
}

