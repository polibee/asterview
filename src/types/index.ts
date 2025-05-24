
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

// --- Aster User API Types ---
export interface AsterAccountBalanceV2 {
  accountAlias: string;
  asset: string;
  balance: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
}

export interface AsterPositionV2 {
  symbol: string;
  initialMargin: string;
  maintMargin: string;
  unrealizedProfit: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  leverage: string;
  isolated: boolean;
  entryPrice: string;
  maxNotional: string;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  positionAmt: string;
  updateTime: number;
}

export interface AsterAccountInfoV2Asset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  maintMargin: string;
  initialMargin: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
}


export interface AsterAccountInfoV2 {
  feeTier: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: number;
  totalInitialMargin: string;
  totalMaintMargin: string;
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  totalPositionInitialMargin: string;
  totalOpenOrderInitialMargin: string;
  totalCrossWalletBalance: string;
  totalCrossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  assets: AsterAccountInfoV2Asset[];
  positions: AsterPositionV2[]; 
}

export interface AsterUserTrade {
    buyer: boolean;
    commission: string;
    commissionAsset: string;
    id: number;
    maker: boolean;
    orderId: number;
    price: string;
    qty: string;
    quoteQty: string;
    realizedPnl: string;
    side: 'BUY' | 'SELL';
    positionSide: 'BOTH' | 'LONG' | 'SHORT';
    symbol: string;
    time: number;
}

export interface AsterCommissionRate {
  symbol: string;
  makerCommissionRate: string;
  takerCommissionRate: string;
}

export interface AsterListenKey {
  listenKey: string;
}


// --- EdgeX API Types ---
export interface EdgeXContract {
  contractId: string;
  contractName: string; // e.g., BTCUSDT
  baseCoinId: string; // This is often the base asset like 'BTC'
  quoteCoinId: string; // This is often the quote asset like 'USDT'
  tickSize: string;
  stepSize: string;
  minOrderSize: string;
  maxOrderSize: string;
  enableTrade: boolean;
  enableDisplay: boolean;
  starkExSyntheticAssetId?: string;
}

export interface EdgeXCoin { // Added EdgeXCoin
  coinId: string;
  coinName: string;
  iconUrl: string;
  stepSize: string;
  showStepSize: string;
  starkExAssetId?: string | null;
  starkExResolution?: string | null;
}


export interface EdgeXMetaData {
  coinList: EdgeXCoin[];
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
  fundingRate: string; 
  fundingTime: string; // This is the settlement time for the current fundingRate
  nextFundingTime: string; // Next settlement time
}

export interface EdgeXFundingRateItem {
    contractId: string;
    fundingTime: string; 
    fundingTimestamp: string; 
    oraclePrice: string;
    indexPrice: string;
    fundingRate: string; 
    isSettlement: boolean;
    forecastFundingRate?: string; 
    previousFundingRate?: string; 
    previousFundingTimestamp?: string; 
    premiumIndex: string;
    avgPremiumIndex: string;
    premiumIndexTimestamp: string;
    impactMarginNotional: string;
    impactAskPrice: string;
    impactBidPrice: string;
    interestRate: string;
    predictedFundingRate?: string; 
    fundingRateIntervalMin: string;
    starkExFundingIndex: string;
    nextFundingTime?: string; 
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
  contractId: string; 
  exchange: string; 
  buyRatio: string;
  sellRatio: string;
  buyVolUsd: string;
  sellVolUsd: string;
  createdTime: string;
  updatedTime: string;
}

export interface EdgeXLongShortRatioData {
  exchangeLongShortRatioList: EdgeXLongShortRatioItem[];
  allRangeList: string[]; 
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
  id: string; 
  symbol: string; 
  price: number;
  dailyVolume: number; 
  baseAssetVolume24h?: number; 
  openInterest: number; 
  dailyTrades: number;
  fundingRate: number | null;
  nextFundingTime: number | null;
  priceChangePercent24h: number | null;
  high24h: number | null;
  low24h: number | null;
  markPrice: number | null;
  indexPrice: number | null;
  oraclePrice?: number | null; 
  exchange: 'Aster' | 'EdgeX';
  iconUrl?: string; 
}

export interface ExchangeAggregatedMetrics {
  totalDailyVolume: number; 
  totalOpenInterest: number; 
  totalDailyTrades: number;
}

export interface ExchangeData {
  name: 'Aster' | 'EdgeX';
  metrics: ExchangeAggregatedMetrics;
  assets: ExchangeAssetDetail[];
}

export type UnifiedOrderBookEntry = {
  price: number;
  quantity: number;
  total?: number; 
};

// Account Center Data Types
export interface AsterAccountSummaryData {
  portfolioValue: number | null;
  totalUnrealizedPNL: number | null;
  totalRealizedPNL: number | null; // Needs calculation over a period
  totalTrades: number | null; // Long/Short breakdown might require more logic
  totalTradesLong?: number;
  totalTradesShort?: number;
  totalVolume: number | null; // Long/Short breakdown
  totalVolumeLong?: number;
  totalVolumeShort?: number;
  totalFeesPaid: number | null; // Needs calculation
  commissionRateTaker?: string | null;
  commissionRateMaker?: string | null;
  commissionSymbol?: string | null;
  todayVolumeAuBoost: number | null;
  auTraderBoost: string | null; // e.g. "+1x"
  rhPointsTotal: number | null;
  // Raw data for further processing if needed
  balances?: AsterAccountBalanceV2[];
  accountInfo?: AsterAccountInfoV2;
  positions?: AsterPositionV2[];
  userTrades?: AsterUserTrade[]; // Could be a sample for recent trades
  webSocketStatus: 'Disconnected' | 'Connecting' | 'Connected' | 'Error';
}

