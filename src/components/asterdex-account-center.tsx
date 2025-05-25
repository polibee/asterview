
// src/components/asterdex-account-center.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AsterAccountSummaryData, AsterAccountBalanceV2, AsterAccountInfoV2, AsterPositionV2, AsterCommissionRate, AsterUserTrade, AsterWebSocketUpdateAccount, AsterWebSocketUpdateOrder, AsterWebSocketListenKeyExpired } from '@/types';
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
  fetchAsterPositions,
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
import { format, startOfDay, endOfDay, fromUnixTime } from 'date-fns';

const parseFloatSafe = (value: string | number | undefined | null, defaultValue: number | null = null): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  const num = parseFloat(String(value));
  return isNaN(num) ? defaultValue : num;
};

const parseIntSafe = (value: string | number | undefined | null, returnNullOnNaN = false): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return returnNullOnNaN ? null : 0;
  }
  const num = parseInt(String(value), 10);
  if (isNaN(num)) {
    return returnNullOnNaN ? null : 0;
  }
  return num;
}

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

const LOCAL_STORAGE_KEY = 'asterAccountSummaryData_v2';
const DATA_STALE_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_COMMISSION_SYMBOL = 'BTCUSDT'; // Default symbol for fetching trades and commission

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
      portfolioValue: null, totalUnrealizedPNL: null, totalRealizedPNL: null,
      totalTrades: null, totalVolume: null, totalFeesPaid: null,
      commissionRateMaker: null, commissionRateTaker: null, commissionSymbol: null,
      todayVolumeAuBoost: null, auTraderBoost: null, rhPointsTotal: null,
      balances: [], accountInfo: undefined, positions: [], userTrades: [],
      webSocketStatus: status,
      lastUpdated: 0,
    });
  };

  const saveAccountDataToLocalStorage = (data: AsterAccountSummaryData | null) => {
    if (typeof window === 'undefined') return;
    if (!data) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }
    try {
      const dataToStore = { ...data, lastUpdated: Date.now() };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (e) {
      console.error("Error saving account data to localStorage:", e);
    }
  };

  const loadAccountDataFromLocalStorage = (): AsterAccountSummaryData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!storedData) return null;
      const parsedData = JSON.parse(storedData) as AsterAccountSummaryData;
      return parsedData;
    } catch (e) {
      console.error("Error loading account data from localStorage:", e);
      return null;
    }
  };

  const calculateTradeMetrics = (trades: AsterUserTrade[] | undefined): Partial<AsterAccountSummaryData> => {
    if (!trades || trades.length === 0) {
      return {
        totalRealizedPNL: 0, totalTrades: 0, totalVolume: 0, totalFeesPaid: 0,
        todayVolumeAuBoost: 0, auTraderBoost: "1x (Base)", rhPointsTotal: 0,
      };
    }

    let totalRealizedPNL = 0;
    let totalVolume = 0;
    let totalFeesPaid = 0;
    
    let todayTakerVolume = 0;
    let todayMakerVolume = 0;
    
    let allTradesTakerVolume = 0;
    let allTradesMakerVolume = 0;

    // Calculate UTC day boundaries
    const now = new Date();
    const yearUTC = now.getUTCFullYear();
    const monthUTC = now.getUTCMonth(); // 0-11
    const dayUTC = now.getUTCDate();
    const currentDayUTCTimestampStart = Date.UTC(yearUTC, monthUTC, dayUTC, 0, 0, 0, 0);
    const nextDayUTCTimestampStart = Date.UTC(yearUTC, monthUTC, dayUTC + 1, 0, 0, 0, 0);


    trades.forEach(trade => {
      const pnl = parseFloatSafe(trade.realizedPnl);
      const quoteQty = parseFloatSafe(trade.quoteQty) ?? 0; // Value of the trade in quote asset
      const commission = parseFloatSafe(trade.commission); // Assuming commission is negative
      const tradeTime = typeof trade.time === 'string' ? parseIntSafe(trade.time) : trade.time;

      if (pnl !== null) totalRealizedPNL += pnl;
      totalVolume += quoteQty;
      if (commission !== null) totalFeesPaid += Math.abs(commission); // Store as positive value

      // Today's Volume (for Au Boost) based on UTC day
      if (tradeTime && tradeTime >= currentDayUTCTimestampStart && tradeTime < nextDayUTCTimestampStart) {
        if (trade.maker === false) { // Taker
          todayTakerVolume += quoteQty;
        } else { // Maker
          todayMakerVolume += quoteQty;
        }
      }

      // All (fetched) trades volume for Rh Points
      if (trade.maker === false) { // Taker
          allTradesTakerVolume += quoteQty;
      } else { // Maker
          allTradesMakerVolume += quoteQty;
      }
    });

    const todayVolumeAuBoostCalc = todayTakerVolume + (todayMakerVolume * 0.5);

    let auTraderBoostFactor = "1x (Base)"; // Default, meaning no additional boost from trading volume
    // Based on "Au Trader Boost Tiers (Adjust on 12 May)" from docs/asterpoint.md
    // This table shows the total multiplier. So if <10k, it's effectively 1x.
    if (todayVolumeAuBoostCalc >= 500000) auTraderBoostFactor = "3x";
    else if (todayVolumeAuBoostCalc >= 200000) auTraderBoostFactor = "2.6x";
    else if (todayVolumeAuBoostCalc >= 50000) auTraderBoostFactor = "2.4x";
    else if (todayVolumeAuBoostCalc >= 10000) auTraderBoostFactor = "2x";


    const rhPointsTotalCalc = allTradesTakerVolume + (allTradesMakerVolume * 0.5);

    return {
      totalRealizedPNL,
      totalTrades: trades.length,
      totalVolume,
      totalFeesPaid,
      todayVolumeAuBoost: todayVolumeAuBoostCalc,
      auTraderBoost: auTraderBoostFactor,
      rhPointsTotal: rhPointsTotalCalc,
    };
  };


  const loadAccountData = useCallback(async (forceRefresh = false) => {
    if (!apiKey || !secretKey) {
      setError("API Key and Secret Key are required.");
      resetAccountDataToDefaults();
      saveAccountDataToLocalStorage(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let loadedFromCache = false;
    if (!forceRefresh) {
        const cachedData = loadAccountDataFromLocalStorage();
        if (cachedData && (Date.now() - (cachedData.lastUpdated || 0) < DATA_STALE_MS)) {
            setAccountData(cachedData);
            setIsLoading(false); 
            loadedFromCache = true;
            if (Date.now() - (cachedData.lastUpdated || 0) > 60 * 1000) { 
                 // console.log("Refreshing cached data in background...");
            } else {
                return; 
            }
        }
    }

    try {
      const [balances, accInfo, positions, commissionInfo, userTradesResponse] = await Promise.all([
        fetchAsterAccountBalances(apiKey, secretKey),
        fetchAsterAccountInfo(apiKey, secretKey),
        fetchAsterPositions(apiKey, secretKey), // Fetches all positions. Can specify symbol if needed.
        fetchAsterCommissionRate(apiKey, secretKey, DEFAULT_COMMISSION_SYMBOL),
        fetchAsterUserTrades(apiKey, secretKey, DEFAULT_COMMISSION_SYMBOL, 200) // Fetch last 200 trades for default symbol
      ]);

      const portfolioValue = parseFloatSafe(accInfo.totalMarginBalance);
      const totalUnrealizedPNL = parseFloatSafe(accInfo.totalUnrealizedProfit);
      const userTrades = userTradesResponse || [];
      const tradeMetrics = calculateTradeMetrics(userTrades);

      const newAccountData: AsterAccountSummaryData = {
        portfolioValue,
        totalUnrealizedPNL,
        totalRealizedPNL: tradeMetrics.totalRealizedPNL ?? null,
        totalTrades: tradeMetrics.totalTrades ?? null,
        totalVolume: tradeMetrics.totalVolume ?? null,
        totalFeesPaid: tradeMetrics.totalFeesPaid ?? null,
        commissionRateMaker: commissionInfo?.makerCommissionRate ?? null,
        commissionRateTaker: commissionInfo?.takerCommissionRate ?? null,
        commissionSymbol: commissionInfo?.symbol ?? DEFAULT_COMMISSION_SYMBOL,
        todayVolumeAuBoost: tradeMetrics.todayVolumeAuBoost ?? null,
        auTraderBoost: tradeMetrics.auTraderBoost ?? null,
        rhPointsTotal: tradeMetrics.rhPointsTotal ?? null,
        balances: balances || [],
        accountInfo: accInfo,
        positions: positions || [],
        userTrades: userTrades,
        webSocketStatus: accountData?.webSocketStatus || 'Disconnected',
        lastUpdated: Date.now()
      };
      setAccountData(newAccountData);
      saveAccountDataToLocalStorage(newAccountData);

    } catch (err: any) {
      console.error("Error fetching account data via REST:", err);
      setError(err.message || "An unknown error occurred while fetching account data via REST.");
      if (!loadedFromCache) { 
          resetAccountDataToDefaults(accountData?.webSocketStatus || 'Disconnected');
          saveAccountDataToLocalStorage(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, secretKey, accountData?.webSocketStatus]);


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
      loadAccountData(); 
    } else {
      resetAccountDataToDefaults(); 
    }
  }, [loadAccountData]);


  useEffect(() => {
    if (!isApiKeysSet || !apiKey || !secretKey || typeof window === 'undefined') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWebSocketStatus('Disconnected');
      if (listenKey && apiKey) { // Use old apiKey for deletion if it existed
         deleteAsterListenKey(apiKey, listenKey).catch(e => console.error("Error deleting old listen key:", e));
         setListenKey(null);
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      return;
    }

    let currentWs: WebSocket | null = null;
    let localListenKeyAttempt = listenKey; // Use current listenKey if available

    const connectWebSocket = async () => {
      setWebSocketStatus('Connecting');
      try {
        if (!localListenKeyAttempt) {
            const keyData = await createAsterListenKey(apiKey);
            if (!keyData || !keyData.listenKey) {
            throw new Error("Failed to create listen key for WebSocket.");
            }
            localListenKeyAttempt = keyData.listenKey;
            setListenKey(localListenKeyAttempt); // Set state here
        }

        currentWs = new WebSocket(`wss://fstream.asterdex.com/ws/${localListenKeyAttempt}`);
        wsRef.current = currentWs;

        currentWs.onopen = () => {
          setWebSocketStatus('Connected');
          if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = setInterval(async () => {
            if (localListenKeyAttempt && apiKey) {
              try {
                await keepAliveAsterListenKey(apiKey, localListenKeyAttempt);
              } catch (e) {
                console.error("Failed to keep alive listenKey:", e);
                currentWs?.close(); 
                setListenKey(null); // Invalidate key
                localListenKeyAttempt = null;
                // Attempt to reconnect which will fetch a new key
                // setTimeout(() => connectWebSocket(), 5000); // Avoid rapid loops
              }
            }
          }, 30 * 60 * 1000); // 30 minutes
        };

        currentWs.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string);
            const typedMessage = message as AsterWebSocketUpdateAccount | AsterWebSocketUpdateOrder | AsterWebSocketListenKeyExpired;

            if (typedMessage.e === 'ACCOUNT_UPDATE') {
              const update = typedMessage as AsterWebSocketUpdateAccount;
              setAccountData(prevData => {
                if (!prevData) return null;

                const newBalances = prevData.balances ? [...prevData.balances] : [];
                update.a.B.forEach(bUpdate => {
                  const balanceIndex = newBalances.findIndex(b => (b.a || b.asset) === (bUpdate.a || bUpdate.asset));
                  if (balanceIndex !== -1) {
                    newBalances[balanceIndex].balance = bUpdate.wb || bUpdate.balance || newBalances[balanceIndex].balance;
                    newBalances[balanceIndex].crossWalletBalance = bUpdate.cw || bUpdate.crossWalletBalance || newBalances[balanceIndex].crossWalletBalance;
                  } else {
                    newBalances.push({ asset: (bUpdate.a || bUpdate.asset || ''), balance: (bUpdate.wb || bUpdate.balance || '0') , crossWalletBalance: (bUpdate.cw || bUpdate.crossWalletBalance || '0'), accountAlias: '', availableBalance: '', maxWithdrawAmount: '', marginAvailable: false, updateTime: Date.now() });
                  }
                });
                
                const newPositions = prevData.positions ? [...prevData.positions] : [];
                update.a.P.forEach(pUpdate => {
                  const posIndex = newPositions.findIndex(p => (p.s || p.symbol) === (pUpdate.s || pUpdate.symbol) && (p.ps || p.positionSide) === (pUpdate.ps || pUpdate.positionSide));
                  if (posIndex !== -1) {
                    newPositions[posIndex].positionAmt = pUpdate.pa || pUpdate.positionAmt || newPositions[posIndex].positionAmt;
                    newPositions[posIndex].entryPrice = pUpdate.ep || pUpdate.entryPrice || newPositions[posIndex].entryPrice;
                    newPositions[posIndex].unrealizedProfit = pUpdate.up || pUpdate.unrealizedProfit || newPositions[posIndex].unrealizedProfit;
                    newPositions[posIndex].updateTime = Date.now();
                  } else {
                     newPositions.push({
                        symbol: pUpdate.s || pUpdate.symbol || "",
                        positionAmt: pUpdate.pa || pUpdate.positionAmt || "0",
                        entryPrice: pUpdate.ep || pUpdate.entryPrice || "0",
                        unrealizedProfit: pUpdate.up || pUpdate.unrealizedProfit || "0",
                        positionSide: pUpdate.ps || pUpdate.positionSide || "BOTH",
                        initialMargin: "0", maintMargin: "0", positionInitialMargin: "0",
                        openOrderInitialMargin: "0", leverage: "0", isolated: false,
                        maxNotional: "0", updateTime: Date.now(),
                     });
                  }
                });

                let newAccountInfo = prevData.accountInfo ? { ...prevData.accountInfo } : undefined;
                let newPortfolioValue = prevData.portfolioValue;
                let newTotalUnrealizedPNL = prevData.totalUnrealizedPNL;

                if (newAccountInfo) {
                    newAccountInfo.assets.forEach(asset => {
                        const balanceUpdate = update.a.B.find(b => (b.a || b.asset) === asset.asset);
                        if (balanceUpdate) {
                            asset.walletBalance = balanceUpdate.wb || balanceUpdate.balance || asset.walletBalance;
                            asset.crossWalletBalance = balanceUpdate.cw || balanceUpdate.crossWalletBalance || asset.crossWalletBalance;
                            asset.updateTime = Date.now();
                        }
                    });
                    newAccountInfo.positions.forEach(pos => {
                         const posUpdate = update.a.P.find(p => (p.s || p.symbol) === pos.symbol && (p.ps || p.positionSide) === pos.positionSide);
                         if (posUpdate) {
                            pos.positionAmt = posUpdate.pa || posUpdate.positionAmt || pos.positionAmt;
                            pos.entryPrice = posUpdate.ep || posUpdate.entryPrice || pos.entryPrice;
                            pos.unrealizedProfit = posUpdate.up || posUpdate.unrealizedProfit || pos.unrealizedProfit;
                            pos.updateTime = Date.now();
                         }
                    });
                    
                    const usdtAsset = newAccountInfo.assets.find(a => a.asset === 'USDT'); // Assuming USDT is primary quote asset
                    if (usdtAsset) {
                        newAccountInfo.totalMarginBalance = usdtAsset.marginBalance; // Or walletBalance based on Aster's definition
                        newPortfolioValue = parseFloatSafe(usdtAsset.marginBalance);
                    }
                    
                    newTotalUnrealizedPNL = newAccountInfo.positions.reduce((sum, p) => sum + (parseFloatSafe(p.unrealizedProfit) || 0), 0);
                    newAccountInfo.totalUnrealizedProfit = newTotalUnrealizedPNL.toString();
                }


                const updatedData = {
                  ...prevData,
                  balances: newBalances,
                  positions: newPositions,
                  accountInfo: newAccountInfo,
                  portfolioValue: newPortfolioValue,
                  totalUnrealizedPNL: newTotalUnrealizedPNL,
                  webSocketStatus: 'Connected', 
                  lastUpdated: Date.now(),
                };
                saveAccountDataToLocalStorage(updatedData);
                return updatedData;
              });
            } else if (typedMessage.e === 'ORDER_TRADE_UPDATE') {
                // For more accurate PNL and trade volume updates, would need to:
                // 1. Potentially re-fetch recent trades (could hit rate limits if too frequent)
                // 2. Or, maintain a client-side list of trades and update it with the new trade, then recalculate.
                // For now, we'll trigger a full REST refresh to simplify, but this is not optimal for high frequency.
                 // console.log("Order update received, triggering REST data refresh for trade-dependent metrics.");
                 loadAccountData(true); 
            } else if (typedMessage.e === 'listenKeyExpired') {
                console.warn("ListenKey expired via WebSocket. Attempting to reconnect.");
                if (wsRef.current) wsRef.current.close();
                setListenKey(null); 
                localListenKeyAttempt = null;
                connectWebSocket(); // Reconnect will fetch a new key
            }

          } catch (e) {
            console.error("Error processing WebSocket message:", e);
          }
        };

        currentWs.onerror = (error) => {
          console.error("AsterDex WebSocket Error:", error);
          setWebSocketStatus('Error');
        };

        currentWs.onclose = (event) => {
          if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
          }
          if (wsRef.current && wsRef.current === event.target) { 
            setWebSocketStatus(event.code === 1000 ? 'Disconnected' : 'Error');
             // if (isApiKeysSet && event.code !== 1000 && apiKey && secretKey) {
             //   console.log("WebSocket closed unexpectedly, attempting to reconnect...");
             //   localListenKeyAttempt = null; // Force new key fetch
             //   setListenKey(null);
             //   setTimeout(() => connectWebSocket(), 5000); 
             // }
          }
        };

      } catch (e: any) {
        console.error("Failed to connect WebSocket:", e.message);
        setError(e.message || "Failed to establish WebSocket connection.");
        setWebSocketStatus('Error');
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
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      if (apiKey && keyToDelete) {
         deleteAsterListenKey(apiKey, keyToDelete).catch(e => console.warn("Could not delete listen key on unmount:", e));
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

    setApiKey(tempApiKey);
    setSecretKey(tempSecretKey);
    if (typeof window !== 'undefined') {
        localStorage.setItem('asterApiKey', tempApiKey);
        localStorage.setItem('asterSecretKey', tempSecretKey);
    }
    setIsApiKeysSet(true);
    setIsSettingsDialogOpen(false);
    toast({ title: "Success", description: "API Keys saved. Fetching data..." });
    
    if (wsRef.current) {
        wsRef.current.close(1000, "API Keys changed");
        wsRef.current = null;
    }
    if (oldApiKey && oldListenKey) { 
        deleteAsterListenKey(oldApiKey, oldListenKey).catch(e => console.warn("Could not delete old listen key on API key change:", e));
    }
    setListenKey(null); 
    loadAccountData(true); 
  };

  const handleDisconnect = () => {
    const currentListenKey = listenKey; 
    const currentApiKey = apiKey;

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (currentApiKey && currentListenKey) { 
        deleteAsterListenKey(currentApiKey, currentListenKey).catch(e => console.error("Error deleting listen key on disconnect:", e));
    }

    setApiKey('');
    setSecretKey('');
    setTempApiKey('');
    setTempSecretKey('');
    if (typeof window !== 'undefined') {
        localStorage.removeItem('asterApiKey');
        localStorage.removeItem('asterSecretKey');
    }
    saveAccountDataToLocalStorage(null);
    setIsApiKeysSet(false);
    setError(null);
    setListenKey(null);
    setWebSocketStatus('Disconnected');
    resetAccountDataToDefaults();
    toast({ title: "Disconnected", description: "API Keys have been cleared." });
  };

  const getPnlVariant = (pnl: number | null): MetricCardProps['variant'] => {
    if (pnl === null || pnl === 0) return 'default';
    return pnl > 0 ? 'positive' : 'negative';
  };

  const tradesNote = `Based on last ${accountData?.userTrades?.length || 0} trades for ${accountData?.commissionSymbol || DEFAULT_COMMISSION_SYMBOL}. Not account-wide.`;

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
              {webSocketStatus === 'Connected' ? <Wifi size={14}/> : <WifiOff size={14} />}
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
              value={formatUsd(accountData?.portfolioValue ?? (isLoading && !accountData?.portfolioValue ? 0 : null))}
              description="Total margin balance (USDT)"
              icon={DollarSign}
              isLoading={isLoading && !accountData?.portfolioValue}
              className="lg:col-span-1"
            />
            <MetricCard
              title="Total Unrealized PNL"
              value={formatUsd(accountData?.totalUnrealizedPNL ?? (isLoading && !accountData?.totalUnrealizedPNL ? 0 : null))}
              description="Live PNL on open positions (USDT)"
              icon={TrendingDown}
              isLoading={isLoading && !accountData?.totalUnrealizedPNL}
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
              title="Total Realized PNL"
              value={formatUsd(accountData?.totalRealizedPNL)}
              description={tradesNote}
              icon={TrendingUp}
              isLoading={isLoading && accountData?.totalRealizedPNL === null}
              variant={getPnlVariant(accountData?.totalRealizedPNL)}
            />
            <MetricCard
              title="Total Trades"
              value={formatNumber(accountData?.totalTrades)}
              description={tradesNote}
              icon={ListChecks}
              isLoading={isLoading && accountData?.totalTrades === null}
            />
            <MetricCard
              title="Total Volume"
              value={formatUsd(accountData?.totalVolume)}
              description={tradesNote}
              icon={BarChart3}
              isLoading={isLoading && accountData?.totalVolume === null}
            />
            <MetricCard
              title="Total Fees Paid"
              value={formatUsd(accountData?.totalFeesPaid)}
              description={tradesNote}
              icon={Landmark}
              isLoading={isLoading && accountData?.totalFeesPaid === null}
            />
            <MetricCard
              title="Today's Volume (Au Boost)"
              value={formatUsd(accountData?.todayVolumeAuBoost)}
              description={<>Pro Taker + 0.5*Maker (Today UTC, <br/> {accountData?.commissionSymbol || DEFAULT_COMMISSION_SYMBOL} only)</>}
              icon={Zap}
              isLoading={isLoading && accountData?.todayVolumeAuBoost === null}
            />
            <MetricCard
              title="Au Trader Boost"
              value={accountData?.auTraderBoost || (isLoading && accountData?.auTraderBoost === null ? "Loading..." : "N/A")}
              description={<>Based on Today's Volume (before other boosts, <br/>{accountData?.commissionSymbol || DEFAULT_COMMISSION_SYMBOL} only)</>}
              icon={ArrowUpRightSquare}
              isLoading={isLoading && accountData?.auTraderBoost === null}
            />
          </div>

          <div className="mt-6">
             <MetricCard
              title="Rh Points (Base)"
              value={formatNumber(accountData?.rhPointsTotal)}
              description={<>Base Rh from last {accountData?.userTrades?.length || 0} trades for {accountData?.commissionSymbol || DEFAULT_COMMISSION_SYMBOL}.<br/>Excludes team/referral/other boosts.</>}
              icon={Trophy}
              isLoading={isLoading && accountData?.rhPointsTotal === null}
            />
          </div>
        </>
      )}

      <Card className="mt-6 bg-muted/30 dark:bg-muted/20 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info size={18} className="text-primary"/> Points Program & Data Info
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p><strong className="text-foreground">Data Caching:</strong> Core account summary is cached in your browser (localStorage) for 5 minutes. Data is refreshed via REST API in the background or on interaction if cache is stale.</p>
          <p><strong className="text-foreground">Trade-Based Metrics:</strong> Realized PNL, Total Trades, Volume, Fees, and Points Program values are calculated from the <strong className="text-foreground">last {accountData?.userTrades?.length || 200} trades fetched for the symbol {accountData?.commissionSymbol || DEFAULT_COMMISSION_SYMBOL} only</strong>. These are not account-wide historical totals.</p>
          <p><strong className="text-foreground">Au Points:</strong> "Au Trader Boost" factor shown is derived from "Today's Volume (Au Boost)" for the specified symbol, based on AsterDex documentation. Actual Au Points depend on other factors like "Earn Asset" holdings (not shown here) and overall account activity.</p>
          <p><strong className="text-foreground">Rh Points:</strong> "Rh Points (Base)" are calculated from the fetched trades (Taker Vol + 0.5 \* Maker Vol) for the specified symbol. This does not include team boosts, user-specific Rh boosts, or referral bonuses.</p>
          <p><strong className="text-foreground">Real-time Updates:</strong> After initial load, balances and positions are updated via WebSocket. Trade-derived metrics currently update on full REST refresh when a new trade is detected via WebSocket, or on manual refresh / stale cache.</p>
          <p><strong className="text-foreground">API Limits:</strong> Note: AsterDex API has a general limit of 2400 requests/minute. This component fetches key data on load and uses WebSockets for live balance/position updates to minimize REST calls. For comprehensive historical analytics, a backend data aggregation solution is recommended.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    
