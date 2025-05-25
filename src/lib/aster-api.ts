
import type { AsterTicker24hr, AsterOpenInterest, AsterExchangeInfo, ExchangeAssetDetail, ExchangeAggregatedMetrics, AsterExchangeSymbol, AsterOrderBookData, AsterPremiumIndex, AsterServerTime } from '@/types';

const ASTER_API_BASE_URL = 'https://fapi.asterdex.com/fapi/v1';

// Helper to safely parse numbers, returning 0 if NaN or invalid, or null if specified
const parseFloatSafe = (value: string | number | undefined | null, returnNullOnNaN = false): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return returnNullOnNaN ? null : 0;
  }
  const num = parseFloat(String(value));
  if (isNaN(num)) {
    return returnNullOnNaN ? null : 0;
  }
  return num;
};

const parseIntSafe = (value: string | number | undefined | null, returnNullOnNaN = false): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return returnNullOnNaN ? null : 0;
  }
  const num = parseInt(String(value), 10);
  if (isNaN(num)) {
    return returnNullOnNaN ? null : 0;
  }
  return num;
}

export async function fetchAsterServerTime(): Promise<AsterServerTime> {
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/time`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Aster API error (serverTime): ${response.status} ${errorText}`);
      throw new Error(`Failed to fetch Aster server time: ${response.status} ${errorText.substring(0,100)}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Network or other error fetching Aster server time:', error);
    throw error;
  }
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
      // Avoid console logging for 400 errors if it's just "Invalid symbol" as this can be noisy.
      // Other errors (like rate limits or server issues) should still be logged.
      if (response.status !== 400) { 
         console.warn(`Aster API error (openInterest for ${symbol}): ${response.status} ${await response.text()}`);
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Failed to fetch Aster open interest for ${symbol}:`, error);
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

// Valid limits for AsterDex Order Book: [5, 10, 20, 50, 100, 500, 1000]
export async function fetchAsterOrderBook(symbol: string, limit: 5 | 10 | 20 | 50 | 100 | 500 | 1000 = 20): Promise<AsterOrderBookData | null> {
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/depth?symbol=${symbol}&limit=${limit}`);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Aster API error (depth for ${symbol}): ${response.status} ${errorBody}`);
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson && errorJson.code === -4021) { // Specific error code for invalid depth limit
            console.error(`Specific Aster API error: Invalid depth limit used for symbol ${symbol}. Attempted limit: ${limit}. Valid limits: [5, 10, 20, 50, 100, 500, 1000]`);
        }
      } catch(e) {/* ignore json parse error if body is not json */}
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch Aster order book for ${symbol}:`, error);
    return null;
  }
}


export async function getAsterProcessedData(): Promise<{ metrics: ExchangeAggregatedMetrics, assets: ExchangeAssetDetail[] }> {
  const symbolsInfoPromise = fetchAsterExchangeInfo();
  const allTickersPromise = fetchAsterAllTickers24hr();
  const allPremiumIndicesPromise = fetchAsterAllPremiumIndex();

  const [symbolsInfo, allTickers, allPremiumIndices] = await Promise.all([
    symbolsInfoPromise,
    allTickersPromise,
    allPremiumIndicesPromise,
  ]);

  if (!symbolsInfo || symbolsInfo.length === 0 || !allTickers || allTickers.length === 0) {
    console.warn("AsterDex: Failed to fetch critical initial data (symbols or tickers). Returning empty.");
    return { metrics: { totalDailyVolume: 0, totalOpenInterest: 0, totalDailyTrades: 0 }, assets: [] };
  }
  
  let totalDailyVolume = 0;
  let totalOpenInterest = 0;
  let totalDailyTrades = 0;
  const assets: ExchangeAssetDetail[] = [];

  const tickerMap = new Map<string, AsterTicker24hr>();
  allTickers.forEach(ticker => tickerMap.set(ticker.symbol, ticker));

  const premiumIndexMap = new Map<string, AsterPremiumIndex>();
  allPremiumIndices.forEach(pi => premiumIndexMap.set(pi.symbol, pi));

  // Sort tickers by quoteVolume to fetch OI for top N symbols first
  const sortedTickersForOI = [...allTickers]
    .sort((a, b) => (parseFloatSafe(b.quoteVolume) ?? 0) - (parseFloatSafe(a.quoteVolume) ?? 0))
    .slice(0, 20); // Fetch OI for top 20 symbols by volume

  const openInterestDataMap = new Map<string, AsterOpenInterest | null>();

  for (const ticker of sortedTickersForOI) {
    // Add a small delay to be extremely cautious with rate limits, even for a smaller loop.
    await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay as we loop fewer times
    const oiData = await fetchAsterOpenInterest(ticker.symbol);
    openInterestDataMap.set(ticker.symbol, oiData);
  }

  for (const symbolInfo of symbolsInfo) {
    const ticker = tickerMap.get(symbolInfo.symbol);
    if (!ticker) continue; // Skip if no ticker data for this symbol

    const price = parseFloatSafe(ticker.lastPrice) ?? 0;
    const dailyVolumeQuote = parseFloatSafe(ticker.quoteVolume) ?? 0;
    const dailyTrades = parseIntSafe(ticker.count) ?? 0;

    totalDailyVolume += dailyVolumeQuote;
    totalDailyTrades += dailyTrades;
    
    let openInterestValue = 0;
    const oiData = openInterestDataMap.get(symbolInfo.symbol); // Get pre-fetched OI if available
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
      openInterest: openInterestDataMap.has(symbolInfo.symbol) ? openInterestValue : null, // Set to null if OI wasn't fetched
      dailyTrades: dailyTrades,
      fundingRate: premiumIndex ? parseFloatSafe(premiumIndex.lastFundingRate, true) : null,
      nextFundingTime: premiumIndex ? premiumIndex.nextFundingTime : null,
      priceChangePercent24h: parseFloatSafe(ticker.priceChangePercent, true),
      high24h: parseFloatSafe(ticker.highPrice, true),
      low24h: parseFloatSafe(ticker.lowPrice, true),
      markPrice: premiumIndex ? parseFloatSafe(premiumIndex.markPrice, true) : null,
      indexPrice: premiumIndex ? parseFloatSafe(premiumIndex.indexPrice, true) : null,
      oraclePrice: null, // Aster doesn't provide oraclePrice in these endpoints
      exchange: 'Aster',
      iconUrl: `https://s3-ap-northeast-1.amazonaws.com/file.fmex.com/imgs/coin_new/${symbolInfo.baseAsset.toLowerCase()}.png`, // Example dynamic icon URL pattern
    });
  }
  
  return {
    metrics: {
      totalDailyVolume,
      totalOpenInterest, // Now based on top N symbols
      totalDailyTrades,
    },
    assets: assets.sort((a, b) => (b.dailyVolume ?? 0) - (a.dailyVolume ?? 0)),
  };
}

    