
// src/lib/aster-user-api.ts
'use server'; 

import type { 
  AsterAccountBalanceV2, 
  AsterAccountInfoV2, 
  AsterPositionV2,
  AsterUserTrade,
  AsterCommissionRate,
  AsterListenKey,
  AsterIncomeHistoryItem
} from '@/types';
import { hmacSHA256 } from './utils';

const ASTER_API_BASE_URL = 'https://fapi.asterdex.com/fapi/v1';
const ASTER_API_V2_BASE_URL = 'https://fapi.asterdex.com/fapi/v2';


async function makeAsterAuthenticatedRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  apiKey: string,
  secretKey: string,
  params?: Record<string, any>
): Promise<T> {
  if (!apiKey || !secretKey) {
    console.error('API key or secret key is missing for authenticated request.');
    throw new Error('API key or secret key is missing.');
  }

  const timestamp = Date.now();
  let queryParams = { ...params, timestamp, recvWindow: 5000 }; 
  
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  const signature = hmacSHA256(queryString, secretKey);
  const url = `${endpoint}?${queryString}&signature=${signature}`;

  const headers = new Headers();
  headers.append('X-MBX-APIKEY', apiKey);
  if (method === 'POST' || method === 'PUT') {
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
  }


  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
    });

    const responseBodyText = await response.text(); 

    if (!response.ok) {
      console.error(`Aster User API error (${endpoint} - ${method}): ${response.status} ${responseBodyText}`);
      try {
        const errorJson = JSON.parse(responseBodyText);
        throw new Error(errorJson.msg || `API Error ${response.status}: ${responseBodyText}`);
      } catch (e) {
        throw new Error(`API Error ${response.status}: ${responseBodyText}`);
      }
    }
    try {
        if (responseBodyText.trim() === '' && response.status === 200 && (method === 'PUT' || method === 'DELETE')) {
            // For PUT/DELETE that might return empty success response
            return {} as T;
        }
        return JSON.parse(responseBodyText) as T;
    } catch (e) {
        if (responseBodyText.trim() === '{}' && (method === 'PUT' || method === 'DELETE')) {
            return {} as T; 
        }
        console.error(`Error parsing JSON response from ${endpoint}: ${responseBodyText}`, e);
        throw new Error(`Failed to parse API response: ${responseBodyText}`);
    }
  } catch (error: any) {
    console.error(`Failed to fetch Aster User API (${endpoint} - ${method}):`, error.message);
    throw error; 
  }
}

export async function fetchAsterAccountBalances(apiKey: string, secretKey: string): Promise<AsterAccountBalanceV2[]> {
  return makeAsterAuthenticatedRequest<AsterAccountBalanceV2[]>(`${ASTER_API_V2_BASE_URL}/balance`, 'GET', apiKey, secretKey);
}

export async function fetchAsterAccountInfo(apiKey: string, secretKey: string): Promise<AsterAccountInfoV2> {
  return makeAsterAuthenticatedRequest<AsterAccountInfoV2>(`${ASTER_API_V2_BASE_URL}/account`, 'GET', apiKey, secretKey);
}

export async function fetchAsterPositions(apiKey: string, secretKey: string, symbol?: string): Promise<AsterPositionV2[]> {
  const params: Record<string, any> = {};
  if (symbol) {
    params.symbol = symbol;
  }
  return makeAsterAuthenticatedRequest<AsterPositionV2[]>(`${ASTER_API_V2_BASE_URL}/positionRisk`, 'GET', apiKey, secretKey, params);
}

export async function fetchAsterUserTrades(
  apiKey: string, 
  secretKey: string, 
  symbol: string, 
  limit: number = 500, 
  fromId?: number,
  startTime?: number,
  endTime?: number
): Promise<AsterUserTrade[]> {
  const params: Record<string, any> = { symbol, limit };
  if (fromId) params.fromId = fromId;
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  
  return makeAsterAuthenticatedRequest<AsterUserTrade[]>(`${ASTER_API_BASE_URL}/userTrades`, 'GET', apiKey, secretKey, params);
}

export async function fetchAsterCommissionRate(apiKey: string, secretKey: string, symbol: string): Promise<AsterCommissionRate> {
   return makeAsterAuthenticatedRequest<AsterCommissionRate>(`${ASTER_API_BASE_URL}/commissionRate`, 'GET', apiKey, secretKey, { symbol });
}

export async function fetchAsterIncomeHistory(
    apiKey: string,
    secretKey: string,
    incomeType?: "TRANSFER" | "WELCOME_BONUS" | "REALIZED_PNL" | "FUNDING_FEE" | "COMMISSION" | "INSURANCE_CLEAR" | "MARKET_MERCHANT_RETURN_REWARD" | string,
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000 // Default to fetching up to 1000 income records
): Promise<AsterIncomeHistoryItem[]> {
    const params: Record<string, any> = { limit };
    if (incomeType) params.incomeType = incomeType;
    if (symbol) params.symbol = symbol;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    return makeAsterAuthenticatedRequest<AsterIncomeHistoryItem[]>(`${ASTER_API_BASE_URL}/income`, 'GET', apiKey, secretKey, params);
}


// --- Listen Key for WebSocket ---
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
      console.error(`Aster ListenKey creation error: ${response.status} ${responseBodyText}`);
      throw new Error(`ListenKey creation failed: ${responseBodyText}`);
    }
    return JSON.parse(responseBodyText) as AsterListenKey;
  } catch (error: any) {
    console.error('Failed to create Aster ListenKey:', error.message);
    throw error;
  }
}

export async function keepAliveAsterListenKey(apiKey: string, listenKey: string): Promise<Record<string, unknown>> {
  if (!apiKey || !listenKey) {
    // ListenKey is not actually sent for keepAlive, but it's good to check it exists in component state
    console.error('API key or listenKey state is missing for keepAlive.');
    throw new Error('API key or listenKey state is missing for keepAlive.');
  }
   try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'PUT',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
    const responseBodyText = await response.text();
    if (!response.ok) {
      console.error(`Aster ListenKey keepAlive error: ${response.status} ${responseBodyText}`);
      throw new Error(`ListenKey keepAlive failed: ${responseBodyText}`);
    }
     // Expecting {} for success
    if (responseBodyText.trim() === '{}') {
        return {};
    }
    return JSON.parse(responseBodyText); 
  } catch (error: any) {
    console.error('Failed to keepAlive Aster ListenKey:', error.message);
    throw error;
  }
}

export async function deleteAsterListenKey(apiKey: string, listenKey: string): Promise<Record<string, unknown>> {
   if (!apiKey || !listenKey) {
    console.error('API key or listenKey state is missing for delete.');
    throw new Error('API key or listenKey state is missing for delete.');
  }
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'DELETE',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
    const responseBodyText = await response.text();
     if (!response.ok) {
      console.error(`Aster ListenKey delete error: ${response.status} ${responseBodyText}`);
      throw new Error(`ListenKey delete failed: ${responseBodyText}`);
    }
    // Expecting {} for success
    if (responseBodyText.trim() === '{}') {
        return {};
    }
    return JSON.parse(responseBodyText); 
  } catch (error:any) {
    console.error('Failed to delete Aster ListenKey:', error.message);
    throw error;
  }
}
