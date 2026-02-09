import { CoinGeckoPriceResponse, TokenMetadata, PriceData } from '@/lib/types/portfolio'

const COINGECKO_API_URL = process.env.NEXT_PUBLIC_COINGECKO_API_URL || 'https://api.coingecko.com/api/v3'

/**
 * Fetch current prices, market cap, FDV, and 24h changes for multiple tokens from CoinGecko
 */
export async function fetchPricesWithCoinGecko(tokenIds: string[]): Promise<Record<string, PriceData>> {
  try {
    // Use the /coins/markets endpoint to get market cap and FDV data
    const ids = tokenIds.join(',')
    const url = `${COINGECKO_API_URL}/coins/markets?ids=${ids}&vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`
    
    const response = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 60 seconds
      // headers: {
      //   'Accept': 'application/json',
      //   // ...(process.env.COINGECKO_API_KEY ? { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY } : {})
      // },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform the response to include price, market cap, FDV, and 24h change
    const prices: Record<string, PriceData> = {}
    data.forEach((coin: any) => {
      prices[coin.id] = {
        price: coin.current_price || 0,
        change24h: coin.price_change_percentage_24h,
        marketCap: coin.market_cap,
        fdv: coin.fully_diluted_valuation
      }
    })
    
    return prices
  } catch (error) {
    console.error('Error fetching crypto prices:', error)
    throw new Error('Failed to fetch cryptocurrency prices')
  }
}

/**
 * Fetch current prices and 24h changes for multiple tokens from CoinGecko
 */
export async function fetchCryptoPrices(tokens: TokenMetadata[]): Promise<Record<string, PriceData>> {
  // Filter out tokens that use ETH_AMOUNT or BTC_AMOUNT special calculations
  // These tokens will use ETH and BTC prices respectively
  const tokensNeedingPrices = tokens.filter(token => 
    !token.specialCalculation || token.specialCalculation === 'REGULAR'
  )
  
  // Get unique CoinGecko IDs for tokens that need price fetching
  const uniqueIds = new Set<string>()
  tokensNeedingPrices.forEach(token => {
    uniqueIds.add(token.id)
  })
  
  const tokenIds = Array.from(uniqueIds)
  
  return fetchPricesWithCoinGecko(tokenIds)
}

/**
 * Fetch price for a single token
 */
export async function fetchTokenPrice(token: TokenMetadata): Promise<PriceData> {
  // If token uses special calculation, it doesn't need its own price
  if (token.specialCalculation && token.specialCalculation !== 'REGULAR') {
    return { price: 0 }
  }
  
  const prices = await fetchPricesWithPreferredAPI([token])
  return prices[token.id] || { price: 0 }
}

/**
 * Get unique token IDs from portfolio data
 */
export function getUniqueTokenIds(tokens: TokenMetadata[]): string[] {
  // Only include tokens that need price fetching (not ETH_AMOUNT or BTC_AMOUNT)
  const tokensNeedingPrices = tokens.filter(token => 
    !token.specialCalculation || token.specialCalculation === 'REGULAR'
  )
  
  const uniqueIds = new Set<string>()
  tokensNeedingPrices.forEach(token => {
    uniqueIds.add(token.id)
  })
  return Array.from(uniqueIds)
}

/**
 * Mock data for development/testing when API is unavailable
 */
export function getMockPrices(): Record<string, PriceData> {
  return {
    'bitcoin': { price: 95000, change24h: 2.5, marketCap: 1879200000000, fdv: 1995000000000 },
    'ethereum': { price: 3200, change24h: -1.2, marketCap: 384640000000, fdv: 384640000000 },
    'wrapped-eeth': { price: 3200, change24h: -1.2, marketCap: 16000000, fdv: 16000000 },
    'freysa-ai': { price: 0.018, change24h: 5.8, marketCap: 18000000, fdv: 180000000 },
    'superverse': { price: 0.75, change24h: 3.2, marketCap: 750000000, fdv: 1125000000 },
    'aioz-network': { price: 0.35, change24h: -0.8, marketCap: 280000000, fdv: 350000000 },
    'pudgy-penguins': { price: 0.016, change24h: 12.5, marketCap: 1600000000, fdv: 1600000000 },
    'worldcoin': { price: 1.05, change24h: -2.1, marketCap: 1575000000, fdv: 10500000000 },
    'avalanche-2': { price: 20.50, change24h: 1.8, marketCap: 8815000000, fdv: 22000000000 },
    'aave': { price: 300, change24h: -0.5, marketCap: 4800000000, fdv: 4800000000 },
    'pendle': { price: 4.20, change24h: 7.3, marketCap: 1008000000, fdv: 1008000000 },
    'maple-finance': { price: 0.60, change24h: -1.5, marketCap: 60000000, fdv: 60000000 },
    'ether-fi': { price: 1.15, change24h: 2.8, marketCap: 1265000000, fdv: 1265000000 },
    'pinlink': { price: 0.50, change24h: -3.2, marketCap: 50000000, fdv: 500000000 },
    'vertical-ai': { price: 0.20, change24h: 15.7, marketCap: 200000000, fdv: 2000000000 },
    'nodeai': { price: 0.35, change24h: 8.9, marketCap: 350000000, fdv: 3500000000 },
    'yieldstone': { price: 0.04, change24h: -5.2, marketCap: 4000000, fdv: 40000000 },
    'agent-virtual-machine': { price: 0.28, change24h: 4.1, marketCap: 280000000, fdv: 2800000000 },
    'parallelai': { price: 0.11, change24h: 6.7, marketCap: 110000000, fdv: 1100000000 },
  }
}

/**
 * Fetch prices with fallback to mock data
 */
export async function fetchPricesWithFallback(tokens: TokenMetadata[]): Promise<Record<string, PriceData>> {
  try {
    return await fetchCryptoPrices(tokens)
  } catch (error) {
    console.warn('Using mock data due to API error:', error)
    const mockPrices = getMockPrices()
    
    // Return only the requested token prices for tokens that need price fetching
    const fallbackPrices: Record<string, PriceData> = {}
    tokens.forEach(token => {
      if (!token.specialCalculation || token.specialCalculation === 'REGULAR') {
        fallbackPrices[token.id] = mockPrices[token.id] || { price: 0, marketCap: 0, fdv: 0 }
      }
    })
    
    return fallbackPrices
  }
}

/**
 * Fetch current prices, market cap, FDV, and 24h changes for multiple tokens from CoinMarketCap
 */
export async function fetchCoinMarketCapPrices(symbols: string[]): Promise<Record<string, PriceData>> {
  const CMC_API_URL = process.env.NEXT_PUBLIC_COINMARKETCAP_API_URL || 'https://pro-api.coinmarketcap.com/v1'
  const apiKey = process.env.COINMARKETCAP_API_KEY
  if (!apiKey) throw new Error('COINMARKETCAP_API_KEY is not set')

  const symbolParam = symbols.join(',')
  const url = `${CMC_API_URL}/cryptocurrency/quotes/latest?symbol=${symbolParam}&convert=USD`

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-CMC_PRO_API_KEY': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`CoinMarketCap API error: ${response.status}`)
  }

  const data = await response.json()
  const prices: Record<string, PriceData> = {}
  for (const symbol of symbols) {
    const quote = data.data?.[symbol]?.quote?.USD
    if (quote) {
      prices[symbol] = {
        price: quote.price || 0,
        change24h: quote.percent_change_24h || 0,
        marketCap: quote.market_cap,
        fdv: quote.fully_diluted_market_cap
      }
    }
  }
  return prices
}

/**
 * Fetch prices using preferred API for each token
 * Uses the preferredAPI field from token metadata to determine which API to use
 */
export async function fetchPricesWithPreferredAPI(tokens: TokenMetadata[]): Promise<Record<string, PriceData>> {
  // Filter tokens that need price fetching (not ETH_AMOUNT or BTC_AMOUNT)
  const tokensNeedingPrices = tokens.filter(token => 
    !token.specialCalculation || token.specialCalculation === 'REGULAR'
  )
  
  const prices: Record<string, PriceData> = {}
  
  // Group tokens by preferred API
  const coingeckoTokens = tokensNeedingPrices.filter(token => token.preferredAPI === 'coingecko')
  const cmcTokens = tokensNeedingPrices.filter(token => token.preferredAPI === 'coinmarketcap')
  
  // Fetch from CoinGecko for tokens that prefer it
  if (coingeckoTokens.length > 0) {
    try {
      const coingeckoIds = coingeckoTokens.map(token => token.id)
      const coingeckoPrices = await fetchPricesWithCoinGecko(coingeckoIds)
      console.log('CoinGecko prices:', coingeckoPrices)
      
      // Map CoinGecko prices back to token IDs
      for (const token of coingeckoTokens) {
        if (coingeckoPrices[token.id]) {
          prices[token.id] = coingeckoPrices[token.id]
        }
      }
    } catch (error) {
      console.error('CoinGecko fetch failed:', error)
      // Fallback to CoinMarketCap for failed CoinGecko tokens
      const fallbackTokens = coingeckoTokens.filter(token => token.cmcSymbol)
      const fallbackSymbols = fallbackTokens.map(token => token.cmcSymbol!).filter(Boolean)
      
      if (fallbackSymbols.length > 0) {
        try {
          const fallbackPrices = await fetchCoinMarketCapPrices(fallbackSymbols)
          console.log('CoinGecko fallback to CMC prices:', fallbackPrices)
          
          for (const token of fallbackTokens) {
            if (token.cmcSymbol && fallbackPrices[token.cmcSymbol]) {
              prices[token.id] = fallbackPrices[token.cmcSymbol]
            }
          }
        } catch (fallbackError) {
          console.error('CMC fallback also failed:', fallbackError)
        }
      }
    }
  }
  
  // Fetch from CoinMarketCap for tokens that prefer it
  if (cmcTokens.length > 0) {
    try {
      const cmcSymbols = cmcTokens
        .map(token => token.cmcSymbol)
        .filter(Boolean) as string[]
      
      if (cmcSymbols.length > 0) {
        const cmcPrices = await fetchCoinMarketCapPrices(cmcSymbols)
        console.log('CoinMarketCap prices:', cmcPrices)
        
        // Map CoinMarketCap prices back to token IDs
        for (const token of cmcTokens) {
          if (token.cmcSymbol && cmcPrices[token.cmcSymbol]) {
            prices[token.id] = cmcPrices[token.cmcSymbol]
          }
        }
      }
    } catch (error) {
      console.error('CoinMarketCap fetch failed:', error)
    }
  }
  
  console.log('Final prices with preferred APIs:', prices)
  return prices
}

// Legacy function for backward compatibility - returns just prices
export async function fetchPricesWithCoinGeckoLegacy(tokenIds: string[]): Promise<Record<string, number>> {
  const priceData = await fetchPricesWithCoinGecko(tokenIds)
  const prices: Record<string, number> = {}
  Object.entries(priceData).forEach(([tokenId, data]) => {
    prices[tokenId] = data.price
  })
  return prices
}

// Legacy function for backward compatibility - returns just prices
export async function fetchPricesWithPreferredAPILegacy(tokens: TokenMetadata[]): Promise<Record<string, number>> {
  const priceData = await fetchPricesWithPreferredAPI(tokens)
  const prices: Record<string, number> = {}
  Object.entries(priceData).forEach(([tokenId, data]) => {
    prices[tokenId] = data.price
  })
  return prices
}

/**
 * Fetch historical price for a single token from CoinGecko
 * Uses the /coins/{id}/history endpoint
 * @param tokenId - CoinGecko token ID
 * @param date - Date string in YYYY-MM-DD format
 */
export class RateLimitError extends Error {
  status = 429

  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export async function fetchHistoricalPriceSingle(tokenId: string, date: string): Promise<PriceData | null> {
  try {
    // Convert YYYY-MM-DD to DD-MM-YYYY for CoinGecko API
    const [year, month, day] = date.split('-')
    const formattedDate = `${day}-${month}-${year}`
    
    const url = `${COINGECKO_API_URL}/coins/${tokenId}/history?date=${formattedDate}&localization=false`
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache historical data for 1 hour
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError('CoinGecko rate limit reached')
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.market_data?.current_price?.usd) {
      return null
    }
    
    return {
      price: data.market_data.current_price.usd,
      marketCap: data.market_data.market_cap?.usd,
      // FDV not available in historical data
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    console.error(`Error fetching historical price for ${tokenId}:`, error)
    return null
  }
}

/**
 * Fetch historical prices for multiple tokens from CoinGecko
 * Note: CoinGecko free tier has rate limits (30 calls/min), so we add delays
 * @param tokenIds - Array of CoinGecko token IDs
 * @param date - Date string in YYYY-MM-DD format
 */
export async function fetchHistoricalPrices(tokenIds: string[], date: string): Promise<Record<string, PriceData>> {
  const prices: Record<string, PriceData> = {}
  const uniqueIds = Array.from(new Set(tokenIds))
  
  // Fetch prices in batches to respect rate limits but improve speed
  // CoinGecko free tier: ~30 requests/minute, so we can do batches with small delays
  const BATCH_SIZE = 5
  const DELAY_BETWEEN_BATCHES = 2500 // 2.5 seconds between batches
  
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE)
    
    // Add delay between batches (except for the first one)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
    }
    
    // Fetch batch in parallel
    const batchResults = await Promise.all(
      batch.map(tokenId => fetchHistoricalPriceSingle(tokenId, date))
    )
    
    // Add results to prices map
    batch.forEach((tokenId, index) => {
      if (batchResults[index]) {
        prices[tokenId] = batchResults[index]!
      }
    })
  }
  
  return prices
}

/**
 * Fetch historical prices for tokens using the token registry
 * Handles special calculation tokens (ETH_AMOUNT, BTC_AMOUNT) by fetching base asset prices
 */
export async function fetchHistoricalPricesForTokens(
  tokens: TokenMetadata[], 
  date: string
): Promise<Record<string, PriceData>> {
  // Get unique CoinGecko IDs that we need to fetch
  // For special calculation tokens, we need the base asset (ETH or BTC)
  const tokenIdsToFetch = new Set<string>()
  
  for (const token of tokens) {
    if (token.specialCalculation === 'ETH_AMOUNT') {
      tokenIdsToFetch.add('ethereum')
    } else if (token.specialCalculation === 'BTC_AMOUNT') {
      tokenIdsToFetch.add('bitcoin')
    } else if (!token.specialCalculation || token.specialCalculation === 'REGULAR') {
      tokenIdsToFetch.add(token.id)
    }
  }
  
  return fetchHistoricalPrices(Array.from(tokenIdsToFetch), date)
}

/**
 * Compare prices between CoinGecko and CoinMarketCap for CMC-preferred tokens
 * This helps determine if we can consolidate to CoinGecko-only
 */
export interface PriceComparison {
  symbol: string
  coingeckoId: string
  cmcSymbol: string
  coingeckoPrice: number | null
  cmcPrice: number | null
  priceDifference: number | null  // Percentage difference
  coingeckoAvailable: boolean
  cmcAvailable: boolean
}

export interface ComparisonResult {
  comparisons: PriceComparison[]
  summary: {
    totalTokens: number
    coingeckoAvailable: number
    cmcAvailable: number
    bothAvailable: number
    avgPriceDifference: number | null
    maxPriceDifference: number | null
    tokensWithinTolerance: number  // Within 1% difference
    missingFromCoingecko: string[]
  }
}

export async function comparePrices(tokens: TokenMetadata[]): Promise<ComparisonResult> {
  // Filter tokens that need price fetching and prefer CMC
  const cmcPreferredTokens = tokens.filter(token => 
    token.preferredAPI === 'coinmarketcap' &&
    (!token.specialCalculation || token.specialCalculation === 'REGULAR')
  )

  const comparisons: PriceComparison[] = []
  
  // Get unique CoinGecko IDs
  const coingeckoIds = Array.from(new Set(cmcPreferredTokens.map(t => t.id)))
  
  // Get unique CMC symbols
  const cmcSymbols = Array.from(new Set(cmcPreferredTokens.map(t => t.cmcSymbol).filter(Boolean))) as string[]

  // Fetch from both APIs
  let coingeckoPrices: Record<string, PriceData> = {}
  let cmcPrices: Record<string, PriceData> = {}

  try {
    coingeckoPrices = await fetchPricesWithCoinGecko(coingeckoIds)
    console.log('CoinGecko prices for comparison:', coingeckoPrices)
  } catch (error) {
    console.error('CoinGecko fetch failed during comparison:', error)
  }

  try {
    cmcPrices = await fetchCoinMarketCapPrices(cmcSymbols)
    console.log('CMC prices for comparison:', cmcPrices)
  } catch (error) {
    console.error('CMC fetch failed during comparison:', error)
  }

  // Compare prices for each token
  for (const token of cmcPreferredTokens) {
    const cgPrice = coingeckoPrices[token.id]?.price ?? null
    const cmcPrice = token.cmcSymbol ? (cmcPrices[token.cmcSymbol]?.price ?? null) : null
    
    let priceDifference: number | null = null
    if (cgPrice !== null && cmcPrice !== null && cmcPrice !== 0) {
      priceDifference = Math.abs((cgPrice - cmcPrice) / cmcPrice) * 100
    }

    comparisons.push({
      symbol: token.symbol,
      coingeckoId: token.id,
      cmcSymbol: token.cmcSymbol || '',
      coingeckoPrice: cgPrice,
      cmcPrice: cmcPrice,
      priceDifference,
      coingeckoAvailable: cgPrice !== null && cgPrice > 0,
      cmcAvailable: cmcPrice !== null && cmcPrice > 0
    })
  }

  // Calculate summary statistics
  const coingeckoAvailable = comparisons.filter(c => c.coingeckoAvailable).length
  const cmcAvailable = comparisons.filter(c => c.cmcAvailable).length
  const bothAvailable = comparisons.filter(c => c.coingeckoAvailable && c.cmcAvailable).length
  
  const validDifferences = comparisons
    .map(c => c.priceDifference)
    .filter((d): d is number => d !== null)
  
  const avgPriceDifference = validDifferences.length > 0
    ? validDifferences.reduce((a, b) => a + b, 0) / validDifferences.length
    : null
  
  const maxPriceDifference = validDifferences.length > 0
    ? Math.max(...validDifferences)
    : null

  const tokensWithinTolerance = validDifferences.filter(d => d < 1).length
  
  const missingFromCoingecko = comparisons
    .filter(c => !c.coingeckoAvailable && c.cmcAvailable)
    .map(c => c.symbol)

  return {
    comparisons,
    summary: {
      totalTokens: comparisons.length,
      coingeckoAvailable,
      cmcAvailable,
      bothAvailable,
      avgPriceDifference,
      maxPriceDifference,
      tokensWithinTolerance,
      missingFromCoingecko
    }
  }
} 
