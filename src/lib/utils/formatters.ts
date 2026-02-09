import numeral from 'numeral'

/**
 * Format currency values
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  if (value >= 1_000_000) {
    return numeral(value).format('$0.0a') // $1.2M
  } else if (value >= 1_000) {
    return numeral(value).format('$0,000') // $1,234
  } else {
    return numeral(value).format('$0.00') // $123.45
  }
}

/**
 * Format percentages (expects decimal value, e.g., 0.05 for 5%)
 */
export function formatPercentage(value: number): string {
  return numeral(value).format('0.00%')
}

/**
 * Format performance values (expects percentage value, e.g., 5.0 for 5%)
 */
export function formatPerformance(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

/**
 * Format portfolio percentages (expects percentage value, e.g., 15.5 for 15.5%)
 */
export function formatPortfolioPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(2)}%`
}

/**
 * Format token amounts
 */
export function formatTokenAmount(amount: number, symbol: string): string {
  if (amount >= 1_000_000) {
    return `${numeral(amount).format('0.0a')} ${symbol}`
  } else if (amount >= 1_000) {
    return `${numeral(amount).format('0,000')} ${symbol}`
  } else {
    return `${numeral(amount).format('0.0000')} ${symbol}`
  }
}

/**
 * Format price values
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    return numeral(price).format('$0.00')
  } else {
    return numeral(price).format('$0.0000')
  }
}

/**
 * Get performance color class
 */
export function getPerformanceColor(performance: number | null | undefined): string {
  if (performance === null || performance === undefined) return '!text-gray-600'
  if (performance > 0) return '!text-green-600'
  if (performance < 0) return '!text-red-600'
  return '!text-gray-600'
}

/**
 * Get performance icon
 */
export function getPerformanceIcon(performance: number | null | undefined): string {
  if (performance === null || performance === undefined) return ''
  if (performance > 0) return '↗'
  if (performance < 0) return '↘'
  return '→'
}

/**
 * Format large numbers with abbreviations
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return numeral(value).format('0.0a') // 1.2B
  } else if (value >= 1_000_000) {
    return numeral(value).format('0.0a') // 1.2M
  } else if (value >= 1_000) {
    return numeral(value).format('0.0a') // 1.2K
  } else {
    return numeral(value).format('0')
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get category color for charts
 */
export function getCategoryColor(category: string): string {
  const colors = {
    'Btc': '#F7931A',
    'Eth': '#627EEA',
    'AI': '#10B981',
    'Gaming/Meme': '#8B5CF6',
    'Defi': '#F59E0B',
    'Micro': '#6B7280'
  }
  
  return colors[category as keyof typeof colors] || '#6B7280'
}

/**
 * Format market cap values
 */
export function formatMarketCap(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  if (value === 0) return '-'
  
  if (value >= 1_000_000_000) {
    return numeral(value).format('$0.0a') // $1.2B
  } else if (value >= 1_000_000) {
    return numeral(value).format('$0.0a') // $1.2M
  } else if (value >= 1_000) {
    return numeral(value).format('$0.0a') // $1.2K
  } else {
    return numeral(value).format('$0')
  }
}

/**
 * Format FDV (Fully Diluted Valuation) values
 */
export function formatFDV(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  if (value === 0) return '-'
  
  if (value >= 1_000_000_000) {
    return numeral(value).format('$0.0a') // $1.2B
  } else if (value >= 1_000_000) {
    return numeral(value).format('$0.0a') // $1.2M
  } else if (value >= 1_000) {
    return numeral(value).format('$0.0a') // $1.2K
  } else {
    return numeral(value).format('$0')
  }
} 