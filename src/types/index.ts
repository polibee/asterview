
// src/types/index.ts

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
export interface AsterServerTime {
  serverTime: number;
}

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
}

export type AsterOrderBookEntry = [string, string]; // [price, quantity]
export interface AsterOrderBookData {
  lastUpdateId: number;
  E: number; // Message output time
  T: number; // Transaction time
  bids: AsterOrderBookEntry[];
  asks: AsterOrderBookEntry[];
}

export interface AsterOrderBookWebSocketMessage {
  e: 'depthUpdate'; // Event type for order book updates
  E: number;        // Event time
  T: number;        // Transaction time
  s: string;        // Symbol
  U: number;        // First update ID in event
  u: number;        // Final update ID in event
  pu: number;       // Final update ID in last stream (for diff stream, not used in snapshot)
  b: AsterOrderBookEntry[]; // Bids to be updated
  a: AsterOrderBookEntry[]; // Asks to be updated
}


// --- Aster User API Types ---
export interface AsterAccountBalanceV2 {
  accountAlias: string;
  asset: string;
  a?: string; // For WebSocket
  balance: string;
  wb?: string; // For WebSocket
  crossWalletBalance: string;
  cw?: string; // For WebSocket
  crossUnPnl?: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  marginAvailable: boolean;
  updateTime: number;
  bc?: string; // For WebSocket
}

export interface AsterPositionV2 {
  symbol: string;
  s?: string; // For WebSocket
  initialMargin: string;
  maintMargin: string;
  unrealizedProfit: string;
  up?: string; // For WebSocket
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  leverage: string;
  isolated: boolean;
  entryPrice: string;
  ep?: string; // For WebSocket
  maxNotional: string;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  ps?: 'BOTH' | 'LONG' | 'SHORT'; // For WebSocket
  positionAmt: string;
  pa?: string; // For WebSocket
  updateTime: number;
  mt?: 'isolated' | 'cross'; // Margin Type from WebSocket
  iw?: string; // Isolated Wallet from WebSocket
  cr?: string; // (Pre-fee) Accumulated Realized from WebSocket
  marginType?: "isolated" | "cross" | string; // From REST
  isAutoAddMargin?: "true" | "false" | string; // From REST
  isolatedMargin?: string; // From REST & WebSocket
  liquidationPrice?: string; // From REST
  markPrice?: string; // From REST
  maxNotionalValue?: string; // From REST
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

export interface AsterIncomeHistoryItem {
    symbol: string;
    incomeType: "TRANSFER" | "WELCOME_BONUS" | "REALIZED_PNL" | "FUNDING_FEE" | "COMMISSION" | "INSURANCE_CLEAR" | "MARKET_MERCHANT_RETURN_REWARD" | string;
    income: string;
    asset: string;
    info: string;
    time: number;
    tranId: string;
    tradeId: string;
}


// --- Aster WebSocket User Data Stream Event Payloads ---
export interface AsterWebSocketUpdateAccountDataBalance {
  a: string; // Asset
  wb: string; // Wallet Balance
  cw: string; // Cross Wallet Balance
  bc: string; // Balance Change except PnL and Commission
}
export interface AsterWebSocketUpdateAccountDataPosition {
  s: string;  // Symbol
  pa: string; // Position Amount
  ep: string; // Entry Price
  cr: string; // (Pre-fee) Accumulated Realized
  up: string; // Unrealized PnL
  mt: 'isolated' | 'cross'; // Margin Type
  iw: string; // Isolated Wallet (if isolated position)
  ps: 'BOTH' | 'LONG' | 'SHORT'; // Position Side
  imr?: string; // Initial Margin Rate (Added)
  mm?: string; // Maintenance Margin (Added)
}
export interface AsterWebSocketUpdateAccountData {
  m: string; // Event reason type ('ORDER', 'FUNDING_FEE', etc.)
  B: AsterWebSocketUpdateAccountDataBalance[]; // Balances
  P: AsterWebSocketUpdateAccountDataPosition[]; // Positions
}
export interface AsterWebSocketUpdateAccount {
  e: "ACCOUNT_UPDATE"; // Event Type
  E: number; // Event Time
  T: number; // Transaction Time
  a: AsterWebSocketUpdateAccountData; // Update Data
}
export interface AsterWebSocketOrderUpdateData {
  s: string; // Symbol
  c: string; // Client Order ID
  S: 'BUY' | 'SELL'; // Side
  o: string; // Order Type
  f: string; // Time in Force
  q: string; // Original Quantity
  p: string; // Original Price
  ap: string; // Average Price
  sp: string; // Stop Price
  x: string; // Execution Type
  X: string; // Order Status
  i: number; // Order ID
  l: string; // Order Last Filled Quantity
  z: string; // Order Filled Accumulated Quantity
  L: string; // Last Filled Price
  N?: string; // Commission Asset (if different from Main Asset)
  n?: string; // Commission Amount (if different from Main Asset)
  T: number; // Transaction Time
  t: number; // Trade ID
  b: string; // Bid Notional
  a: string; // Ask Notional
  m: boolean; // Is this trade the maker?
  R: boolean; // Is an order on the book?
  wt: string; // Working Type
  ot: string; // Original Order Type
  ps: 'BOTH' | 'LONG' | 'SHORT'; // Position Side
  cp: boolean; // If Close-All, pushed with conditional order
  AP?: string; // Trailing Stop Activation Price
  cr?: string; // Trailing Stop Callback Rate
  rp: string; // Realized Pnl
}
export interface AsterWebSocketUpdateOrder {
  e: "ORDER_TRADE_UPDATE"; E: number; T: number; o: AsterWebSocketOrderUpdateData;
}
export interface AsterWebSocketListenKeyExpired {
  e: "listenKeyExpired"; E: number;
}

// --- Unified/Comparison Types ---
export interface ExchangeAssetDetail {
  id: string;
  symbol: string;
  baseAsset?: string;
  price: number;
  dailyVolume: number;
  baseAssetVolume24h?: number;
  openInterest: number | null;
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
  price: number; quantity: number; total?: number;
};

// Account Center Data Types
export interface AsterAccountSummaryData {
  portfolioValue: number | null;
  totalUnrealizedPNL: number | null;
  totalRealizedPNL: number;
  totalTrades: number;
  longTrades: number;
  shortTrades: number;
  totalVolume: number;
  longVolume: number;
  shortVolume: number;
  totalFeesPaid: number; // Sum of commissions from TRADES (for latestFee display logic)
  latestFee: number | null; // Latest single trade commission
  commissionRateTaker: string | null;
  commissionRateMaker: string | null;
  commissionSymbol: string | null;
  previousDayVolumeAuBoost: number;
  auTraderBoost: string | null;
  rhPointsTotal: number;
  todayTotalVolume: number;
  totalFundingFees: number; // Sum of FUNDING_FEE from income history
  totalCommissions: number; // Sum of COMMISSION from income history
  balances?: AsterAccountBalanceV2[];
  accountInfo?: AsterAccountInfoV2;
  positions?: AsterPositionV2[];
  webSocketStatus: 'Disconnected' | 'Connecting' | 'Connected' | 'Error';
  lastUpdated?: number; // Timestamp for the overall summary data
  incomeHistory?: AsterIncomeHistoryItem[];
  userTrades?: AsterUserTrade[]; // This will hold the consolidated trades
}

// For caching trades
export interface CachedSymbolTrades {
  trades: AsterUserTrade[];
  newestTradeId: number | null;
  oldestTradeIdKnown: number | null;
  allHistoryFetched?: boolean;
}

export interface AllCachedTrades {
    [symbol: string]: CachedSymbolTrades;
}

// HMR Recovery Comment
export {}; // Ensures this file is treated as a module
