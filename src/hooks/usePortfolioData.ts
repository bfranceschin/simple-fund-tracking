'use client'

import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { PortfolioSnapshot } from '@/lib/types/portfolio'

const DEFAULT_SETTINGS = {
  baselineTotalValue: 0,
  initialQuotaValue: 1,
}

export function usePortfolioData() {
  const snapshot = useQuery(api.portfolioData.getSnapshot)

  if (snapshot === undefined) {
    return {
      loading: true,
      error: null as string | null,
      snapshot: null as PortfolioSnapshot | null,
    }
  }

  if (!snapshot.settings) {
    return {
      loading: false,
      error: 'Portfolio data is not initialized in Convex. Run the bootstrap CLI command.',
      snapshot: {
        tokens: snapshot.tokens,
        transactions: snapshot.transactions,
        settings: DEFAULT_SETTINGS,
      } as PortfolioSnapshot,
    }
  }

  return {
    loading: false,
    error: null as string | null,
    snapshot,
  }
}
