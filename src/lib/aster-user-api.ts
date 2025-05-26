
// src/lib/aster-user-api.ts

import type {
  AsterAccountBalanceV2,
  AsterAccountInfoV2,
  AsterPositionV2,
  AsterUserTrade,
  AsterCommissionRate,
  AsterListenKey,
  AsterIncomeHistoryItem
} from '@/types';
import { hmacSHA256 } from '@/lib/utils';

const ASTER_API_BASE_URL = 'https://fapi.asterdex.com/fapi/v1';
const ASTER_API_V2_BASE_URL = 'https://fapi.asterdex.com/fapi/v2';


async function makeAsterAuthenticatedRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  apiKey: string,
  secretKey: string,
  params?: Record<string, any>,
  serverTimeOffset?: number // Optional server time offset
): Promise<T> {
  if (!apiKey || !secretKey) {
    console.error('API key or secret key is missing for authenticated request to', endpoint);
    throw new Error('API Key or Secret Key is not configured.');
  }

  const currentClientTime = Date.now();
  // Ensure serverTimeOffset is a number before using it
  const effectiveServerTimeOffset = typeof serverTimeOffset === 'number' ? serverTimeOffset : 0;
  const requestTimestamp = currentClientTime + effectiveServerTimeOffset;


  const queryParams = { ...params, timestamp: requestTimestamp, recvWindow: 5000 };

  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  const signature = hmacSHA256(queryString, secretKey);
  const url = `${endpoint}?${queryString}&signature=${signature}`;

  const headers = new Headers();
  headers.append('X-MBX-APIKEY', apiKey);
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
  }

  let response: Response | undefined;
  try {
    response = await fetch(url, {
      method: method,
      headers: headers,
    });

    const responseBodyText = await response.text();

    if (!response.ok) {
      let apiErrorMessage = `API Error ${response.status}: ${responseBodyText || 'No response body'}`;
      try {
        const errorJson = JSON.parse(responseBodyText);
        if (errorJson && errorJson.msg) {
          apiErrorMessage = `Aster API Error (${errorJson.code || response.status}): ${errorJson.msg}`;
        }
      } catch (e) {
        // Ignore parsing error if body isn't JSON, use the raw text
      }
      console.error(`Aster User API request to ${endpoint} failed. Status: ${response.status}. URL: ${url.replace(secretKey, '***SECRET***')}. Response: ${responseBodyText}`);
      throw new Error(apiErrorMessage);
    }
    
    if (responseBodyText.trim() === '' || responseBodyText.trim() === '{}') {
        if (response.status === 200 && (method === 'PUT' || method === 'DELETE')) {
            return {} as T; 
        }
    }
    
    try {
        return JSON.parse(responseBodyText) as T;
    } catch (e) {
        console.error(`Error parsing JSON response from ${endpoint}. Status: ${response.status}. Body: ${responseBodyText}`, e);
        throw new Error(`Failed to parse API response from ${endpoint}: ${responseBodyText.substring(0, 100)}...`);
    }

  } catch (error: any) {
    if (error.message.includes("Failed to fetch")) {
      console.warn(`Network error or CORS issue fetching Aster User API (${endpoint} - ${method}): ${error.message}. Ensure AsterDex API allows requests from this origin if running client-side.`);
      throw new Error(`Network error or CORS issue: ${error.message}. Check browser console and network tab for details.`);
    } else if (!(error.message.startsWith("Aster API Error") || error.message.startsWith("Failed to parse API response") || error.message.startsWith("Network error or CORS issue"))) {
        console.error(`Unexpected error during Aster User API request to ${endpoint} (${method}):`, error);
    }
    throw error; 
  }
}

export async function fetchAsterAccountBalances(apiKey: string, secretKey: string, serverTimeOffset?: number): Promise<AsterAccountBalanceV2[]> {
  return makeAsterAuthenticatedRequest<AsterAccountBalanceV2[]>(`${ASTER_API_V2_BASE_URL}/balance`, 'GET', apiKey, secretKey, undefined, serverTimeOffset);
}

export async function fetchAsterAccountInfo(apiKey: string, secretKey: string, serverTimeOffset?: number): Promise<AsterAccountInfoV2> {
  return makeAsterAuthenticatedRequest<AsterAccountInfoV2>(`${ASTER_API_V2_BASE_URL}/account`, 'GET', apiKey, secretKey, undefined, serverTimeOffset);
}

export async function fetchAsterPositions(apiKey: string, secretKey: string, serverTimeOffset?: number, symbol?: string): Promise<AsterPositionV2[]> {
  const params: Record<string, any> = {};
  if (symbol) {
    params.symbol = symbol;
  }
  return makeAsterAuthenticatedRequest<AsterPositionV2[]>(`${ASTER_API_V2_BASE_URL}/positionRisk`, 'GET', apiKey, secretKey, params, serverTimeOffset);
}

export async function fetchAsterUserTrades(
  apiKey: string,
  secretKey: string,
  symbol: string,
  serverTimeOffset?: number,
  limit: number = 500, 
  fromId?: number,
  startTime?: number,
  endTime?: number
): Promise<AsterUserTrade[]> {
  const params: Record<string, any> = { symbol, limit };
  if (fromId !== undefined) params.fromId = fromId;
  if (startTime !== undefined) params.startTime = startTime;
  if (endTime !== undefined) params.endTime = endTime;

  return makeAsterAuthenticatedRequest<AsterUserTrade[]>(`${ASTER_API_BASE_URL}/userTrades`, 'GET', apiKey, secretKey, params, serverTimeOffset);
}

export async function fetchAsterCommissionRate(apiKey: string, secretKey: string, symbol: string, serverTimeOffset?: number): Promise<AsterCommissionRate> {
   return makeAsterAuthenticatedRequest<AsterCommissionRate>(`${ASTER_API_BASE_URL}/commissionRate`, 'GET', apiKey, secretKey, { symbol }, serverTimeOffset);
}

export async function fetchAsterIncomeHistory(
    apiKey: string,
    secretKey: string,
    serverTimeOffset?: number,
    incomeType?: "TRANSFER" | "WELCOME_BONUS" | "REALIZED_PNL" | "FUNDING_FEE" | "COMMISSION" | "INSURANCE_CLEAR" | "MARKET_MERCHANT_RETURN_REWARD" | string,
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000 
): Promise<AsterIncomeHistoryItem[]> {
    const params: Record<string, any> = { limit };
    if (incomeType) params.incomeType = incomeType;
    if (symbol) params.symbol = symbol;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    return makeAsterAuthenticatedRequest<AsterIncomeHistoryItem[]>(`${ASTER_API_BASE_URL}/income`, 'GET', apiKey, secretKey, params, serverTimeOffset);
}


export async function createAsterListenKey(apiKey: string): Promise<AsterListenKey> {
  if (!apiKey) {
    console.error('API key is missing for creating listen key.');
    throw new Error('API key is missing for creating listen key.');
  }
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
    const responseBodyText = await response.text();
    if (!response.ok) {
      const errorMsg = `ListenKey creation failed (status ${response.status}): ${responseBodyText.substring(0,100)}`;
      console.error(`Aster ListenKey creation error: ${response.status} ${responseBodyText}`);
      throw new Error(errorMsg);
    }
    return JSON.parse(responseBodyText) as AsterListenKey;
  } catch (error: any) {
     if (error instanceof TypeError && error.message === "Failed to fetch") {
      const networkErrorMsg = `Network error or CORS issue creating Aster ListenKey: ${error.message}.`;
      console.warn(networkErrorMsg);
      throw new Error(networkErrorMsg);
    }
    if (!error.message.startsWith("ListenKey creation failed") && !error.message.startsWith("Network error")) {
        console.error('Failed to create Aster ListenKey (unexpected):', error.message);
        throw new Error(`Failed to create Aster ListenKey: ${error.message}`);
    }
    throw error;
  }
}

export async function keepAliveAsterListenKey(apiKey: string, listenKey: string): Promise<Record<string, unknown>> {
  if (!apiKey || !listenKey) {
    console.error('API key or listenKey is missing for keepAlive.');
    throw new Error('API key or listenKey is missing for keepAlive.');
  }
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, { // Removed listenKey from params
      method: 'PUT',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
    const responseBodyText = await response.text();
    if (!response.ok) {
      const errorMsg = `ListenKey keepAlive failed (status ${response.status}): ${responseBodyText.substring(0,100)}`;
      console.error(`Aster ListenKey keepAlive error (status ${response.status}): ${responseBodyText}`);
      throw new Error(errorMsg);
    }
    if (responseBodyText.trim() === '{}' || responseBodyText.trim() === '') {
        return {}; 
    }
    return JSON.parse(responseBodyText) as Record<string, unknown>;
  } catch (error: any) {
     if (error instanceof TypeError && error.message === "Failed to fetch") {
      const networkErrorMsg = `Network error or CORS issue keeping alive Aster ListenKey: ${error.message}.`;
      console.warn(networkErrorMsg);
      throw new Error(networkErrorMsg);
    }
    if (!error.message.startsWith("ListenKey keepAlive failed") && !error.message.startsWith("Network error")) {
        console.error('Failed to keepAlive Aster ListenKey (unexpected):', error.message);
        throw new Error(`Failed to keepAlive Aster ListenKey: ${error.message}`);
    }
    throw error;
  }
}

export async function deleteAsterListenKey(apiKey: string, listenKey: string): Promise<Record<string, unknown>> {
   if (!apiKey || !listenKey) {
    console.error('API key or listenKey is missing for delete.');
    throw new Error('API key or listenKey is missing for delete.');
  }
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, { // Removed listenKey from params
      method: 'DELETE',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
    const responseBodyText = await response.text();
     if (!response.ok) {
      const errorMsg = `ListenKey delete failed (status ${response.status}): ${responseBodyText.substring(0,100)}`;
      console.error(`Aster ListenKey delete error (status ${response.status}): ${responseBodyText}`);
      throw new Error(errorMsg);
    }
     if (responseBodyText.trim() === '{}' || responseBodyText.trim() === '') {
        return {};
    }
    return JSON.parse(responseBodyText)  as Record<string, unknown>;
  } catch (error:any) {
     if (error instanceof TypeError && error.message === "Failed to fetch") {
      const networkErrorMsg = `Network error or CORS issue deleting Aster ListenKey: ${error.message}.`;
      console.warn(networkErrorMsg);
      throw new Error(networkErrorMsg);
    }
    if (!error.message.startsWith("ListenKey delete failed") && !error.message.startsWith("Network error")) {
        console.error('Failed to delete Aster ListenKey (unexpected):', error.message);
        throw new Error(`Failed to delete Aster ListenKey: ${error.message}`);
    }
    throw error;
  }
}
