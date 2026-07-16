export type PricePoint = {
  date: string
  price: number
}

export type BandPoint = {
  date: string
  price: number
  fairValue: number
  oversoldNeg1: number
  overboughtPos15: number
  extremePos2: number
}

const MS_PER_DAY = 86_400_000

/**
 * Fit ln(price) = α + β·t (t = days since first point) and emit
 * fair-value plus σ bands in USD: −1σ, +1.5σ, +2σ.
 */
export function computeLogRegressionBands(points: PricePoint[]): BandPoint[] {
  const valid = points.filter((p) => Number.isFinite(p.price) && p.price > 0)
  if (valid.length < 3) {
    return []
  }

  const t0 = Date.parse(valid[0].date)
  const xs = valid.map((p) => (Date.parse(p.date) - t0) / MS_PER_DAY)
  const ys = valid.map((p) => Math.log(p.price))
  const n = valid.length

  const meanX = xs.reduce((sum, x) => sum + x, 0) / n
  const meanY = ys.reduce((sum, y) => sum + y, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    numerator += dx * (ys[i] - meanY)
    denominator += dx * dx
  }

  const beta = denominator === 0 ? 0 : numerator / denominator
  const alpha = meanY - beta * meanX

  const residuals = ys.map((y, i) => y - (alpha + beta * xs[i]))
  const degreesOfFreedom = Math.max(n - 2, 1)
  const variance =
    residuals.reduce((sum, r) => sum + r * r, 0) / degreesOfFreedom
  const sigma = Math.sqrt(variance)

  return valid.map((point, i) => {
    const fitted = alpha + beta * xs[i]
    return {
      date: point.date,
      price: point.price,
      fairValue: Math.exp(fitted),
      oversoldNeg1: Math.exp(fitted - sigma),
      overboughtPos15: Math.exp(fitted + 1.5 * sigma),
      extremePos2: Math.exp(fitted + 2 * sigma),
    }
  })
}
