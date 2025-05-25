
// src/lib/aster-user-api.ts
// REMOVED: 'use server'; 
// IMPORTANT: These functions will now run in the user's browser.
// This requires the AsterDex API (fapi.asterdex.com) to have CORS headers
// configured to allow requests from your application's domain for authenticated endpoints.
// If CORS is not configured correctly on their side, these requests will fail.

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
    console.error('API key or secret key is missing for authenticated request to', endpoint);
    throw new Error('API Key or Secret Key is not configured.');
  }

  const timestamp = Date.now();
  const queryParams = { ...params, timestamp, recvWindow: 5000 }; // recvWindow is important

  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  const signature = hmacSHA256(queryString, secretKey);
  const url = `${endpoint}?${queryString}&signature=${signature}`;

  const headers = new Headers();
  headers.append('X-MBX-APIKEY', apiKey);
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') { // DELETE might also need this
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
      let apiErrorMessage = `API Error ${response.status}: ${responseBodyText}`;
      try {
        const errorJson = JSON.parse(responseBodyText);
        if (errorJson && errorJson.msg) {
          apiErrorMessage = `Aster API Error (${errorJson.code || response.status}): ${errorJson.msg}`;
        }
      } catch (e) {
        // Ignore parsing error if body isn't JSON, use the raw text
      }
      // Log the more detailed error that includes the response body text.
      console.error(`Aster User API request to ${endpoint} failed with status ${response.status}. Body: ${responseBodyText}`);
      throw new Error(apiErrorMessage);
    }
    
    // Handle potentially empty successful responses (e.g., for PUT/DELETE on listenKey)
    if (responseBodyText.trim() === '' || responseBodyText.trim() === '{}') {
        if (response.status === 200 && (method === 'PUT' || method === 'DELETE')) {
             // For PUT/DELETE listenKey, an empty JSON object {} is a success.
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
    // This catch block handles errors from the fetch() call itself (e.g., network issues)
    // or errors re-thrown from the !response.ok block, or JSON parsing errors.
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      // Network error (e.g., CORS, DNS, server unreachable)
      console.warn(`Network error or CORS issue fetching Aster User API (${endpoint} - ${method}): ${error.message}. Ensure AsterDex API allows requests from this origin.`);
      throw new Error(`Network error or CORS issue communicating with AsterDex API: ${error.message}. Please check browser console for details.`);
    } else if (!(error.message.startsWith("Aster API Error") || error.message.startsWith("Failed to parse API response") || error.message.startsWith("Network error or CORS issue"))) {
        console.error(`Unexpected error during Aster User API request to ${endpoint} (${method}):`, error);
    }
    throw error; // Re-throw the error to be handled by the calling component
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
  if (fromId !== undefined) params.fromId = fromId;
  if (startTime !== undefined) params.startTime = startTime;
  if (endTime !== undefined) params.endTime = endTime;

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
    limit: number = 1000
): Promise<AsterIncomeHistoryItem[]> {
    const params: Record<string, any> = { limit };
    if (incomeType) params.incomeType = incomeType;
    if (symbol) params.symbol = symbol;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    return makeAsterAuthenticatedRequest<AsterIncomeHistoryItem[]>(`${ASTER_API_BASE_URL}/income`, 'GET', apiKey, secretKey, params);
}


// --- Listen Key for WebSocket ---
// These also become client-side. Note: ListenKey management directly from the client
// means the API key is exposed in these non-signed requests too.
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
      throw new Error(`ListenKey creation failed (status ${response.status}): ${responseBodyText.substring(0,100)}`);
    }
    return JSON.parse(responseBodyText) as AsterListenKey;
  } catch (error: any) {
     if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.warn(`Network error or CORS issue creating Aster ListenKey: ${error.message}.`);
      throw new Error(`Network error or CORS issue creating Aster ListenKey: ${error.message}.`);
    }
    console.error('Failed to create Aster ListenKey:', error.message);
    throw new Error(`Failed to create Aster ListenKey: ${error.message}`);
  }
}

export async function keepAliveAsterListenKey(apiKey: string, listenKeyToUse: string): Promise<Record<string, unknown>> {
  if (!apiKey) {
    console.error('API key is missing for keepAlive.');
    throw new Error('API key is missing for keepAlive.');
  }
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'PUT',
      headers: { 'X-MBX-APIKEY': apiKey },
       // Body for PUT listenKey is just listenKey=<theKey> but it's actually just managed by API Key
    });
    const responseBodyText = await response.text();
    if (!response.ok) {
      console.error(`Aster ListenKey keepAlive error for key (status ${response.status}): ${responseBodyText}`);
      throw new Error(`ListenKey keepAlive failed (status ${response.status}): ${responseBodyText.substring(0,100)}`);
    }
    if (responseBodyText.trim() === '{}' || responseBodyText.trim() === '') {
        return {}; // Success with empty body
    }
    return JSON.parse(responseBodyText); // Success usually returns {}
  } catch (error: any) {
     if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.warn(`Network error or CORS issue keeping alive Aster ListenKey: ${error.message}.`);
      throw new Error(`Network error or CORS issue keeping alive Aster ListenKey: ${error.message}.`);
    }
    console.error('Failed to keepAlive Aster ListenKey:', error.message);
    throw new Error(`Failed to keepAlive Aster ListenKey: ${error.message}`);
  }
}

export async function deleteAsterListenKey(apiKey: string, listenKeyToUse: string): Promise<Record<string, unknown>> {
   if (!apiKey) {
    console.error('API key is missing for delete.');
    throw new Error('API key is missing for delete.');
  }
  try {
    const response = await fetch(`${ASTER_API_BASE_URL}/listenKey`, {
      method: 'DELETE',
      headers: { 'X-MBX-APIKEY': apiKey },
      // Body for DELETE listenKey is just listenKey=<theKey> but it's actually just managed by API Key
    });
    const responseBodyText = await response.text();
     if (!response.ok) {
      console.error(`Aster ListenKey delete error for key (status ${response.status}): ${responseBodyText}`);
      throw new Error(`ListenKey delete failed (status ${response.status}): ${responseBodyText.substring(0,100)}`);
    }
    if (responseBodyText.trim() === '{}' || responseBodyText.trim() === '') {
        return {}; // Success with empty body
    }
    return JSON.parse(responseBodyText); // Success usually returns {}
  } catch (error:any) {
     if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.warn(`Network error or CORS issue deleting Aster ListenKey: ${error.message}.`);
      throw new Error(`Network error or CORS issue deleting Aster ListenKey: ${error.message}.`);
    }
    console.error('Failed to delete Aster ListenKey:', error.message);
    throw new Error(`Failed to delete Aster ListenKey: ${error.message}`);
  }
}

