'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { PortfolioItem, PortfolioSummary, CategoryData, PriceData } from '@/lib/types/portfolio'
import { fetchPricesWithRetry } from '@/lib/api/client'
import {
  createPortfolioItem,
  calculatePercentages,
  aggregateByCategory,
  calculateTotalPerformance
} from '@/lib/utils/calculations'
import {
  processTransactions,
  calculateCostBasis,
  calculateQuotaValue,
  calculateQuotaPerformance,
  getTokenAmount
} from '@/lib/utils/fund-calculations'
import { usePortfolioDate } from '@/contexts/PortfolioDateContext'
import { usePortfolioData } from '@/hooks/usePortfolioData'

interface UsePortfolioOptions {
  selectedDate?: string | null
}

export function usePortfolio(options: UsePortfolioOptions = {}) {
  const { selectedDate } = options
  const { snapshot, loading: snapshotLoading, error: snapshotError } = usePortfolioData()

  const { historicalPrices: sharedHistoricalPrices, isFetchingHistorical } = usePortfolioDate()

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [currentPrices, setCurrentPrices] = useState<Record<string, PriceData>>({})

  const isHistorical = Boolean(selectedDate)
  const tokens = snapshot?.tokens || []
  const transactions = snapshot?.transactions || []
  const initialQuotaValue = snapshot?.settings?.initialQuotaValue ?? 1
  const baselineTotalValue = snapshot?.settings?.baselineTotalValue ?? 0

  const fundState = useMemo(
    () => processTransactions(transactions, selectedDate || undefined, initialQuotaValue),
    [transactions, selectedDate, initialQuotaValue]
  )
  const costBasisMap = useMemo(
    () => calculateCostBasis(transactions, selectedDate || undefined),
    [transactions, selectedDate]
  )

  const buildPortfolioFromPrices = useCallback((prices: Record<string, PriceData>, date?: string) => {
    const items: PortfolioItem[] = tokens
      .filter(token => {
        const amount = getTokenAmount(token, fundState.holdings)
        return amount > 0
      })
      .map(token => {
        const amount = getTokenAmount(token, fundState.holdings)
        const costBasis = costBasisMap.get(token.symbol) || 0
        return createPortfolioItem(token, amount, costBasis, prices)
      })

    const itemsWithPercentages = calculatePercentages(items)
    const categoryData = aggregateByCategory(itemsWithPercentages)
    const totalValue = itemsWithPercentages.reduce((sum, item) => sum + item.currentValue, 0)
    const quotaValue = calculateQuotaValue(totalValue, fundState.totalShares, initialQuotaValue)
    const quotaPerformance = calculateQuotaPerformance(quotaValue, initialQuotaValue)
    const totalPerformance = calculateTotalPerformance(totalValue, baselineTotalValue)

    const portfolioSummary: PortfolioSummary = {
      totalValue,
      baselineValue: baselineTotalValue,
      totalPerformance: totalPerformance.performance,
      categories: categoryData.map(cat => ({
        category: cat.category as any,
        totalValue: cat.totalValue,
        percentage: cat.percentage,
        items: cat.items
      })),
      lastUpdated: date ? new Date(date) : new Date(),
      quotaValue,
      initialQuotaValue,
      totalShares: fundState.totalShares,
      quotaPerformance
    }

    return { itemsWithPercentages, portfolioSummary }
  }, [tokens, fundState, costBasisMap, baselineTotalValue, initialQuotaValue])

  const fetchCurrentPrices = useCallback(async (forceRefresh: boolean = false) => {
    if (tokens.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetchPricesWithRetry(3, forceRefresh)

      const prices: Record<string, PriceData> = response.priceData || {}
      if (!response.priceData) {
        Object.entries(response.prices).forEach(([tokenId, price]) => {
          prices[tokenId] = { price }
        })
      }

      setCurrentPrices(prices)

      const { itemsWithPercentages, portfolioSummary } = buildPortfolioFromPrices(prices)

      setPortfolioItems(itemsWithPercentages)
      setCategories(portfolioSummary.categories)
      setSummary(portfolioSummary)
      setLastUpdated(new Date(response.timestamp))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch current prices')
    } finally {
      setLoading(false)
    }
  }, [buildPortfolioFromPrices, tokens.length])

  useEffect(() => {
    if (!selectedDate || !snapshot) return

    const priceCount = Object.keys(sharedHistoricalPrices).length
    if (priceCount > 0) {
      const { itemsWithPercentages, portfolioSummary } = buildPortfolioFromPrices(
        sharedHistoricalPrices,
        selectedDate
      )

      setPortfolioItems(itemsWithPercentages)
      setCategories(portfolioSummary.categories)
      setSummary(portfolioSummary)
      setLastUpdated(new Date(selectedDate))
    }
  }, [sharedHistoricalPrices, selectedDate, buildPortfolioFromPrices, snapshot])

  useEffect(() => {
    if (snapshotLoading) {
      setLoading(true)
      return
    }

    if (snapshotError) {
      setLoading(false)
      setError(snapshotError)
      return
    }

    if (!selectedDate) {
      fetchCurrentPrices()
      return
    }

    setLoading(isFetchingHistorical && Object.keys(sharedHistoricalPrices).length === 0)
  }, [
    snapshotLoading,
    snapshotError,
    selectedDate,
    isFetchingHistorical,
    sharedHistoricalPrices,
    fetchCurrentPrices,
  ])

  const refreshData = useCallback((forceRefresh: boolean = false) => {
    if (!selectedDate) {
      fetchCurrentPrices(forceRefresh)
    }
  }, [selectedDate, fetchCurrentPrices])

  return {
    portfolioItems,
    summary,
    categories,
    loading,
    error,
    lastUpdated,
    refreshData,
    fundState,
    isHistorical,
    selectedDate,
    historicalPrices: selectedDate ? sharedHistoricalPrices : currentPrices
  }
}
