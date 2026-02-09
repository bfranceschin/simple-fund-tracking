'use client'

import { useState, useCallback } from 'react'
import { format, parseISO, isValid } from 'date-fns'

interface DatePickerProps {
  selectedDate: string | null  // YYYY-MM-DD format or null for "today"
  onDateChange: (date: string | null) => void
  minDate?: string  // YYYY-MM-DD format
  maxDate?: string  // YYYY-MM-DD format
  isLoading?: boolean
}

// Default min date is the first transaction date
const DEFAULT_MIN_DATE = '2025-07-02'

// Spinning loader component
function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}

export default function DatePicker({
  selectedDate,
  onDateChange,
  minDate = DEFAULT_MIN_DATE,
  maxDate,
  isLoading = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  // Pending date - local state for the date picker before applying
  const [pendingDate, setPendingDate] = useState<string | null>(selectedDate)
  
  // Get today's date in YYYY-MM-DD format
  const today = format(new Date(), 'yyyy-MM-dd')
  const effectiveMaxDate = maxDate || today
  
  // Format the display date
  const getDisplayDate = useCallback(() => {
    if (!selectedDate) {
      return 'Today (Live)'
    }
    try {
      const date = parseISO(selectedDate)
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy')
      }
    } catch {
      // Fall through to default
    }
    return selectedDate
  }, [selectedDate])
  
  // Open the picker and initialize pending date
  const handleOpen = () => {
    if (!isLoading) {
      setPendingDate(selectedDate)
      setIsOpen(true)
    }
  }
  
  // Handle date input change - only update pending, not actual
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    if (newDate) {
      setPendingDate(newDate)
    }
  }
  
  // Apply the pending date
  const handleApply = () => {
    if (pendingDate) {
      onDateChange(pendingDate)
    }
    setIsOpen(false)
  }
  
  // Reset to today (applies immediately)
  const handleResetToToday = () => {
    onDateChange(null)
    setPendingDate(null)
    setIsOpen(false)
  }
  
  // Cancel without applying
  const handleCancel = () => {
    setPendingDate(selectedDate) // Reset to current
    setIsOpen(false)
  }
  
  const isViewingHistorical = selectedDate !== null
  
  // Check if the pending date is different from current (to highlight Apply button)
  const hasPendingChanges = pendingDate !== selectedDate
  
  return (
    <div className="relative flex items-center gap-3 flex-wrap">
      {/* Date Label */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Viewing:</span>
        <button
          onClick={handleOpen}
          disabled={isLoading}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium
            transition-colors duration-200
            ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
            ${isViewingHistorical 
              ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200' 
              : 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
            }
          `}
        >
          <span className="flex items-center gap-1.5">
            {isLoading ? (
              <LoadingSpinner />
            ) : isViewingHistorical ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : null}
            {getDisplayDate()}
            {!isLoading && (
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </span>
        </button>
      </div>
      
      {/* Historical Badge - shown when historical and not loading */}
      {isViewingHistorical && !isLoading && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Historical Data
        </span>
      )}
      
      {/* Loading Badge - shown when fetching historical */}
      {isLoading && isViewingHistorical && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
          <LoadingSpinner />
          <span className="ml-1">Loading...</span>
        </span>
      )}
      
      {/* Reset Button - always show when historical, but label changes */}
      {isViewingHistorical && !isLoading && (
        <button
          onClick={handleResetToToday}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors duration-200"
        >
          Reset to Today
        </button>
      )}
      
      {/* Date Input Dropdown */}
      {isOpen && !isLoading && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[280px]">
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Select a date</div>
            <input
              type="date"
              value={pendingDate || today}
              min={minDate}
              max={effectiveMaxDate}
              onChange={handleDateInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> Historical data takes a few minutes to load due to API rate limits. 
                Prices will appear progressively.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApply}
                disabled={!pendingDate}
                className={`
                  flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${hasPendingChanges 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }
                `}
              >
                Apply
              </button>
              <button
                onClick={handleResetToToday}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Today (Live)
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Date range: {format(parseISO(minDate), 'MMM d, yyyy')} - {format(parseISO(effectiveMaxDate), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && !isLoading && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={handleCancel}
        />
      )}
    </div>
  )
}
