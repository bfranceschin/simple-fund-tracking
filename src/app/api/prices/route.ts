import { NextRequest } from 'next/server'
import { fetchPricesWithPreferredAPI } from '@/lib/api/crypto'
import { getPortfolioTokensServer } from '@/lib/server/portfolio-data'

export async function GET(request: NextRequest) {
  try {
    // Add request validation
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true'
    
    // Add cache control for 60 seconds (unless force refresh)
    const cacheControl = forceRefresh 
      ? 'no-cache, no-store, must-revalidate'
      : 'public, s-maxage=60, stale-while-revalidate=300'
    
    const tokens = await getPortfolioTokensServer()
    if (tokens.length === 0) {
      return Response.json(
        { error: 'Portfolio tokens are not initialized in Convex' },
        { status: 400 }
      )
    }
    const startTime = Date.now()
    const priceData = await fetchPricesWithPreferredAPI(tokens)
    const fetchTime = Date.now() - startTime
    
    // Transform PriceData to legacy format for backward compatibility
    const prices: Record<string, number> = {}
    Object.entries(priceData).forEach(([tokenId, data]) => {
      prices[tokenId] = data.price
    })
    
    const response = {
      prices,
      priceData, // Include the full PriceData for new features
      timestamp: new Date().toISOString(),
      metadata: {
        tokenCount: Object.keys(prices).length,
        fetchTimeMs: fetchTime,
        source: 'server'
      }
    }
    
    return Response.json(response, {
      headers: {
        'Cache-Control': cacheControl,
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    console.error('Price fetch error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return Response.json(
      { 
        error: 'Failed to fetch prices',
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
