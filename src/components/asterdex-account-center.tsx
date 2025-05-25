
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
  DollarSign, TrendingDown, TrendingUp, ListChecks, BarChart3, Landmark, Percent, Zap, ArrowUpRightSquare, Trophy, Info, Settings, AlertTriangle, WifiOff, Wifi, ReceiptText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, fromUnixTime, getUnixTime, getYear, getMonth, getDate, startOfTomorrow, subDays, startOfToday, addDays } from 'date-fns';


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

const ACCOUNT_SUMMARY_LS_KEY = 'asterAccountSummaryData_v10';
const TRADES_LS_KEY_PREFIX = 'asterUserTrades_v7_';
const INCOME_HISTORY_LS_KEY_PREFIX = 'asterIncomeHistory_v1_';
const DATA_STALE_MS = 5 * 60 * 1000; // 5 minutes for summary
const DEFAULT_COMMISSION_SYMBOL = 'BTCUSDT';
const INITIAL_TRADE_FETCH_LIMIT = 1000; // Max trades per symbol initially
const UPDATE_TRADE_FETCH_LIMIT = 1000; // Max trades for updates
const INCOME_FETCH_LIMIT = 1000; // Max income records to fetch
const INCOME_HISTORY_DAYS_LOOKBACK = 7; // Fetch income history for the last 7 days
const API_CALL_DELAY_MS = 350; // Delay between API calls

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

  const resetAccountDataToDefaults = (status: AsterAccountSummaryData['webSocketStatus'] = 'Disconnected') => {
    setAccountData({
      portfolioValue: null, totalUnrealizedPNL: null,
      totalRealizedPNL: 0, totalTrades: 0, longTrades: 0, shortTrades: 0,
      totalVolume: 0, longVolume: 0, shortVolume: 0,
      totalFeesPaid: 0, latestFee: null,
      totalCommissions: 0, totalFundingFees: 0,
      commissionRateMaker: null, commissionRateTaker: null, commissionSymbol: null,
      previousDayVolumeAuBoost: 0, auTraderBoost: "1x (Base)",
      rhPointsTotal: 0,
      todayTotalVolume: 0,
      balances: [], accountInfo: undefined, positions: [], incomeHistory: [],
      webSocketStatus: status,
      lastUpdated: 0,
    });
  };

  // --- localStorage Helper Functions ---
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


  const saveAccountSummaryToLocalStorage = (data: AsterAccountSummaryData | null) => {
    if (typeof window === 'undefined') return;
    if (!data) { localStorage.removeItem(ACCOUNT_SUMMARY_LS_KEY); return; }
    try {
      const { userTrades, incomeHistory, ...summaryToStore } = data; // Exclude full lists
      localStorage.setItem(ACCOUNT_SUMMARY_LS_KEY, JSON.stringify(summaryToStore));
    } catch (e) { console.error("Error saving account summary to localStorage:", e); }
  };

  const loadAccountSummaryFromLocalStorage = (): AsterAccountSummaryData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const storedData = localStorage.getItem(ACCOUNT_SUMMARY_LS_KEY);
      if (!storedData) return null;
      const parsedData = JSON.parse(storedData) as AsterAccountSummaryData;
      return {
        ...parsedData,
        totalRealizedPNL: parsedData.totalRealizedPNL ?? 0,
        totalTrades: parsedData.totalTrades ?? 0, longTrades: parsedData.longTrades ?? 0, shortTrades: parsedData.shortTrades ?? 0,
        totalVolume: parsedData.totalVolume ?? 0, longVolume: parsedData.longVolume ?? 0, shortVolume: parsedData.shortVolume ?? 0,
        totalFeesPaid: parsedData.totalFeesPaid ?? 0, latestFee: parsedData.latestFee === undefined ? null : parsedData.latestFee,
        totalCommissions: parsedData.totalCommissions ?? 0, totalFundingFees: parsedData.totalFundingFees ?? 0,
        previousDayVolumeAuBoost: parsedData.previousDayVolumeAuBoost ?? 0,
        rhPointsTotal: parsedData.rhPointsTotal ?? 0,
        todayTotalVolume: parsedData.todayTotalVolume ?? 0,
        auTraderBoost: parsedData.auTraderBoost ?? "1x (Base)",
      };
    } catch (e) { console.warn("Error loading account summary from localStorage:", e); return null; }
  };
  // --- End localStorage Helpers ---

  const calculateTradeMetrics = (trades: AsterUserTrade[] | undefined, incomeHistory: AsterIncomeHistoryItem[] | undefined) => {
    let totalRealizedPNLFromIncome = 0;
    let totalCommissionsFromIncome = 0;
    let totalFundingFeesFromIncome = 0;

    if (incomeHistory) {
        incomeHistory.forEach(item => {
            const incomeVal = parseFloatSafe(item.income) ?? 0;
            if (item.incomeType === "REALIZED_PNL") {
                totalRealizedPNLFromIncome += incomeVal;
            } else if (item.incomeType === "COMMISSION") {
                totalCommissionsFromIncome += Math.abs(incomeVal); // Commissions are costs
            } else if (item.incomeType === "FUNDING_FEE") {
                totalFundingFeesFromIncome += incomeVal; // Can be positive or negative
            }
        });
    }


    if (!trades || trades.length === 0) {
      return {
        totalRealizedPNL: totalRealizedPNLFromIncome,
        totalCommissions: totalCommissionsFromIncome,
        totalFundingFees: totalFundingFeesFromIncome,
        totalTrades: 0, longTrades: 0, shortTrades: 0,
        totalVolume: 0, longVolume: 0, shortVolume: 0,
        totalFeesPaid: totalCommissionsFromIncome, // Use commission from income as total fees
        latestFee: null,
        previousDayVolumeAuBoost: 0, auTraderBoost: "1x (Base)",
        rhPointsTotal: 0,
        todayTotalVolume: 0,
      };
    }

    let totalVolume = 0; let longTrades = 0; let shortTrades = 0;
    let longVolume = 0; let shortVolume = 0;
    let prevDayTakerVolume = 0; let prevDayMakerVolume = 0;
    let allTradesTakerVolume = 0; let allTradesMakerVolume = 0;
    let currentDayTotalVolume = 0;

    const now = new Date();
    const currentDayStartUTCTimestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
    const nextDayUTCTimestampStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
    
    const yesterday = subDays(now, 1);
    const previousDayStartUTCTimestamp = Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 0, 0, 0, 0);
    
    let latestFeeValue: number | null = null;
    const sortedTradesForLatestFee = [...trades].sort((a, b) => b.time - a.time);
    if (sortedTradesForLatestFee.length > 0) {
      const latestTradeCommission = parseFloatSafe(sortedTradesForLatestFee[0].commission);
      if (latestTradeCommission !== null) latestFeeValue = Math.abs(latestTradeCommission);
    }

    trades.forEach(trade => {
      const quoteQty = parseFloatSafe(trade.quoteQty) ?? 0;
      const tradeTime = trade.time;

      totalVolume += quoteQty;
      if (trade.side === 'BUY') { longTrades++; longVolume += quoteQty; }
      else if (trade.side === 'SELL') { shortTrades++; shortVolume += quoteQty; }

      if (tradeTime >= previousDayStartUTCTimestamp && tradeTime < currentDayStartUTCTimestamp) {
        if (trade.maker === false) prevDayTakerVolume += quoteQty;
        else prevDayMakerVolume += quoteQty;
      }
      if (tradeTime >= currentDayStartUTCTimestamp && tradeTime < nextDayUTCTimestampStart) {
        currentDayTotalVolume += quoteQty;
      }
      if (trade.maker === false) allTradesTakerVolume += quoteQty;
      else allTradesMakerVolume += quoteQty;
    });

    const previousDayVolumeAuBoostCalc = prevDayTakerVolume + (prevDayMakerVolume * 0.5);
    
    let auTraderBoostFactor = "+0x"; // Additional boost
    if (previousDayVolumeAuBoostCalc >= 500000) auTraderBoostFactor = "+3x";
    else if (previousDayVolumeAuBoostCalc >= 200000) auTraderBoostFactor = "+2.5x";
    else if (previousDayVolumeAuBoostCalc >= 50000) auTraderBoostFactor = "+2x";
    else if (previousDayVolumeAuBoostCalc >= 10000) auTraderBoostFactor = "+1x";
    const displayAuBoost = auTraderBoostFactor === "+0x" ? "1x (Base)" : auTraderBoostFactor;


    const rhPointsTotalCalc = allTradesTakerVolume + (allTradesMakerVolume * 0.5);

    return {
      totalRealizedPNL: totalRealizedPNLFromIncome,
      totalCommissions: totalCommissionsFromIncome,
      totalFundingFees: totalFundingFeesFromIncome,
      totalTrades: trades.length, longTrades, shortTrades,
      totalVolume, longVolume, shortVolume, 
      totalFeesPaid: totalCommissionsFromIncome, // Use commission from income
      latestFee: latestFeeValue,
      previousDayVolumeAuBoost: previousDayVolumeAuBoostCalc, auTraderBoost: displayAuBoost,
      rhPointsTotal: rhPointsTotalCalc,
      todayTotalVolume: currentDayTotalVolume,
    };
  };

  const fetchAndCacheTradesForSymbol = async (
    currentApiKey: string, currentSecretKey: string, symbol: string,
    cachedSymbolData: CachedSymbolTrades | undefined
  ): Promise<CachedSymbolTrades> => {
    let allTradesForSymbol = cachedSymbolData?.trades || [];
    const newestCachedTradeId = cachedSymbolData?.newestTradeId || null;
    let newTradesFetchedThisRun: AsterUserTrade[] = [];
    
    let tradesToFetchLimit = newestCachedTradeId ? UPDATE_TRADE_FETCH_LIMIT : INITIAL_TRADE_FETCH_LIMIT;
    let fetchFromId: number | undefined = newestCachedTradeId ? newestCachedTradeId + 1 : undefined;

    try {
      const fetchedTrades = await fetchAsterUserTrades(
        currentApiKey, currentSecretKey, symbol, tradesToFetchLimit, fetchFromId
      );
      newTradesFetchedThisRun = fetchedTrades;

      if (newTradesFetchedThisRun.length > 0) {
        let combinedTrades = [...allTradesForSymbol, ...newTradesFetchedThisRun].sort((a, b) => a.id - b.id);
        const uniqueTradesMap = new Map<number, AsterUserTrade>();
        combinedTrades.forEach(trade => uniqueTradesMap.set(trade.id, trade));
        allTradesForSymbol = Array.from(uniqueTradesMap.values()).sort((a, b) => a.id - b.id);
      }
    } catch (e) { console.warn(`Failed to fetch trades for ${symbol}:`, e); 
                  return cachedSymbolData || { trades: [], newestTradeId: null, oldestTradeIdKnown: null, allHistoryFetched: false };
    }

    const newestTrade = allTradesForSymbol.length > 0 ? allTradesForSymbol[allTradesForSymbol.length - 1] : null;
    const oldestTrade = allTradesForSymbol.length > 0 ? allTradesForSymbol[0] : null;

    return {
      trades: allTradesForSymbol,
      newestTradeId: newestTrade ? newestTrade.id : cachedSymbolData?.newestTradeId || null,
      oldestTradeIdKnown: oldestTrade ? oldestTrade.id : cachedSymbolData?.oldestTradeIdKnown || null,
      allHistoryFetched: cachedSymbolData?.allHistoryFetched || (newTradesFetchedThisRun.length < tradesToFetchLimit && allTradesForSymbol.length > 0 && !newestCachedTradeId),
    };
  };


  const loadAccountData = useCallback(async (forceRefresh = false) => {
    if (!apiKey || !secretKey) {
      setError("API Key and Secret Key are required.");
      resetAccountDataToDefaults(webSocketStatus);
      saveAccountSummaryToLocalStorage(null);
      saveTradesToLocalStorage(null);
      saveIncomeHistoryToLocalStorage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    let initialSummaryDataForDisplay: AsterAccountSummaryData | null = null;

    if (!forceRefresh) {
      initialSummaryDataForDisplay = loadAccountSummaryFromLocalStorage();
      if (initialSummaryDataForDisplay && (Date.now() - (initialSummaryDataForDisplay.lastUpdated || 0) < DATA_STALE_MS)) {
        setAccountData(current => ({
          ...(current || resetAccountDataToDefaults(webSocketStatus)),
          ...initialSummaryDataForDisplay,
          webSocketStatus: webSocketStatus, 
        }));
      } else {
        setAccountData(prev => prev ? { ...prev, portfolioValue: null, totalUnrealizedPNL: null } : resetAccountDataToDefaults(webSocketStatus));
      }
    } else {
      setAccountData(prev => prev ? { ...prev, portfolioValue: null, totalUnrealizedPNL: null } : resetAccountDataToDefaults(webSocketStatus));
    }

    try {
      const [balances, accInfo, commissionInfoResp] = await Promise.all([
        fetchAsterAccountBalances(apiKey, secretKey),
        fetchAsterAccountInfo(apiKey, secretKey),
        fetchAsterCommissionRate(apiKey, secretKey, DEFAULT_COMMISSION_SYMBOL),
      ]);
      await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));

      let currentTradesBySymbolCache = loadTradesFromLocalStorage() || {};
      const symbolsFromPositions = (accInfo?.positions || []).map(p => p.symbol);
      const symbolsFromCache = Object.keys(currentTradesBySymbolCache);
      const symbolsToUpdateTrades = Array.from(new Set([...symbolsFromPositions, ...symbolsFromCache]));

      for (const symbol of symbolsToUpdateTrades) {
        if (!symbol) continue; 
        currentTradesBySymbolCache[symbol] = await fetchAndCacheTradesForSymbol(
          apiKey, secretKey, symbol, currentTradesBySymbolCache[symbol]
        );
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));
      }
      saveTradesToLocalStorage(currentTradesBySymbolCache);
      const allUserTradesArray = Object.values(currentTradesBySymbolCache).flatMap(cts => cts.trades || []);
      
      // Fetch Income History
      const incomeHistoryLookbackStart = subDays(new Date(), INCOME_HISTORY_DAYS_LOOKBACK).getTime();
      const fetchedIncomeHistory = await fetchAsterIncomeHistory(apiKey, secretKey, undefined, undefined, incomeHistoryLookbackStart, undefined, INCOME_FETCH_LIMIT);
      saveIncomeHistoryToLocalStorage(fetchedIncomeHistory);
      await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));


      const tradeMetrics = calculateTradeMetrics(allUserTradesArray, fetchedIncomeHistory);

      const portfolioValue = parseFloatSafe(accInfo.totalMarginBalance);
      const totalUnrealizedPNL = parseFloatSafe(accInfo.totalUnrealizedProfit);

      const newAccountData: AsterAccountSummaryData = {
        portfolioValue, totalUnrealizedPNL,
        ...tradeMetrics,
        commissionRateMaker: commissionInfoResp?.makerCommissionRate ?? null,
        commissionRateTaker: commissionInfoResp?.takerCommissionRate ?? null,
        commissionSymbol: commissionInfoResp?.symbol ?? DEFAULT_COMMISSION_SYMBOL,
        balances: balances || [],
        accountInfo: accInfo,
        positions: accInfo.positions || [],
        incomeHistory: fetchedIncomeHistory || [],
        webSocketStatus: webSocketStatus,
        lastUpdated: Date.now(),
      };
      setAccountData(newAccountData);
      saveAccountSummaryToLocalStorage(newAccountData); // Save summary without full trade/income lists

    } catch (err: any) {
      console.error("Error fetching account data via REST:", err);
      setError(err.message || "An unknown error occurred while fetching account data via REST.");
      if (!initialSummaryDataForDisplay && !accountData) { 
        resetAccountDataToDefaults(webSocketStatus === 'Connecting' ? 'Connecting' : 'Error');
        saveAccountSummaryToLocalStorage(null); saveTradesToLocalStorage(null); saveIncomeHistoryToLocalStorage(null);
      } else if (accountData) { 
         setAccountData(prev => prev ? { ...prev, webSocketStatus: (prev.webSocketStatus === 'Connecting' ? 'Connecting' : 'Error') } : resetAccountDataToDefaults((webSocketStatus === 'Connecting' ? 'Connecting' : 'Error')));
      } else { 
         resetAccountDataToDefaults((webSocketStatus === 'Connecting' ? 'Connecting' : 'Error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, secretKey, webSocketStatus, loadTradesFromLocalStorage, saveTradesToLocalStorage, loadIncomeHistoryFromLocalStorage, saveIncomeHistoryToLocalStorage, isApiKeysSet]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedApiKey = localStorage.getItem('asterApiKey');
    const storedSecretKey = localStorage.getItem('asterSecretKey');
    if (storedApiKey && storedSecretKey) {
      setApiKey(storedApiKey); setSecretKey(storedSecretKey);
      setTempApiKey(storedApiKey); setTempSecretKey(storedSecretKey);
      setIsApiKeysSet(true);
    } else { resetAccountDataToDefaults(); }
  }, []); 

  useEffect(() => {
    if (isApiKeysSet) { loadAccountData(); }
  }, [isApiKeysSet, loadAccountData]); 


  useEffect(() => {
    if (!isApiKeysSet || !apiKey || !secretKey || typeof window === 'undefined') {
      if (wsRef.current) { wsRef.current.close(1000, "API keys not set or component unmounting"); wsRef.current = null; }
      setWebSocketStatus('Disconnected');
      if (listenKey && apiKey) { 
        deleteAsterListenKey(apiKey, listenKey).catch(e => console.warn("Could not delete old listen key:", e));
        setListenKey(null);
      }
      if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
      return;
    }

    let currentWs: WebSocket | null = null;
    let localListenKeyAttempt = listenKey; 

    const connectWebSocket = async () => {
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
          if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = setInterval(async () => {
            if (localListenKeyAttempt && apiKey) { 
              try { await keepAliveAsterListenKey(apiKey, localListenKeyAttempt); }
              catch (e) {
                console.error("Failed to keep alive listenKey:", e);
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

                let newBalances = prevData.balances ? prevData.balances.map(b => ({ ...b })) : [];
                let newPositions = prevData.positions ? prevData.positions.map(p => ({ ...p })) : [];
                let newAccountInfo = prevData.accountInfo ?
                  {
                    ...prevData.accountInfo,
                    assets: prevData.accountInfo.assets.map(a => ({ ...a })),
                    positions: prevData.accountInfo.positions.map(p => ({ ...p }))
                  } : undefined;

                update.a.B.forEach(bUpdate => {
                  const assetIdentifier = bUpdate.a; 
                  const balIndex = newBalances.findIndex(b => b.asset === assetIdentifier);
                  const existingBalance = newBalances.find(b => b.asset === assetIdentifier);
                  
                  const updatedBalanceData: AsterAccountBalanceV2 = {
                    ...(existingBalance || { accountAlias: '', asset: assetIdentifier, maxWithdrawAmount: bUpdate.wb, marginAvailable: false, crossUnPnl: "0", balance: "0", crossWalletBalance: "0", availableBalance: "0" }), 
                    balance: bUpdate.wb,
                    crossWalletBalance: bUpdate.cw,
                    availableBalance: bUpdate.wb, 
                    updateTime: typedMessage.E,
                    bc: bUpdate.bc,
                  };


                  if (balIndex !== -1) newBalances[balIndex] = updatedBalanceData;
                  else newBalances.push(updatedBalanceData);

                  if (newAccountInfo) {
                    const accAssetIndex = newAccountInfo.assets.findIndex(a => a.asset === assetIdentifier);
                    const existingAccAsset = newAccountInfo.assets.find(a => a.asset === assetIdentifier);
                    const updatedAccAssetData: AsterAccountInfoV2Asset = {
                        ...(existingAccAsset || { asset: assetIdentifier, unrealizedProfit: "0", marginBalance: bUpdate.wb, maintMargin: "0", initialMargin: "0", positionInitialMargin: "0", openOrderInitialMargin: "0", crossUnPnl: "0", availableBalance: bUpdate.wb, maxWithdrawAmount: bUpdate.wb, marginAvailable: false, walletBalance: "0" }), 
                        walletBalance: bUpdate.wb,
                        crossWalletBalance: bUpdate.cw,
                        updateTime: typedMessage.E,
                    };
                    if (accAssetIndex !== -1) newAccountInfo.assets[accAssetIndex] = updatedAccAssetData;
                    else newAccountInfo.assets.push(updatedAccAssetData);
                  }
                });

                update.a.P.forEach(pUpdate => {
                  const symbolIdentifier = pUpdate.s;
                  const positionSideIdentifier = pUpdate.ps;
                  
                  let posIndex = newPositions.findIndex(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                  const existingPosition = posIndex !== -1 ? newPositions[posIndex] : null;

                  const updatedPositionData: AsterPositionV2 = {
                    symbol: symbolIdentifier, positionSide: positionSideIdentifier,
                    positionAmt: pUpdate.pa, entryPrice: pUpdate.ep, unrealizedProfit: pUpdate.up,
                    isolated: pUpdate.mt === 'isolated',
                    isolatedMargin: pUpdate.iw || existingPosition?.isolatedMargin || "0",
                    marginType: pUpdate.mt || existingPosition?.marginType,
                    updateTime: typedMessage.E,
                    initialMargin: existingPosition?.initialMargin || "0", maintMargin: existingPosition?.maintMargin || "0",
                    positionInitialMargin: existingPosition?.positionInitialMargin || "0", openOrderInitialMargin: existingPosition?.openOrderInitialMargin || "0",
                    leverage: existingPosition?.leverage || "0", maxNotional: existingPosition?.maxNotional || "0",
                    isAutoAddMargin: existingPosition?.isAutoAddMargin || "false",
                    liquidationPrice: existingPosition?.liquidationPrice || "0", markPrice: existingPosition?.markPrice || "0",
                    maxNotionalValue: existingPosition?.maxNotionalValue || "0",
                  };

                  if (posIndex !== -1) newPositions[posIndex] = updatedPositionData;
                  else newPositions.push(updatedPositionData);

                  if (newAccountInfo) {
                    let accPosIndex = newAccountInfo.positions.findIndex(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                    // const existingAccPosition = accPosIndex !== -1 ? newAccountInfo.positions[accPosIndex] : null;
                    const updatedAccPositionData: AsterPositionV2 = {
                        ...updatedPositionData, 
                    };
                    if (accPosIndex !== -1) newAccountInfo.positions[accPosIndex] = updatedAccPositionData;
                    else newAccountInfo.positions.push(updatedAccPositionData);
                  }
                });

                let newPortfolioValue = prevData.portfolioValue;
                let newTotalUnrealizedPNL = prevData.totalUnrealizedPNL;

                if (newAccountInfo) {
                  newAccountInfo.totalMarginBalance = newAccountInfo.assets.reduce((sum, asset) => sum + (parseFloatSafe(asset.walletBalance) || 0), 0).toString();
                  newAccountInfo.totalUnrealizedProfit = newAccountInfo.positions.reduce((sum, pos) => sum + (parseFloatSafe(pos.unrealizedProfit) || 0), 0).toString();
                  newPortfolioValue = parseFloatSafe(newAccountInfo.totalMarginBalance);
                  newTotalUnrealizedPNL = parseFloatSafe(newAccountInfo.totalUnrealizedProfit);
                }

                const updatedData = {
                  ...prevData,
                  balances: newBalances, positions: newPositions, accountInfo: newAccountInfo,
                  portfolioValue: newPortfolioValue, totalUnrealizedPNL: newTotalUnrealizedPNL,
                  webSocketStatus: 'Connected' as AsterAccountSummaryData['webSocketStatus'],
                  lastUpdated: typedMessage.E
                };
                saveAccountSummaryToLocalStorage(updatedData); 
                return updatedData;
              });
            } else if (typedMessage.e === 'ORDER_TRADE_UPDATE') {
              // This triggers a full REST refresh for simplicity now.
              // A more optimized approach would be to fetch new trades/income and merge.
              console.log("ORDER_TRADE_UPDATE received, triggering full data refresh.");
              loadAccountData(true); 
            } else if (typedMessage.e === 'listenKeyExpired') {
              console.warn("ListenKey expired via WebSocket. Attempting to reconnect.");
              if (wsRef.current) wsRef.current.close(); 
            }
          } catch (e) { console.error("Error processing WebSocket message:", e); }
        };

        currentWs.onerror = (error) => {
          console.error("AsterDex WebSocket Error:", error);
          setWebSocketStatus('Error');
           if (isApiKeysSet && apiKey && secretKey) { 
             if (wsRef.current) wsRef.current.close(); 
             setTimeout(() => connectWebSocket(), 5000 + Math.random() * 5000);
           }
        };

        currentWs.onclose = (event) => {
          if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
          const wasManuallyClosed = event.code === 1000 && (event.reason === "Component unmounting or API keys changed" || event.reason === "User disconnected" || event.reason === "API Keys not set or component unmounting");
          if (!wasManuallyClosed && isApiKeysSet && apiKey && secretKey) {
            console.log("WebSocket closed unexpectedly, attempting to reconnect...");
            setListenKey(null); localListenKeyAttempt = null; 
            setWebSocketStatus('Connecting'); 
            setTimeout(() => connectWebSocket(), 5000 + Math.random() * 5000);
          } else {
            wsRef.current = null; 
            setWebSocketStatus('Disconnected');
            if (wasManuallyClosed) { setListenKey(null); localListenKeyAttempt = null; }
          }
        };

      } catch (e: any) {
        console.error("Failed to connect WebSocket:", e.message);
        setError(e.message || "Failed to establish WebSocket connection.");
        setWebSocketStatus('Error'); setListenKey(null); localListenKeyAttempt = null;
        if (isApiKeysSet && apiKey && secretKey) { 
            console.log("WebSocket connection failed, attempting to reconnect...");
            setTimeout(() => connectWebSocket(), 5000 + Math.random() * 5000); 
        }
      }
    };

    connectWebSocket();

    return () => {
      const keyToDeleteOnUnmount = localListenKeyAttempt || listenKey; 
      if (wsRef.current) {
        wsRef.current.onclose = null; 
        wsRef.current.close(1000, "Component unmounting or API keys changed");
      }
      wsRef.current = null;
      if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
      if (apiKey && keyToDeleteOnUnmount) { 
        deleteAsterListenKey(apiKey, keyToDeleteOnUnmount).catch(e => console.warn("Could not delete listen key on unmount/cleanup:", e));
      }
    };
  }, [isApiKeysSet, apiKey, secretKey, loadAccountData]); 

  const handleSaveApiKeys = () => {
    if (!tempApiKey.trim() || !tempSecretKey.trim()) {
      toast({ title: "Error", description: "API Key and Secret Key cannot be empty.", variant: "destructive" });
      return;
    }
    const oldApiKey = apiKey; const oldListenKey = listenKey;

    if (wsRef.current) {
      wsRef.current.onclose = null; 
      wsRef.current.close(1000, "API Keys changed"); wsRef.current = null;
    }
    if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
    
    if (oldApiKey && oldListenKey) {
      deleteAsterListenKey(oldApiKey, oldListenKey).catch(e => console.warn("Could not delete old listen key on API key change:", e));
    }
    setListenKey(null); 

    setApiKey(tempApiKey); setSecretKey(tempSecretKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('asterApiKey', tempApiKey);
      localStorage.setItem('asterSecretKey', tempSecretKey);
    }
    setIsApiKeysSet(true); 
    setIsSettingsDialogOpen(false);
    toast({ title: "Success", description: "API Keys saved. Fetching data..." });
  };

  const handleDisconnect = () => {
    const currentListenKey = listenKey; const currentApiKeyForDisconnect = apiKey; 

    if (wsRef.current) {
      wsRef.current.onclose = null; 
      wsRef.current.close(1000, "User disconnected"); wsRef.current = null;
    }
    if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }

    if (currentApiKeyForDisconnect && currentListenKey) {
      deleteAsterListenKey(currentApiKeyForDisconnect, currentListenKey).catch(e => console.error("Error deleting listen key on disconnect:", e));
    }
    
    setApiKey(''); setSecretKey(''); setTempApiKey(''); setTempSecretKey('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('asterApiKey'); localStorage.removeItem('asterSecretKey');
      const tradesKey = getTradesLocalStorageKey(); 
      if (tradesKey) localStorage.removeItem(tradesKey);
      const incomeKey = getIncomeHistoryLocalStorageKey();
      if (incomeKey) localStorage.removeItem(incomeKey);
      localStorage.removeItem(ACCOUNT_SUMMARY_LS_KEY);
      if (currentApiKeyForDisconnect) { 
          const oldTradesKey = `${TRADES_LS_KEY_PREFIX}${currentApiKeyForDisconnect}`;
          localStorage.removeItem(oldTradesKey);
          const oldIncomeKey = `${INCOME_HISTORY_LS_KEY_PREFIX}${currentApiKeyForDisconnect}`;
          localStorage.removeItem(oldIncomeKey);
      }
    }
    setIsApiKeysSet(false); setError(null); setListenKey(null);
    setWebSocketStatus('Disconnected'); resetAccountDataToDefaults(); 
    toast({ title: "Disconnected", description: "API Keys and cached data have been cleared." });
  };

  const getPnlVariant = (pnl: number | null): MetricCardProps['variant'] => {
    if (pnl === null || pnl === 0) return 'default';
    return pnl > 0 ? 'positive' : 'negative';
  };

  const tradeMetricsScopeMessage = `Based on fetched & cached trades (up to ${INITIAL_TRADE_FETCH_LIMIT} recent per symbol initially, plus newer trades). May not reflect complete lifetime history for all symbols.`;
  const incomeHistoryScopeMessage = `Based on last ${INCOME_HISTORY_DAYS_LOOKBACK} days of income history (up to ${INCOME_FETCH_LIMIT} records).`;
  const latestFeeText = accountData?.latestFee !== null && accountData?.latestFee !== undefined ? `Latest trade fee: ${formatUsd(accountData.latestFee, 6)}` : 'No recent trades for fee info.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-1">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Center</h1>
          <p className="text-sm text-muted-foreground">Live overview of your AsterDEX account activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-2 py-1 rounded-full flex items-center gap-1",
            webSocketStatus === 'Connected' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
              webSocketStatus === 'Connecting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          )}>
            {webSocketStatus === 'Connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
            WSS {webSocketStatus}
          </span>
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings size={16} /> API Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>AsterDex API Configuration</DialogTitle>
                <CardDescription>Enter your API Key and Secret Key to fetch account data. Keys are stored locally in your browser.</CardDescription>
              </DialogHeader>
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
              <DialogFooter className="sm:justify-between">
                <Button type="button" variant="destructive" onClick={handleDisconnect} disabled={!isApiKeysSet}>
                  Disconnect & Clear Keys
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveApiKeys}>Save & Connect</Button>
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
          <h2 className="text-xl font-semibold text-foreground mt-2 mb-0">Account Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Portfolio Value"
              value={formatUsd(accountData?.portfolioValue)}
              description="Total margin balance (live)"
              icon={DollarSign}
              isLoading={isLoading && accountData?.portfolioValue === null}
              className="lg:col-span-1"
            />
            <MetricCard
              title="Total Unrealized PNL"
              value={formatUsd(accountData?.totalUnrealizedPNL)}
              description="Live PNL on open positions"
              icon={TrendingDown}
              isLoading={isLoading && accountData?.totalUnrealizedPNL === null}
              variant={getPnlVariant(accountData?.totalUnrealizedPNL)}
            />
            <MetricCard
              title="Total Realized PNL"
              value={formatUsd(accountData?.totalRealizedPNL)}
              description={`From REALIZED_PNL income. ${incomeHistoryScopeMessage}`}
              icon={TrendingUp}
              isLoading={isLoading && accountData?.totalRealizedPNL === 0 && !accountData?.incomeHistory?.length}
              variant={getPnlVariant(accountData?.totalRealizedPNL)}
            />
             <MetricCard
              title="Total Commissions Paid"
              value={formatUsd(accountData?.totalCommissions, 4)}
              description={`From COMMISSION income. ${incomeHistoryScopeMessage}`}
              icon={ReceiptText}
              isLoading={isLoading && accountData?.totalCommissions === 0 && !accountData?.incomeHistory?.length}
            />
            <MetricCard
              title="Net Funding Fees"
              value={formatUsd(accountData?.totalFundingFees, 4)}
              description={`Paid/Received. From FUNDING_FEE income. ${incomeHistoryScopeMessage}`}
              icon={Landmark} // Using landmark, could be better
              isLoading={isLoading && accountData?.totalFundingFees === 0 && !accountData?.incomeHistory?.length}
              variant={getPnlVariant(accountData?.totalFundingFees !== null ? -accountData.totalFundingFees : null)} // Negative funding fee is a cost
            />
            <MetricCard
              title="Commission Rates"
              value={
                isLoading && !(accountData && accountData.commissionSymbol) ? "Loading..." :
                  (accountData && accountData.commissionRateTaker !== null && accountData.commissionRateMaker !== null) ?
                    (<>
                      <div>T: {formatCommissionRate(accountData.commissionRateTaker)}</div>
                      <div>M: {formatCommissionRate(accountData.commissionRateMaker)}</div>
                    </>) : "N/A"
              }
              description={`For ${accountData?.commissionSymbol || DEFAULT_COMMISSION_SYMBOL}`}
              icon={Percent}
              isLoading={isLoading && accountData?.commissionRateMaker === null && accountData?.commissionRateTaker === null}
            />
            <MetricCard
              title="Total Trades"
              value={formatNumber(accountData?.totalTrades)}
              description={<>
                Long: {formatNumber(accountData?.longTrades)} | Short: {formatNumber(accountData?.shortTrades)}
                <br />{tradeMetricsScopeMessage}
              </>}
              icon={ListChecks}
              isLoading={isLoading && accountData?.totalTrades === 0}
            />
            <MetricCard
              title="Total Volume Traded"
              value={formatUsd(accountData?.totalVolume)}
              description={<>
                Long: {formatUsd(accountData?.longVolume, 2)} | Short: {formatUsd(accountData?.shortVolume, 2)}
                <br />{tradeMetricsScopeMessage}
              </>}
              icon={BarChart3}
              isLoading={isLoading && accountData?.totalVolume === 0}
            />
             <MetricCard // New card for Today's Total Volume
              title="Today's Total Volume"
              value={formatUsd(accountData?.todayTotalVolume)}
              description={`Current UTC Day. ${tradeMetricsScopeMessage}`}
              icon={BarChart3}
              isLoading={isLoading && accountData?.todayTotalVolume === 0}
            />
            <MetricCard
              title="Previous Day's Volume (Au Boost)"
              value={formatUsd(accountData?.previousDayVolumeAuBoost)}
              description={`Pro Taker + 0.5 * Maker (Previous UTC Day). ${tradeMetricsScopeMessage}`}
              icon={Zap}
              isLoading={isLoading && accountData?.previousDayVolumeAuBoost === 0}
            />
            <MetricCard
              title="Au Trader Boost Factor"
              value={accountData?.auTraderBoost || (isLoading && accountData?.auTraderBoost === null ? "Loading..." : "1x (Base)")}
              description="Additional multiplier based on Previous Day's Volume. '1x (Base)' = no additional boost."
              icon={ArrowUpRightSquare}
              isLoading={isLoading && accountData?.auTraderBoost === "1x (Base)"}
            />
            <MetricCard
              title="Rh Points (Base)"
              value={formatNumber(accountData?.rhPointsTotal)}
              description={`Base Rh from fetched & cached trades. Excludes team/referral/other boosts. ${tradeMetricsScopeMessage}`}
              icon={Trophy}
              isLoading={isLoading && accountData?.rhPointsTotal === 0}
            />
          </div>
        </>
      )}

      <Card className="mt-6 bg-muted/30 dark:bg-muted/20 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info size={18} className="text-primary" /> Points Program & Data Info
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p><strong className="text-foreground">Data Caching:</strong> Account summary (balances, positions) is cached (5 min freshness). Trade & Income history is cached by API key & incrementally updated on load.</p>
          <p><strong className="text-foreground">Realized PNL & Fees:</strong> Calculated from Income History API (REALIZED_PNL, COMMISSION, FUNDING_FEE types) for the last {INCOME_HISTORY_DAYS_LOOKBACK} days (up to {INCOME_FETCH_LIMIT} records).</p>
          <p><strong className="text-foreground">Trade-Based Metrics:</strong> Volume, Trades count, Rh Points are from fetched & cached trades (up to {INITIAL_TRADE_FETCH_LIMIT} recent per symbol initially, plus newer trades). May not reflect complete lifetime history for all symbols.</p>
          <p><strong className="text-foreground">Points Program:</strong> Au Trader Boost is based on Previous Day's Volume (UTC). Rh Points are base values. Both exclude external boosts/referrals not derivable from trade/income data.</p>
          <p><strong className="text-foreground">Real-time Updates:</strong> Balances/positions & Unrealized PNL update via WebSocket. Other metrics update on page load/refresh or when a new trade is detected via WebSocket (triggering a REST refresh).</p>
          <p><strong className="text-foreground">API Limits:</strong> Note: AsterDex API has a general limit of 2400 requests/minute. This component fetches key data on load and uses WebSockets for live balance/position updates to minimize REST calls. For comprehensive historical analytics, a backend data aggregation solution is recommended.</p>
        </CardContent>
      </Card>
    </div>
  );
}
