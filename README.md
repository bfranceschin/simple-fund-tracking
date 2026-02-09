# simple-fund-tracking

A Next.js 14 app for tracking a crypto portfolio using a quota-based fund model, with portfolio data stored in Convex.

## Overview

This project tracks portfolio performance like a fund NAV:

- Initial quota value: `$1.00`
- Performance: `(currentQuota - initialQuota) / initialQuota`

## Data Model

Portfolio metadata and transactions are no longer hardcoded in source files.

They now live in Convex tables:

- `portfolioTokens`
- `portfolioTransactions`
- `portfolioSettings`
- `portfolioDaily` (historical daily snapshots used by the history chart)

`src/lib/constants/portfolio-data.ts` now only contains UI constants (`CATEGORY_COLORS`, `CATEGORY_NAMES`).

## Architecture

Data flow now is:

1. Portfolio snapshot is read from Convex (`convex/portfolioData.ts`).
2. App computes holdings/cost basis/quota metrics from Convex transactions.
3. Price API routes load token registry from Convex, then fetch market prices.
4. UI renders current and historical views from computed values.

## CLI Workflow

The project includes a CLI tool for data management:

- `scripts/portfolio-cli.mjs`

Available commands:

- `npm run portfolio:bootstrap`
- `npm run portfolio:tx -- --file ./examples/transaction.json`
- `npm run portfolio:token -- --file ./examples/token.json`
- `npm run portfolio:settings -- --file ./examples/settings.json`

### Bootstrap (first time)

1. Keep Convex dev running:

```bash
npx convex dev
```

2. Bootstrap initial dataset into Convex:

```bash
npm run portfolio:bootstrap
```

This uses `.portfolio-data.local.json` (gitignored).

### Add/Update a transaction

```bash
npm run portfolio:tx -- --file ./examples/transaction.json
```

### Add/Update a token

```bash
npm run portfolio:token -- --file ./examples/token.json
```

### Update baseline settings

```bash
npm run portfolio:settings -- --file ./examples/settings.json
```

## In-App Usage Guide

There is an in-app info page at:

- `/portfolio/[your-secret-slug]/info`

It is linked from the portfolio page footer as **Portfolio data CLI guide**.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Convex project configured

### Install

```bash
npm install
```

### Environment

Create `.env.local`:

```env
# Portfolio route protection
PORTFOLIO_SECRET_SLUG=your-secret-slug

# Convex
CONVEX_DEPLOYMENT=your-convex-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# Price APIs
NEXT_PUBLIC_COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=
COINMARKETCAP_API_KEY=
```

### Run locally

Terminal 1:

```bash
npx convex dev
```

Terminal 2:

```bash
npm run dev
```

Then open:

- `http://localhost:3000/portfolio/[your-secret-slug]`

## Features

- Quota-based portfolio tracking
- Live price fetch with API fallback
- Historical date view with progressive fetching
- Historical daily backfill into Convex (`portfolioDaily`)
- Category allocation chart
- Sortable portfolio table
- CLI-based portfolio data updates

## Key Files

- `convex/schema.ts`
- `convex/portfolioData.ts`
- `convex/portfolioDaily.ts`
- `src/hooks/usePortfolioData.ts`
- `src/hooks/usePortfolio.ts`
- `src/components/PortfolioHistorySection.tsx`
- `src/app/portfolio/[slug]/info/page.tsx`
- `scripts/portfolio-cli.mjs`

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Convex
- Tailwind CSS
- Recharts
- CoinGecko / CoinMarketCap APIs

## License

Private project.
