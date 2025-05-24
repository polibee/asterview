
import type { EdgeXMetaData, EdgeXTicker, EdgeXContract, ExchangeAssetDetail, ExchangeAggregatedMetrics, EdgeXLongShortRatioData, EdgeXOrderBookData, EdgeXLatestFundingRateResponse, EdgeXFundingRateItem, EdgeXCoin } from '@/types';

const EDGEX_API_BASE_URL = 'https://pro.edgex.exchange/api/v1/public';

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

export async function fetchEdgeXMetaData(): Promise<EdgeXMetaData | null> {
  try {
    const response = await fetch(`${EDGEX_API_BASE_URL}/meta/getMetaData`);
    if (!response.ok) {
      console.error(`EdgeX API error (getMetaData): ${response.status} ${await response.text()}`);
      return null;
    }
    const data: { data: EdgeXMetaData } = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to fetch EdgeX metadata:', error);
    return null;
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

export async function fetchEdgeXLatestFundingRates(): Promise<EdgeXFundingRateItem[]> {
  try {
    const response = await fetch(`${EDGEX_API_BASE_URL}/funding/getLatestFundingRate`);
    if (!response.ok) {
      console.error(`EdgeX API error (getLatestFundingRate): ${response.status} ${await response.text()}`);
      return [];
    }
    const data: EdgeXLatestFundingRateResponse = await response.json();
    if (data.code === "SUCCESS" && data.data) {
      return data.data;
    }
    console.error('EdgeX getLatestFundingRate response not successful or data missing:', data);
    return [];
  } catch (error) {
    console.error('Failed to fetch EdgeX latest funding rates:', error);
    return [];
  }
}


export async function fetchEdgeXLongShortRatio(range: string = "1h"): Promise<EdgeXLongShortRatioData | null> {
  try {
    const response = await fetch(`${EDGEX_API_BASE_URL}/quote/getExchangeLongShortRatio?range=${range}`);
    if (!response.ok) {
      console.error(`EdgeX API error (getExchangeLongShortRatio for range ${range}): ${response.status} ${await response.text()}`);
      return null;
    }
    const result: { data: EdgeXLongShortRatioData } = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Failed to fetch EdgeX long/short ratio for range ${range}:`, error);
    return null;
  }
}

export async function fetchEdgeXOrderBook(contractId: string, level: number = 15): Promise<EdgeXOrderBookData[] | null> {
  try {
    const response = await fetch(`${EDGEX_API_BASE_URL}/quote/getDepth?contractId=${contractId}&level=${level}`);
    if (!response.ok) {
      console.error(`EdgeX API error (getDepth for ${contractId}): ${response.status} ${await response.text()}`);
      return null;
    }
    const result: { data: EdgeXOrderBookData[] } = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Failed to fetch EdgeX order book for ${contractId}:`, error);
    return null;
  }
}

export async function getEdgeXProcessedData(): Promise<{ metrics: ExchangeAggregatedMetrics, assets: ExchangeAssetDetail[] }> {
  const metaData = await fetchEdgeXMetaData();
  if (!metaData) {
    // Throw an error if metadata, which is critical, could not be fetched.
    // The console.error is already done in fetchEdgeXMetaData.
    throw new Error("Failed to fetch critical EdgeX metadata. Unable to process exchange data.");
  }
  
  const allContractsMeta = metaData.contractList.filter(c => c.enableDisplay && c.enableTrade);
  const coinMetaMap = new Map(metaData.coinList.map(coin => [coin.coinId, coin]));

  const allTickers = await fetchEdgeXAllTickers();
  const allFundingRates = await fetchEdgeXLatestFundingRates(); 

  let totalDailyVolume = 0;
  let totalOpenInterest = 0;
  let totalDailyTrades = 0;
  const assets: ExchangeAssetDetail[] = [];

  const contractMetaMap = new Map<string, EdgeXContract>();
  allContractsMeta.forEach(contract => contractMetaMap.set(contract.contractId, contract));

  const fundingRateMap = new Map<string, EdgeXFundingRateItem>();
  allFundingRates.forEach(fr => fundingRateMap.set(fr.contractId, fr));

  for (const ticker of allTickers) {
    const contractInfo = contractMetaMap.get(ticker.contractId);
    if (!contractInfo || !contractInfo.enableTrade || !contractInfo.enableDisplay) {
        continue;
    }

    const price = parseFloatSafe(ticker.lastPrice) ?? 0;
    const dailyVolumeQuote = parseFloatSafe(ticker.value) ?? 0; 
    const openInterestBase = parseFloatSafe(ticker.openInterest) ?? 0;
    const openInterestQuote = openInterestBase * price; 
    const dailyTrades = parseIntSafe(ticker.trades) ?? 0;

    totalDailyVolume += dailyVolumeQuote;
    totalOpenInterest += openInterestQuote;
    totalDailyTrades += dailyTrades;

    const fundingInfo = fundingRateMap.get(ticker.contractId);
    
    const baseCoinInfo = coinMetaMap.get(contractInfo.baseCoinId);
    
    // Prioritize iconUrl from coinList, then use contract baseCoin name for placeholder
    let iconUrl = baseCoinInfo?.iconUrl;
    if (!iconUrl) {
      const baseCoinName = baseCoinInfo?.coinName || contractInfo.baseCoinId; // Use coinName if available
      iconUrl = `https://placehold.co/32x32.png?text=${baseCoinName.substring(0,3).toUpperCase()}`;
    }
    
    assets.push({
      id: ticker.contractId,
      symbol: ticker.contractName,
      price,
      dailyVolume: dailyVolumeQuote,
      baseAssetVolume24h: parseFloatSafe(ticker.size, true),
      openInterest: openInterestQuote,
      dailyTrades,
      fundingRate: fundingInfo ? parseFloatSafe(fundingInfo.fundingRate, true) : parseFloatSafe(ticker.fundingRate, true),
      nextFundingTime: fundingInfo ? parseIntSafe(fundingInfo.nextFundingTime || ticker.nextFundingTime, true) : parseIntSafe(ticker.nextFundingTime, true),
      priceChangePercent24h: parseFloatSafe(ticker.priceChangePercent, true),
      high24h: parseFloatSafe(ticker.high, true),
      low24h: parseFloatSafe(ticker.low, true),
      markPrice: null, // EdgeX ticker doesn't directly provide a 'markPrice'. Using index/oracle as alternatives.
      indexPrice: parseFloatSafe(ticker.indexPrice, true),
      oraclePrice: parseFloatSafe(ticker.oraclePrice, true),
      exchange: 'EdgeX',
      iconUrl: iconUrl, 
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

