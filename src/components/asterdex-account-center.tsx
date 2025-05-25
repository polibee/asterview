
// src/components/asterdex-account-center.tsx
'use client';

import React,
{
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';
import type {
  AsterAccountSummaryData,
  AsterAccountBalanceV2,
  AsterAccountInfoV2,
  AsterUserTrade,
  AsterCommissionRate,
  AsterListenKey,
  AsterWebSocketUpdateAccount,
  AsterWebSocketUpdateOrder,
  AsterWebSocketListenKeyExpired,
  CachedSymbolTrades,
  AllCachedTrades,
  AsterPositionV2,
  AsterAccountInfoV2Asset,
  AsterIncomeHistoryItem,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  fetchAsterAccountBalances,
  fetchAsterAccountInfo,
  fetchAsterCommissionRate,
  fetchAsterUserTrades,
  fetchAsterIncomeHistory,
  createAsterListenKey,
  keepAliveAsterListenKey,
  deleteAsterListenKey,
} from '@/lib/aster-user-api';
import {
  DollarSign, TrendingDown, TrendingUp, ListChecks, BarChart3, Landmark, Percent, Zap, ArrowUpRightSquare, Trophy, Info, Settings, AlertTriangle, WifiOff, Wifi, ReceiptText, RefreshCw, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, fromUnixTime, getUnixTime, getYear, getMonth, getDate, startOfTomorrow, subDays, addDays } from 'date-fns';

// Configuration for the Invite Code Feature
const ENABLE_INVITE_CODE_FEATURE = true;
const INVITE_CODE = "Ea990e";
const INVITE_URL = `https://www.asterdex.com/en/referral/${INVITE_CODE}`;

const parseFloatSafe = (value: string | number | undefined | null, defaultValue: number | null = null): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  const num = parseFloat(String(value));
  return isNaN(num) ? defaultValue : num;
};

const formatUsd = (value: number | null, digits = 2) => {
  if (value === null || isNaN(value)) return 'N/A';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const formatNumber = (value: number | null, digits = 0) => {
  if (value === null || isNaN(value)) return 'N/A';
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const formatCommissionRate = (rate: string | null): string => {
  if (rate === null) return "N/A";
  const numRate = parseFloatSafe(rate);
  if (numRate === null) return "N/A";
  return `${(numRate * 100).toFixed(4)}%`;
}

interface MetricCardProps {
  title: string;
  value: string | React.ReactNode;
  description?: string | React.ReactNode;
  icon: React.ElementType;
  isLoading?: boolean;
  variant?: 'default' | 'positive' | 'negative';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description, icon: Icon, isLoading, variant = 'default', className }) => {
  let valueColor = "text-foreground";
  if (variant === 'positive') valueColor = "text-green-600 dark:text-green-500";
  if (variant === 'negative') valueColor = "text-red-600 dark:text-red-500";

  return (
    <Card className={cn("shadow-md flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center">
        {isLoading ? (
          <div className="h-8 w-3/4 bg-muted animate-pulse rounded-md my-1"></div>
        ) : (
          <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        )}
        {description && !isLoading && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

const ACCOUNT_SUMMARY_LS_KEY = 'asterAccountSummaryData_v17'; // Incremented version for cache invalidation if structure changes
const TRADES_LS_KEY_PREFIX = 'asterUserTrades_v15_'; // Incremented version
const INCOME_HISTORY_LS_KEY_PREFIX = 'asterIncomeHistory_v9_'; // Incremented

const DATA_STALE_MS = 5 * 60 * 1000; // 5 minutes
const INITIAL_TRADE_FETCH_LIMIT = 1000;
const UPDATE_TRADE_FETCH_LIMIT = 1000;
const INCOME_FETCH_LIMIT = 1000;
const INCOME_HISTORY_DAYS_LOOKBACK = 7;
const API_CALL_DELAY_MS = 350; 
const DEFAULT_COMMISSION_SYMBOL = 'BTCUSDT';


export function AsterdexAccountCenter() {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempSecretKey, setTempSecretKey] = useState('');
  const [isApiKeysSet, setIsApiKeysSet] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const [accountData, setAccountData] = useState<AsterAccountSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listenKey, setListenKey] = useState<string | null>(null);
  const [webSocketStatus, setWebSocketStatus] = useState<AsterAccountSummaryData['webSocketStatus']>('Disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetAccountDataToDefaults = useCallback((status: AsterAccountSummaryData['webSocketStatus'] = 'Disconnected'): AsterAccountSummaryData => {
    return {
      portfolioValue: null, totalUnrealizedPNL: null,
      totalRealizedPNL: 0, totalCommissions: 0, totalFundingFees: 0,
      totalTrades: 0, longTrades: 0, shortTrades: 0,
      totalVolume: 0, longVolume: 0, shortVolume: 0,
      totalFeesPaid: 0, latestFee: null,
      commissionRateMaker: null, commissionRateTaker: null, commissionSymbol: null,
      previousDayVolumeAuBoost: 0, auTraderBoost: "1x (Base)",
      rhPointsTotal: 0, todayTotalVolume: 0,
      webSocketStatus: status, lastUpdated: 0,
      balances: [], accountInfo: undefined, positions: [], incomeHistory: [], userTrades: [],
    };
  }, []);


  const getTradesLocalStorageKey = useCallback(() => {
    if (!apiKey || typeof window === 'undefined') return null;
    return `${TRADES_LS_KEY_PREFIX}${apiKey}`;
  }, [apiKey]);

  const loadTradesFromLocalStorage = useCallback((): AllCachedTrades | null => {
    if (typeof window === 'undefined') return null;
    const key = getTradesLocalStorageKey();
    if (!key) return null;
    try {
      const storedData = localStorage.getItem(key);
      return storedData ? JSON.parse(storedData) : null;
    } catch (e) { console.warn("Error loading trades from localStorage:", e); return null; }
  }, [getTradesLocalStorageKey]);

  const saveTradesToLocalStorage = useCallback((tradesBySymbol: AllCachedTrades | null) => {
    if (typeof window === 'undefined') return;
    const key = getTradesLocalStorageKey();
    if (!key) return;
    if (!tradesBySymbol) { localStorage.removeItem(key); return; }
    try { localStorage.setItem(key, JSON.stringify(tradesBySymbol)); }
    catch (e) { console.error("Error saving trades to localStorage:", e); }
  }, [getTradesLocalStorageKey]);

  const getIncomeHistoryLocalStorageKey = useCallback(() => {
    if (!apiKey || typeof window === 'undefined') return null;
    return `${INCOME_HISTORY_LS_KEY_PREFIX}${apiKey}`;
  }, [apiKey]);

  const loadIncomeHistoryFromLocalStorage = useCallback((): AsterIncomeHistoryItem[] | null => {
    if (typeof window === 'undefined') return null;
    const key = getIncomeHistoryLocalStorageKey();
    if (!key) return null;
    try {
      const storedData = localStorage.getItem(key);
      return storedData ? JSON.parse(storedData) : null;
    } catch (e) { console.warn("Error loading income history from localStorage:", e); return null; }
  }, [getIncomeHistoryLocalStorageKey]);

  const saveIncomeHistoryToLocalStorage = useCallback((incomeHistory: AsterIncomeHistoryItem[] | null) => {
    if (typeof window === 'undefined') return;
    const key = getIncomeHistoryLocalStorageKey();
    if (!key) return;
    if (!incomeHistory) { localStorage.removeItem(key); return; }
    try { localStorage.setItem(key, JSON.stringify(incomeHistory)); }
    catch (e) { console.error("Error saving income history to localStorage:", e); }
  }, [getIncomeHistoryLocalStorageKey]);


  const loadAccountSummaryFromLocalStorage = useCallback((): Partial<AsterAccountSummaryData> | null => {
    if (typeof window === 'undefined') return null;
    try {
      const storedData = localStorage.getItem(ACCOUNT_SUMMARY_LS_KEY);
      if (!storedData) return null;
      const parsedData = JSON.parse(storedData) as Partial<AsterAccountSummaryData>;
      return { 
        ...parsedData,
        portfolioValue: parsedData.portfolioValue ?? null,
        totalUnrealizedPNL: parsedData.totalUnrealizedPNL ?? null,
        totalRealizedPNL: parsedData.totalRealizedPNL ?? 0,
        totalCommissions: parsedData.totalCommissions ?? 0,
        totalFundingFees: parsedData.totalFundingFees ?? 0,
        totalTrades: parsedData.totalTrades ?? 0,
        longTrades: parsedData.longTrades ?? 0,
        shortTrades: parsedData.shortTrades ?? 0,
        totalVolume: parsedData.totalVolume ?? 0,
        longVolume: parsedData.longVolume ?? 0,
        shortVolume: parsedData.shortVolume ?? 0,
        totalFeesPaid: parsedData.totalFeesPaid ?? 0,
        latestFee: parsedData.latestFee ?? null,
        commissionRateMaker: parsedData.commissionRateMaker ?? null,
        commissionRateTaker: parsedData.commissionRateTaker ?? null,
        commissionSymbol: parsedData.commissionSymbol ?? null,
        previousDayVolumeAuBoost: parsedData.previousDayVolumeAuBoost ?? 0,
        auTraderBoost: parsedData.auTraderBoost ?? "1x (Base)",
        rhPointsTotal: parsedData.rhPointsTotal ?? 0,
        todayTotalVolume: parsedData.todayTotalVolume ?? 0,
        lastUpdated: parsedData.lastUpdated ?? 0,
      };
    } catch (e) { console.warn("Error loading account summary from localStorage:", e); return null; }
  }, []);

  const saveAccountSummaryToLocalStorage = useCallback((data: AsterAccountSummaryData | null) => {
    if (typeof window === 'undefined') return;
    if (!data) { localStorage.removeItem(ACCOUNT_SUMMARY_LS_KEY); return; }
    try {
      const { incomeHistory, balances, positions, accountInfo, userTrades, ...summaryToStore } = data;
      localStorage.setItem(ACCOUNT_SUMMARY_LS_KEY, JSON.stringify(summaryToStore));
    } catch (e) { console.error("Error saving account summary to localStorage:", e); }
  }, []);

const fetchAndCacheTradesForSymbol = async (
    currentApiKey: string, currentSecretKey: string, symbol: string,
    cachedSymbolData: CachedSymbolTrades | undefined
  ): Promise<CachedSymbolTrades> => {
    let allTradesForSymbol = cachedSymbolData?.trades || [];
    const newestCachedTradeId = cachedSymbolData?.newestTradeId || null;
    let tradesToFetchLimit = newestCachedTradeId ? UPDATE_TRADE_FETCH_LIMIT : INITIAL_TRADE_FETCH_LIMIT;
    let fetchFromId: number | undefined = newestCachedTradeId ? newestCachedTradeId + 1 : undefined;
    let currentOldestId = cachedSymbolData?.oldestTradeIdKnown;
    let allHistoryPotentiallyFetched = cachedSymbolData?.allHistoryFetched || false;

    try {
      const fetchedTrades = await fetchAsterUserTrades(currentApiKey, currentSecretKey, symbol, tradesToFetchLimit, fetchFromId);
      if (fetchedTrades.length > 0) {
        const combinedTrades = [...allTradesForSymbol, ...fetchedTrades].sort((a, b) => a.id - b.id);
        const uniqueTradesMap = new Map<number, AsterUserTrade>();
        combinedTrades.forEach(trade => uniqueTradesMap.set(trade.id, trade));
        allTradesForSymbol = Array.from(uniqueTradesMap.values()).sort((a, b) => a.id - b.id);
      }
      if (fetchedTrades.length < tradesToFetchLimit && !newestCachedTradeId && !fetchFromId) { 
        allHistoryPotentiallyFetched = true;
      }
    } catch (e) {
      console.warn(`Failed to fetch trades for ${symbol}:`, e);
      return cachedSymbolData || { trades: [], newestTradeId: null, oldestTradeIdKnown: null, allHistoryFetched: false };
    }

    const newestTrade = allTradesForSymbol.length > 0 ? allTradesForSymbol[allTradesForSymbol.length - 1] : null;
    const oldestTrade = allTradesForSymbol.length > 0 ? allTradesForSymbol[0] : null;

    return {
      trades: allTradesForSymbol,
      newestTradeId: newestTrade ? newestTrade.id : (cachedSymbolData?.newestTradeId || null),
      oldestTradeIdKnown: oldestTrade ? oldestTrade.id : (currentOldestId || null),
      allHistoryFetched: allHistoryPotentiallyFetched,
    };
  };

  const calculateTradeMetrics = (
    userTrades: AsterUserTrade[] | undefined,
    incomeHistoryData: AsterIncomeHistoryItem[] | undefined
  ) => {
    let totalRealizedPNLFromIncome = 0; let totalCommissionsFromIncome = 0; let totalFundingFeesFromIncome = 0;

    if (incomeHistoryData) {
      incomeHistoryData.forEach(item => {
        const incomeVal = parseFloatSafe(item.income) ?? 0;
        if (item.incomeType === "REALIZED_PNL") totalRealizedPNLFromIncome += incomeVal;
        else if (item.incomeType === "COMMISSION") totalCommissionsFromIncome += Math.abs(incomeVal);
        else if (item.incomeType === "FUNDING_FEE") totalFundingFeesFromIncome += incomeVal;
      });
    }

    if (!userTrades || userTrades.length === 0) {
      return {
        totalRealizedPNL: totalRealizedPNLFromIncome, totalCommissions: totalCommissionsFromIncome, totalFundingFees: totalFundingFeesFromIncome,
        totalTrades: 0, longTrades: 0, shortTrades: 0,
        totalVolume: 0, longVolume: 0, shortVolume: 0,
        totalFeesPaid: 0, latestFee: null,
        previousDayVolumeAuBoost: 0, auTraderBoost: "1x (Base)",
        rhPointsTotal: 0, todayTotalVolume: 0,
      };
    }

    let totalVolume = 0; let longTrades = 0; let shortTrades = 0;
    let longVolume = 0; let shortVolume = 0;
    let totalFeesPaidFromTrades = 0;
    let previousDayTakerVolume = 0; let previousDayMakerVolume = 0;
    let allTradesTakerVolume = 0; let allTradesMakerVolume = 0;
    let currentDayTotalVolume = 0;

    const now = new Date();
    const prevDay = subDays(now, 1);
    const previousDayStartUTCTimestamp = Date.UTC(prevDay.getUTCFullYear(), prevDay.getUTCMonth(), prevDay.getUTCDate(), 0, 0, 0, 0);
    const currentDayStartUTCTimestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
    const nextDayUTCTimestampStart = addDays(new Date(currentDayStartUTCTimestamp), 1).getTime();


    let latestFeeValue: number | null = null;
    const sortedTradesForLatestFee = [...userTrades].sort((a, b) => b.time - a.time);
    if (sortedTradesForLatestFee.length > 0) {
      const latestTradeCommission = parseFloatSafe(sortedTradesForLatestFee[0].commission);
      if (latestTradeCommission !== null) latestFeeValue = Math.abs(latestTradeCommission);
    }

    userTrades.forEach(trade => {
      const quoteQty = parseFloatSafe(trade.quoteQty) ?? 0;
      const commission = parseFloatSafe(trade.commission) ?? 0;
      const tradeTime = trade.time;

      totalVolume += quoteQty;
      totalFeesPaidFromTrades += Math.abs(commission);

      if (trade.side.toUpperCase() === 'BUY') { longTrades++; longVolume += quoteQty; }
      else if (trade.side.toUpperCase() === 'SELL') { shortTrades++; shortVolume += quoteQty; }

      if (tradeTime >= previousDayStartUTCTimestamp && tradeTime < currentDayStartUTCTimestamp) {
        if (trade.maker === false) previousDayTakerVolume += quoteQty;
        else previousDayMakerVolume += quoteQty;
      }
      if (tradeTime >= currentDayStartUTCTimestamp && tradeTime < nextDayUTCTimestampStart) {
        currentDayTotalVolume += quoteQty;
      }

      if (trade.maker === false) allTradesTakerVolume += quoteQty;
      else allTradesMakerVolume += quoteQty;
    });

    const previousDayVolumeAuBoostCalc = previousDayTakerVolume + (previousDayMakerVolume * 0.5);

    let auTraderBoostFactor = "1x (Base)"; // This means +0x additional boost.
    if (previousDayVolumeAuBoostCalc >= 500000) auTraderBoostFactor = "+3x";
    else if (previousDayVolumeAuBoostCalc >= 200000) auTraderBoostFactor = "+2.5x";
    else if (previousDayVolumeAuBoostCalc >= 50000) auTraderBoostFactor = "+2x";
    else if (previousDayVolumeAuBoostCalc >= 10000) auTraderBoostFactor = "+1x";
    
    const rhPointsTotalCalc = allTradesTakerVolume + (allTradesMakerVolume * 0.5);
    const tradeMetricsScopeMessage = `Based on fetched & cached trades (up to ${INITIAL_TRADE_FETCH_LIMIT} recent per symbol initially, plus newer trades for symbols with previous activity or current positions). May not reflect complete lifetime history for all symbols.`;

    return {
      totalRealizedPNL: totalRealizedPNLFromIncome, totalCommissions: totalCommissionsFromIncome, totalFundingFees: totalFundingFeesFromIncome,
      totalTrades: userTrades.length, longTrades, shortTrades,
      totalVolume, longVolume, shortVolume,
      totalFeesPaid: totalFeesPaidFromTrades, 
      latestFee: latestFeeValue,
      previousDayVolumeAuBoost: previousDayVolumeAuBoostCalc, auTraderBoost: auTraderBoostFactor,
      rhPointsTotal: rhPointsTotalCalc,
      todayTotalVolume: currentDayTotalVolume,
    };
  };

  const loadAccountData = useCallback(async (forceRefresh = false) => {
    if (!isApiKeysSet || !apiKey || !secretKey) {
      setAccountData(resetAccountDataToDefaults('Disconnected'));
      setError("API Key and Secret Key are required.");
      return;
    }
    
    let initialRenderData = accountData;
    if (accountData === null && !forceRefresh) { // Very first load attempt with keys
        initialRenderData = resetAccountDataToDefaults(webSocketStatus);
        setAccountData(initialRenderData);
    }

    setIsLoading(true); setError(null);

    try {
      const cachedSummary = loadAccountSummaryFromLocalStorage();
      if (cachedSummary && !forceRefresh && (Date.now() - (cachedSummary.lastUpdated || 0) < DATA_STALE_MS)) {
         if (!initialRenderData || initialRenderData.portfolioValue === null ) { // Only use cached summary if current data is minimal
            setAccountData(prev => ({...(prev || resetAccountDataToDefaults(webSocketStatus)), ...cachedSummary, webSocketStatus: webSocketStatus}));
         }
      }

      const [balancesResp, accInfo, commissionInfoResp] = await Promise.all([
        fetchAsterAccountBalances(apiKey, secretKey),
        fetchAsterAccountInfo(apiKey, secretKey),
        fetchAsterCommissionRate(apiKey, secretKey, DEFAULT_COMMISSION_SYMBOL),
      ]);
      await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));

      let newAccountDataPartial = {
        ...(initialRenderData || resetAccountDataToDefaults(webSocketStatus)),
        portfolioValue: parseFloatSafe(accInfo.totalMarginBalance),
        totalUnrealizedPNL: parseFloatSafe(accInfo.totalUnrealizedProfit),
        commissionRateMaker: commissionInfoResp?.makerCommissionRate ?? null,
        commissionRateTaker: commissionInfoResp?.takerCommissionRate ?? null,
        commissionSymbol: commissionInfoResp?.symbol ?? DEFAULT_COMMISSION_SYMBOL,
        balances: balancesResp || [],
        accountInfo: accInfo,
        positions: accInfo.positions || [],
        webSocketStatus: webSocketStatus, 
      };
      setAccountData(prev => ({...prev, ...newAccountDataPartial})); // Update UI with base info first

      let cachedIncome = loadIncomeHistoryFromLocalStorage();
      let fetchedIncomeHistory: AsterIncomeHistoryItem[];
      const sevenDaysAgo = subDays(new Date(), INCOME_HISTORY_DAYS_LOOKBACK).getTime();
      if (cachedIncome && !forceRefresh && cachedIncome.length > 0 && cachedIncome[0]?.time > sevenDaysAgo) {
          fetchedIncomeHistory = cachedIncome;
      } else {
          fetchedIncomeHistory = await fetchAsterIncomeHistory(apiKey, secretKey, undefined, undefined, sevenDaysAgo, undefined, INCOME_FETCH_LIMIT);
          saveIncomeHistoryToLocalStorage(fetchedIncomeHistory);
      }
      
      let currentTradesBySymbolCache = loadTradesFromLocalStorage() || {};
      const symbolsInPositionsAndCache = Array.from(new Set([
          ...(accInfo?.positions || []).map(p => p.symbol), 
          ...Object.keys(currentTradesBySymbolCache)
      ]));

      let allUserTradesArray: AsterUserTrade[] = [];

      for (const symbol of symbolsInPositionsAndCache) {
        if (!symbol) continue;
        const updatedSymbolCache = await fetchAndCacheTradesForSymbol(apiKey, secretKey, symbol, currentTradesBySymbolCache[symbol]);
        currentTradesBySymbolCache[symbol] = updatedSymbolCache;
        if(updatedSymbolCache?.trades) {
          allUserTradesArray.push(...updatedSymbolCache.trades);
        }
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));
      }
      saveTradesToLocalStorage(currentTradesBySymbolCache);
      
      const uniqueUserTrades = Array.from(new Map(allUserTradesArray.map(trade => [trade.id, trade])).values()).sort((a, b) => a.id - b.id);

      const tradeMetrics = calculateTradeMetrics(uniqueUserTrades, fetchedIncomeHistory);

      const finalAccountData = {
        ...newAccountDataPartial, // Start with the already set partial data
        incomeHistory: fetchedIncomeHistory,
        userTrades: uniqueUserTrades, 
        ...tradeMetrics,
        lastUpdated: Date.now(),
      };

      setAccountData(finalAccountData);
      saveAccountSummaryToLocalStorage(finalAccountData);

    } catch (err: any) {
      console.error("Error fetching account data via REST:", err);
      setError(err.message || "An unknown error occurred while fetching account data via REST.");
      setAccountData(resetAccountDataToDefaults(webSocketStatus === 'Connecting' ? 'Connecting' : 'Error'));
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, secretKey, webSocketStatus, isApiKeysSet, resetAccountDataToDefaults, loadAccountSummaryFromLocalStorage, saveAccountSummaryToLocalStorage, getTradesLocalStorageKey, loadTradesFromLocalStorage, saveTradesToLocalStorage, getIncomeHistoryLocalStorageKey, loadIncomeHistoryFromLocalStorage, saveIncomeHistoryToLocalStorage, accountData]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedApiKey = localStorage.getItem('asterApiKey');
    const storedSecretKey = localStorage.getItem('asterSecretKey');

    if (storedApiKey && storedSecretKey) {
      setApiKey(storedApiKey); setSecretKey(storedSecretKey);
      setTempApiKey(storedApiKey); setTempSecretKey(storedSecretKey);
      setIsApiKeysSet(true);
    } else {
      setAccountData(resetAccountDataToDefaults('Disconnected'));
    }
  }, [resetAccountDataToDefaults]);

  useEffect(() => {
    if (isApiKeysSet && apiKey && secretKey) {
      loadAccountData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiKeysSet, apiKey, secretKey]); // loadAccountData itself has other deps like accountData, consider if this is correct

  useEffect(() => {
    if (!isApiKeysSet || !apiKey || !secretKey || typeof window === 'undefined') {
      if (wsRef.current) { wsRef.current.close(1000, "API keys not set or component unmounting"); wsRef.current = null; }
      setWebSocketStatus('Disconnected');
      if (listenKey && apiKey) { deleteAsterListenKey(apiKey, listenKey).catch(e => console.warn("Could not delete old listen key:", e)); setListenKey(null); }
      if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
      return;
    }

    let currentWs: WebSocket | null = null;
    let localListenKeyAttempt = listenKey;

    const connectWebSocket = async () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
      setWebSocketStatus('Connecting');
      try {
        if (!localListenKeyAttempt) {
          const keyData = await createAsterListenKey(apiKey);
          localListenKeyAttempt = keyData.listenKey;
          setListenKey(localListenKeyAttempt);
        }

        currentWs = new WebSocket(`wss://fstream.asterdex.com/ws/${localListenKeyAttempt}`);
        wsRef.current = currentWs;

        currentWs.onopen = () => {
          setWebSocketStatus('Connected');
          if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
          if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = setInterval(async () => {
            if (localListenKeyAttempt && apiKey) {
              try { await keepAliveAsterListenKey(apiKey, localListenKeyAttempt); }
              catch (e: any) {
                console.warn("Failed to keep alive listenKey:", e.message); 
                if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current?.close(); 
              }
            }
          }, 30 * 60 * 1000); 
        };

        currentWs.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string);
            const typedMessage = message as AsterWebSocketUpdateAccount | AsterWebSocketUpdateOrder | AsterWebSocketListenKeyExpired;

            if (typedMessage.e === 'ACCOUNT_UPDATE') {
              const update = typedMessage as AsterWebSocketUpdateAccount;
              setAccountData(prevData => {
                if (!prevData) return resetAccountDataToDefaults('Connected');

                let newBalances = prevData.balances ? [...prevData.balances] : [];
                let newPositions = prevData.positions ? [...prevData.positions] : [];
                let newAccountInfo = prevData.accountInfo ? JSON.parse(JSON.stringify(prevData.accountInfo)) as AsterAccountInfoV2 : undefined;

                update.a.B.forEach(bUpdate => {
                  const assetIdentifier = bUpdate.a;
                  const balIndex = newBalances.findIndex(b => b.asset === assetIdentifier);
                  const existingBalance = balIndex !== -1 ? newBalances[balIndex] : undefined;
                  const updatedBalanceData: AsterAccountBalanceV2 = {
                    accountAlias: existingBalance?.accountAlias || '',
                    asset: assetIdentifier, balance: bUpdate.wb, crossWalletBalance: bUpdate.cw,
                    availableBalance: bUpdate.wb, 
                    crossUnPnl: existingBalance?.crossUnPnl || "0",
                    maxWithdrawAmount: existingBalance?.maxWithdrawAmount || bUpdate.wb,
                    marginAvailable: existingBalance?.marginAvailable || false,
                    updateTime: typedMessage.E, bc: bUpdate.bc,
                  };
                  if (balIndex !== -1) newBalances[balIndex] = updatedBalanceData; else newBalances.push(updatedBalanceData);

                  if (newAccountInfo) {
                    const accAssetIndex = newAccountInfo.assets.findIndex(a => a.asset === assetIdentifier);
                    let existingAccAsset = accAssetIndex !== -1 ? newAccountInfo.assets[accAssetIndex] : undefined;
                    if (!existingAccAsset) { // Create a default structure if asset not found
                        existingAccAsset = { asset: assetIdentifier, walletBalance: "0", unrealizedProfit: "0", marginBalance: "0", maintMargin: "0", initialMargin: "0", positionInitialMargin: "0", openOrderInitialMargin: "0", crossWalletBalance: "0", crossUnPnl: "0", availableBalance: "0", maxWithdrawAmount: "0", marginAvailable: false, updateTime: 0 };
                        newAccountInfo.assets.push(existingAccAsset);
                        accAssetIndex = newAccountInfo.assets.length -1;
                    }
                    
                    const updatedAccAssetData: AsterAccountInfoV2Asset = {
                        ...existingAccAsset,
                        walletBalance: bUpdate.wb, crossWalletBalance: bUpdate.cw, updateTime: typedMessage.E,
                        availableBalance: bUpdate.wb, 
                        marginBalance: ( (parseFloatSafe(bUpdate.wb) ?? 0) + (parseFloatSafe(existingAccAsset?.unrealizedProfit ?? "0") ?? 0) ).toString(),
                    };
                     newAccountInfo.assets[accAssetIndex] = updatedAccAssetData;
                  }
                });

                update.a.P.forEach(pUpdate => {
                    const symbolIdentifier = pUpdate.s;
                    const positionSideIdentifier = pUpdate.ps;
                    let posIndex = newPositions.findIndex(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                
                    let existingPositionForDefaults = posIndex !== -1 ? newPositions[posIndex] : newAccountInfo?.positions.find(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                    if (!existingPositionForDefaults) {
                        existingPositionForDefaults = { symbol: symbolIdentifier, positionSide: positionSideIdentifier, positionAmt: "0", entryPrice: "0", unrealizedProfit: "0", marginType: "cross", isolatedMargin: "0", updateTime: 0, initialMargin: "0", maintMargin: "0", positionInitialMargin: "0", openOrderInitialMargin: "0", leverage: "0", isolated: false, maxNotional: "0", isAutoAddMargin: "false", liquidationPrice: "0", markPrice: "0", maxNotionalValue: "0" };
                    }

                    const updatedPositionData: AsterPositionV2 = {
                        symbol: symbolIdentifier, positionSide: positionSideIdentifier,
                        positionAmt: pUpdate.pa, entryPrice: pUpdate.ep, unrealizedProfit: pUpdate.up,
                        marginType: pUpdate.mt, isolatedMargin: pUpdate.iw,
                        updateTime: typedMessage.E,
                        initialMargin: existingPositionForDefaults.initialMargin, maintMargin: existingPositionForDefaults.maintMargin,
                        positionInitialMargin: existingPositionForDefaults.positionInitialMargin, openOrderInitialMargin: existingPositionForDefaults.openOrderInitialMargin,
                        leverage: existingPositionForDefaults.leverage, isolated: pUpdate.mt === 'isolated',
                        maxNotional: existingPositionForDefaults.maxNotional,
                        isAutoAddMargin: existingPositionForDefaults.isAutoAddMargin,
                        liquidationPrice: existingPositionForDefaults.liquidationPrice, markPrice: existingPositionForDefaults.markPrice,
                        maxNotionalValue: existingPositionForDefaults.maxNotionalValue,
                    };

                    if (posIndex !== -1) newPositions[posIndex] = updatedPositionData; else newPositions.push(updatedPositionData);

                    if (newAccountInfo) {
                        let accPosIndex = newAccountInfo.positions.findIndex(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                        if (accPosIndex !== -1) newAccountInfo.positions[accPosIndex] = updatedPositionData;
                        else newAccountInfo.positions.push(updatedPositionData);
                    }
                });
                
                let newPortfolioValue = prevData.portfolioValue;
                let newTotalUnrealizedPNL = prevData.totalUnrealizedPNL;

                if (newAccountInfo) {
                  newAccountInfo.totalWalletBalance = newAccountInfo.assets.reduce((sum, asset) => sum + (parseFloatSafe(asset.walletBalance) || 0), 0).toString();
                  newAccountInfo.totalUnrealizedProfit = newAccountInfo.positions.reduce((sum, pos) => sum + (parseFloatSafe(pos.unrealizedProfit) || 0), 0).toString();
                  newAccountInfo.totalMarginBalance = ( (parseFloatSafe(newAccountInfo.totalWalletBalance) ?? 0) + (parseFloatSafe(newAccountInfo.totalUnrealizedProfit) ?? 0) ).toString();
                  newPortfolioValue = parseFloatSafe(newAccountInfo.totalMarginBalance);
                  newTotalUnrealizedPNL = parseFloatSafe(newAccountInfo.totalUnrealizedProfit);
                }

                const updatedData = {
                  ...prevData, balances: newBalances, positions: newPositions, accountInfo: newAccountInfo,
                  portfolioValue: newPortfolioValue, totalUnrealizedPNL: newTotalUnrealizedPNL,
                  webSocketStatus: 'Connected' as AsterAccountSummaryData['webSocketStatus'],
                  lastUpdated: typedMessage.E
                };
                saveAccountSummaryToLocalStorage(updatedData);
                saveIncomeHistoryToLocalStorage(prevData.incomeHistory || null);
                const tradesKey = getTradesLocalStorageKey();
                if(tradesKey) saveTradesToLocalStorage(loadTradesFromLocalStorage());
                return updatedData;
              });
            } else if (typedMessage.e === 'ORDER_TRADE_UPDATE') {
              loadAccountData(true); // Force refresh for trade-dependent metrics
            } else if (typedMessage.e === 'listenKeyExpired') {
              console.warn("ListenKey expired via WebSocket. Attempting to reconnect.");
              if (wsRef.current) {
                  wsRef.current.onclose = null; 
                  wsRef.current.close(1000, "ListenKey expired");
                  wsRef.current = null;
              }
              setListenKey(null); localListenKeyAttempt = null; 
              setAccountData(resetAccountDataToDefaults('Connecting'));
              if (isApiKeysSet && apiKey && secretKey && !reconnectTimeoutRef.current) {
                  reconnectTimeoutRef.current = setTimeout(() => {
                      reconnectTimeoutRef.current = null; 
                      connectWebSocket();
                  }, 1000 + Math.random() * 1000); 
              }
            }
          } catch (e) { console.error("Error processing WebSocket message:", e); }
        };

        currentWs.onerror = (errorEvent) => {
          console.warn("AsterDex WebSocket onerror event. Details may follow in onclose.", errorEvent);
          setWebSocketStatus('Error');
           if (isApiKeysSet && apiKey && secretKey && !reconnectTimeoutRef.current) {
             if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close(1000, "WebSocket error occurred");
                wsRef.current = null;
             }
             setListenKey(null); localListenKeyAttempt = null;
             setAccountData(prev => prev ? {...prev, webSocketStatus: 'Connecting'} : resetAccountDataToDefaults('Connecting'));
             reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                connectWebSocket();
             }, 5000 + Math.random() * 5000);
           }
        };

        currentWs.onclose = (event) => {
          if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
          const wasManuallyClosed = event.code === 1000 && (event.reason === "Component unmounting or API keys changed" || event.reason === "User disconnected" || event.reason === "API Keys not set or component unmounting" || event.reason === "ListenKey expired" || event.reason === "WebSocket error occurred");

          wsRef.current = null; 
          if (!wasManuallyClosed && isApiKeysSet && apiKey && secretKey && !reconnectTimeoutRef.current) {
            console.warn(`WebSocket closed unexpectedly. Code: ${event.code}, Reason: "${event.reason}". Attempting to reconnect...`);
            setListenKey(null); localListenKeyAttempt = null; 
            setAccountData(prev => prev ? {...prev, webSocketStatus: 'Connecting'} : resetAccountDataToDefaults('Connecting'));
             reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                connectWebSocket();
             }, 5000 + Math.random() * 5000); 
          } else if (wasManuallyClosed && event.reason !== "ListenKey expired" && event.reason !== "WebSocket error occurred") {
            setWebSocketStatus('Disconnected');
            if (event.reason !== "User disconnected") { // Only nullify listenKey if not user initiated disconnect
                setListenKey(null); localListenKeyAttempt = null;
            }
            console.log(`WebSocket closed. Code: ${event.code}, Reason: "${event.reason}". Not attempting reconnect due to manual/controlled closure.`);
          } else {
             if (webSocketStatus !== 'Connecting' && webSocketStatus !== 'Error') {
                 setWebSocketStatus('Disconnected');
             }
             console.log(`WebSocket closed. Code: ${event.code}, Reason: "${event.reason}". Reconnect logic handled by specific events or conditions.`);
          }
        };

      } catch (e: any) {
        console.error("Failed to connect WebSocket:", e.message);
        setError(e.message || "Failed to establish WebSocket connection.");
        setWebSocketStatus('Error'); setListenKey(null); localListenKeyAttempt = null;
        setAccountData(prev => prev ? {...prev, webSocketStatus: 'Error'} : resetAccountDataToDefaults('Error'));
        if (isApiKeysSet && apiKey && secretKey && !reconnectTimeoutRef.current) {
            console.log("WebSocket connection failed, attempting to reconnect...");
            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                connectWebSocket();
            }, 7000 + Math.random() * 5000); 
        }
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
      const keyToDeleteOnUnmount = localListenKeyAttempt || listenKey;
      if (wsRef.current) {
        wsRef.current.onopen = null; wsRef.current.onmessage = null; wsRef.current.onerror = null; wsRef.current.onclose = null;
        wsRef.current.close(1000, "Component unmounting or API keys changed");
      }
      wsRef.current = null;
      if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
      if (apiKey && keyToDeleteOnUnmount) {
        deleteAsterListenKey(apiKey, keyToDeleteOnUnmount).catch(e => console.warn("Could not delete listen key on unmount/cleanup:", e));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiKeysSet, apiKey, secretKey]);


  const handleSaveApiKeys = () => {
    if (!tempApiKey.trim() || !tempSecretKey.trim()) {
      toast({ title: "Error", description: "API Key and Secret Key cannot be empty.", variant: "destructive" }); return;
    }
    const oldApiKey = apiKey; const oldListenKey = listenKey;

    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }

    if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, "API Keys changed");
        wsRef.current = null;
    }
    if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }

    if (oldApiKey && oldListenKey) {
        deleteAsterListenKey(oldApiKey, oldListenKey).catch(e => console.warn("Could not delete old listen key on API key change:", e));
    }
    setListenKey(null);

    setApiKey(tempApiKey); setSecretKey(tempSecretKey);
    if (typeof window !== 'undefined') { localStorage.setItem('asterApiKey', tempApiKey); localStorage.setItem('asterSecretKey', tempSecretKey); }
    setIsApiKeysSet(true); setIsSettingsDialogOpen(false);
    setAccountData(null); 
    setError(null);
    toast({ title: "Success", description: "API Keys saved. Fetching data..." });
  };

  const handleDisconnect = () => {
    const currentListenKey = listenKey; const currentApiKeyForDisconnect = apiKey;

    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, "User disconnected");
        wsRef.current = null;
    }
    if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }

    if (currentApiKeyForDisconnect && currentListenKey) {
      deleteAsterListenKey(currentApiKeyForDisconnect, currentListenKey).catch(e => console.error("Error deleting listen key on disconnect:", e));
    }

    setApiKey(''); setSecretKey(''); setTempApiKey(''); setTempSecretKey('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('asterApiKey'); localStorage.removeItem('asterSecretKey');
      const tradesKey = getTradesLocalStorageKey(); if (tradesKey) localStorage.removeItem(tradesKey); 
      const incomeKey = getIncomeHistoryLocalStorageKey(); if (incomeKey) localStorage.removeItem(incomeKey);
      localStorage.removeItem(ACCOUNT_SUMMARY_LS_KEY);

      if (currentApiKeyForDisconnect) { 
          const oldTradesKey = `${TRADES_LS_KEY_PREFIX}${currentApiKeyForDisconnect}`; localStorage.removeItem(oldTradesKey);
          const oldIncomeKey = `${INCOME_HISTORY_LS_KEY_PREFIX}${currentApiKeyForDisconnect}`; localStorage.removeItem(oldIncomeKey);
      }
    }
    setIsApiKeysSet(false); setError(null); setListenKey(null);
    setWebSocketStatus('Disconnected');
    setAccountData(resetAccountDataToDefaults('Disconnected'));
    toast({ title: "Disconnected", description: "API Keys and cached data have been cleared." });
  };

  const getPnlVariant = (pnl: number | null): MetricCardProps['variant'] => {
    if (pnl === null || pnl === 0) return 'default';
    return pnl > 0 ? 'positive' : 'negative';
  };

  const tradeMetricsScopeMessage = `Based on fetched & cached trades (up to ${INITIAL_TRADE_FETCH_LIMIT} recent per symbol initially, plus newer trades for symbols with previous activity or current positions). May not reflect complete lifetime history for all symbols.`;
  const incomeHistoryScopeMessage = `Based on last ${INCOME_HISTORY_DAYS_LOOKBACK} days of income history (up to ${INCOME_FETCH_LIMIT} records).`;

  const showCardShimmer = isApiKeysSet && !error && isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-1">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Summary</h1>
          <p className="text-sm text-muted-foreground">Live overview of your AsterDEX account activity.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
           <Button variant="outline" size="sm" className="gap-1.5" onClick={() => loadAccountData(true)} disabled={isLoading || !isApiKeysSet}>
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh Data
          </Button>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap",
            webSocketStatus === 'Connected' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
              webSocketStatus === 'Connecting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          )}>
            {webSocketStatus === 'Connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
            WSS {webSocketStatus}
          </span>
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
                <Settings size={16} /> API Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>AsterDex API Configuration</DialogTitle>
                <CardDescription>Enter your API Key and Secret Key to fetch account data.</CardDescription>
              </DialogHeader>
               <Alert variant="destructive" className="mt-4 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Security Warning</AlertTitle>
                <AlertDescription>
                  API keys are stored locally in your browser and are not sent to any server other than AsterDex.
                  For maximum security, it is strongly recommended to:
                  <ul className="list-disc pl-5 mt-1 text-xs">
                    <li>Create API keys with **restricted permissions** (e.g., read-only if you only need to view data).</li>
                    <li>Bind your API keys to **specific IP addresses** (IP Whitelisting) on the AsterDex platform.</li>
                  </ul>
                  This helps prevent unauthorized use if your keys are compromised.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apiKey" className="text-right col-span-1">API Key</Label>
                  <Input id="apiKey" value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)} className="col-span-3" placeholder="Enter your API Key" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="secretKey" className="text-right col-span-1">Secret Key</Label>
                  <Input id="secretKey" type="password" value={tempSecretKey} onChange={(e) => setTempSecretKey(e.target.value)} className="col-span-3" placeholder="Enter your Secret Key" />
                </div>
              </div>
              <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                <Button type="button" variant="destructive" onClick={handleDisconnect} disabled={!isApiKeysSet}>
                  Disconnect & Clear Keys
                </Button>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleSaveApiKeys}>Save & Connect</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {!isApiKeysSet && (
        <Card className="shadow-md">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
            <h3 className="text-lg font-semibold mb-1">API Keys Not Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please configure your AsterDex API Key and Secret Key in settings to view your account data.
            </p>
            <Button onClick={() => setIsSettingsDialogOpen(true)}>Open API Settings</Button>
          </CardContent>
        </Card>
      )}

      {isApiKeysSet && error && (
        <Card className="shadow-md border-destructive">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="text-lg font-semibold text-destructive mb-1">Error Fetching Data</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => loadAccountData(true)} variant="outline" disabled={isLoading}>
              {isLoading ? 'Retrying...' : 'Retry REST Fetch'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isApiKeysSet && !error && (
        <>
          <h2 className="text-xl font-semibold text-foreground mt-2 mb-0">Account Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Portfolio Value"
              value={formatUsd(accountData?.portfolioValue)}
              description="Total margin balance (live via WSS if connected)"
              icon={DollarSign}
              isLoading={showCardShimmer}
              className="lg:col-span-1"
            />
            <MetricCard
              title="Total Unrealized PNL"
              value={formatUsd(accountData?.totalUnrealizedPNL)}
              description="Live PNL on open positions (via WSS if connected)"
              icon={TrendingDown}
              isLoading={showCardShimmer}
              variant={getPnlVariant(accountData?.totalUnrealizedPNL)}
            />
            <MetricCard
              title="Total Realized PNL"
              value={formatUsd(accountData?.totalRealizedPNL)}
              description={<>From Income History (last {INCOME_HISTORY_DAYS_LOOKBACK} days). {incomeHistoryScopeMessage}</>}
              icon={TrendingUp}
              isLoading={showCardShimmer}
              variant={getPnlVariant(accountData?.totalRealizedPNL)}
            />
             <MetricCard
              title="Total Commissions Paid"
              value={formatUsd(accountData?.totalCommissions, 4)}
              description={<>From Income History (last {INCOME_HISTORY_DAYS_LOOKBACK} days). {incomeHistoryScopeMessage}</>}
              icon={ReceiptText}
              isLoading={showCardShimmer}
            />
            <MetricCard
              title="Net Funding Fees"
              value={formatUsd(accountData?.totalFundingFees, 4)}
              description={<>Paid/Received. From Income History (last {INCOME_HISTORY_DAYS_LOOKBACK} days). {incomeHistoryScopeMessage}</>}
              icon={Landmark}
              isLoading={showCardShimmer && (!accountData || (accountData.totalFundingFees === 0 && (!accountData.incomeHistory || accountData.incomeHistory.length === 0)))}
              variant={getPnlVariant(accountData && accountData.totalFundingFees != null ? -accountData.totalFundingFees : null)}
            />
            <MetricCard
              title="Commission Rates"
              value={
                (accountData && accountData.commissionRateTaker !== null && accountData.commissionRateMaker !== null) ?
                  (<>
                    <div>T: {formatCommissionRate(accountData.commissionRateTaker)}</div>
                    <div>M: {formatCommissionRate(accountData.commissionRateMaker)}</div>
                  </>) : "N/A"
              }
              description={`For ${accountData?.commissionSymbol || DEFAULT_COMMISSION_SYMBOL}`}
              icon={Percent}
              isLoading={showCardShimmer}
            />
             <MetricCard
              title="Total Trades"
              value={formatNumber(accountData?.totalTrades)}
              description={<>
                Long: {formatNumber(accountData?.longTrades)} | Short: {formatNumber(accountData?.shortTrades)}
                <br/>{tradeMetricsScopeMessage}
              </>}
              icon={ListChecks}
              isLoading={showCardShimmer}
            />
            <MetricCard
              title="Total Volume Traded"
              value={formatUsd(accountData?.totalVolume)}
              description={<>
                Long: {formatUsd(accountData?.longVolume, 2)} | Short: {formatUsd(accountData?.shortVolume, 2)}
                <br/>{tradeMetricsScopeMessage}
              </>}
              icon={BarChart3}
              isLoading={showCardShimmer}
            />
            <MetricCard
                title="Today's Total Volume"
                value={formatUsd(accountData?.todayTotalVolume)}
                description={<>Current UTC Day. {tradeMetricsScopeMessage}</>}
                icon={BarChart3}
                isLoading={showCardShimmer}
            />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mt-8 mb-0">Points Program Summary</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <MetricCard
              title="Previous Day's Volume (Au Boost)"
              value={formatUsd(accountData?.previousDayVolumeAuBoost)}
              description={<>Pro Taker + 0.5 * Pro Maker (Previous UTC Day). {tradeMetricsScopeMessage}</>}
              icon={Zap}
              isLoading={showCardShimmer}
            />
            <MetricCard
              title="Au Trader Boost Factor"
              value={accountData?.auTraderBoost || "1x (Base)"}
              description={<>Additional multiplier based on Previous Day's Volume. '1x (Base)' = no additional boost. {tradeMetricsScopeMessage}</>}
              icon={ArrowUpRightSquare}
              isLoading={showCardShimmer}
            />
            <MetricCard
              title="Rh Points (Base)"
              value={formatNumber(accountData?.rhPointsTotal)}
              description={<>Base Rh from fetched & cached trades. Excludes team/referral/other boosts. {tradeMetricsScopeMessage}</>}
              icon={Trophy}
              isLoading={showCardShimmer}
            />
          </div>
        </>
      )}

      {ENABLE_INVITE_CODE_FEATURE && (
        <Card className="mt-8 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-primary" />
              Referral Information
            </CardTitle>
            <CardDescription>
              Use the code below or click the button to visit the AsterDex referral page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-3 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-sm text-muted-foreground">Your Invite Code:</p>
              <p className="text-2xl font-bold tracking-wider text-primary">{INVITE_CODE}</p>
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={INVITE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                <ArrowUpRightSquare size={18} />
                Use Referral Code
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8 bg-muted/30 dark:bg-muted/20 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info size={18} className="text-primary" /> Points Program & Data Info
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p><strong className="text-foreground">Data Caching:</strong> Core account summary, {INCOME_HISTORY_DAYS_LOOKBACK}-day income history, and recent trades (up to {INITIAL_TRADE_FETCH_LIMIT} per symbol initially) are cached in your browser. Data is refreshed from APIs on load or when you use the 'Refresh' button.</p>
          <p><strong className="text-foreground">Realized PNL, Commissions, Funding Fees:</strong> Calculated from Income History API for the last {INCOME_HISTORY_DAYS_LOOKBACK} days (up to {INCOME_FETCH_LIMIT} records).</p>
          <p><strong className="text-foreground">Trade-Based Metrics:</strong> {tradeMetricsScopeMessage}</p>
          <p><strong className="text-foreground">Points Program:</strong> Au Trader Boost Factor is based on Previous Day's Volume (UTC). Rh Points are base values. Both exclude external boosts/referrals not derivable from trade/income data.</p>
          <p><strong className="text-foreground">Real-time Updates:</strong> Balances/positions & Unrealized PNL update via WebSocket if connected. Other metrics update on page load/refresh or when a new trade is detected via WebSocket (triggering a REST refresh of trade-dependent data).</p>
          <p><strong className="text-foreground">API Limits:</strong> Note: AsterDex API has a general limit of 2400 requests/minute. This component fetches key data on load and uses WebSockets for live balance/position updates to minimize REST calls. For comprehensive historical analytics, a backend data aggregation solution is recommended.</p>
        </CardContent>
      </Card>
    </div>
  );
}
