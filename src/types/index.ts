

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
  balance: string; // Wallet balance
  wb?: string; // Wallet Balance (alternative key from WebSocket ACCOUNT_UPDATE)
  crossWalletBalance: string;
  cw?: string; // Cross Wallet Balance (alternative key from WebSocket ACCOUNT_UPDATE)
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
  bc?: string; // Balance Change from WebSocket ACCOUNT_UPDATE
  a?: string; // Asset (alternative key from WebSocket ACCOUNT_UPDATE)
}

export interface AsterPositionV2 {
  symbol: string;
  s?: string; // Symbol (alternative key from WebSocket ACCOUNT_UPDATE)
  initialMargin: string;
  maintMargin: string;
  unrealizedProfit: string;
  up?: string; // Unrealized Profit (alternative key from WebSocket ACCOUNT_UPDATE)
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  leverage: string;
  isolated: boolean;
  entryPrice: string;
  ep?: string; // Entry Price (alternative key from WebSocket ACCOUNT_UPDATE)
  maxNotional: string;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  ps?: 'BOTH' | 'LONG' | 'SHORT'; // Position Side (alternative key from WebSocket ACCOUNT_UPDATE)
  positionAmt: string;
  pa?: string; // Position Amount (alternative key from WebSocket ACCOUNT_UPDATE)
  updateTime: number;
  mt?: 'isolated' | 'cross'; // Margin Type from WebSocket
  iw?: string; // Isolated Wallet from WebSocket
  // Other fields from WebSocket ACCOUNT_UPDATE's "P" array might be relevant too
  cr?: string; // (Pre-fee) Accumulated Realized from WebSocket
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
// (Simplified based on documentation examples)

// For "e": "ACCOUNT_UPDATE"
export interface AsterWebSocketUpdateAccountData {
  m: string; // Event reason type (e.g., "ORDER", "FUNDING_FEE")
  B: Partial<AsterAccountBalanceV2>[]; // Balances
  P: Partial<AsterPositionV2>[]; // Positions
}

export interface AsterWebSocketUpdateAccount {
  e: "ACCOUNT_UPDATE"; // Event Type
  E: number; // Event Time
  T: number; // Transaction Time
  a: AsterWebSocketUpdateAccountData; // Update Data
}

// For "e": "ORDER_TRADE_UPDATE"
export interface AsterWebSocketOrderUpdateData {
  s: string; // Symbol
  c: string; // Client Order Id
  S: 'BUY' | 'SELL'; // Side
  o: string; // Order Type
  f: string; // Time in Force
  q: string; // Original Quantity
  p: string; // Original Price
  ap: string; // Average Price
  sp: string; // Stop Price
  x: string; // Execution Type
  X: string; // Order Status
  i: number; // Order Id
  l: string; // Order Last Filled Quantity
  z: string; // Order Filled Accumulated Quantity
  L: string; // Last Filled Price
  N?: string; // Commission Asset
  n?: string; // Commission
  T: number; // Order Trade Time
  t: number; // Trade Id
  b: string; // Bids Notional
  a: string; // Ask Notional
  m: boolean; // Is this trade the maker side?
  R: boolean; // Is this reduce only
  wt: string; // Stop Price Working Type
  ot: string; // Original Order Type
  ps: 'BOTH' | 'LONG' | 'SHORT'; // Position Side
  cp: boolean; // If Close-All
  AP?: string; // Activation Price (for TRAILING_STOP_MARKET)
  cr?: string; // Callback Rate (for TRAILING_STOP_MARKET)
  rp: string; // Realized Profit of the trade
}

export interface AsterWebSocketUpdateOrder {
  e: "ORDER_TRADE_UPDATE"; // Event Type
  E: number; // Event Time
  T: number; // Transaction Time
  o: AsterWebSocketOrderUpdateData; // Order Data
}

export interface AsterWebSocketListenKeyExpired {
  e: "listenKeyExpired";
  E: number; // Event Time
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
  metrics: ExchangeAggregatedMetrics | null; // Can be null if data fails to load
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
  lastUpdated?: number; // Timestamp for localStorage caching
}

    