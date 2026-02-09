'use client'

import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioDate } from '@/contexts/PortfolioDateContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatCurrency, formatPortfolioPercentage } from '@/lib/utils/formatters'
import { CATEGORY_COLORS } from '@/lib/constants/portfolio-data'

// Get color for a category, with fallback for unknown categories
const getCategoryColor = (category: string) => {
  return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#6B7280'
}

export default function CategoryChart() {
  const { selectedDate } = usePortfolioDate()
  const { categories, loading, error } = usePortfolio({ selectedDate })
  
  console.log('[CategoryChart] Render state:', { loading, error, categoryCount: categories?.length, selectedDate })

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Category Allocation
        </h2>
        <div className="text-red-600">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Category Allocation
        </h2>
        <div className="text-gray-500">
          No data available
        </div>
      </div>
    )
  }

  // Sort categories by totalValue descending
  const sortedCategories = [...categories].sort((a, b) => b.totalValue - a.totalValue)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.category}</p>
          <p className="text-gray-600">{formatCurrency(data.totalValue)}</p>
          <p className="text-gray-500">{formatPortfolioPercentage(data.percentage)}</p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: getCategoryColor(entry.category) }}
            ></div>
            <span className="text-gray-700">{entry.category}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Category Allocation
      </h2>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sortedCategories}
              dataKey="totalValue"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name}: ${formatPortfolioPercentage(percent * 100)}`}
            >
              {sortedCategories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 space-y-1">
        {sortedCategories.map((category, index) => (
          <div key={index} className="flex justify-between">
            <span className="text-gray-600">
              <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getCategoryColor(category.category) }} />
              {category.category}
            </span>
            <span className="font-medium">{formatPortfolioPercentage(category.percentage)}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 