

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
  // Other filter types might have different properties
  minQty?: string;
  maxQty?: string;
  stepSize?: string;
  limit?: number;
  notional?: string;
  multiplierUp?: string;
  multiplierDown?: string;
  multiplierDecimal?: number;
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
  liquidationFee?: string;
  marketTakeBound?: string;
}

export interface AsterExchangeInfo {
  symbols: AsterExchangeSymbol[];
  // other fields like rateLimits, serverTime, assets, timezone
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
  wb?: string; 
  crossWalletBalance: string;
  cw?: string; 
  crossUnPnl?: string; // Optional as it might not always be present or needed
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
  bc?: string; 
  a?: string; 
}

export interface AsterPositionV2 {
  symbol: string;
  s?: string; 
  initialMargin: string;
  maintMargin: string;
  unrealizedProfit: string;
  up?: string; 
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  leverage: string;
  isolated: boolean;
  entryPrice: string;
  ep?: string; 
  maxNotional: string;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  ps?: 'BOTH' | 'LONG' | 'SHORT'; 
  positionAmt: string;
  pa?: string; 
  updateTime: number;
  mt?: 'isolated' | 'cross'; 
  iw?: string; 
  cr?: string; 
  // Fields from /fapi/v2/positionRisk, may not be in /fapi/v2/account.positions
  marginType?: "isolated" | "cross";
  isAutoAddMargin?: "true" | "false";
  isolatedMargin?: string;
  liquidationPrice?: string;
  markPrice?: string;
  maxNotionalValue?: string; // Different from maxNotional?
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

// --- Aster WebSocket User Data Stream Event Payloads ---

export interface AsterWebSocketUpdateAccountDataBalance {
  a: string; // Asset
  wb: string; // Wallet Balance
  cw: string; // Cross Wallet Balance
  bc: string; // Balance Change except PnL and Commission
}
export interface AsterWebSocketUpdateAccountDataPosition {
  s: string; // Symbol
  pa: string; // Position Amount
  ep: string; // Entry Price
  cr: string; // (Pre-fee) Accumulated Realized
  up: string; // Unrealized PnL
  mt: 'isolated' | 'cross'; // Margin Type
  iw: string; // Isolated Wallet (if isolated position)
  ps: 'BOTH' | 'LONG' | 'SHORT'; // Position Side
}
export interface AsterWebSocketUpdateAccountData {
  m: string; 
  B: AsterWebSocketUpdateAccountDataBalance[]; 
  P: AsterWebSocketUpdateAccountDataPosition[]; 
}

export interface AsterWebSocketUpdateAccount {
  e: "ACCOUNT_UPDATE"; 
  E: number; 
  T: number; 
  a: AsterWebSocketUpdateAccountData; 
}


export interface AsterWebSocketOrderUpdateData {
  s: string; 
  c: string; 
  S: 'BUY' | 'SELL'; 
  o: string; 
  f: string; 
  q: string; 
  p: string; 
  ap: string; 
  sp: string; 
  x: string; 
  X: string; 
  i: number; 
  l: string; 
  z: string; 
  L: string; 
  N?: string; 
  n?: string; 
  T: number; 
  t: number; 
  b: string; 
  a: string; 
  m: boolean; 
  R: boolean; 
  wt: string; 
  ot: string; 
  ps: 'BOTH' | 'LONG' | 'SHORT'; 
  cp: boolean; 
  AP?: string; 
  cr?: string; 
  rp: string; 
}

export interface AsterWebSocketUpdateOrder {
  e: "ORDER_TRADE_UPDATE"; 
  E: number; 
  T: number; 
  o: AsterWebSocketOrderUpdateData; 
}

export interface AsterWebSocketListenKeyExpired {
  e: "listenKeyExpired";
  E: number; 
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
  exchange: 'Aster'; 
  iconUrl?: string; 
}

export interface ExchangeAggregatedMetrics {
  totalDailyVolume: number; 
  totalOpenInterest: number; 
  totalDailyTrades: number;
}

export interface ExchangeData {
  name: 'Aster'; 
  metrics: ExchangeAggregatedMetrics | null; 
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
  totalRealizedPNL: number | null; 
  totalTrades: number | null; 
  totalVolume: number | null; 
  totalFeesPaid: number | null; 
  commissionRateTaker: string | null; 
  commissionRateMaker: string | null; 
  commissionSymbol: string | null;
  todayVolumeAuBoost: number | null;
  auTraderBoost: string | null; 
  rhPointsTotal: number | null;
  balances?: AsterAccountBalanceV2[];
  accountInfo?: AsterAccountInfoV2;
  positions?: AsterPositionV2[];
  userTrades?: AsterUserTrade[]; 
  webSocketStatus: 'Disconnected' | 'Connecting' | 'Connected' | 'Error';
  lastUpdated?: number; 
  // New fields for detailed trade metrics
  longTrades: number | null;
  shortTrades: number | null;
  longVolume: number | null;
  shortVolume: number | null;
  latestFee: number | null;
}

    

    