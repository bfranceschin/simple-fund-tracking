'use client'

import { useMemo, useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDate } from '@/contexts/PortfolioDateContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts'
import { formatCurrency, formatPortfolioPercentage } from '@/lib/utils/formatters'
import { CATEGORY_COLORS, CATEGORY_NAMES } from '@/lib/constants/portfolio-data'
import type { TokenCategory } from '@/lib/types/portfolio'

const MIN_CHART_PERCENT = 0.1

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#64748B'
}

function getCategoryLabel(category: string) {
  return CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES] || category
}

type ChartRow = {
  category: TokenCategory
  totalValue: number
  percentage: number
  name: string
  fill: string
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

export default function CategoryChart() {
  const { selectedDate } = usePortfolioDate()
  const { categories, loading, error } = usePortfolio({ selectedDate })
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const sortedCategories = useMemo(() => {
    if (!categories?.length) return []
    return [...categories].sort((a, b) => b.totalValue - a.totalValue)
  }, [categories])

  const chartData = useMemo<ChartRow[]>(
    () =>
      sortedCategories
        .filter((c) => c.percentage >= MIN_CHART_PERCENT)
        .map((c) => ({
          category: c.category,
          totalValue: c.totalValue,
          percentage: c.percentage,
          name: getCategoryLabel(c.category),
          fill: getCategoryColor(c.category),
        })),
    [sortedCategories]
  )

  const activeCategory = activeIndex !== null ? chartData[activeIndex] : chartData[0]
  const dustCategories = sortedCategories.filter((c) => c.percentage < MIN_CHART_PERCENT)

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
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Category Allocation</h2>
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!sortedCategories.length) {
    return (
      <div className="card">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Category Allocation</h2>
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Category Allocation</h2>
      <p className="mb-5 text-sm text-slate-500">Share of portfolio value by category</p>

      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
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
                    key={entry.category}
                    fill={entry.fill}
                    fillOpacity={activeIndex === null || chartData[activeIndex]?.category === entry.category ? 1 : 0.45}
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {activeCategory && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="max-w-[7.5rem] truncate text-xs font-medium uppercase tracking-wide text-slate-500">
                {activeCategory.name}
              </span>
              <span className="text-2xl font-semibold tabular-nums text-slate-900">
                {formatPortfolioPercentage(activeCategory.percentage)}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {sortedCategories.map((category) => {
            const isActive =
              activeIndex !== null && chartData[activeIndex]?.category === category.category
            const color = getCategoryColor(category.category)
            const isDust = category.percentage < MIN_CHART_PERCENT

            return (
              <button
                key={category.category}
                type="button"
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => {
                  const idx = chartData.findIndex((c) => c.category === category.category)
                  setActiveIndex(idx >= 0 ? idx : null)
                }}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-sm font-medium text-slate-800">
                      {getCategoryLabel(category.category)}
                    </span>
                    {isDust && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        &lt;0.1%
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                    {formatPortfolioPercentage(category.percentage)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.max(category.percentage, isDust ? 0 : 1.5)}%`,
                      backgroundColor: color,
                      opacity: isDust ? 0.35 : 0.9,
                    }}
                  />
                </div>
                <div className="mt-1 text-right text-xs tabular-nums text-slate-500">
                  {formatCurrency(category.totalValue)}
                </div>
              </button>
            )
          })}

          {dustCategories.length > 0 && (
            <p className="px-3 pt-1 text-xs text-slate-400">
              Tiny holdings are listed but omitted from the donut when under {MIN_CHART_PERCENT}%.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
