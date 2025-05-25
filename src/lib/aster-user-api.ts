
// src/lib/aster-user-api.ts
'use server'; 

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
): Promise<T> { // Changed to throw error instead of returning null
  if (!apiKey || !secretKey) {
    console.error('API key or secret key is missing for authenticated request.');
    throw new Error('API key or secret key is missing.');
  }

  const timestamp = Date.now();
  let queryParams = { ...params, timestamp, recvWindow: 5000 }; // Added recvWindow
  
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  const signature = hmacSHA256(queryString, secretKey);
  const url = `${endpoint}?${queryString}&signature=${signature}`;

  const headers = new Headers();
  headers.append('X-MBX-APIKEY', apiKey);
  // For GET/DELETE, Content-Type is not typically needed if body is not sent.
  // For POST/PUT, it should be set if body is form-urlencoded
  if (method === 'POST' || method === 'PUT') {
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
  }


  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
      // Body is not added here as params are in query string for this setup
    });

    const responseBodyText = await response.text(); // Read body once

    if (!response.ok) {
      console.error(`Aster User API error (${endpoint}): ${response.status} ${responseBodyText}`);
      // Attempt to parse as JSON for structured error, otherwise use text
      try {
        const errorJson = JSON.parse(responseBodyText);
        throw new Error(errorJson.msg || `API Error ${response.status}: ${responseBodyText}`);
      } catch (e) {
        throw new Error(`API Error ${response.status}: ${responseBodyText}`);
      }
    }
    // If response is OK, try to parse as JSON
    try {
        return JSON.parse(responseBodyText) as T;
    } catch (e) {
        // Handle cases where successful response might not be JSON (e.g. {} for keepAlive)
        if (responseBodyText.trim() === '{}' && (method === 'PUT' || method === 'DELETE')) {
            return {} as T; 
        }
        console.error(`Error parsing JSON response from ${endpoint}: ${responseBodyText}`, e);
        throw new Error(`Failed to parse API response: ${responseBodyText}`);
    }
  } catch (error: any) {
    console.error(`Failed to fetch Aster User API (${endpoint}):`, error.message);
    throw error; // Re-throw the caught error or a new one
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
    console.error('API key or listenKey is missing for keepAlive.');
    throw new Error('API key or listenKey is missing for keepAlive.');
  }
   try {
    // Aster's keepalive is a PUT to /listenKey with NO body parameters, just the API key in header.
    // The listenKey itself is part of the URL for the WebSocket, not typically sent in PUT body for keepalive.
    // Re-checking docs: `PUT /fapi/v1/listenKey` with `X-MBX-APIKEY` and NO parameters.
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'PUT',
      headers: { 'X-MBX-APIKEY': apiKey },
      // body: new URLSearchParams({ listenKey }) // This is likely incorrect for Aster PUT listenKey
    });
    const responseBodyText = await response.text();
    if (!response.ok) {
      console.error(`Aster ListenKey keepAlive error: ${response.status} ${responseBodyText}`);
      throw new Error(`ListenKey keepAlive failed: ${responseBodyText}`);
    }
    return JSON.parse(responseBodyText); 
  } catch (error: any) {
    console.error('Failed to keepAlive Aster ListenKey:', error.message);
    throw error;
  }
}

export async function deleteAsterListenKey(apiKey: string, listenKey: string): Promise<Record<string, unknown>> {
   if (!apiKey || !listenKey) {
    console.error('API key or listenKey is missing for delete.');
    throw new Error('API key or listenKey is missing for delete.');
  }
  try {
    // Aster's delete is a DELETE to /listenKey with NO body parameters, just the API key in header.
    // Re-checking docs: `DELETE /fapi/v1/listenKey` with `X-MBX-APIKEY` and NO parameters.
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'DELETE',
      headers: { 'X-MBX-APIKEY': apiKey },
      // body: new URLSearchParams({ listenKey }) // This is likely incorrect for Aster DELETE listenKey
    });
    const responseBodyText = await response.text();
     if (!response.ok) {
      console.error(`Aster ListenKey delete error: ${response.status} ${responseBodyText}`);
      throw new Error(`ListenKey delete failed: ${responseBodyText}`);
    }
    return JSON.parse(responseBodyText); 
  } catch (error:any) {
    console.error('Failed to delete Aster ListenKey:', error.message);
    throw error;
  }
}

    