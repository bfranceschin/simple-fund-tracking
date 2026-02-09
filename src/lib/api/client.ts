/**
 * Client-side API utilities for fetching portfolio data
 */

import { PriceData } from '@/lib/types/portfolio'

export interface PricesResponse {
  prices: Record<string, number> // Legacy format for backward compatibility
  priceData?: Record<string, PriceData> // New format with 24h changes
  timestamp: string
  metadata?: {
    tokenCount: number
    fetchTimeMs: number
    source: string
  }
}

export interface HistoricalPricesResponse extends PricesResponse {
  date: string
}

export interface SingleTokenHistoricalResponse {
  tokenId: string
  date: string
  price: number
  marketCap?: number
  timestamp: string
  metadata?: {
    fetchTimeMs: number
    source: string
  }
}

export interface ApiError {
  error: string
  message?: string
  status?: number
  timestamp?: string
}

/**
 * Fetch current crypto prices from our API
 */
export async function fetchPrices(forceRefresh: boolean = false): Promise<PricesResponse> {
  const url = forceRefresh ? '/api/prices?refresh=true' : '/api/prices'
  
  const response = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds
    headers: {
      'Accept': 'application/json',
    }
  })

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }))
    const message = errorData.message || errorData.error || `HTTP error! status: ${response.status}`
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  const data = await response.json()
  
  if (!data.prices) {
    throw new Error('No prices received from API')
  }

  return data as PricesResponse
}

/**
 * Fetch prices with retry logic
 */
export async function fetchPricesWithRetry(maxRetries: number = 3, forceRefresh: boolean = false): Promise<PricesResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchPrices(forceRefresh)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        throw lastError
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Failed to fetch prices after retries')
}

/**
 * Fetch historical crypto prices from our API
 * @param date - Date in YYYY-MM-DD format
 */
export async function fetchHistoricalPrices(date: string): Promise<HistoricalPricesResponse> {
  const url = `/api/prices/historical?date=${date}`
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    }
  })

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }))
    const message = errorData.message || errorData.error || `HTTP error! status: ${response.status}`
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  const data = await response.json()
  
  if (!data.prices) {
    throw new Error('No prices received from API')
  }

  return data as HistoricalPricesResponse
}

/**
 * Fetch historical prices with retry logic
 */
export async function fetchHistoricalPricesWithRetry(date: string, maxRetries: number = 3): Promise<HistoricalPricesResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchHistoricalPrices(date)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        throw lastError
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Failed to fetch historical prices after retries')
}

/**
 * Fetch historical price for a single token
 * @param tokenId - CoinGecko token ID (e.g., 'bitcoin', 'ethereum')
 * @param date - Date in YYYY-MM-DD format
 * @param signal - Optional AbortSignal for cancellation
 */
export async function fetchSingleTokenHistoricalPrice(
  tokenId: string, 
  date: string,
  signal?: AbortSignal
): Promise<SingleTokenHistoricalResponse> {
  const url = `/api/prices/historical/token?id=${encodeURIComponent(tokenId)}&date=${encodeURIComponent(date)}`
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    signal
  })

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }))
    const message = errorData.message || errorData.error || `HTTP error! status: ${response.status}`
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  const data = await response.json()
  
  if (data.price === undefined) {
    throw new Error(`No price data for ${tokenId}`)
  }

  return data as SingleTokenHistoricalResponse
} 
