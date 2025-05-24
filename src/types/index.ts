
export interface MarketData {
  id: string;
  symbol: string; // e.g., "BTC/USD"
  name: string; // e.g., "Bitcoin"
  price: number;
  volume24h: number;
  change24h: number; // percentage, e.g., 2.5 for +2.5%
  high24h: number;
  low24h: number;
  marketCap: number;
  lastUpdated: string; // ISO date string
  iconUrl?: string; // Optional URL for an asset icon
}

export interface GlobalMetrics {
  totalMarketCap: number;
  totalVolume24h: number;
  activeCurrencies: number;
  btcDominance?: number; // Optional
}

// --- Aster API Types ---
export interface AsterTicker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string; // Base asset volume
  quoteVolume: string; // Quote asset volume
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number; // Trade count
}

export interface AsterOpenInterest {
  openInterest: string;
  symbol: string;
  time: number;
}

export interface AsterPremiumIndex {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  estimatedSettlePrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  interestRate: string;
  time: number;
}

export interface AsterExchangeSymbolFilter {
  filterType: string;
  minPrice?: string;
  maxPrice?: string;
  tickSize?: string;
}
export interface AsterExchangeSymbol {
  symbol: string;
  pair: string;
  contractType: string;
  deliveryDate: number;
  onboardDate: number;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  marginAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  baseAssetPrecision: number;
  quotePrecision: number;
  filters: AsterExchangeSymbolFilter[];
  orderTypes: string[];
  timeInForce: string[];
}

export interface AsterExchangeInfo {
  symbols: AsterExchangeSymbol[];
}

export type AsterOrderBookEntry = [string, string]; // [price, quantity]
export interface AsterOrderBookData {
  lastUpdateId: number;
  E: number; // Message output time
  T: number; // Transaction time
  bids: AsterOrderBookEntry[];
  asks: AsterOrderBookEntry[];
}


// --- EdgeX API Types ---
export interface EdgeXContract {
  contractId: string;
  contractName: string; // e.g., BTCUSDT
  baseCoinId: string;
  quoteCoinId: string;
  tickSize: string;
  stepSize: string;
  minOrderSize: string;
  maxOrderSize: string;
  enableTrade: boolean;
  enableDisplay: boolean;
}

export interface EdgeXMetaData {
  contractList: EdgeXContract[];
}

export interface EdgeXTicker {
  contractId: string;
  contractName: string;
  priceChange: string;
  priceChangePercent: string;
  trades: string; // Number of trades
  size: string; // 24-hour trading volume (base asset)
  value: string; // 24-hour trading value (quote asset)
  high: string;
  low: string;
  open: string;
  close: string;
  lastPrice: string;
  indexPrice: string;
  oraclePrice: string;
  openInterest: string;
  fundingRate: string; // This field exists in ticker for EdgeX, can be used directly
  fundingTime: string;
  nextFundingTime: string;
}

export interface EdgeXFundingRateItem {
    contractId: string;
    fundingTime: string; // Timestamp string
    fundingTimestamp: string; // Timestamp string
    oraclePrice: string;
    indexPrice: string;
    fundingRate: string; // The actual funding rate
    isSettlement: boolean;
    forecastFundingRate: string;
    previousFundingRate: string;
    previousFundingTimestamp: string; // Timestamp string
    premiumIndex: string;
    avgPremiumIndex: string;
    premiumIndexTimestamp: string; // Timestamp string
    impactMarginNotional: string;
    impactAskPrice: string;
    impactBidPrice: string;
    interestRate: string;
    predictedFundingRate: string;
    fundingRateIntervalMin: string;
    starkExFundingIndex: string;
    nextFundingTime?: string; // Not in API doc, but Ticker has it, useful to add if available
}

export interface EdgeXLatestFundingRateResponse {
    code: string;
    data: EdgeXFundingRateItem[];
    msg: string | null;
    errorParam: string | null;
    requestTime: string;
    responseTime: string;
    traceId: string;
}


export interface EdgeXLongShortRatioItem {
  range: string;
  contractId: string; // Can be "_total_" or a specific contract ID
  exchange: string; // e.g., "_total_"
  buyRatio: string;
  sellRatio: string;
  buyVolUsd: string;
  sellVolUsd: string;
  createdTime: string;
  updatedTime: string;
}

export interface EdgeXLongShortRatioData {
  exchangeLongShortRatioList: EdgeXLongShortRatioItem[];
  allRangeList: string[]; // e.g., ["30m", "1h", "4h"]
}

export type EdgeXOrderBookEntryRaw = { price: string; size: string };
export interface EdgeXOrderBookData {
  startVersion: string;
  endVersion: string;
  level: number;
  contractId: string;
  contractName: string;
  asks: EdgeXOrderBookEntryRaw[];
  bids: EdgeXOrderBookEntryRaw[];
  depthType: "SNAPSHOT" | "CHANGED";
}


// --- Unified/Comparison Types ---
export interface ExchangeAssetDetail {
  id: string; // Aster: symbol, EdgeX: contractId
  symbol: string; // Common trading symbol, e.g. BTC/USDT
  price: number;
  dailyVolume: number; // In quote currency
  openInterest: number; // In quote currency
  dailyTrades: number;
  fundingRate: number | null; // Added
  nextFundingTime?: number | null; // Added, optional
  exchange: 'Aster' | 'EdgeX';
  iconUrl?: string; // Optional icon
}

export interface ExchangeAggregatedMetrics {
  totalDailyVolume: number; // In quote currency
  totalOpenInterest: number; // In quote currency
  totalDailyTrades: number;
}

export interface ExchangeData {
  name: 'Aster' | 'EdgeX';
  metrics: ExchangeAggregatedMetrics;
  assets: ExchangeAssetDetail[];
}

// Unified Order Book Entry for display
export type UnifiedOrderBookEntry = {
  price: number;
  quantity: number;
  total?: number; // Optional cumulative quantity
};
