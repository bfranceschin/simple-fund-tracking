'use client'

import { useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDate } from '@/contexts/PortfolioDateContext'
import { 
  formatCurrency, 
  formatPercentage, 
  formatPrice, 
  formatTokenAmount,
  formatMarketCap,
  formatFDV,
  getPerformanceColor, 
  getPerformanceIcon,
  formatPerformance,
  formatPortfolioPercentage
} from '@/lib/utils/formatters'
import { aggregateBitcoinEthereumCategories } from '@/lib/utils/calculations'
import { CATEGORY_NAMES, CATEGORY_COLORS } from '@/lib/constants/portfolio-data'
import { PortfolioItem } from '@/lib/types/portfolio'

// Helper functions for USD calculations
function calculatePerformanceUSD(item: PortfolioItem): number {
  return item.currentValue - item.costBasis
}

function calculate24hChangeUSD(item: PortfolioItem): number {
  if (!item.change24h) return 0
  // Calculate the price 24h ago
  const price24hAgo = item.currentPrice / (1 + item.change24h / 100)
  
  const amount = item.amount
  
  // Calculate the value 24h ago
  const value24hAgo = amount * price24hAgo
  // Return the USD change
  return item.currentValue - value24hAgo
}

function formatUSDChange(value: number): string {
  const formatted = formatCurrency(Math.abs(value))
  return `${value >= 0 ? '+' : '-'}${formatted}`
}

export default function PortfolioTable() {
  const { selectedDate } = usePortfolioDate()
  const { portfolioItems, loading, error, refreshData, isHistorical } = usePortfolio({ selectedDate })
  const [sortField, setSortField] = useState<'currentValue' | 'performance' | 'percentage' | 'change24h'>('currentValue')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [aggregateCategories, setAggregateCategories] = useState(true)
  const [showUSDValues, setShowUSDValues] = useState(false)
  const [hideSmallBalances, setHideSmallBalances] = useState(true)

  console.log('[PortfolioTable] Render state:', { loading, error, itemCount: portfolioItems?.length, selectedDate })

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Portfolio Overview
        </h2>
        <div className="text-red-600">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!portfolioItems || portfolioItems.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Portfolio Overview
        </h2>
        <div className="text-gray-500">
          No data available
        </div>
      </div>
    )
  }

  // Apply aggregation if enabled
  const displayItems = aggregateCategories 
    ? aggregateBitcoinEthereumCategories(portfolioItems)
    : portfolioItems

  const visibleItems = hideSmallBalances
    ? displayItems.filter(item => item.currentValue >= 10)
    : displayItems

  // Sort items
  const sortedItems = [...visibleItems].sort((a, b) => {
    let aValue: number
    let bValue: number
    
    if (sortField === 'change24h') {
      // Handle optional change24h field
      aValue = a.change24h ?? 0
      bValue = b.change24h ?? 0
    } else {
      // Handle other fields that are always numbers
      aValue = a[sortField] as number
      bValue = b[sortField] as number
    }
    
    if (sortDirection === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-gray-400">↕</span>
    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Portfolio Overview
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showUSDValues}
              onChange={(e) => setShowUSDValues(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">USD Values</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideSmallBalances}
              onChange={(e) => setHideSmallBalances(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Hide &lt;$10</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={aggregateCategories}
              onChange={(e) => setAggregateCategories(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Aggregate BTC/ETH</span>
          </label>
          <button
            onClick={() => refreshData()}
            className="btn-secondary text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table-dense">
          <thead className="table-header sticky top-0 z-20">
            <tr>
              <th className="table-header-cell-dense sticky left-0 bg-gray-50 border-r border-gray-200 z-30">Token</th>
              <th 
                className="table-header-cell-dense cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('performance')}
              >
                Performance {showUSDValues ? '(USD)' : ''} <SortIcon field="performance" />
              </th>
              <th 
                className="table-header-cell-dense cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('change24h')}
              >
                24h Change {showUSDValues ? '(USD)' : ''} <SortIcon field="change24h" />
              </th>
              <th 
                className="table-header-cell-dense cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('currentValue')}
              >
                Value (USD) <SortIcon field="currentValue" />
              </th>
              <th 
                className="table-header-cell-dense cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('percentage')}
              >
                Percentage <SortIcon field="percentage" />
              </th>
              <th className="table-header-cell-dense">Current Price</th>
              <th className="table-header-cell-dense">Mkt Cap</th>
              <th className="table-header-cell-dense">FDV</th>
              <th className="table-header-cell-dense">Amount</th>
              <th className="table-header-cell-dense">Cost Basis</th>
              <th className="table-header-cell-dense">Category</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {sortedItems.map((item, index) => {
              const performanceUSD = calculatePerformanceUSD(item)
              const change24hUSD = calculate24hChangeUSD(item)
              
              return (
                <tr key={index} className="table-row">
                  <td className="table-cell-dense sticky left-0 bg-white border-r border-gray-200 z-10">
                    <div>
                      <div className="font-medium text-gray-900">{item.token.name}</div>
                      <div className="text-xs text-gray-500">{item.token.symbol}</div>
                    </div>
                  </td>
                  <td className={`table-cell-dense`}>
                    <div className="flex items-center gap-1">
                      <span 
                        className={`${(showUSDValues ? performanceUSD : item.performance) > 0 ? 'font-semibold' : ''}`}
                        style={{ 
                          color: (showUSDValues ? performanceUSD : item.performance) > 0 ? '#059669' : (showUSDValues ? performanceUSD : item.performance) < 0 ? '#DC2626' : '#4B5563'
                        }}
                      >
                        {getPerformanceIcon(showUSDValues ? performanceUSD : item.performance)}
                      </span>
                      <span 
                        className={`${(showUSDValues ? performanceUSD : item.performance) > 0 ? 'font-semibold' : ''}`}
                        style={{ 
                          color: (showUSDValues ? performanceUSD : item.performance) > 0 ? '#059669' : (showUSDValues ? performanceUSD : item.performance) < 0 ? '#DC2626' : '#4B5563'
                        }}
                      >
                        {showUSDValues ? formatUSDChange(performanceUSD) : formatPerformance(item.performance)}
                      </span>
                    </div>
                  </td>
                  <td className={`table-cell-dense`}>
                    {item.change24h !== undefined ? (
                      <div className="flex items-center gap-1">
                        <span 
                          className={`${(showUSDValues ? change24hUSD : item.change24h) > 0 ? 'font-semibold' : ''}`}
                          style={{ 
                            color: (showUSDValues ? change24hUSD : item.change24h) > 0 ? '#059669' : (showUSDValues ? change24hUSD : item.change24h) < 0 ? '#DC2626' : '#4B5563'
                          }}
                        >
                          {getPerformanceIcon(showUSDValues ? change24hUSD : item.change24h)}
                        </span>
                        <span 
                          className={`${(showUSDValues ? change24hUSD : item.change24h) > 0 ? 'font-semibold' : ''}`}
                          style={{ 
                            color: (showUSDValues ? change24hUSD : item.change24h) > 0 ? '#059669' : (showUSDValues ? change24hUSD : item.change24h) < 0 ? '#DC2626' : '#4B5563'
                          }}
                        >
                          {showUSDValues ? formatUSDChange(change24hUSD) : formatPerformance(item.change24h)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="table-cell-dense font-medium">
                    {formatCurrency(item.currentValue)}
                  </td>
                  <td className="table-cell-dense">
                    {formatPortfolioPercentage(item.percentage)}
                  </td>
                  <td className="table-cell-dense">
                    {formatPrice(item.currentPrice)}
                  </td>
                  <td className="table-cell-dense">
                    {formatMarketCap(item.marketCap)}
                  </td>
                  <td className="table-cell-dense">
                    {formatFDV(item.fdv)}
                  </td>
                  <td className="table-cell-dense">
                    {item.amount === 0 ? '-' : formatTokenAmount(item.amount, item.token.symbol)}
                  </td>
                  <td className="table-cell-dense">
                    {formatCurrency(item.costBasis)}
                  </td>
                  <td className="table-cell-dense">
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ 
                        backgroundColor: CATEGORY_COLORS[item.token.category] || '#6B7280'
                      }}
                    >
                      {CATEGORY_NAMES[item.token.category] || item.token.category}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Total Tokens</div>
              <div className="font-medium">{visibleItems.length}</div>
          </div>
          <div>
            <div className="text-gray-500">Total Value</div>
            <div className="font-medium">
              {formatCurrency(visibleItems.reduce((sum, item) => sum + item.currentValue, 0))}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Categories</div>
            <div className="font-medium">
              {new Set(visibleItems.map(item => item.token.category)).size}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Avg Performance</div>
            <div className="font-medium">
              {visibleItems.length > 0 ? (
                showUSDValues 
                  ? formatUSDChange(visibleItems.reduce((sum, item) => sum + calculatePerformanceUSD(item), 0) / visibleItems.length)
                  : formatPerformance(visibleItems.reduce((sum, item) => sum + item.performance, 0) / visibleItems.length)
              ) : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}