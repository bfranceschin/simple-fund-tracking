'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchBtcHistory } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils/formatters'
import {
  computeLogRegressionBands,
  GMI_CHART_DEFAULTS,
  type BandPoint,
} from '@/lib/utils/log-regression'

const COLORS = {
  price: '#374151',
  fairValue: '#3B82F6',
  bandNeg1: '#16A34A',
  bandPos1: '#FB923C',
  bandNeg2: '#F87171',
  bandPos2: '#EF4444',
  freeze: '#9CA3AF',
} as const

const SERIES = [
  { key: 'price', label: 'Price', color: COLORS.price },
  { key: 'fairValue', label: 'Log Trend Line (Fair Value)', color: COLORS.fairValue },
  { key: 'bandNeg1', label: '−1 Std Dev', color: COLORS.bandNeg1 },
  { key: 'bandPos1', label: '+1 Std Dev', color: COLORS.bandPos1 },
  { key: 'bandNeg2', label: '−2 Std Dev', color: COLORS.bandNeg2 },
  { key: 'bandPos2', label: '+2 Std Dev', color: COLORS.bandPos2 },
] as const

function formatLogAxis(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`
  }
  if (value >= 1_000) {
    const thousands = value / 1_000
    return `$${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k`
  }
  if (value >= 1) {
    return `$${value.toFixed(0)}`
  }
  return `$${value.toFixed(2)}`
}

function formatTimeTick(time: number): string {
  if (!Number.isFinite(time)) return ''
  return format(new Date(time), 'MMM yyyy')
}

function formatTimeLabel(time: number): string {
  if (!Number.isFinite(time)) return ''
  return format(new Date(time), 'MMM d, yyyy')
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string; name?: string }>
  label?: string | number
}) {
  if (!active || !payload?.length || label === undefined || label === null) {
    return null
  }

  const title =
    typeof label === 'number'
      ? formatTimeLabel(label)
      : (() => {
          try {
            return format(parseISO(String(label)), 'MMM d, yyyy')
          } catch {
            return String(label)
          }
        })()

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-sm">
      <div className="font-medium text-gray-900 mb-2">{title}</div>
      <div className="space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? '')
          const series = SERIES.find((s) => s.key === key)
          if (!series || entry.value === undefined || entry.value === null) {
            return null
          }
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-gray-600">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </span>
              <span className="font-medium text-gray-900 tabular-nums">
                {formatCurrency(entry.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GmiLogRegressionChart() {
  const [bands, setBands] = useState<BandPoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchBtcHistory(controller.signal)
        if (controller.signal.aborted) return

        const nextBands = computeLogRegressionBands(
          response.points,
          GMI_CHART_DEFAULTS
        )
        if (nextBands.length === 0) {
          throw new Error('Not enough Bitcoin price points to fit regression')
        }

        setBands(nextBands)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load BTC history')
        setBands(null)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [])

  const yDomain = useMemo(() => {
    if (!bands || bands.length === 0) return [1000, 1_000_000] as [number, number]
    let min = Infinity
    let max = -Infinity
    for (const row of bands) {
      if (row.price != null) {
        min = Math.min(min, row.price)
        max = Math.max(max, row.price)
      }
      min = Math.min(min, row.bandNeg2)
      max = Math.max(max, row.bandPos2)
    }
    const paddedMin = Math.max(min * 0.85, 0.01)
    const paddedMax = max * 1.15
    return [paddedMin, paddedMax] as [number, number]
  }, [bands])

  const freezeLabel = useMemo(() => {
    try {
      return format(parseISO(GMI_CHART_DEFAULTS.freezeDate), "MMM ''yy")
    } catch {
      return GMI_CHART_DEFAULTS.freezeDate
    }
  }, [])

  const freezeTime = useMemo(
    () => Date.parse(GMI_CHART_DEFAULTS.freezeDate),
    []
  )

  const xDomain = useMemo(() => {
    if (!bands || bands.length === 0) {
      return [
        Date.parse(GMI_CHART_DEFAULTS.chartStart),
        Date.parse(GMI_CHART_DEFAULTS.chartEnd),
      ] as [number, number]
    }
    return [bands[0].time, bands[bands.length - 1].time] as [number, number]
  }, [bands])

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          BTC Price vs Log Trend
        </h2>
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!bands || bands.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          BTC Price vs Log Trend
        </h2>
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          BTC Price vs Log Trend
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Frozen {freezeLabel} · ±1σ / ±2σ highway · Forward channel shows
          possible price ranges, not a forecast ·{' '}
          {GMI_CHART_DEFAULTS.chartStart} → {GMI_CHART_DEFAULTS.chartEnd}
        </p>
      </div>

      <div className="h-[28rem]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={bands}
            margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              dataKey="time"
              domain={xDomain}
              tickFormatter={formatTimeTick}
              minTickGap={48}
              tickCount={8}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#D1D5DB' }}
              tickLine={{ stroke: '#D1D5DB' }}
            />
            <YAxis
              scale="log"
              domain={yDomain}
              allowDataOverflow
              tickFormatter={formatLogAxis}
              width={56}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#D1D5DB' }}
              tickLine={{ stroke: '#D1D5DB' }}
            />
            <Tooltip
              content={<ChartTooltip />}
              labelFormatter={(value) =>
                typeof value === 'number' ? formatTimeLabel(value) : String(value)
              }
            />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              formatter={(value) => {
                const series = SERIES.find((s) => s.key === value)
                return series?.label ?? value
              }}
            />

            <ReferenceLine
              x={freezeTime}
              stroke={COLORS.freeze}
              strokeDasharray="4 4"
              label={{
                value: `Frozen ${freezeLabel}`,
                position: 'insideTopRight',
                fill: '#6B7280',
                fontSize: 11,
              }}
            />

            <Line
              type="linear"
              dataKey="bandPos2"
              name="bandPos2"
              stroke={COLORS.bandPos2}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="bandNeg2"
              name="bandNeg2"
              stroke={COLORS.bandNeg2}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="bandPos1"
              name="bandPos1"
              stroke={COLORS.bandPos1}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="bandNeg1"
              name="bandNeg1"
              stroke={COLORS.bandNeg1}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="fairValue"
              name="fairValue"
              stroke={COLORS.fairValue}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="price"
              name="price"
              stroke={COLORS.price}
              strokeWidth={1.75}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
