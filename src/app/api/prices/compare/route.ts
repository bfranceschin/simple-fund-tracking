import { NextRequest } from 'next/server'
import { comparePrices } from '@/lib/api/crypto'
import { getPortfolioTokensServer } from '@/lib/server/portfolio-data'

export async function GET(request: NextRequest) {
  try {
    const tokens = await getPortfolioTokensServer()
    if (tokens.length === 0) {
      return Response.json(
        { error: 'Portfolio tokens are not initialized in Convex' },
        { status: 400 }
      )
    }
    const startTime = Date.now()
    const result = await comparePrices(tokens)
    const fetchTime = Date.now() - startTime

    return Response.json({
      ...result,
      metadata: {
        fetchTimeMs: fetchTime,
        timestamp: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    console.error('Price comparison error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return Response.json(
      { 
        error: 'Failed to compare prices',
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
