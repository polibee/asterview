
// src/components/asterdex-account-center.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AsterAccountSummaryData, AsterAccountBalanceV2, AsterAccountInfoV2, AsterPositionV2, AsterCommissionRate, AsterUserTrade } from '@/types';
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
} from '@/lib/aster-user-api';
import { 
  DollarSign, TrendingDown, TrendingUp, ListChecks, BarChart3, Landmark, Percent, Zap, ArrowUpRightSquare, Trophy, Info, Settings, AlertTriangle, WifiOff, Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfUTCDay, endOfDay, fromUnixTime } from 'date-fns';

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
  description?: string;
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
  const [webSocketStatus, setWebSocketStatus] = useState<AsterAccountSummaryData['webSocketStatus']>('Disconnected');

  const resetAccountDataToDefaults = () => {
    setAccountData({
      portfolioValue: null, totalUnrealizedPNL: null, totalRealizedPNL: null,
      totalTrades: null, totalVolume: null, totalFeesPaid: null,
      commissionRateMaker: null, commissionRateTaker: null, commissionSymbol: null,
      todayVolumeAuBoost: null, auTraderBoost: null, rhPointsTotal: null,
      balances: [], accountInfo: undefined, positions: [], userTrades: [],
      webSocketStatus: 'Disconnected'
    });
  };

  useEffect(() => {
    const storedApiKey = localStorage.getItem('asterApiKey');
    const storedSecretKey = localStorage.getItem('asterSecretKey');
    if (storedApiKey && storedSecretKey) {
      setApiKey(storedApiKey);
      setSecretKey(storedSecretKey);
      setTempApiKey(storedApiKey);
      setTempSecretKey(storedSecretKey);
      setIsApiKeysSet(true);
    } else {
      resetAccountDataToDefaults();
    }
  }, []);

  const calculateTradeMetrics = (trades: AsterUserTrade[]): Partial<AsterAccountSummaryData> => {
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

    const todayStart = startOfUTCDay(new Date()).getTime();
    const todayEnd = endOfDay(new Date()).getTime(); // Use endOfDay

    trades.forEach(trade => {
      totalRealizedPNL += parseFloatSafe(trade.realizedPnl) ?? 0;
      totalVolume += parseFloatSafe(trade.quoteQty) ?? 0;
      totalFeesPaid += parseFloatSafe(trade.commission) ?? 0; 

      const tradeTime = typeof trade.time === 'string' ? parseIntSafe(trade.time) : trade.time;
      const tradeQuoteQty = parseFloatSafe(trade.quoteQty) ?? 0;

      if (tradeTime && tradeTime >= todayStart && tradeTime <= todayEnd) {
        if (trade.maker === false) { 
          todayTakerVolume += tradeQuoteQty;
        } else { 
          todayMakerVolume += tradeQuoteQty;
        }
      }

      if (trade.maker === false) { 
        allTradesTakerVolume += tradeQuoteQty;
      } else { 
        allTradesMakerVolume += tradeQuoteQty;
      }
    });

    const todayVolumeAuBoost = todayTakerVolume + (todayMakerVolume * 0.5);
    
    let auTraderBoost = "1x"; 
    if (todayVolumeAuBoost >= 500000) auTraderBoost = "3x";
    else if (todayVolumeAuBoost >= 200000) auTraderBoost = "2.6x";
    else if (todayVolumeAuBoost >= 50000) auTraderBoost = "2.4x";
    else if (todayVolumeAuBoost >= 10000) auTraderBoost = "2x";

    const rhPointsTotal = allTradesTakerVolume + (allTradesMakerVolume * 0.5);

    return {
      totalRealizedPNL,
      totalTrades: trades.length,
      totalVolume,
      totalFeesPaid,
      todayVolumeAuBoost,
      auTraderBoost,
      rhPointsTotal,
    };
  };

  const loadAccountData = useCallback(async () => {
    if (!apiKey || !secretKey) {
      setError("API Key and Secret Key are required.");
      resetAccountDataToDefaults();
      return;
    }
    setIsLoading(true);
    setError(null);
    const defaultCommissionSymbol = 'BTCUSDT'; 

    try {
      const [balances, accInfo, positions, commissionInfo, userTradesResponse] = await Promise.all([
        fetchAsterAccountBalances(apiKey, secretKey),
        fetchAsterAccountInfo(apiKey, secretKey),
        fetchAsterPositions(apiKey, secretKey), 
        fetchAsterCommissionRate(apiKey, secretKey, defaultCommissionSymbol),
        fetchAsterUserTrades(apiKey, secretKey, defaultCommissionSymbol, 200)
      ]);

      if (!accInfo || !balances) {
        throw new Error("Failed to fetch essential account information (balances or account info).");
      }
      
      const portfolioValue = parseFloatSafe(accInfo.totalMarginBalance);
      const totalUnrealizedPNL = parseFloatSafe(accInfo.totalUnrealizedProfit);
      const userTrades = userTradesResponse || [];
      const tradeMetrics = calculateTradeMetrics(userTrades);

      setAccountData({
        portfolioValue,
        totalUnrealizedPNL,
        totalRealizedPNL: tradeMetrics.totalRealizedPNL ?? null,
        totalTrades: tradeMetrics.totalTrades ?? null,
        totalVolume: tradeMetrics.totalVolume ?? null,
        totalFeesPaid: tradeMetrics.totalFeesPaid ?? null,
        commissionRateMaker: commissionInfo?.makerCommissionRate ?? null,
        commissionRateTaker: commissionInfo?.takerCommissionRate ?? null,
        commissionSymbol: commissionInfo?.symbol ?? defaultCommissionSymbol,
        todayVolumeAuBoost: tradeMetrics.todayVolumeAuBoost ?? null,
        auTraderBoost: tradeMetrics.auTraderBoost ?? null,
        rhPointsTotal: tradeMetrics.rhPointsTotal ?? null,
        balances: balances || [],
        accountInfo: accInfo,
        positions: positions || [],
        userTrades: userTrades,
        webSocketStatus: webSocketStatus, 
      });

    } catch (err: any) {
      setError(err.message || "An unknown error occurred while fetching account data.");
      resetAccountDataToDefaults();
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, secretKey, webSocketStatus]);

  useEffect(() => {
    if (isApiKeysSet) {
      loadAccountData();
    }
  }, [isApiKeysSet, loadAccountData]);

  const handleSaveApiKeys = () => {
    if (!tempApiKey.trim() || !tempSecretKey.trim()) {
      toast({ title: "Error", description: "API Key and Secret Key cannot be empty.", variant: "destructive" });
      return;
    }
    setApiKey(tempApiKey);
    setSecretKey(tempSecretKey);
    localStorage.setItem('asterApiKey', tempApiKey);
    localStorage.setItem('asterSecretKey', tempSecretKey);
    setIsApiKeysSet(true);
    setIsSettingsDialogOpen(false);
    toast({ title: "Success", description: "API Keys saved. Fetching data..." });
  };
  
  const handleDisconnect = () => {
    setApiKey('');
    setSecretKey('');
    setTempApiKey('');
    setTempSecretKey('');
    localStorage.removeItem('asterApiKey');
    localStorage.removeItem('asterSecretKey');
    setIsApiKeysSet(false);
    setAccountData(null); 
    setError(null);
    setWebSocketStatus('Disconnected');
    toast({ title: "Disconnected", description: "API Keys have been cleared." });
    resetAccountDataToDefaults(); 
  };

  const getPnlVariant = (pnl: number | null): MetricCardProps['variant'] => {
    if (pnl === null || pnl === 0) return 'default';
    return pnl > 0 ? 'positive' : 'negative';
  };

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
            <Button onClick={loadAccountData} variant="outline" disabled={isLoading}>
              {isLoading ? 'Retrying...' : 'Retry'}
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
              value={formatUsd(accountData?.portfolioValue ?? (isLoading ? 0 : null))} 
              description="Total wallet balance + Unrealized PNL" 
              icon={DollarSign} 
              isLoading={isLoading}
              className="lg:col-span-1"
            />
            <MetricCard 
              title="Total Unrealized PNL" 
              value={formatUsd(accountData?.totalUnrealizedPNL ?? (isLoading ? 0 : null))} 
              description="Live PNL on open positions" 
              icon={TrendingDown} 
              isLoading={isLoading}
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
              description={`For ${accountData?.commissionSymbol || 'default symbol'}`}
              icon={Percent} 
              isLoading={isLoading && !(accountData && accountData.commissionSymbol)}
            />
            <MetricCard 
              title="Total Realized PNL" 
              value={formatUsd(accountData?.totalRealizedPNL)} 
              description={`Last ${accountData?.userTrades?.length || 0} trades (${accountData?.commissionSymbol || 'symbol'})`}
              icon={TrendingUp} 
              isLoading={isLoading} 
              variant={getPnlVariant(accountData?.totalRealizedPNL)}
            />
            <MetricCard 
              title="Total Trades" 
              value={formatNumber(accountData?.totalTrades)} 
              description={`Last ${accountData?.userTrades?.length || 0} trades (${accountData?.commissionSymbol || 'symbol'})`}
              icon={ListChecks} 
              isLoading={isLoading}
            />
            <MetricCard 
              title="Total Volume Traded" 
              value={formatUsd(accountData?.totalVolume)} 
              description={`Last ${accountData?.userTrades?.length || 0} trades (${accountData?.commissionSymbol || 'symbol'})`}
              icon={BarChart3} 
              isLoading={isLoading}
            />
            <MetricCard 
              title="Total Fees Paid" 
              value={formatUsd(accountData?.totalFeesPaid)} 
              description={`Last ${accountData?.userTrades?.length || 0} trades (${accountData?.commissionSymbol || 'symbol'})`}
              icon={Landmark} 
              isLoading={isLoading}
            />
            <MetricCard 
              title="Today's Volume (Au Boost Calc)" 
              value={formatUsd(accountData?.todayVolumeAuBoost)} 
              description={`Pro Taker + 0.5*Maker (Today UTC, ${accountData?.commissionSymbol || 'symbol'})`}
              icon={Zap} 
              isLoading={isLoading}
            />
            <MetricCard 
              title="Au Trader Boost Factor" 
              value={accountData?.auTraderBoost || (isLoading ? "Loading..." : "N/A")} 
              description="Based on Today's Volume (before other boosts)"
              icon={ArrowUpRightSquare} 
              isLoading={isLoading}
            />
          </div>

          <div className="mt-6">
             <MetricCard 
              title="Rh Points (Base)" 
              value={formatNumber(accountData?.rhPointsTotal)} 
              description={`Last ${accountData?.userTrades?.length || 0} trades (before other boosts, ${accountData?.commissionSymbol || 'symbol'})`}
              icon={Trophy} 
              isLoading={isLoading}
              className="lg:col-span-3"
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
          <p><strong className="text-foreground">Trade-Based Metrics:</strong> Realized PNL, Total Trades, Volume, Fees, and Points Program values are calculated from the <strong className="text-foreground">last {accountData?.userTrades?.length || 200} trades for the symbol {accountData?.commissionSymbol || 'BTCUSDT'}</strong>. This is not full historical data.</p>
          <p><strong className="text-foreground">Au Points:</strong> Actual Au Points depend on "Earn Asset" holdings (not shown here). "Au Trader Boost Factor" is the multiplier derived from today's trading volume for {accountData?.commissionSymbol || 'BTCUSDT'}, as per AsterDex docs.</p>
          <p><strong className="text-foreground">Rh Points:</strong> "Rh Points (Base)" are calculated from the fetched trades (Taker Vol + 0.5 \* Maker Vol). This does not include team boosts, user-specific Rh boosts, or referral bonuses.</p>
          <p className="text-xs mt-2 italic">For complete and historical data, a backend processing solution is recommended. WebSocket updates for these metrics are planned for future enhancements.</p>
        </CardContent>
      </Card>
    </div>
  );
}
