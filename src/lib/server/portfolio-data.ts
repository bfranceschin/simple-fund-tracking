import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { PortfolioSnapshot, TokenMetadata } from '@/lib/types/portfolio'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

function getConvexClient() {
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set')
  }
  return new ConvexHttpClient(convexUrl)
}

export async function getPortfolioSnapshotServer(): Promise<PortfolioSnapshot> {
  const client = getConvexClient()
  const snapshot = await client.query(api.portfolioData.getSnapshot, {})

  return {
    tokens: snapshot.tokens,
    transactions: snapshot.transactions,
    settings: snapshot.settings,
  }
}

export async function getPortfolioTokensServer(): Promise<TokenMetadata[]> {
  const snapshot = await getPortfolioSnapshotServer()
  return snapshot.tokens
}
