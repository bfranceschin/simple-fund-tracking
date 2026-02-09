'use client'

import { useMemo, useRef, useState } from 'react'
import { addDays, format, isAfter, parseISO } from 'date-fns'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { fetchSingleTokenHistoricalPrice } from '@/lib/api/client'
import { calculatePortfolioValue, processTransactions } from '@/lib/utils/fund-calculations'
import { PriceData } from '@/lib/types/portfolio'
import { formatCurrency } from '@/lib/utils/formatters'
import { getUniqueTokenIdsForPricing } from '@/lib/utils/portfolio-pricing'
import { usePortfolioData } from '@/hooks/usePortfolioData'

const BACKFILL_DELAY_MS = 10000
const RATE_LIMIT_BACKOFF_MS = 60000
const GRAPH_MODES = ['total', 'share', 'percent'] as const
type GraphMode = (typeof GRAPH_MODES)[number]

interface BackfillProgress {
  current: number
  total: number
  date: string
  status: string
}

function getFirstTransactionDate(transactionDates: string[]): string | null {
  if (transactionDates.length === 0) return null
  return transactionDates.reduce((min, date) => (date < min ? date : min), transactionDates[0])
}

function buildDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  let current = parseISO(startDate)
  const end = parseISO(endDate)

  while (!isAfter(current, end)) {
    dates.push(format(current, 'yyyy-MM-dd'))
    current = addDays(current, 1)
  }

  return dates
}

async function sleepWithAbort(ms: number, signal: AbortSignal) {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, ms)
    const abortHandler = () => {
      clearTimeout(timeout)
      resolve()
    }
    signal.addEventListener('abort', abortHandler, { once: true })
  })
}

async function fetchPricesForDate(
  tokenIds: string[],
  date: string,
  signal: AbortSignal,
  onStatus: (status: string) => void
): Promise<Record<string, PriceData>> {
  const prices: Record<string, PriceData> = {}

  for (let i = 0; i < tokenIds.length; i++) {
    if (signal.aborted) {
      break
    }

    const tokenId = tokenIds[i]
    let fetched = false

    while (!fetched && !signal.aborted) {
      onStatus(`Fetching ${tokenId} price for ${date}...`)
      try {
        const response = await fetchSingleTokenHistoricalPrice(tokenId, date, signal)
        prices[tokenId] = { price: response.price, marketCap: response.marketCap }
        fetched = true
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          break
        }

        const status = typeof error === 'object' && error !== null && 'status' in error
          ? (error as { status?: number }).status
          : undefined
        const message = error instanceof Error ? error.message : String(error)
        const isRateLimit =
          status === 429 ||
          message.toLowerCase().includes('rate limit') ||
          message.toLowerCase().includes('http error! status: 429') ||
          message.toLowerCase().includes('status: 429')

        if (status === 404) {
          onStatus(`No data for ${tokenId} on ${date}. Skipping...`)
          fetched = true
          continue
        }

        if (isRateLimit) {
          onStatus(`Rate limit hit. Waiting 60s before retrying ${tokenId}...`)
          await sleepWithAbort(RATE_LIMIT_BACKOFF_MS, signal)
          continue
        }

        console.error(`[PortfolioHistory] Failed to fetch ${tokenId} for ${date}:`, error)
        fetched = true
      }
    }

    if (i < tokenIds.length - 1 && !signal.aborted) {
      onStatus(`Waiting ${BACKFILL_DELAY_MS / 1000}s before next token...`)
      await sleepWithAbort(BACKFILL_DELAY_MS, signal)
    }
  }

  return prices
}

export default function PortfolioHistorySection() {
  const { snapshot, loading: snapshotLoading, error: snapshotError } = usePortfolioData()
  const today = format(new Date(), 'yyyy-MM-dd')
  const transactions = snapshot?.transactions || []
  const tokens = snapshot?.tokens || []
  const initialQuotaValue = snapshot?.settings?.initialQuotaValue ?? 1
  const firstTransactionDate = getFirstTransactionDate(transactions.map(tx => tx.date))

  const dailyEntries = useQuery(
    api.portfolioDaily.list,
    firstTransactionDate ? { startDate: firstTransactionDate, endDate: today } : "skip"
  )

  const upsertDaily = useMutation(api.portfolioDaily.upsert)

  const [isBackfilling, setIsBackfilling] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [progress, setProgress] = useState<BackfillProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [graphMode, setGraphMode] = useState<GraphMode>('total')
  const abortRef = useRef<AbortController | null>(null)

  const existingDates = useMemo(() => {
    return new Set((dailyEntries || []).map((entry) => entry.date))
  }, [dailyEntries])

  const missingDates = useMemo(() => {
    if (!firstTransactionDate) return []
    const range = buildDateRange(firstTransactionDate, today)
    return range.filter((date) => !existingDates.has(date))
  }, [existingDates, firstTransactionDate, today])

  const chartData = useMemo(() => {
    const rows = (dailyEntries || []).map((entry) => ({
      date: entry.date,
      portfolioValue: entry.portfolioValue,
      totalShares: entry.totalShares,
      shareValue: entry.totalShares === 0 ? 0 : entry.portfolioValue / entry.totalShares,
    }))

    if (rows.length === 0) return rows

    const baseValue = rows[0].portfolioValue || 0
    const baseShare = rows[0].shareValue || 0

    return rows.map((row) => ({
      ...row,
      percentValue: baseValue > 0 ? ((row.portfolioValue / baseValue) - 1) * 100 : 0,
      percentShare: baseShare > 0 ? ((row.shareValue / baseShare) - 1) * 100 : 0,
    }))
  }, [dailyEntries])

  const chartConfig = useMemo(() => {
    switch (graphMode) {
      case 'share':
        return {
          dataKey: 'shareValue',
          label: 'Share Value',
          color: '#16A34A',
          yFormatter: (value: number) => formatCurrency(value),
          tooltipFormatter: (value: number) => formatCurrency(value),
        }
      case 'percent':
        return {
          dataKey: 'percentValue',
          label: 'Portfolio % Change',
          color: '#7C3AED',
          yFormatter: (value: number) => `${value.toFixed(2)}%`,
          tooltipFormatter: (value: number) => `${value.toFixed(2)}%`,
        }
      case 'total':
      default:
        return {
          dataKey: 'portfolioValue',
          label: 'Portfolio Value',
          color: '#2563EB',
          yFormatter: (value: number) => formatCurrency(value),
          tooltipFormatter: (value: number) => formatCurrency(value),
        }
    }
  }, [graphMode])

  const handleBackfill = async () => {
    if (snapshotLoading || snapshotError || isBackfilling || missingDates.length === 0 || !firstTransactionDate) return

    setIsBackfilling(true)
    setIsStopping(false)
    setError(null)

    const abortController = new AbortController()
    abortRef.current = abortController

    const tokenIds = getUniqueTokenIdsForPricing(tokens)

    try {
      for (let i = 0; i < missingDates.length; i++) {
        if (abortController.signal.aborted) {
          break
        }

        const date = missingDates[i]
        setProgress({
          current: i + 1,
          total: missingDates.length,
          date,
          status: `Preparing ${date}...`,
        })

        const prices = await fetchPricesForDate(
          tokenIds,
          date,
          abortController.signal,
          (status) =>
            setProgress({
              current: i + 1,
              total: missingDates.length,
              date,
              status,
            })
        )
        if (abortController.signal.aborted) {
          break
        }

        if (Object.keys(prices).length === 0) {
          console.warn(`[PortfolioHistory] No prices for ${date}, skipping`)
          continue
        }

        setProgress({
          current: i + 1,
          total: missingDates.length,
          date,
          status: `Calculating portfolio for ${date}...`,
        })

        const fundState = processTransactions(transactions, date, initialQuotaValue)
        const portfolioValue = calculatePortfolioValue(fundState, prices, tokens)

        setProgress({
          current: i + 1,
          total: missingDates.length,
          date,
          status: `Saving ${date} to database...`,
        })

        await upsertDaily({
          date,
          portfolioValue,
          totalShares: fundState.totalShares,
        })
      }
    } catch (err) {
      console.error('[PortfolioHistory] Backfill failed:', err)
      setError(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setIsBackfilling(false)
      setIsStopping(false)
      setProgress(null)
      if (abortRef.current === abortController) {
        abortRef.current = null
      }
    }
  }

  const handleStop = () => {
    if (!abortRef.current) return
    setIsStopping(true)
    abortRef.current.abort()
  }

  return (
    <section className="card">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Portfolio History</h2>
            <p className="text-sm text-gray-500">
              Stored days: {dailyEntries ? dailyEntries.length : 0}
              {firstTransactionDate ? ` · Missing: ${missingDates.length}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {GRAPH_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setGraphMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  graphMode === mode
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mode === 'total' && 'Total Value'}
                {mode === 'share' && 'Share Value'}
                {mode === 'percent' && '% Change'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackfill}
              disabled={snapshotLoading || Boolean(snapshotError) || isBackfilling || missingDates.length === 0 || !firstTransactionDate}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                snapshotLoading || snapshotError || isBackfilling || missingDates.length === 0 || !firstTransactionDate
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Backfill Missing Days
            </button>
            <button
              onClick={handleStop}
              disabled={!isBackfilling || isStopping}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isBackfilling || isStopping
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isStopping ? 'Stopping…' : 'Stop'}
            </button>
          </div>
        </div>

        {progress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-blue-800 mb-2">
              <span>
                Backfilling {progress.current}/{progress.total}
              </span>
              <span>{progress.date}</span>
            </div>
            <div className="text-xs text-blue-700 mb-2">
              {progress.status}
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}
        {snapshotError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {snapshotError}
          </div>
        )}

        <div className="h-72">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              No historical data stored yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    try {
                      return format(parseISO(value), 'MMM d')
                    } catch {
                      return value
                    }
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => chartConfig.yFormatter(Number(value))}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [chartConfig.tooltipFormatter(value), chartConfig.label]}
                  labelFormatter={(label) => {
                    try {
                      return format(parseISO(label), 'MMM d, yyyy')
                    } catch {
                      return label
                    }
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={chartConfig.dataKey}
                  stroke={chartConfig.color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  )
}
