'use client'

import { ReactNode } from 'react'
import { PortfolioDateProvider, usePortfolioDate } from '@/contexts/PortfolioDateContext'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import DatePicker from './DatePicker'

// Progress bar component for historical fetch
function HistoricalFetchProgress() {
  const { isFetchingHistorical, fetchProgress, cancelHistoricalFetch } = usePortfolioDate()
  
  if (!isFetchingHistorical || !fetchProgress) {
    return null
  }
  
  const progressPercent = (fetchProgress.current / fetchProgress.total) * 100
  
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-amber-800">
                Fetching historical prices: {fetchProgress.current}/{fetchProgress.total}
              </span>
              <span className="text-sm text-amber-600">
                {fetchProgress.currentToken}
              </span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-amber-600 mt-1">
              This may take a few minutes. Prices update as they are fetched.
            </p>
          </div>
          <button
            onClick={cancelHistoricalFetch}
            className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Header component that uses the date context
function PortfolioHeader() {
  const { selectedDate, setSelectedDate, isFetchingHistorical } = usePortfolioDate()
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Portfolio Dashboard
            </h1>
          </div>
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            isLoading={isFetchingHistorical}
          />
        </div>
      </div>
    </header>
  )
}

interface PortfolioClientWrapperProps {
  children: ReactNode
}

export default function PortfolioClientWrapper({ children }: PortfolioClientWrapperProps) {
  return (
    <ConvexClientProvider>
      <PortfolioDateProvider>
        <div className="min-h-screen bg-gray-50">
          <PortfolioHeader />
          <HistoricalFetchProgress />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </PortfolioDateProvider>
    </ConvexClientProvider>
  )
}
