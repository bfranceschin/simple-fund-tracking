import { Transaction, FundState, TokenMetadata, PriceData } from '@/lib/types/portfolio'

/**
 * Filter transactions up to a specific date (inclusive)
 */
export function filterTransactionsByDate(
  transactions: Transaction[],
  upToDate?: string
): Transaction[] {
  if (!upToDate) {
    return transactions
  }

  return transactions.filter(tx => tx.date <= upToDate)
}

/**
 * Process all transactions to compute fund state (holdings, shares, cash).
 */
export function processTransactions(
  transactions: Transaction[],
  upToDate?: string,
  initialQuotaValue: number = 1
): FundState {
  const filteredTransactions = filterTransactionsByDate(transactions, upToDate)

  let totalShares = 0
  let cashBalance = 0
  const holdings = new Map<string, number>()

  for (const tx of filteredTransactions) {
    const quotaValue = tx.quotaValueAtTransaction ?? initialQuotaValue

    switch (tx.type) {
      case 'DEPOSIT': {
        const newShares = tx.usdValue / quotaValue
        totalShares += newShares
        cashBalance += tx.usdValue
        break
      }
      case 'WITHDRAW': {
        const sharesToRedeem = tx.usdValue / quotaValue
        totalShares -= sharesToRedeem
        cashBalance -= tx.usdValue
        break
      }
      case 'BUY': {
        if (tx.tokenSymbol) {
          cashBalance -= tx.usdValue
          const currentAmount = holdings.get(tx.tokenSymbol) || 0
          holdings.set(tx.tokenSymbol, currentAmount + tx.amount)
        }
        break
      }
      case 'SELL': {
        if (tx.tokenSymbol) {
          cashBalance += tx.usdValue
          const currentAmount = holdings.get(tx.tokenSymbol) || 0
          holdings.set(tx.tokenSymbol, currentAmount - tx.amount)
        }
        break
      }
    }
  }

  return {
    totalShares,
    quotaValue: initialQuotaValue,
    cashBalance,
    holdings
  }
}

export function calculateQuotaValue(
  portfolioValue: number,
  totalShares: number,
  initialQuotaValue: number = 1
): number {
  if (totalShares === 0) return initialQuotaValue
  return portfolioValue / totalShares
}

export function calculateQuotaPerformance(
  currentQuotaValue: number,
  initialQuotaValue: number = 1
): number {
  return ((currentQuotaValue - initialQuotaValue) / initialQuotaValue) * 100
}

export function calculateSharesForDeposit(amount: number, quotaValue: number): number {
  return amount / quotaValue
}

export function calculateSharesForWithdraw(amount: number, quotaValue: number): number {
  return amount / quotaValue
}

export function getHoldingsFromFundState(fundState: FundState): Map<string, number> {
  return fundState.holdings
}

export function calculateCostBasis(
  transactions: Transaction[],
  upToDate?: string
): Map<string, number> {
  const filteredTransactions = filterTransactionsByDate(transactions, upToDate)

  const costBasis = new Map<string, number>()
  const holdings = new Map<string, number>()

  for (const tx of filteredTransactions) {
    if (tx.type === 'BUY' && tx.tokenSymbol) {
      const currentCost = costBasis.get(tx.tokenSymbol) || 0
      costBasis.set(tx.tokenSymbol, currentCost + tx.usdValue)
      const currentAmount = holdings.get(tx.tokenSymbol) || 0
      holdings.set(tx.tokenSymbol, currentAmount + tx.amount)
    } else if (tx.type === 'SELL' && tx.tokenSymbol) {
      const currentAmount = holdings.get(tx.tokenSymbol) || 0
      if (currentAmount <= 0) {
        continue
      }
      const currentCost = costBasis.get(tx.tokenSymbol) || 0
      const averageCost = currentCost / currentAmount
      const amountSold = Math.min(tx.amount, currentAmount)
      const costReduction = averageCost * amountSold
      costBasis.set(tx.tokenSymbol, Math.max(0, currentCost - costReduction))
      holdings.set(tx.tokenSymbol, currentAmount - amountSold)
    }
  }

  return costBasis
}

export function calculatePortfolioValue(
  fundState: FundState,
  currentPrices: Record<string, PriceData>,
  tokens: TokenMetadata[]
): number {
  let totalValue = fundState.cashBalance

  fundState.holdings.forEach((amount, symbol) => {
    const token = tokens.find(t => t.symbol === symbol)
    if (!token) return

    if (token.specialCalculation === 'ETH_AMOUNT') {
      const ethPrice = currentPrices['ethereum']?.price || 0
      totalValue += amount * ethPrice
    } else if (token.specialCalculation === 'BTC_AMOUNT') {
      const btcPrice = currentPrices['bitcoin']?.price || 0
      totalValue += amount * btcPrice
    } else {
      const price = currentPrices[token.id]?.price || 0
      totalValue += amount * price
    }
  })

  return totalValue
}

export function getTokenAmount(
  token: TokenMetadata,
  holdings: Map<string, number>
): number {
  return holdings.get(token.symbol) || 0
}

export function calculateTokenValue(
  token: TokenMetadata,
  holdings: Map<string, number>,
  currentPrices: Record<string, PriceData>
): number {
  const amount = getTokenAmount(token, holdings)

  if (token.specialCalculation === 'ETH_AMOUNT') {
    const ethPrice = currentPrices['ethereum']?.price || 0
    return amount * ethPrice
  } else if (token.specialCalculation === 'BTC_AMOUNT') {
    const btcPrice = currentPrices['bitcoin']?.price || 0
    return amount * btcPrice
  }

  const price = currentPrices[token.id]?.price || 0
  return amount * price
}
