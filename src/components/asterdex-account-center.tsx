// src/components/asterdex-account-center.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AsterAccountSummaryData, AsterAccountBalanceV2, AsterAccountInfoV2, AsterPositionV2 } from '@/types';
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
  // More specific fetch functions for trades, commission can be added here
} from '@/lib/aster-user-api';
import { 
  DollarSign, TrendingDown, TrendingUp, ListChecks, BarChart3, Landmark, Percent, Zap, ArrowUpRightSquare, Trophy, Info, Settings, AlertTriangle, WifiOff, Wifi
} from 'lucide-react';

const parseFloatSafe = (value: string | number | undefined | null, defaultValue: number | null = null): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  const num = parseFloat(String(value));
  return isNaN(num) ? defaultValue : num;
};

const formatUsd = (value: number | null, digits = 2) => {
  if (value === null || isNaN(value)) return 'N/A';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USDT', minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const formatNumber = (value: number | null, digits = 0) => {
  if (value === null || isNaN(value)) return 'N/A';
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

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


  useEffect(() => {
    const storedApiKey = localStorage.getItem('asterApiKey');
    const storedSecretKey = localStorage.getItem('asterSecretKey');
    if (storedApiKey && storedSecretKey) {
      setApiKey(storedApiKey);
      setSecretKey(storedSecretKey);
      setTempApiKey(storedApiKey);
      setTempSecretKey(storedSecretKey);
      setIsApiKeysSet(true);
    }
  }, []);

  const loadAccountData = useCallback(async () => {
    if (!apiKey || !secretKey) {
      setError("API Key and Secret Key are required.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [balances, accInfo, positions] = await Promise.all([
        fetchAsterAccountBalances(apiKey, secretKey),
        fetchAsterAccountInfo(apiKey, secretKey),
        fetchAsterPositions(apiKey, secretKey) // Fetch all positions initially
      ]);

      if (!accInfo || !balances) {
        throw new Error("Failed to fetch essential account information.");
      }
      
      const usdtBalance = balances.find(b => b.asset === 'USDT');
      const portfolioValue = parseFloatSafe(accInfo.totalMarginBalance); // totalMarginBalance seems more appropriate
      const totalUnrealizedPNL = parseFloatSafe(accInfo.totalUnrealizedProfit);

      // Placeholder for other metrics until full fetching logic is built
      setAccountData({
        portfolioValue,
        totalUnrealizedPNL,
        totalRealizedPNL: null, // TODO
        totalTrades: null, // TODO
        totalVolume: null, // TODO
        totalFeesPaid: null, // TODO
        commissionRateMaker: null, // TODO
        commissionRateTaker: null, // TODO
        commissionSymbol: 'BTCUSDT', // Default or fetch specific later
        todayVolumeAuBoost: null, // TODO
        auTraderBoost: null, // TODO
        rhPointsTotal: null, // TODO
        balances,
        accountInfo: accInfo,
        positions: positions || [],
        webSocketStatus: webSocketStatus,
      });

    } catch (err: any) {
      setError(err.message || "An unknown error occurred while fetching account data.");
      setAccountData(null);
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
    // TODO: Disconnect WebSocket if active
    setWebSocketStatus('Disconnected');
    toast({ title: "Disconnected", description: "API Keys have been cleared." });
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
              title="Total Realized PNL" 
              value={formatUsd(accountData?.totalRealizedPNL)} 
              description="Based on recent trades" 
              icon={TrendingUp} 
              isLoading={isLoading}
              variant={getPnlVariant(accountData?.totalRealizedPNL)}
            />
            <MetricCard 
              title="Total Trades" 
              value={formatNumber(accountData?.totalTrades)} 
              description={accountData?.totalTradesLong !== undefined ? `Long: ${formatNumber(accountData.totalTradesLong)} | Short: ${formatNumber(accountData.totalTradesShort)}` : "Aggregated trades"}
              icon={ListChecks} 
              isLoading={isLoading}
            />
            <MetricCard 
              title="Total Volume" 
              value={formatUsd(accountData?.totalVolume)} 
              description={accountData?.totalVolumeLong !== undefined ? `Long: ${formatUsd(accountData.totalVolumeLong)} | Short: ${formatUsd(accountData.totalVolumeShort)}` : "Aggregated volume"}
              icon={BarChart3} 
              isLoading={isLoading}
            />
            <MetricCard 
              title="Total Fees Paid" 
              value={formatUsd(accountData?.totalFeesPaid)} 
              description="Based on recent trades" 
              icon={Landmark} 
              isLoading={isLoading}
            />
            <MetricCard 
                title="Commission Rates" 
                value={
                    isLoading ? "Loading..." :
                    (accountData?.commissionRateTaker !== null && accountData?.commissionRateMaker !== null) ? 
                    (<>
                        <div>T: {accountData?.commissionRateTaker}%</div>
                        <div>M: {accountData?.commissionRateMaker}%</div>
                    </>) : "N/A"
                }
                description={`For ${accountData?.commissionSymbol || 'default'}`}
                icon={Percent} 
                isLoading={isLoading}
            />
            <MetricCard 
              title="Today's Volume (Au Boost)" 
              value={formatUsd(accountData?.todayVolumeAuBoost)} 
              description="Pro Taker + 0.5 * Pro Maker (Today UTC)" 
              icon={Zap} 
              isLoading={isLoading}
            />
            <MetricCard 
              title="Au Trader Boost" 
              value={accountData?.auTraderBoost || (isLoading ? "Loading..." : "N/A")} 
              description="Based on today's volume" 
              icon={ArrowUpRightSquare} 
              isLoading={isLoading}
            />
          </div>

          <div className="mt-6">
             <MetricCard 
              title="Rh Points (Total)" 
              value={formatNumber(accountData?.rhPointsTotal)} 
              description="Based on historical trades (Taker + 0.5*Maker)" 
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
            <Info size={18} className="text-primary"/> Points Program Info
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p><strong className="text-foreground">Au Points:</strong> Calculation depends on specific "Earn Asset" holdings, which are not available via the current API. The "Au Trader Boost" shown is based on your daily trading volume but applies to Au Points you might earn elsewhere.</p>
          <p><strong className="text-foreground">Rh Points:</strong> Calculated based on your total trading volume (Taker + 0.5 \* Maker). Team boosts, user-specific Rh boosts, and referral bonuses are not included in this display as they require external data.</p>
        </CardContent>
      </Card>
    </div>
  );
}
