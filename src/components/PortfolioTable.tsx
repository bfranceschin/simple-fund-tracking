'use client'

import { useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDate } from '@/contexts/PortfolioDateContext'
import {
  formatCurrency,
  formatPrice,
  formatTokenAmount,
  formatMarketCap,
  formatFDV,
  formatPerformance,
  formatPortfolioPercentage,
} from '@/lib/utils/formatters'
import { aggregateBitcoinEthereumCategories } from '@/lib/utils/calculations'
import { CATEGORY_NAMES, CATEGORY_COLORS } from '@/lib/constants/portfolio-data'
import { PortfolioItem } from '@/lib/types/portfolio'

function calculatePerformanceUSD(item: PortfolioItem): number {
  return item.currentValue - item.costBasis
}

function calculate24hChangeUSD(item: PortfolioItem): number {
  if (!item.change24h) return 0
  const price24hAgo = item.currentPrice / (1 + item.change24h / 100)
  const value24hAgo = item.amount * price24hAgo
  return item.currentValue - value24hAgo
}

function formatUSDChange(value: number): string {
  const formatted = formatCurrency(Math.abs(value))
  return `${value >= 0 ? '+' : '-'}${formatted}`
}

function getTokenLabel(item: PortfolioItem): string {
  return item.token.name.replace(/\s*\(Aggregated\)\s*$/i, '').trim() || item.token.symbol
}

function signedTone(value: number): string {
  if (value > 0) return 'text-emerald-700'
  if (value < 0) return 'text-rose-700'
  return 'text-slate-600'
}

function FilterToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        checked
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}

export default function PortfolioTable() {
  const { selectedDate } = usePortfolioDate()
  const { portfolioItems, loading, error, refreshData } = usePortfolio({ selectedDate })
  const [sortField, setSortField] = useState<
    'currentValue' | 'performance' | 'percentage' | 'change24h'
  >('currentValue')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [aggregateCategories, setAggregateCategories] = useState(true)
  const [showUSDValues, setShowUSDValues] = useState(false)
  const [hideSmallBalances, setHideSmallBalances] = useState(true)

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-gray-200" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Portfolio Overview</h2>
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!portfolioItems || portfolioItems.length === 0) {
    return (
      <div className="card">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Portfolio Overview</h2>
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  const displayItems = aggregateCategories
    ? aggregateBitcoinEthereumCategories(portfolioItems)
    : portfolioItems

  const visibleItems = hideSmallBalances
    ? displayItems.filter((item) => item.currentValue >= 10)
    : displayItems

  const sortedItems = [...visibleItems].sort((a, b) => {
    const aValue = sortField === 'change24h' ? (a.change24h ?? 0) : (a[sortField] as number)
    const bValue = sortField === 'change24h' ? (b.change24h ?? 0) : (b[sortField] as number)
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
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
    if (sortField !== field) {
      return <span className="ml-1 text-slate-300">↕</span>
    }
    return (
      <span className="ml-1 text-slate-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
    )
  }

  const totalValue = visibleItems.reduce((sum, item) => sum + item.currentValue, 0)
  const categoryCount = new Set(visibleItems.map((item) => item.token.category)).size
  const avgPerformance =
    visibleItems.length > 0
      ? showUSDValues
        ? visibleItems.reduce((sum, item) => sum + calculatePerformanceUSD(item), 0) /
          visibleItems.length
        : visibleItems.reduce((sum, item) => sum + item.performance, 0) / visibleItems.length
      : null

  return (
    <div className="card">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Portfolio Overview</h2>
          <p className="mt-1 text-sm text-slate-500">Holdings, performance, and allocation by token</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            role="group"
            aria-label="Portfolio table filters"
          >
            <FilterToggle
              checked={showUSDValues}
              onChange={setShowUSDValues}
              label="USD Values"
            />
            <FilterToggle
              checked={hideSmallBalances}
              onChange={setHideSmallBalances}
              label="Hide <$10"
            />
            <FilterToggle
              checked={aggregateCategories}
              onChange={setAggregateCategories}
              label="Aggregate BTC/ETH"
            />
          </div>
          <button
            type="button"
            onClick={() => refreshData()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr className="text-left text-[10px] font-medium uppercase tracking-wide text-slate-500">
                <th className="sticky left-0 z-30 border-r border-slate-200 bg-slate-50 px-2 py-1.5">
                  Token
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-2 py-1.5 text-right hover:bg-slate-100"
                  onClick={() => handleSort('performance')}
                >
                  Perf. {showUSDValues ? 'USD' : '%'}
                  <SortIcon field="performance" />
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-2 py-1.5 text-right hover:bg-slate-100"
                  onClick={() => handleSort('change24h')}
                >
                  24h {showUSDValues ? 'USD' : '%'}
                  <SortIcon field="change24h" />
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-2 py-1.5 text-right hover:bg-slate-100"
                  onClick={() => handleSort('currentValue')}
                >
                  Value
                  <SortIcon field="currentValue" />
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-2 py-1.5 text-right hover:bg-slate-100"
                  onClick={() => handleSort('percentage')}
                >
                  Alloc.
                  <SortIcon field="percentage" />
                </th>
                <th className="whitespace-nowrap px-2 py-1.5 text-right">Price</th>
                <th className="whitespace-nowrap px-2 py-1.5 text-right">Mkt Cap</th>
                <th className="whitespace-nowrap px-2 py-1.5 text-right">FDV</th>
                <th className="whitespace-nowrap px-2 py-1.5 text-right">Amount</th>
                <th className="whitespace-nowrap px-2 py-1.5 text-right">Cost Basis</th>
                <th className="whitespace-nowrap px-2 py-1.5">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedItems.map((item) => {
                const performanceUSD = calculatePerformanceUSD(item)
                const change24hUSD = calculate24hChangeUSD(item)
                const performanceValue = showUSDValues ? performanceUSD : item.performance
                const change24hValue = showUSDValues ? change24hUSD : (item.change24h ?? 0)
                const categoryColor =
                  CATEGORY_COLORS[item.token.category] || '#64748B'

                return (
                  <tr
                    key={`${item.token.symbol}-${item.token.id ?? item.token.name}`}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-2 py-1.5 group-hover:bg-slate-50">
                      <div className="min-w-[6.5rem]">
                        <div className="font-medium text-slate-900">{getTokenLabel(item)}</div>
                        <div className="text-[10px] text-slate-500">{item.token.symbol}</div>
                      </div>
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right tabular-nums ${signedTone(performanceValue)}`}
                    >
                      {showUSDValues
                        ? formatUSDChange(performanceUSD)
                        : formatPerformance(item.performance)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {item.change24h !== undefined ? (
                        <span className={signedTone(change24hValue)}>
                          {showUSDValues
                            ? formatUSDChange(change24hUSD)
                            : formatPerformance(item.change24h)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium tabular-nums text-slate-900">
                      {formatCurrency(item.currentValue)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                      {formatPortfolioPercentage(item.percentage)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                      {formatPrice(item.currentPrice)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                      {formatMarketCap(item.marketCap)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                      {formatFDV(item.fdv)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                      {item.amount === 0
                        ? '-'
                        : formatTokenAmount(item.amount, item.token.symbol)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                      {formatCurrency(item.costBasis)}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${categoryColor}18`,
                          color: categoryColor,
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
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tokens</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {visibleItems.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Value</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Categories</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{categoryCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Avg Performance
          </p>
          <p
            className={`mt-1 text-lg font-semibold tabular-nums ${
              avgPerformance === null ? 'text-slate-900' : signedTone(avgPerformance)
            }`}
          >
            {avgPerformance === null
              ? '-'
              : showUSDValues
                ? formatUSDChange(avgPerformance)
                : formatPerformance(avgPerformance)}
          </p>
        </div>
      </div>
    </div>
  )
}
