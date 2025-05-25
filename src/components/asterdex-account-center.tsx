
// src/components/asterdex-account-center.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  createAsterListenKey,
  keepAliveAsterListenKey,
  deleteAsterListenKey,
} from '@/lib/aster-user-api';
import {
  DollarSign, TrendingDown, TrendingUp, ListChecks, BarChart3, Landmark, Percent, Zap, ArrowUpRightSquare, Trophy, Info, Settings, AlertTriangle, WifiOff, Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, fromUnixTime, getUnixTime, getYear, getMonth, getDate, startOfTomorrow, subDays } from 'date-fns';

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

const ACCOUNT_SUMMARY_LS_KEY = 'asterAccountSummaryData_v6';
const TRADES_LS_KEY_PREFIX = 'asterUserTrades_v3_'; 
const DATA_STALE_MS = 5 * 60 * 1000; 
const DEFAULT_COMMISSION_SYMBOL = 'BTCUSDT';
const INITIAL_TRADE_FETCH_LIMIT = 1000; // Fetch up to 1000 for initial load
const UPDATE_TRADE_FETCH_LIMIT = 1000; // Fetch up to 1000 for updates
const API_CALL_DELAY_MS = 300; // Increased delay for more safety

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
      commissionRateMaker: null, commissionRateTaker: null, commissionSymbol: null,
      previousDayVolumeAuBoost: 0, auTraderBoost: "1x (Base)", 
      rhPointsTotal: 0,
      todayTotalVolume: 0,
      balances: [], accountInfo: undefined, positions: [],
      webSocketStatus: status,
      lastUpdated: 0,
    });
  };

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
    } catch (e) {
      console.warn("Error loading trades from localStorage:", e);
      return null;
    }
  }, [getTradesLocalStorageKey]);

  const saveTradesToLocalStorage = useCallback((tradesBySymbol: AllCachedTrades | null) => {
    if (typeof window === 'undefined') return;
    const key = getTradesLocalStorageKey();
    if (!key) return;
    if (!tradesBySymbol) {
      localStorage.removeItem(key);
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(tradesBySymbol));
    } catch (e) {
      console.error("Error saving trades to localStorage:", e);
    }
  }, [getTradesLocalStorageKey]);

  const saveAccountSummaryToLocalStorage = (data: AsterAccountSummaryData | null) => {
    if (typeof window === 'undefined') return;
    if (!data) {
      localStorage.removeItem(ACCOUNT_SUMMARY_LS_KEY);
      return;
    }
    try {
      localStorage.setItem(ACCOUNT_SUMMARY_LS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving account summary to localStorage:", e);
    }
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
        totalTrades: parsedData.totalTrades ?? 0,
        longTrades: parsedData.longTrades ?? 0,
        shortTrades: parsedData.shortTrades ?? 0,
        totalVolume: parsedData.totalVolume ?? 0,
        longVolume: parsedData.longVolume ?? 0,
        shortVolume: parsedData.shortVolume ?? 0,
        totalFeesPaid: parsedData.totalFeesPaid ?? 0,
        previousDayVolumeAuBoost: parsedData.previousDayVolumeAuBoost ?? 0,
        rhPointsTotal: parsedData.rhPointsTotal ?? 0,
        todayTotalVolume: parsedData.todayTotalVolume ?? 0,
        auTraderBoost: parsedData.auTraderBoost ?? "1x (Base)",
      };
    } catch (e) {
      console.warn("Error loading account summary from localStorage:", e);
      return null;
    }
  };

  const calculateTradeMetrics = (trades: AsterUserTrade[] | undefined) => {
    if (!trades || trades.length === 0) {
      return {
        totalRealizedPNL: 0, totalTrades: 0, longTrades: 0, shortTrades: 0,
        totalVolume: 0, longVolume: 0, shortVolume: 0,
        totalFeesPaid: 0, latestFee: null,
        previousDayVolumeAuBoost: 0, auTraderBoost: "1x (Base)", 
        rhPointsTotal: 0,
        todayTotalVolume: 0,
      };
    }

    let totalRealizedPNL = 0;
    let totalVolume = 0;
    let totalFeesPaid = 0;
    let longTrades = 0;
    let shortTrades = 0;
    let longVolume = 0;
    let shortVolume = 0;
    let prevDayTakerVolume = 0;
    let prevDayMakerVolume = 0;
    let allTradesTakerVolume = 0;
    let allTradesMakerVolume = 0;
    let todayTotalVolume = 0;

    const now = new Date();
    const currentDayStart = new Date(Date.UTC(getYear(now), getMonth(now), getDate(now), 0, 0, 0, 0));
    const currentDayUTCTimestampStart = getUnixTime(currentDayStart) * 1000;
    
    const previousDayStart = subDays(currentDayStart, 1);
    const previousDayStartUTCTimestamp = getUnixTime(previousDayStart) * 1000;
    
    const nextDayStart = startOfTomorrow();
    const nextDayUTCTimestampStart = getUnixTime(new Date(Date.UTC(getYear(nextDayStart), getMonth(nextDayStart), getDate(nextDayStart), 0, 0, 0, 0))) * 1000;


    let latestFeeValue: number | null = null;
    const sortedTradesForLatestFee = [...trades].sort((a, b) => b.time - a.time);
    if (sortedTradesForLatestFee.length > 0) {
      const latestTradeCommission = parseFloatSafe(sortedTradesForLatestFee[0].commission);
      if (latestTradeCommission !== null) {
        latestFeeValue = Math.abs(latestTradeCommission);
      }
    }

    trades.forEach(trade => {
      const pnl = parseFloatSafe(trade.realizedPnl);
      const quoteQty = parseFloatSafe(trade.quoteQty) ?? 0;
      const commission = parseFloatSafe(trade.commission);
      const tradeTime = trade.time;

      if (pnl !== null) totalRealizedPNL += pnl;
      totalVolume += quoteQty;
      if (commission !== null) totalFeesPaid += Math.abs(commission);

      if (trade.side === 'BUY') {
        longTrades++;
        longVolume += quoteQty;
      } else if (trade.side === 'SELL') {
        shortTrades++;
        shortVolume += quoteQty;
      }

      if (tradeTime >= previousDayStartUTCTimestamp && tradeTime < currentDayUTCTimestampStart) {
        if (trade.maker === false) prevDayTakerVolume += quoteQty;
        else prevDayMakerVolume += quoteQty;
      }
      
      if (tradeTime >= currentDayUTCTimestampStart && tradeTime < nextDayUTCTimestampStart) {
        todayTotalVolume += quoteQty;
      }

      if (trade.maker === false) allTradesTakerVolume += quoteQty;
      else allTradesMakerVolume += quoteQty;
    });

    const previousDayVolumeAuBoostCalc = prevDayTakerVolume + (prevDayMakerVolume * 0.5);
    let auTraderBoostFactor = "1x (Base)";
    if (previousDayVolumeAuBoostCalc >= 500000) auTraderBoostFactor = "3x";
    else if (previousDayVolumeAuBoostCalc >= 200000) auTraderBoostFactor = "2.6x";
    else if (previousDayVolumeAuBoostCalc >= 50000) auTraderBoostFactor = "2.4x";
    else if (previousDayVolumeAuBoostCalc >= 10000) auTraderBoostFactor = "2x";
    
    const rhPointsTotalCalc = allTradesTakerVolume + (allTradesMakerVolume * 0.5);

    return {
      totalRealizedPNL, totalTrades: trades.length, longTrades, shortTrades,
      totalVolume, longVolume, shortVolume, totalFeesPaid, latestFee: latestFeeValue,
      previousDayVolumeAuBoost: previousDayVolumeAuBoostCalc, auTraderBoost: auTraderBoostFactor,
      rhPointsTotal: rhPointsTotalCalc,
      todayTotalVolume,
    };
  };
  
  const fetchAndCacheTradesForSymbol = async (
    currentApiKey: string,
    currentSecretKey: string,
    symbol: string,
    cachedSymbolData: CachedSymbolTrades | undefined
  ): Promise<CachedSymbolTrades> => {
    let allTradesForSymbol = cachedSymbolData?.trades || [];
    const lastFetchedId = cachedSymbolData?.newestTradeId || undefined;
    let newTradesFetchedThisRun: AsterUserTrade[] = [];
    // Use UPDATE_TRADE_FETCH_LIMIT for incremental, INITIAL_TRADE_FETCH_LIMIT for initial
    const fetchLimit = lastFetchedId ? UPDATE_TRADE_FETCH_LIMIT : INITIAL_TRADE_FETCH_LIMIT;
  
    try {
      const fetchedTrades = await fetchAsterUserTrades(
        currentApiKey,
        currentSecretKey,
        symbol,
        fetchLimit,
        lastFetchedId ? lastFetchedId + 1 : undefined 
      );
      newTradesFetchedThisRun = fetchedTrades;
  
      if (newTradesFetchedThisRun.length > 0) {
        let combinedTrades = [...allTradesForSymbol, ...newTradesFetchedThisRun].sort((a, b) => a.id - b.id);
        const uniqueTradesMap = new Map<number, AsterUserTrade>();
        combinedTrades.forEach(trade => uniqueTradesMap.set(trade.id, trade));
        allTradesForSymbol = Array.from(uniqueTradesMap.values()).sort((a,b) => a.id - b.id);
      }
    } catch (e) {
        console.error(`Failed to fetch trades for ${symbol}:`, e);
        // Return existing cache on error to avoid losing data
        return cachedSymbolData || { trades: [], newestTradeId: null, oldestTradeIdKnown: null, allHistoryFetched: false };
    }
    
    const newestTrade = allTradesForSymbol.length > 0 ? allTradesForSymbol[allTradesForSymbol.length - 1] : null;
    const oldestTrade = allTradesForSymbol.length > 0 ? allTradesForSymbol[0] : null;
  
    return {
      trades: allTradesForSymbol,
      newestTradeId: newestTrade ? newestTrade.id : cachedSymbolData?.newestTradeId || null,
      oldestTradeIdKnown: oldestTrade ? oldestTrade.id : cachedSymbolData?.oldestTradeIdKnown || null,
      allHistoryFetched: cachedSymbolData?.allHistoryFetched || (newTradesFetchedThisRun.length < fetchLimit && allTradesForSymbol.length > 0 && !lastFetchedId),
    };
  };

  const loadAccountData = useCallback(async (forceRefresh = false) => {
    if (!apiKey || !secretKey) {
      setError("API Key and Secret Key are required.");
      resetAccountDataToDefaults(webSocketStatus);
      saveAccountSummaryToLocalStorage(null);
      saveTradesToLocalStorage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    let loadedSummaryFromCache = false;
    let initialSummaryDataForDisplay: AsterAccountSummaryData | null = null;

    if (!forceRefresh) {
      initialSummaryDataForDisplay = loadAccountSummaryFromLocalStorage();
      if (initialSummaryDataForDisplay && (Date.now() - (initialSummaryDataForDisplay.lastUpdated || 0) < DATA_STALE_MS)) {
        setAccountData(current => ({
          ...(current || resetAccountDataToDefaults(webSocketStatus)),
          ...initialSummaryDataForDisplay,
          webSocketStatus: webSocketStatus,
        }));
        loadedSummaryFromCache = true;
      } else {
        setAccountData(prev => prev ? {...prev, portfolioValue: null, totalUnrealizedPNL: null} : resetAccountDataToDefaults(webSocketStatus));
      }
    } else {
       setAccountData(prev => prev ? {...prev, portfolioValue: null, totalUnrealizedPNL: null} : resetAccountDataToDefaults(webSocketStatus));
    }

    try {
      const [balances, accInfo, commissionInfoResp] = await Promise.all([
        fetchAsterAccountBalances(apiKey, secretKey),
        fetchAsterAccountInfo(apiKey, secretKey),
        fetchAsterCommissionRate(apiKey, secretKey, DEFAULT_COMMISSION_SYMBOL),
      ]);
      await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));

      let currentTradesBySymbol = loadTradesFromLocalStorage() || {};
      const activeSymbols = accInfo.positions
        .filter(p => parseFloatSafe(p.positionAmt) !== 0)
        .map(p => p.symbol);
      
      const uniqueActiveSymbols = Array.from(new Set(activeSymbols));

      for (const symbol of uniqueActiveSymbols) {
        currentTradesBySymbol[symbol] = await fetchAndCacheTradesForSymbol(
          apiKey, secretKey, symbol, currentTradesBySymbol[symbol]
        );
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MS));
      }
      saveTradesToLocalStorage(currentTradesBySymbol);
      
      const allUserTradesArray = Object.values(currentTradesBySymbol).flatMap(cts => cts.trades || []);
      const tradeMetrics = calculateTradeMetrics(allUserTradesArray);

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
        webSocketStatus: webSocketStatus,
        lastUpdated: Date.now(),
      };
      setAccountData(newAccountData);
      saveAccountSummaryToLocalStorage(newAccountData);

    } catch (err: any) {
      console.error("Error fetching account data via REST:", err);
      setError(err.message || "An unknown error occurred while fetching account data via REST.");
      if (!loadedSummaryFromCache && !accountData) { 
        resetAccountDataToDefaults(webSocketStatus === 'Connecting' ? 'Connecting' : 'Error');
        saveAccountSummaryToLocalStorage(null);
        saveTradesToLocalStorage(null);
      } else if (accountData) { 
        setAccountData(prev => prev ? {...prev, webSocketStatus: (prev.webSocketStatus === 'Connecting' ? 'Connecting' : 'Error')} : resetAccountDataToDefaults((webSocketStatus === 'Connecting' ? 'Connecting' : 'Error')));
      } else {
         resetAccountDataToDefaults((webSocketStatus === 'Connecting' ? 'Connecting' : 'Error'));
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, secretKey, webSocketStatus]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedApiKey = localStorage.getItem('asterApiKey');
    const storedSecretKey = localStorage.getItem('asterSecretKey');
    if (storedApiKey && storedSecretKey) {
      setApiKey(storedApiKey);
      setSecretKey(storedSecretKey);
      setTempApiKey(storedApiKey);
      setTempSecretKey(storedSecretKey);
      setIsApiKeysSet(true);
    } else {
      resetAccountDataToDefaults('Disconnected');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if(isApiKeysSet){
        loadAccountData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiKeysSet]);


  useEffect(() => {
    if (!isApiKeysSet || !apiKey || !secretKey || typeof window === 'undefined') {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
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
                if (!prevData) return null; 
                
                let newBalances = prevData.balances ? prevData.balances.map(b => ({...b})) : [];
                let newPositions = prevData.positions ? prevData.positions.map(p => ({...p})) : [];
                let newAccountInfo = prevData.accountInfo ? 
                    {...prevData.accountInfo, 
                     assets: prevData.accountInfo.assets.map(a => ({...a})), 
                     positions: prevData.accountInfo.positions.map(p => ({...p})) 
                    } : undefined;

                update.a.B.forEach(bUpdate => {
                    const assetIdentifier = bUpdate.a; 
                    const balIndex = newBalances.findIndex(b => b.asset === assetIdentifier);
                    if (balIndex !== -1) {
                        newBalances[balIndex] = { ...newBalances[balIndex], balance: bUpdate.wb, crossWalletBalance: bUpdate.cw, updateTime: typedMessage.E };
                    } else {
                        newBalances.push({ asset: assetIdentifier, balance: bUpdate.wb, crossWalletBalance: bUpdate.cw, accountAlias: '', availableBalance: '', maxWithdrawAmount: '', marginAvailable: false, updateTime: typedMessage.E });
                    }
                    if (newAccountInfo) {
                        const accAssetIndex = newAccountInfo.assets.findIndex(a => a.asset === assetIdentifier);
                        if (accAssetIndex !== -1) {
                            newAccountInfo.assets[accAssetIndex] = {...newAccountInfo.assets[accAssetIndex], walletBalance: bUpdate.wb, crossWalletBalance: bUpdate.cw, updateTime: typedMessage.E};
                        }
                    }
                });

                update.a.P.forEach(pUpdate => {
                    const symbolIdentifier = pUpdate.s;
                    const positionSideIdentifier = pUpdate.ps;
                    const posIndex = newPositions.findIndex(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                    // Logic for updating or adding positions
                    const existingPosition = newPositions.find(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                    const updatedPositionData = {
                        ...(existingPosition || {}), // Spread existing data or empty object
                        symbol: symbolIdentifier,
                        positionSide: positionSideIdentifier,
                        positionAmt: pUpdate.pa,
                        entryPrice: pUpdate.ep,
                        unrealizedProfit: pUpdate.up,
                        isolated: pUpdate.mt === 'isolated',
                        updateTime: typedMessage.E,
                        // Fill other potentially missing fields with defaults or from existing
                        initialMargin: existingPosition?.initialMargin || "0",
                        maintMargin: existingPosition?.maintMargin || "0",
                        positionInitialMargin: existingPosition?.positionInitialMargin || "0",
                        openOrderInitialMargin: existingPosition?.openOrderInitialMargin || "0",
                        leverage: existingPosition?.leverage || "0",
                        maxNotional: existingPosition?.maxNotional || "0",
                        isolatedMargin: existingPosition?.isolatedMargin || "0",
                    } as AsterPositionV2;

                    if (posIndex !== -1) {
                        newPositions[posIndex] = updatedPositionData;
                    } else {
                         newPositions.push(updatedPositionData);
                    }

                    if (newAccountInfo) {
                        const accPosIndex = newAccountInfo.positions.findIndex(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                        const existingAccPosition = newAccountInfo.positions.find(p => p.symbol === symbolIdentifier && p.positionSide === positionSideIdentifier);
                        const updatedAccPositionData = {
                            ...(existingAccPosition || {}),
                            symbol: symbolIdentifier,
                            positionSide: positionSideIdentifier,
                            positionAmt: pUpdate.pa,
                            entryPrice: pUpdate.ep,
                            unrealizedProfit: pUpdate.up,
                            isolated: pUpdate.mt === 'isolated',
                            updateTime: typedMessage.E,
                             initialMargin: existingAccPosition?.initialMargin || "0",
                            maintMargin: existingAccPosition?.maintMargin || "0",
                            positionInitialMargin: existingAccPosition?.positionInitialMargin || "0",
                            openOrderInitialMargin: existingAccPosition?.openOrderInitialMargin || "0",
                            leverage: existingAccPosition?.leverage || "0",
                            maxNotional: existingAccPosition?.maxNotional || "0",
                        } as AsterPositionV2;

                        if (accPosIndex !== -1) {
                             newAccountInfo.positions[accPosIndex] = updatedAccPositionData;
                        }  else {
                            newAccountInfo.positions.push(updatedAccPositionData);
                        }
                    }
                });
                
                let newPortfolioValue = prevData.portfolioValue;
                let newTotalUnrealizedPNL = prevData.totalUnrealizedPNL;

                if (newAccountInfo) {
                    newPortfolioValue = parseFloatSafe(newAccountInfo.totalMarginBalance);
                    newTotalUnrealizedPNL = parseFloatSafe(newAccountInfo.totalUnrealizedProfit);
                }
                
                const updatedData = { 
                    ...prevData, 
                    balances: newBalances, 
                    positions: newPositions, 
                    accountInfo: newAccountInfo, 
                    portfolioValue: newPortfolioValue, 
                    totalUnrealizedPNL: newTotalUnrealizedPNL, 
                    webSocketStatus: 'Connected', 
                    lastUpdated: typedMessage.E 
                };
                saveAccountSummaryToLocalStorage(updatedData); 
                return updatedData;
              });
            } else if (typedMessage.e === 'ORDER_TRADE_UPDATE') {
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
              setTimeout(connectWebSocket, 5000); // Attempt reconnect
            }
        };

        currentWs.onclose = (event) => {
          if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
          if (wsRef.current && wsRef.current === event.target) { 
            setWebSocketStatus(event.code === 1000 ? 'Disconnected' : 'Error');
            setListenKey(null); 
            localListenKeyAttempt = null;

            if (event.code !== 1000 && isApiKeysSet && apiKey && secretKey) {
              console.log("WebSocket closed unexpectedly, attempting to reconnect...");
              setTimeout(connectWebSocket, 5000); 
            }
          }
        };

      } catch (e: any) {
        console.error("Failed to connect WebSocket:", e.message);
        setError(e.message || "Failed to establish WebSocket connection.");
        setWebSocketStatus('Error');
        setListenKey(null);
        localListenKeyAttempt = null;
        if (isApiKeysSet && apiKey && secretKey) {
            console.log("WebSocket connection failed, attempting to reconnect...");
            setTimeout(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    return () => {
      const keyToDelete = localListenKeyAttempt || listenKey;
      if (wsRef.current) { 
        wsRef.current.onclose = null; 
        wsRef.current.close(1000, "Component unmounting or API keys changed"); 
      }
      wsRef.current = null;
      if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
      if (apiKey && keyToDelete) {
        deleteAsterListenKey(apiKey, keyToDelete).catch(e => console.warn("Could not delete listen key on unmount/cleanup:", e));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiKeysSet, apiKey, secretKey]);

  const handleSaveApiKeys = () => {
    if (!tempApiKey.trim() || !tempSecretKey.trim()) {
      toast({ title: "Error", description: "API Key and Secret Key cannot be empty.", variant: "destructive" });
      return;
    }
    const oldApiKey = apiKey;
    const oldListenKey = listenKey;

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

    setApiKey(tempApiKey);
    setSecretKey(tempSecretKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('asterApiKey', tempApiKey);
      localStorage.setItem('asterSecretKey', tempSecretKey);
    }
    setIsApiKeysSet(true); 
    setIsSettingsDialogOpen(false);
    toast({ title: "Success", description: "API Keys saved. Fetching data..." });
  };

  const handleDisconnect = () => {
    const currentListenKey = listenKey;
    const currentApiKeyForDisconnect = apiKey;

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
      localStorage.removeItem('asterApiKey');
      localStorage.removeItem('asterSecretKey');
      const tradesKey = getTradesLocalStorageKey(); 
      if(tradesKey) localStorage.removeItem(tradesKey);
      localStorage.removeItem(ACCOUNT_SUMMARY_LS_KEY);
    }
    setIsApiKeysSet(false); setError(null); setListenKey(null);
    setWebSocketStatus('Disconnected');
    resetAccountDataToDefaults();
    toast({ title: "Disconnected", description: "API Keys and cached data have been cleared." });
  };

  const getPnlVariant = (pnl: number | null): MetricCardProps['variant'] => {
    if (pnl === null || pnl === 0) return 'default';
    return pnl > 0 ? 'positive' : 'negative';
  };

  const latestFeeText = accountData?.latestFee !== null && accountData?.latestFee !== undefined ? `Latest fee: ${formatUsd(accountData.latestFee, 6)}` : 'No recent trades for fee.';
  const tradeMetricsScopeMessage = `Based on fetched & cached trades for symbols with active positions (up to ${INITIAL_TRADE_FETCH_LIMIT} recent per symbol). May not be complete lifetime history.`;

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
              description="Total margin balance (USDT)"
              icon={DollarSign}
              isLoading={isLoading && accountData?.portfolioValue === null}
              className="lg:col-span-1"
            />
            <MetricCard
              title="Total Unrealized PNL"
              value={formatUsd(accountData?.totalUnrealizedPNL)}
              description="Live PNL on open positions (USDT)"
              icon={TrendingDown}
              isLoading={isLoading && accountData?.totalUnrealizedPNL === null}
              variant={getPnlVariant(accountData?.totalUnrealizedPNL)}
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
              isLoading={isLoading && !(accountData && accountData.commissionSymbol)}
            />
             <MetricCard
              title="Today's Total Volume"
              value={formatUsd(accountData?.todayTotalVolume)}
              description="Volume traded today (UTC) across active symbols. Based on fetched & cached trades."
              icon={BarChart3}
              isLoading={isLoading && accountData?.todayTotalVolume === null}
            />
            <MetricCard
              title="Total Realized PNL"
              value={formatUsd(accountData?.totalRealizedPNL)}
              description={tradeMetricsScopeMessage}
              icon={TrendingUp}
              isLoading={isLoading && accountData?.totalRealizedPNL === 0 && accountData?.totalTrades === 0}
              variant={getPnlVariant(accountData?.totalRealizedPNL)}
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
            <MetricCard
              title="Total Fees Paid"
              value={formatUsd(accountData?.totalFeesPaid, 4)}
              description={<>
                {latestFeeText}
                <br />{tradeMetricsScopeMessage}
              </>}
              icon={Landmark}
              isLoading={isLoading && accountData?.totalFeesPaid === 0 && !accountData.latestFee}
            />
            <MetricCard
              title="Previous Day's Volume (Au Boost)"
              value={formatUsd(accountData?.previousDayVolumeAuBoost)}
              description="Pro Taker + 0.5 * Maker (Previous UTC Day). Based on fetched & cached trades."
              icon={Zap}
              isLoading={isLoading && accountData?.previousDayVolumeAuBoost === 0}
            />
            <MetricCard
              title="Au Trader Boost Factor"
              value={accountData?.auTraderBoost || (isLoading && accountData?.auTraderBoost === null ? "Loading..." : "1x (Base)")}
              description="Multiplier based on Previous Day's Volume. '1x (Base)' = no additional boost."
              icon={ArrowUpRightSquare}
              isLoading={isLoading && accountData?.auTraderBoost === null}
            />
          </div>

          <div className="mt-6">
            <MetricCard
              title="Rh Points (Base)"
              value={formatNumber(accountData?.rhPointsTotal)}
              description={`Base Rh from fetched & cached trades for symbols with active positions. Excludes team/referral/other boosts.`}
              icon={Trophy}
              isLoading={isLoading && accountData?.rhPointsTotal === 0}
            />
          </div>
        </>
      )}

      <Card className="mt-6 bg-muted/30 dark:bg-muted/20 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info size={18} className="text-primary" /> Data Info & Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p><strong className="text-foreground">Data Caching:</strong> Account summary is cached (5 min). Trade history is cached by API key and incrementally updated for active symbols.</p>
          <p><strong className="text-foreground">Trade-Based Metrics:</strong> Realized PNL, Volume, Fees, and Points Program values are calculated from fetched & cached trades (up to {INITIAL_TRADE_FETCH_LIMIT} recent trades per active symbol initially). These may not be complete lifetime historical totals for very old accounts but will grow with use.</p>
          <p><strong className="text-foreground">Points Program:</strong> Au Trader Boost based on "Previous Day's Volume (UTC)" from cached trades. Rh Points are base values from cached trades, excluding external boosts.</p>
          <p><strong className="text-foreground">Real-time Updates:</strong> Balances/positions update via WebSocket. Trade-derived metrics update when an order update is received via WebSocket (triggering a REST refresh of trades) or on full REST refresh.</p>
          <p><strong className="text-foreground">API Limits:</strong> Note: AsterDex API has a general limit of 2400 requests/minute. This component fetches key data on load and uses WebSockets for live balance/position updates to minimize REST calls. For comprehensive historical analytics, a backend data aggregation solution is recommended.</p>
        </CardContent>
      </Card>
    </div>
  );
}
