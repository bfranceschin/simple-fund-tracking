'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDate } from '@/contexts/PortfolioDateContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts'
import { formatCurrency, formatPortfolioPercentage } from '@/lib/utils/formatters'
import { CATEGORY_COLORS, CATEGORY_NAMES } from '@/lib/constants/portfolio-data'
import { aggregateBitcoinEthereumCategories } from '@/lib/utils/calculations'
import type { PortfolioItem } from '@/lib/types/portfolio'

const MIN_CHART_PERCENT = 0.1
const MIN_ASSET_VALUE = 10

const ASSET_COLORS = [
  '#0F766E',
  '#7C3AED',
  '#0284C7',
  '#BE185D',
  '#D97706',
  '#4F46E5',
  '#059669',
  '#B45309',
  '#9333EA',
  '#0E7490',
] as const

type ViewMode = 'category' | 'assets'

type ChartRow = {
  id: string
  name: string
  totalValue: number
  percentage: number
  fill: string
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#64748B'
}

function getCategoryLabel(category: string) {
  return CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES] || category
}

function getAssetLabel(item: PortfolioItem) {
  const name = item.token.name.replace(/\s*\(Aggregated\)\s*$/i, '').trim()
  if (item.token.symbol === 'BTC') return 'Bitcoin'
  if (item.token.symbol === 'ETH') return 'Ethereum'
  return name || item.token.symbol
}

function getAssetColor(item: PortfolioItem, paletteIndex: number) {
  if (item.token.symbol === 'BTC' || item.token.category === 'Btc') {
    return CATEGORY_COLORS.Btc
  }
  if (item.token.symbol === 'ETH' || item.token.category === 'Eth') {
    return CATEGORY_COLORS.Eth
  }
  return ASSET_COLORS[paletteIndex % ASSET_COLORS.length]
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="text-sm font-semibold text-slate-900">{data.name}</p>
      <p className="text-sm text-slate-600">{formatCurrency(data.totalValue)}</p>
      <p className="text-xs text-slate-500">{formatPortfolioPercentage(data.percentage)}</p>
    </div>
  )
}

function ActiveSlice(props: {
  cx?: number
  cy?: number
  innerRadius?: number
  outerRadius?: number
  startAngle?: number
  endAngle?: number
  fill?: string
}) {
  const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0, fill } = props
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#fff"
      strokeWidth={2}
    />
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label="Allocation view mode"
    >
      {(
        [
          { id: 'category', label: 'Categories' },
          { id: 'assets', label: 'Assets' },
        ] as const
      ).map((option) => {
        const selected = mode === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selected
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            aria-pressed={selected}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default function CategoryChart() {
  const { selectedDate } = usePortfolioDate()
  const { categories, portfolioItems, loading, error } = usePortfolio({ selectedDate })
  const [mode, setMode] = useState<ViewMode>('category')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    setActiveIndex(null)
  }, [mode])

  const listRows = useMemo<ChartRow[]>(() => {
    if (mode === 'category') {
      if (!categories?.length) return []
      return [...categories]
        .sort((a, b) => b.totalValue - a.totalValue)
        .map((c) => ({
          id: c.category,
          name: getCategoryLabel(c.category),
          totalValue: c.totalValue,
          percentage: c.percentage,
          fill: getCategoryColor(c.category),
        }))
    }

    if (!portfolioItems?.length) return []

    const aggregated = aggregateBitcoinEthereumCategories(portfolioItems)
    let paletteIndex = 0

    return [...aggregated]
      .filter((item) => item.currentValue >= MIN_ASSET_VALUE)
      .sort((a, b) => b.currentValue - a.currentValue)
      .map((item) => {
        const isBtcOrEth =
          item.token.symbol === 'BTC' ||
          item.token.symbol === 'ETH' ||
          item.token.category === 'Btc' ||
          item.token.category === 'Eth'
        const fill = getAssetColor(item, isBtcOrEth ? 0 : paletteIndex++)
        return {
          id: item.token.symbol,
          name: getAssetLabel(item),
          totalValue: item.currentValue,
          percentage: item.percentage,
          fill,
        }
      })
  }, [mode, categories, portfolioItems])

  const chartData = useMemo(
    () =>
      listRows.filter((row) => {
        if (row.percentage < MIN_CHART_PERCENT) return false
        if (mode === 'assets' && row.totalValue < MIN_ASSET_VALUE) return false
        return true
      }),
    [listRows, mode]
  )

  const activeRow = activeIndex !== null ? chartData[activeIndex] : chartData[0]
  const dustRows = listRows.filter((row) => row.percentage < MIN_CHART_PERCENT)

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-1/2 rounded bg-gray-200" />
          <div className="h-72 rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Allocation</h2>
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!listRows.length) {
    return (
      <div className="card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Allocation</h2>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Allocation</h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'category'
              ? 'Share of portfolio value by category'
              : 'Share of portfolio value by asset'}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <div className="mt-5 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative mx-auto h-64 w-full max-w-[280px] sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="totalValue"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="88%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={1.25}
                stroke="#fff"
                strokeWidth={1.5}
                activeIndex={activeIndex ?? undefined}
                activeShape={ActiveSlice}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.fill}
                    fillOpacity={
                      activeIndex === null || chartData[activeIndex]?.id === entry.id ? 1 : 0.45
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {activeRow && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="max-w-[7.5rem] truncate text-xs font-medium uppercase tracking-wide text-slate-500">
                {activeRow.name}
              </span>
              <span className="text-2xl font-semibold tabular-nums text-slate-900">
                {formatPortfolioPercentage(activeRow.percentage)}
              </span>
            </div>
          )}
        </div>

        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {listRows.map((row) => {
            const isActive = activeIndex !== null && chartData[activeIndex]?.id === row.id
            const isDust = row.percentage < MIN_CHART_PERCENT

            return (
              <button
                key={row.id}
                type="button"
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => {
                  const idx = chartData.findIndex((c) => c.id === row.id)
                  setActiveIndex(idx >= 0 ? idx : null)
                }}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.fill }}
                    />
                    <span className="truncate text-sm font-medium text-slate-800">{row.name}</span>
                    {isDust && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        &lt;0.1%
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                    {formatPortfolioPercentage(row.percentage)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.max(row.percentage, isDust ? 0 : 1.5)}%`,
                      backgroundColor: row.fill,
                      opacity: isDust ? 0.35 : 0.9,
                    }}
                  />
                </div>
                <div className="mt-1 text-right text-xs tabular-nums text-slate-500">
                  {formatCurrency(row.totalValue)}
                </div>
              </button>
            )
          })}

          {dustRows.length > 0 && (
            <p className="px-3 pt-1 text-xs text-slate-400">
              Tiny holdings are listed but omitted from the donut when under {MIN_CHART_PERCENT}%.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
