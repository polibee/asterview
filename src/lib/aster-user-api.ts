// src/lib/aster-user-api.ts
'use server'; // Or remove if all functions are client-side compatible. Consider implications.

import type { 
  AsterAccountBalanceV2, 
  AsterAccountInfoV2, 
  AsterPositionV2,
  AsterUserTrade,
  AsterCommissionRate,
  AsterListenKey
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
): Promise<T | null> {
  if (!apiKey || !secretKey) {
    console.error('API key or secret key is missing for authenticated request.');
    // In a real app, might throw or return a specific error object
    return null; 
  }

  const timestamp = Date.now();
  let queryParams = { ...params, timestamp };
  
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  const signature = hmacSHA256(queryString, secretKey);
  const url = `${endpoint}?${queryString}&signature=${signature}`;

  const headers = new Headers();
  headers.append('X-MBX-APIKEY', apiKey);
  headers.append('Content-Type', 'application/x-www-form-urlencoded');


  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Aster User API error (${endpoint}): ${response.status} ${errorBody}`);
      // Consider throwing a custom error or returning an error object
      return null; 
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`Failed to fetch Aster User API (${endpoint}):`, error);
    return null;
  }
}

export async function fetchAsterAccountBalances(apiKey: string, secretKey: string): Promise<AsterAccountBalanceV2[] | null> {
  return makeAsterAuthenticatedRequest<AsterAccountBalanceV2[]>(`${ASTER_API_V2_BASE_URL}/balance`, 'GET', apiKey, secretKey);
}

export async function fetchAsterAccountInfo(apiKey: string, secretKey: string): Promise<AsterAccountInfoV2 | null> {
  return makeAsterAuthenticatedRequest<AsterAccountInfoV2>(`${ASTER_API_V2_BASE_URL}/account`, 'GET', apiKey, secretKey);
}

export async function fetchAsterPositions(apiKey: string, secretKey: string, symbol?: string): Promise<AsterPositionV2[] | null> {
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
): Promise<AsterUserTrade[] | null> {
  const params: Record<string, any> = { symbol, limit };
  if (fromId) params.fromId = fromId;
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  
  return makeAsterAuthenticatedRequest<AsterUserTrade[]>(`${ASTER_API_BASE_URL}/userTrades`, 'GET', apiKey, secretKey, params);
}

export async function fetchAsterCommissionRate(apiKey: string, secretKey: string, symbol: string): Promise<AsterCommissionRate | null> {
   return makeAsterAuthenticatedRequest<AsterCommissionRate>(`${ASTER_API_BASE_URL}/commissionRate`, 'GET', apiKey, secretKey, { symbol });
}

// --- Listen Key for WebSocket ---
export async function createAsterListenKey(apiKey: string): Promise<AsterListenKey | null> {
  // Note: ListenKey creation typically doesn't need the secret key for the POST itself,
  // but it needs a valid API key. The signing is for data endpoints.
  // However, some exchanges might require signing even for listenKey management.
  // Aster's doc implies X-MBX-APIKEY header is enough for USER_STREAM POST.
  if (!apiKey) {
    console.error('API key is missing for creating listen key.');
    return null;
  }
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Aster ListenKey creation error: ${response.status} ${errorBody}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to create Aster ListenKey:', error);
    return null;
  }
}

export async function keepAliveAsterListenKey(apiKey: string, listenKey: string): Promise<Record<string, unknown> | null> {
  if (!apiKey || !listenKey) {
    console.error('API key or listenKey is missing for keepAlive.');
    return null;
  }
   try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'PUT',
      headers: { 'X-MBX-APIKEY': apiKey },
      body: new URLSearchParams({ listenKey }) // Or adjust if API expects JSON
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Aster ListenKey keepAlive error: ${response.status} ${errorBody}`);
      return null;
    }
    return await response.json(); // Expects {} on success
  } catch (error) {
    console.error('Failed to keepAlive Aster ListenKey:', error);
    return null;
  }
}

export async function deleteAsterListenKey(apiKey: string, listenKey: string): Promise<Record<string, unknown> | null> {
   if (!apiKey || !listenKey) {
    console.error('API key or listenKey is missing for delete.');
    return null;
  }
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'DELETE',
      headers: { 'X-MBX-APIKEY': apiKey },
      body: new URLSearchParams({ listenKey }) // Or adjust if API expects JSON
    });
     if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Aster ListenKey delete error: ${response.status} ${errorBody}`);
      return null;
    }
    return await response.json(); // Expects {} on success
  } catch (error) {
    console.error('Failed to delete Aster ListenKey:', error);
    return null;
  }
}
