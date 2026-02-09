import { NextRequest } from 'next/server'
import { fetchHistoricalPricesForTokens, RateLimitError } from '@/lib/api/crypto'
import { getPortfolioTokensServer } from '@/lib/server/portfolio-data'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    
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
    
    const tokens = await getPortfolioTokensServer()
    if (tokens.length === 0) {
      return Response.json(
        { error: 'Portfolio tokens are not initialized in Convex' },
        { status: 400 }
      )
    }
    const startTime = Date.now()
    const priceData = await fetchHistoricalPricesForTokens(tokens, date)
    const fetchTime = Date.now() - startTime
    
    // Transform PriceData to legacy format for backward compatibility
    const prices: Record<string, number> = {}
    Object.entries(priceData).forEach(([tokenId, data]) => {
      prices[tokenId] = data.price
    })
    
    const response = {
      date,
      prices,
      priceData, // Include the full PriceData for new features
      timestamp: new Date().toISOString(),
      metadata: {
        tokenCount: Object.keys(prices).length,
        fetchTimeMs: fetchTime,
        source: 'coingecko-historical'
      }
    }
    
    return Response.json(response, {
      headers: {
        // Cache historical data longer since it doesn't change
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
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
    console.error('Historical price fetch error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return Response.json(
      { 
        error: 'Failed to fetch historical prices',
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
