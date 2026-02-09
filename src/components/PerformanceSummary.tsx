'use client'

import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDate } from '@/contexts/PortfolioDateContext'
import { formatCurrency, formatPerformance, getPerformanceIcon } from '@/lib/utils/formatters'

export default function PerformanceSummary() {
  const { selectedDate } = usePortfolioDate()
  const { summary, loading, error, isHistorical } = usePortfolio({ selectedDate })

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Performance Summary
        </h2>
        <div className="text-red-600">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Performance Summary
        </h2>
        <div className="text-gray-500">
          No data available
        </div>
      </div>
    )
  }

  // Debug logging
  console.log('PerformanceSummary - summary:', {
    quotaValue: summary.quotaValue,
    initialQuotaValue: summary.initialQuotaValue,
    quotaPerformance: summary.quotaPerformance,
    totalShares: summary.totalShares,
    totalValue: summary.totalValue,
    baselineValue: summary.baselineValue,
    totalPerformance: summary.totalPerformance
  })

  const isPositive = (summary.quotaPerformance ?? 0) >= 0
  
  // Safe formatting helpers
  const safeToFixed = (value: number | null | undefined, decimals: number): string => {
    if (value === null || value === undefined || isNaN(value)) return '-'
    return value.toFixed(decimals)
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Fund Performance
      </h2>
      
      {/* Primary Quota Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Quota Value */}
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">
            ${safeToFixed(summary.quotaValue, 4)}
          </div>
          <div className="text-sm text-blue-600">Quota Value</div>
        </div>

        {/* Initial Quota */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-700">
            ${safeToFixed(summary.initialQuotaValue, 2)}
          </div>
          <div className="text-sm text-gray-500">Initial Quota</div>
        </div>

        {/* Quota Performance */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div 
            className="text-2xl font-bold"
            style={{ 
              color: (summary.quotaPerformance ?? 0) > 0 ? '#059669' : (summary.quotaPerformance ?? 0) < 0 ? '#DC2626' : '#4B5563'
            }}
          >
            {getPerformanceIcon(summary.quotaPerformance)} {formatPerformance(summary.quotaPerformance)}
          </div>
          <div className="text-sm text-gray-500">Fund Return</div>
        </div>

        {/* Total Shares */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-700">
            {(summary.totalShares ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-gray-500">Total Shares</div>
        </div>
      </div>

      {/* Portfolio Value Metrics */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Portfolio Value</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Value */}
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(summary.totalValue)}
            </div>
            <div className="text-sm text-gray-500">Current Value</div>
          </div>

          {/* Baseline Value */}
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(summary.baselineValue)}
            </div>
            <div className="text-sm text-gray-500">Initial Investment</div>
          </div>

          {/* Value Change */}
          <div className="text-center">
            <div 
              className="text-xl font-bold"
              style={{ 
                color: (summary.totalPerformance ?? 0) > 0 ? '#059669' : (summary.totalPerformance ?? 0) < 0 ? '#DC2626' : '#4B5563'
              }}
            >
              {getPerformanceIcon(summary.totalPerformance)} {formatCurrency((summary.totalValue ?? 0) - (summary.baselineValue ?? 0))}
            </div>
            <div className="text-sm text-gray-500">P&L</div>
          </div>
        </div>
      </div>

      {/* Performance Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Initial: $1.00/share</span>
          <span>Current: ${safeToFixed(summary.quotaValue, 4)}/share</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              isPositive ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ 
              width: `${Math.min(Math.abs(summary.quotaPerformance ?? 0) * 2, 100)}%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}
