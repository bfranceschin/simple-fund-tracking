import { PortfolioItem, TokenMetadata, PerformanceResult, PriceData } from '@/lib/types/portfolio'

/**
 * Calculate current value based on special calculation rules
 * Amount is passed as a parameter (derived from transactions)
 */
export function calculateCurrentValue(
  token: TokenMetadata,
  amount: number,
  currentPrices: Record<string, PriceData>
): number {
  switch (token.specialCalculation) {
    case 'ETH_AMOUNT': {
      // For ETHW, ETHA, Staked ETH - use current ETH price
      const ethPrice = currentPrices['ethereum']?.price || 0
      return amount * ethPrice
    }
    case 'BTC_AMOUNT': {
      // For BITB - use current BTC price
      const btcPrice = currentPrices['bitcoin']?.price || 0
      return amount * btcPrice
    }
    case 'REGULAR':
    default: {
      // Regular calculation: amount * current price
      const currentPrice = currentPrices[token.id]?.price || 0
      return amount * currentPrice
    }
  }
}

/**
 * Calculate performance percentage (current value vs cost basis)
 */
export function calculatePerformance(
  currentValue: number,
  costBasis: number
): PerformanceResult {
  if (costBasis === 0) {
    return {
      currentValue,
      baselineValue: costBasis,
      performance: 0,
      isPositive: true
    }
  }
  const performance = ((currentValue - costBasis) / costBasis) * 100
  
  return {
    currentValue,
    baselineValue: costBasis,
    performance,
    isPositive: performance >= 0
  }
}

/**
 * Calculate portfolio percentages
 */
export function calculatePercentages(items: PortfolioItem[]): PortfolioItem[] {
  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0)
  
  return items.map(item => ({
    ...item,
    percentage: totalValue > 0 ? (item.currentValue / totalValue) * 100 : 0
  }))
}

/**
 * Aggregate data by category
 */
export function aggregateByCategory(items: PortfolioItem[]) {
  const categories = new Map<string, {
    category: string
    totalValue: number
    items: PortfolioItem[]
  }>()
  
  items.forEach(item => {
    const category = item.token.category
    const existing = categories.get(category)
    
    if (existing) {
      existing.totalValue += item.currentValue
      existing.items.push(item)
    } else {
      categories.set(category, {
        category,
        totalValue: item.currentValue,
        items: [item]
      })
    }
  })
  
  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0)
  
  return Array.from(categories.values()).map(cat => ({
    ...cat,
    percentage: totalValue > 0 ? (cat.totalValue / totalValue) * 100 : 0
  }))
}

/**
 * Calculate total portfolio performance (legacy - still useful for display)
 */
export function calculateTotalPerformance(currentValue: number, baselineValue: number): PerformanceResult {
  return calculatePerformance(currentValue, baselineValue)
}

/**
 * Get current price for a token
 */
export function getCurrentPrice(
  tokenId: string,
  currentPrices: Record<string, PriceData>
): number {
  return currentPrices[tokenId]?.price || 0
}

/**
 * Get 24h change for a token
 */
export function get24hChange(
  tokenId: string,
  currentPrices: Record<string, PriceData>
): number | undefined {
  return currentPrices[tokenId]?.change24h
}

/**
 * Create portfolio item from token metadata, holdings, cost basis, and current prices
 * Now receives amount and costBasis from transaction processing
 */
export function createPortfolioItem(
  token: TokenMetadata,
  amount: number,
  costBasis: number,
  currentPrices: Record<string, PriceData>
): PortfolioItem {
  const currentPrice = getCurrentPrice(token.id, currentPrices)
  const currentValue = calculateCurrentValue(token, amount, currentPrices)
  const performance = calculatePerformance(currentValue, costBasis)
  const change24h = get24hChange(token.id, currentPrices)
  const priceData = currentPrices[token.id]
  
  return {
    token,
    amount,
    currentPrice,
    currentValue,
    percentage: 0, // Will be calculated later
    performance: performance.performance,
    costBasis,
    change24h,
    marketCap: priceData?.marketCap,
    fdv: priceData?.fdv
  }
}

/**
 * Aggregate Bitcoin and Ethereum categories into single lines for table display
 */
export function aggregateBitcoinEthereumCategories(items: PortfolioItem[]): PortfolioItem[] {
  const aggregatedItems: PortfolioItem[] = []
  const btcItems: PortfolioItem[] = []
  const ethItems: PortfolioItem[] = []
  const otherItems: PortfolioItem[] = []

  // Separate items by category
  items.forEach(item => {
    if (item.token.category === 'Btc') {
      btcItems.push(item)
    } else if (item.token.category === 'Eth') {
      ethItems.push(item)
    } else {
      otherItems.push(item)
    }
  })

  // Create aggregated Bitcoin item
  if (btcItems.length > 0) {
    const totalBtcValue = btcItems.reduce((sum, item) => sum + item.currentValue, 0)
    const totalBtcCostBasis = btcItems.reduce((sum, item) => sum + item.costBasis, 0)
    const btcPerformance = calculatePerformance(totalBtcValue, totalBtcCostBasis)
    const btcChange24h = btcItems[0].change24h // Use BTC 24h change from first item
    
    // Calculate total BTC amount
    const totalBtcAmount = btcItems.reduce((sum, item) => sum + item.amount, 0)
    
    // Use the first BTC item as template, but with aggregated values
    const btcTemplate = btcItems[0]
    const aggregatedBtc: PortfolioItem = {
      token: {
        ...btcTemplate.token,
        symbol: 'BTC',
        name: 'Bitcoin (Aggregated)',
        specialCalculation: 'BTC_AMOUNT'
      },
      amount: totalBtcAmount,
      currentPrice: btcTemplate.currentPrice,
      currentValue: totalBtcValue,
      percentage: 0,
      performance: btcPerformance.performance,
      costBasis: totalBtcCostBasis,
      change24h: btcChange24h,
      marketCap: btcTemplate.marketCap,
      fdv: btcTemplate.fdv
    }
    aggregatedItems.push(aggregatedBtc)
  }

  // Create aggregated Ethereum item
  if (ethItems.length > 0) {
    const totalEthValue = ethItems.reduce((sum, item) => sum + item.currentValue, 0)
    const totalEthCostBasis = ethItems.reduce((sum, item) => sum + item.costBasis, 0)
    const ethPerformance = calculatePerformance(totalEthValue, totalEthCostBasis)
    const ethChange24h = ethItems[0].change24h // Use ETH 24h change from first item
    
    // Calculate total ETH amount
    const totalEthAmount = ethItems.reduce((sum, item) => sum + item.amount, 0)
    
    // Use the first ETH item as template, but with aggregated values
    const ethTemplate = ethItems[0]
    const aggregatedEth: PortfolioItem = {
      token: {
        ...ethTemplate.token,
        symbol: 'ETH',
        name: 'Ethereum (Aggregated)',
        specialCalculation: 'ETH_AMOUNT'
      },
      amount: totalEthAmount,
      currentPrice: ethTemplate.currentPrice,
      currentValue: totalEthValue,
      percentage: 0,
      performance: ethPerformance.performance,
      costBasis: totalEthCostBasis,
      change24h: ethChange24h,
      marketCap: ethTemplate.marketCap,
      fdv: ethTemplate.fdv
    }
    aggregatedItems.push(aggregatedEth)
  }

  // Add all other items unchanged
  aggregatedItems.push(...otherItems)

  // Recalculate percentages for all items
  return calculatePercentages(aggregatedItems)
}
