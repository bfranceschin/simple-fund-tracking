export type PricePoint = {
  date: string
  price: number
}

export type BandPoint = {
  date: string
  /** Unix ms — used as the numeric X axis so spacing follows calendar time. */
  time: number
  /** Spot price when available; null on the forward channel. */
  price: number | null
  fairValue: number
  bandNeg1: number
  bandPos1: number
  bandNeg2: number
  bandPos2: number
}

export type LogRegressionChartOptions = {
  /** Inclusive display/fit window start (YYYY-MM-DD). */
  chartStart: string
  /** Fit sample ends here; model coefficients are frozen (YYYY-MM-DD). */
  freezeDate: string
  /** Inclusive forward channel end (YYYY-MM-DD). */
  chartEnd: string
  /** Day step for synthetic forward dates. */
  forwardStepDays?: number
}

export const GMI_CHART_DEFAULTS: LogRegressionChartOptions = {
  chartStart: '2017-08-01',
  freezeDate: '2025-12-31',
  chartEnd: '2034-12-31',
  forwardStepDays: 14,
}

const MS_PER_DAY = 86_400_000

function toDayIndex(date: string, originMs: number): number {
  return (Date.parse(date) - originMs) / MS_PER_DAY
}

function addDays(date: string, days: number): string {
  const ms = Date.parse(date) + days * MS_PER_DAY
  return new Date(ms).toISOString().slice(0, 10)
}

function fitLogLinear(points: PricePoint[]): { alpha: number; beta: number; sigma: number; t0: number } {
  const t0 = Date.parse(points[0].date)
  const xs = points.map((p) => toDayIndex(p.date, t0))
  const ys = points.map((p) => Math.log(p.price))
  const n = points.length

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

  return { alpha, beta, sigma, t0 }
}

/**
 * Fit ln(price) = α + β·t on [chartStart, freezeDate], then emit a
 * symmetric ±1σ / ±2σ highway from chartStart through chartEnd.
 * Spot price is attached only where historical data exists.
 */
export function computeLogRegressionBands(
  points: PricePoint[],
  options: LogRegressionChartOptions = GMI_CHART_DEFAULTS
): BandPoint[] {
  const {
    chartStart,
    freezeDate,
    chartEnd,
    forwardStepDays = 14,
  } = options

  const inWindow = points
    .filter(
      (p) =>
        Number.isFinite(p.price) &&
        p.price > 0 &&
        p.date >= chartStart &&
        p.date <= chartEnd
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const fitSample = inWindow.filter((p) => p.date <= freezeDate)
  if (fitSample.length < 3) {
    return []
  }

  const { alpha, beta, sigma, t0 } = fitLogLinear(fitSample)
  const priceByDate = new Map(inWindow.map((p) => [p.date, p.price]))

  const dates = new Set<string>()
  for (const point of inWindow) {
    dates.add(point.date)
  }

  // Ensure freeze marker date exists on the series.
  dates.add(freezeDate)

  // Forward channel after the last historical point (or freeze, whichever is later).
  const lastHistorical = inWindow[inWindow.length - 1]?.date ?? freezeDate
  let cursor = lastHistorical < freezeDate ? freezeDate : lastHistorical
  while (cursor < chartEnd) {
    cursor = addDays(cursor, forwardStepDays)
    if (cursor > chartEnd) {
      dates.add(chartEnd)
      break
    }
    dates.add(cursor)
  }
  dates.add(chartEnd)

  return Array.from(dates)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .filter((date) => date >= chartStart && date <= chartEnd)
    .map((date) => {
      const fitted = alpha + beta * toDayIndex(date, t0)
      return {
        date,
        time: Date.parse(date),
        price: priceByDate.get(date) ?? null,
        fairValue: Math.exp(fitted),
        bandNeg1: Math.exp(fitted - sigma),
        bandPos1: Math.exp(fitted + sigma),
        bandNeg2: Math.exp(fitted - 2 * sigma),
        bandPos2: Math.exp(fitted + 2 * sigma),
      }
    })
}
