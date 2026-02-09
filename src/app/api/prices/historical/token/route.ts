import { NextRequest } from 'next/server'
import { fetchHistoricalPriceSingle, RateLimitError } from '@/lib/api/crypto'

/**
 * Single token historical price endpoint
 * GET /api/prices/historical/token?id=bitcoin&date=2025-07-02
 * 
 * This endpoint fetches ONE token's historical price from CoinGecko.
 * Used by the client to orchestrate sequential fetching with delays.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const tokenId = url.searchParams.get('id')
    const date = url.searchParams.get('date')
    
    // Validate tokenId parameter
    if (!tokenId) {
      return Response.json(
        { 
          error: 'Missing id parameter',
          message: 'Please provide a token ID (e.g., id=bitcoin)',
          timestamp: new Date().toISOString()
        }, 
        { status: 400 }
      )
    }
    
    // Validate date parameter
    if (!date) {
      return Response.json(
        { 
          error: 'Missing date parameter',
          message: 'Please provide a date in YYYY-MM-DD format',
          timestamp: new Date().toISOString()
        }, 
        { status: 400 }
      )
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return Response.json(
        { 
          error: 'Invalid date format',
          message: 'Date must be in YYYY-MM-DD format',
          timestamp: new Date().toISOString()
        }, 
        { status: 400 }
      )
    }
    
    // Validate date is not in the future
    const requestedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (requestedDate > today) {
      return Response.json(
        { 
          error: 'Invalid date',
          message: 'Date cannot be in the future',
          timestamp: new Date().toISOString()
        }, 
        { status: 400 }
      )
    }
    
    const startTime = Date.now()
    const priceData = await fetchHistoricalPriceSingle(tokenId, date)
    const fetchTime = Date.now() - startTime
    
    if (!priceData) {
      return Response.json(
        { 
          error: 'No price data found',
          message: `Could not find historical price for ${tokenId} on ${date}`,
          tokenId,
          date,
          timestamp: new Date().toISOString()
        }, 
        { status: 404 }
      )
    }
    
    const response = {
      tokenId,
      date,
      price: priceData.price,
      marketCap: priceData.marketCap,
      timestamp: new Date().toISOString(),
      metadata: {
        fetchTimeMs: fetchTime,
        source: 'coingecko-historical'
      }
    }
    
    return Response.json(response, {
      headers: {
        // Cache historical data longer since it doesn't change
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        {
          error: 'Rate limit reached',
          message: error.message,
          timestamp: new Date().toISOString()
        },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      )
    }
    console.error('Single token historical price fetch error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return Response.json(
      { 
        error: 'Failed to fetch historical price',
        message: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  }
}
