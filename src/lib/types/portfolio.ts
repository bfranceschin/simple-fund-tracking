// Token categories
export type TokenCategory = 'Btc' | 'Eth' | 'AI' | 'Gaming/Meme' | 'Defi' | 'Micro'

// Special calculation types
export type SpecialCalculationType = 'ETH_AMOUNT' | 'BTC_AMOUNT' | 'REGULAR'

// Preferred API for price fetching
export type PreferredAPI = 'coingecko' | 'coinmarketcap'

// Token metadata for API integration (no amounts - derived from transactions)
export interface TokenMetadata {
  id: string                    // CoinGecko ID (e.g., 'bitcoin', 'ethereum')
  symbol: string               // Token symbol (e.g., 'BTC', 'ETH')
  name: string                 // Full token name
  category: TokenCategory      // Portfolio category
  cmcSymbol?: string           // CoinMarketCap symbol for API fallback
  preferredAPI: PreferredAPI   // Preferred API for price fetching
  specialCalculation?: SpecialCalculationType
}

// Transaction types for fund accounting
export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'BUY' | 'SELL'

// Transaction record for fund tracking
export interface Transaction {
  id: string                   // Unique transaction ID
  date: string                 // ISO date string (e.g., '2025-07-02')
  type: TransactionType
  tokenSymbol?: string         // Required for BUY/SELL, undefined for DEPOSIT/WITHDRAW
  amount: number               // Token amount for BUY/SELL, USD for DEPOSIT/WITHDRAW
  priceAtTransaction?: number  // USD price per token at transaction time
  quotaValueAtTransaction?: number // Share value at DEPOSIT/WITHDRAW time
  usdValue: number             // Total USD value of transaction
}

export interface PortfolioSettings {
  baselineTotalValue: number
  initialQuotaValue: number
}

export interface PortfolioSnapshot {
  tokens: TokenMetadata[]
  transactions: Transaction[]
  settings: PortfolioSettings | null
}

// Fund state after processing transactions
export interface FundState {
  totalShares: number          // Total shares outstanding
  quotaValue: number           // Current quota value (portfolio value / shares)
  cashBalance: number          // USD cash in the fund
  holdings: Map<string, number> // tokenSymbol -> token amount
}

// Portfolio item with current data
export interface PortfolioItem {
  token: TokenMetadata
  amount: number               // Token amount held (from transactions)
  currentPrice: number         // Current USD price
  currentValue: number         // Calculated current USD value
  percentage: number           // % of total portfolio
  performance: number          // % change from cost basis
  costBasis: number            // Total cost basis from transactions
  change24h?: number           // 24-hour price change percentage
  marketCap?: number           // Market capitalization
  fdv?: number                 // Fully Diluted Valuation
}

// Category aggregation for charts
export interface CategoryData {
  category: TokenCategory
  totalValue: number
  percentage: number
  items: PortfolioItem[]
}

// Portfolio summary
export interface PortfolioSummary {
  totalValue: number
  baselineValue: number
  totalPerformance: number
  categories: CategoryData[]
  lastUpdated: Date
  // Quota-based fund metrics
  quotaValue: number           // Current quota value
  initialQuotaValue: number    // Initial quota value (typically $1.00)
  totalShares: number          // Total shares outstanding
  quotaPerformance: number     // Quota-based performance percentage
}

// API response types
export interface CoinGeckoPriceResponse {
  [tokenId: string]: {
    usd: number
    usd_24h_change?: number
  }
}

// Extended price data interface
export interface PriceData {
  price: number
  change24h?: number
  marketCap?: number
  fdv?: number  // Fully Diluted Valuation
}

// Performance calculation result
export interface PerformanceResult {
  currentValue: number
  baselineValue: number
  performance: number
  isPositive: boolean
} 
