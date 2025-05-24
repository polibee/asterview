
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

export interface AsterExchangeSymbolFilter {
  filterType: string;
  // Define other filter properties if needed, e.g., PRICE_FILTER
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
  // other properties from exchangeInfo if needed
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
  // ... other fields from getMetaData contractList
  enableTrade: boolean;
  enableDisplay: boolean;
}

export interface EdgeXMetaData {
  contractList: EdgeXContract[];
  // ... other fields from getMetaData
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
  fundingTime: string;
  nextFundingTime: string;
}

// --- Unified/Comparison Types ---
export interface ExchangeAssetDetail {
  id: string; // Aster: symbol, EdgeX: contractId
  symbol: string; // Common trading symbol, e.g. BTC/USDT
  price: number;
  dailyVolume: number; // In quote currency
  openInterest: number; // In quote currency or base - needs consistency
  dailyTrades: number;
  exchange: 'Aster' | 'EdgeX';
  iconUrl?: string; // Optional icon
}

export interface ExchangeAggregatedMetrics {
  totalDailyVolume: number; // In quote currency
  totalOpenInterest: number; // In quote currency or base
  totalDailyTrades: number;
}

export interface ExchangeData {
  name: 'Aster' | 'EdgeX';
  metrics: ExchangeAggregatedMetrics;
  assets: ExchangeAssetDetail[];
}
