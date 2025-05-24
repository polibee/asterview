
import type { EdgeXMetaData, EdgeXTicker, EdgeXContract, ExchangeAssetDetail, ExchangeAggregatedMetrics, EdgeXLongShortRatioData, EdgeXOrderBookData, EdgeXLatestFundingRateResponse, EdgeXFundingRateItem } from '@/types';

const EDGEX_API_BASE_URL = 'https://pro.edgex.exchange/api/v1/public';

const parseFloatSafe = (value: string | number | undefined, defaultValue = 0): number => {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue; // Added null and empty string check
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

export async function fetchEdgeXLatestFundingRates(): Promise<EdgeXFundingRateItem[]> {
  try {
    // Assuming contractId is optional to fetch for all, as per EdgeX API doc
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
  // API docs indicate range is optional, but we make it selectable.
  // filterContractIdList can be empty for aggregate.
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
  // API returns an array, even for a single contractId
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
  const allContractsMeta = await fetchEdgeXMetaData();
  const allTickers = await fetchEdgeXAllTickers();
  const allFundingRates = await fetchEdgeXLatestFundingRates(); // Fetch all funding rates once

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

    const price = parseFloatSafe(ticker.lastPrice);
    const dailyVolumeQuote = parseFloatSafe(ticker.value); 
    const openInterestBase = parseFloatSafe(ticker.openInterest);
    const openInterestQuote = openInterestBase * price; 
    const dailyTrades = parseInt(ticker.trades, 10) || 0;

    totalDailyVolume += dailyVolumeQuote;
    totalOpenInterest += openInterestQuote;
    totalDailyTrades += dailyTrades;

    const fundingInfo = fundingRateMap.get(ticker.contractId);
    const fundingRate = fundingInfo ? parseFloatSafe(fundingInfo.fundingRate, null) : (ticker.fundingRate ? parseFloatSafe(ticker.fundingRate, null) : null);
    const nextFundingTime = fundingInfo ? parseFloatSafe(fundingInfo.fundingTime, null) : (ticker.nextFundingTime ? parseFloatSafe(ticker.nextFundingTime, null) : null); // EdgeX Ticker also has nextFundingTime


    assets.push({
      id: ticker.contractId,
      symbol: ticker.contractName,
      price,
      dailyVolume: dailyVolumeQuote,
      openInterest: openInterestQuote,
      dailyTrades,
      fundingRate: fundingRate,
      nextFundingTime: nextFundingTime,
      exchange: 'EdgeX',
      iconUrl: `https://placehold.co/32x32.png?text=${contractInfo.baseCoinId.substring(0,3)}`, 
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
