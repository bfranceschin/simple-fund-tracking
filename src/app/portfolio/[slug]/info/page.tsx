import Link from 'next/link'
import { notFound } from 'next/navigation'

const SECRET_SLUG = process.env.PORTFOLIO_SECRET_SLUG || 'x7k9m2p-abc123-def456'

interface PortfolioInfoPageProps {
  params: {
    slug: string
  }
}

export default function PortfolioInfoPage({ params }: PortfolioInfoPageProps) {
  if (params.slug !== SECRET_SLUG) {
    notFound()
  }

  const basePath = `/portfolio/${params.slug}`

  return (
    <div className="card space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portfolio Data CLI</h1>
        <p className="text-sm text-gray-600 mt-2">
          Tokens, transactions, and baseline settings are stored in Convex. Use the CLI below to initialize and update data.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">1. Bootstrap current data</h2>
        <p className="text-sm text-gray-600">Run this once to seed Convex from your local JSON file:</p>
        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
          <code>npm run portfolio:bootstrap</code>
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">2. Add or update a transaction</h2>
        <p className="text-sm text-gray-600">Create a JSON file with one transaction and run:</p>
        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
          <code>npm run portfolio:tx -- --file ./examples/transaction.json</code>
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">3. Add or update a token</h2>
        <p className="text-sm text-gray-600">Create a JSON file with one token and run:</p>
        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
          <code>npm run portfolio:token -- --file ./examples/token.json</code>
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Required local files</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li><code>.portfolio-data.local.json</code> for bootstrap data (gitignored).</li>
          <li><code>.env.local</code> with <code>NEXT_PUBLIC_CONVEX_URL</code> and <code>CONVEX_DEPLOYMENT</code>.</li>
        </ul>
      </section>

      <div>
        <Link href={basePath} className="text-blue-600 hover:text-blue-700 underline">
          Back to portfolio
        </Link>
      </div>
    </div>
  )
}
