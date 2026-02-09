'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import { PriceData } from '@/lib/types/portfolio'
import { fetchSingleTokenHistoricalPrice } from '@/lib/api/client'
import { getUniqueTokenIdsForPricing } from '@/lib/utils/portfolio-pricing'
import { usePortfolioData } from '@/hooks/usePortfolioData'

// Delay between historical token fetches (20 seconds to avoid rate limits)
const HISTORICAL_FETCH_DELAY_MS = 20000

export interface FetchProgress {
  current: number
  total: number
  currentToken: string
}

interface PortfolioDateContextType {
  selectedDate: string | null  // YYYY-MM-DD format or null for "today"
  setSelectedDate: (date: string | null) => void
  isHistorical: boolean
  // Historical fetch progress tracking
  isFetchingHistorical: boolean
  fetchProgress: FetchProgress | null
  // Accumulated historical prices (shared across all consumers)
  historicalPrices: Record<string, PriceData>
  // Cancel function - aborts fetch and resets to today
  cancelHistoricalFetch: () => void
}

const PortfolioDateContext = createContext<PortfolioDateContextType | undefined>(undefined)

export function PortfolioDateProvider({ children }: { children: ReactNode }) {
  const { snapshot } = usePortfolioData()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isFetchingHistorical, setIsFetchingHistorical] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<FetchProgress | null>(null)
  const [historicalPrices, setHistoricalPrices] = useState<Record<string, PriceData>>({})
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const isHistorical = selectedDate !== null
  
  // Cancel historical fetch and reset to today
  const cancelHistoricalFetch = useCallback(() => {
    console.log('[PortfolioDateContext] Cancelling historical fetch')
    
    // Abort any in-progress fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Reset state
    setIsFetchingHistorical(false)
    setFetchProgress(null)
    setHistoricalPrices({})
    setSelectedDate(null) // Reset to today
  }, [])

  // Centralized historical price fetching - runs when selectedDate changes
  useEffect(() => {
    // If no date selected (today), clear historical data
    if (!selectedDate) {
      setHistoricalPrices({})
      setIsFetchingHistorical(false)
      setFetchProgress(null)
      return
    }

    // Cancel any existing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const fetchHistoricalPrices = async () => {
      console.log('[PortfolioDateContext] Starting historical fetch for:', selectedDate)
      
      setIsFetchingHistorical(true)
      setHistoricalPrices({})
      
      const tokenIds = getUniqueTokenIdsForPricing(snapshot?.tokens || [])
      const total = tokenIds.length
      if (total === 0) {
        setIsFetchingHistorical(false)
        setFetchProgress(null)
        return
      }
      const accumulatedPrices: Record<string, PriceData> = {}
      
      console.log(`[PortfolioDateContext] Will fetch ${total} tokens:`, tokenIds)
      
      try {
        for (let i = 0; i < tokenIds.length; i++) {
          const tokenId = tokenIds[i]
          
          // Check if cancelled
          if (abortController.signal.aborted) {
            console.log('[PortfolioDateContext] Fetch cancelled')
            return
          }
          
          // Update progress BEFORE fetch
          setFetchProgress({
            current: i + 1,
            total,
            currentToken: tokenId
          })
          
          console.log(`[PortfolioDateContext] Fetching token ${i + 1}/${total}: ${tokenId}`)
          
          try {
            const response = await fetchSingleTokenHistoricalPrice(
              tokenId, 
              selectedDate, 
              abortController.signal
            )
            
            // Add to accumulated prices
            accumulatedPrices[tokenId] = {
              price: response.price,
              marketCap: response.marketCap
            }
            
            // Update state with accumulated prices (triggers re-render in all consumers)
            setHistoricalPrices({ ...accumulatedPrices })
            
            console.log(`[PortfolioDateContext] Token ${tokenId} fetched: $${response.price}`)
            
          } catch (tokenError) {
            // If it's an abort, stop
            if (tokenError instanceof Error && tokenError.name === 'AbortError') {
              console.log('[PortfolioDateContext] Fetch aborted')
              return
            }
            console.error(`[PortfolioDateContext] Failed to fetch ${tokenId}:`, tokenError)
            // Continue with other tokens even if one fails
          }
          
          // Wait before next request (except for the last one)
          if (i < tokenIds.length - 1 && !abortController.signal.aborted) {
            console.log(`[PortfolioDateContext] Waiting ${HISTORICAL_FETCH_DELAY_MS / 1000}s before next token...`)
            
            await new Promise<void>((resolve) => {
              const timeout = setTimeout(resolve, HISTORICAL_FETCH_DELAY_MS)
              
              // Listen for abort during the wait
              const abortHandler = () => {
                clearTimeout(timeout)
                resolve()
              }
              abortController.signal.addEventListener('abort', abortHandler, { once: true })
            })
          }
        }
        
        console.log('[PortfolioDateContext] Historical fetch completed successfully')
        
      } finally {
        if (!abortController.signal.aborted) {
          setIsFetchingHistorical(false)
          setFetchProgress(null)
        }
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
        }
      }
    }

    fetchHistoricalPrices()

    // Cleanup on unmount or date change
    return () => {
      abortController.abort()
    }
  }, [selectedDate, snapshot?.tokens])
  
  console.log('[PortfolioDateContext] Provider render:', { 
    selectedDate, 
    isHistorical, 
    isFetchingHistorical,
    fetchProgress,
    historicalPricesCount: Object.keys(historicalPrices).length
  })
  
  return (
    <PortfolioDateContext.Provider value={{ 
      selectedDate, 
      setSelectedDate, 
      isHistorical,
      isFetchingHistorical,
      fetchProgress,
      historicalPrices,
      cancelHistoricalFetch
    }}>
      {children}
    </PortfolioDateContext.Provider>
  )
}

export function usePortfolioDate() {
  const context = useContext(PortfolioDateContext)
  if (context === undefined) {
    console.error('[usePortfolioDate] Context is undefined - component may be outside PortfolioDateProvider')
    throw new Error('usePortfolioDate must be used within a PortfolioDateProvider')
  }
  return context
}
