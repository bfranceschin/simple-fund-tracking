'use client'

import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDate } from '@/contexts/PortfolioDateContext'
import { formatCurrency, formatPerformance } from '@/lib/utils/formatters'

function safeToFixed(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return value.toFixed(decimals)
}

function formatSignedCurrency(value: number): string {
  const absolute = formatCurrency(Math.abs(value))
  if (value > 0) return `+${absolute}`
  if (value < 0) return `-${absolute}`
  return absolute
}

export default function PerformanceSummary() {
  const { selectedDate } = usePortfolioDate()
  const { summary, loading, error } = usePortfolio({ selectedDate })

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-gray-200" />
          <div className="h-28 rounded-xl bg-gray-200" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded-lg bg-gray-200" />
            <div className="h-16 rounded-lg bg-gray-200" />
            <div className="h-16 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Fund Performance</h2>
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="card">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Fund Performance</h2>
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  const quotaPerformance = summary.quotaPerformance ?? 0
  const pnl = (summary.totalValue ?? 0) - (summary.baselineValue ?? 0)
  const isPositive = quotaPerformance >= 0
  const isFlat = quotaPerformance === 0
  const initialQuota = summary.initialQuotaValue ?? 1
  const quotaValue = summary.quotaValue ?? 0
  const valueRatio =
    summary.baselineValue > 0
      ? Math.min((summary.totalValue / summary.baselineValue) * 100, 100)
      : 0
  const tone = isFlat ? 'neutral' : isPositive ? 'up' : 'down'
  const toneClasses = {
    up: {
      hero: 'from-emerald-50 to-white border-emerald-100',
      value: 'text-emerald-700',
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    down: {
      hero: 'from-rose-50 to-white border-rose-100',
      value: 'text-rose-700',
      bar: 'bg-rose-500',
      badge: 'bg-rose-100 text-rose-800',
    },
    neutral: {
      hero: 'from-slate-50 to-white border-slate-200',
      value: 'text-slate-800',
      bar: 'bg-slate-400',
      badge: 'bg-slate-100 text-slate-700',
    },
  }[tone]

  return (
    <div className="card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Fund Performance</h2>
          <p className="mt-1 text-sm text-slate-500">Quota return and portfolio value vs initial capital</p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${toneClasses.badge}`}>
          {isPositive ? 'In profit' : isFlat ? 'Flat' : 'In drawdown'}
        </span>
      </div>

      <div
        className={`mb-5 rounded-xl border bg-gradient-to-br p-5 sm:p-6 ${toneClasses.hero}`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fund Return</p>
            <p className={`mt-1 text-4xl font-semibold tracking-tight tabular-nums ${toneClasses.value}`}>
              {formatPerformance(quotaPerformance)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Quota{' '}
              <span className="font-semibold tabular-nums text-slate-900">
                ${safeToFixed(quotaValue, 4)}
              </span>
              <span className="text-slate-400"> / </span>
              <span className="tabular-nums">${safeToFixed(initialQuota, 2)}</span>
              <span className="text-slate-400"> initial</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:text-right">
            <div>
              <p className="text-xs text-slate-500">Total Shares</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                {(summary.totalShares ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">P&L</p>
              <p className={`mt-0.5 text-sm font-semibold tabular-nums ${toneClasses.value}`}>
                {formatSignedCurrency(pnl)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs text-slate-500">
            <span>Current value vs initial investment</span>
            <span className="tabular-nums">
              {summary.baselineValue > 0
                ? `${((summary.totalValue / summary.baselineValue) * 100).toFixed(1)}%`
                : '-'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${toneClasses.bar}`}
              style={{ width: `${valueRatio}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Value</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            {formatCurrency(summary.totalValue)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Initial Investment
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            {formatCurrency(summary.baselineValue)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Quota / Share</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            ${safeToFixed(quotaValue, 4)}
          </p>
        </div>
      </div>
    </div>
  )
}
