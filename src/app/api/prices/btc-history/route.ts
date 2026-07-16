import { fetchBitcoinMarketHistory, RateLimitError } from '@/lib/api/crypto'

export async function GET() {
  try {
    const startTime = Date.now()
    const points = await fetchBitcoinMarketHistory()
    const fetchTimeMs = Date.now() - startTime

    return Response.json(
      {
        asset: 'bitcoin',
        points,
        source: 'blockchain-com-market-price',
        timestamp: new Date().toISOString(),
        metadata: {
          pointCount: points.length,
          fetchTimeMs,
          startDate: points[0]?.date ?? null,
          endDate: points[points.length - 1]?.date ?? null,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('BTC history fetch error:', error)

    if (error instanceof RateLimitError) {
      return Response.json(
        {
          error: 'Rate limit exceeded',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      )
    }

    return Response.json(
      {
        error: 'Failed to fetch Bitcoin history',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
