import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import PortfolioTable from '@/components/PortfolioTable'
import CategoryChart from '@/components/CategoryChart'
import PerformanceSummary from '@/components/PerformanceSummary'
import PortfolioHistorySection from '@/components/PortfolioHistorySection'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// Define your secret slug - make this random and hard to guess
const SECRET_SLUG = process.env.PORTFOLIO_SECRET_SLUG || 'x7k9m2p-abc123-def456'

function LoadingFallback({ height = 'h-32' }: { height?: string }) {
  return (
    <div className={`card ${height} flex items-center justify-center`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-2" />
        <div className="text-gray-500">Loading portfolio data...</div>
      </div>
    </div>
  )
}

interface PortfolioPageProps {
  params: {
    slug: string
  }
}

export default function PortfolioPage({ params }: PortfolioPageProps) {
  // Check if the slug matches the secret
  if (params.slug !== SECRET_SLUG) {
    notFound()
  }

  return (
    <div className="space-y-8">
      {/* Performance Summary */}
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback height="h-32" />}>
          <PerformanceSummary />
        </Suspense>
      </ErrorBoundary>

      {/* Portfolio History */}
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback height="h-80" />}>
          <PortfolioHistorySection />
        </Suspense>
      </ErrorBoundary>

      {/* Table then Chart (always stacked) */}
      <div className="space-y-8">
        {/* Portfolio Table */}
        <div>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback height="h-96" />}>
              <PortfolioTable />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Category Allocation Chart */}
        <div>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback height="h-80" />}>
              <CategoryChart />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500 py-4">
        <p>
          Data is automatically refreshed every 60 seconds. 
          Last updated from CoinGecko API.
        </p>
        <p className="mt-1">
          Special calculations applied for ETHW, ETHA (ETH amounts) and BITB (BTC amounts).
        </p>
        <p className="mt-2">
          <Link href={`/portfolio/${params.slug}/info`} className="text-blue-600 hover:text-blue-700 underline">
            Portfolio data CLI guide
          </Link>
        </p>
      </div>
    </div>
  )
}
