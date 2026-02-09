import type { Metadata } from 'next'
import PortfolioClientWrapper from '@/components/PortfolioClientWrapper'

export const metadata: Metadata = {
  title: 'Portfolio Dashboard',
  description: 'Personal portfolio management',
}

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortfolioClientWrapper>
      {children}
    </PortfolioClientWrapper>
  )
} 