#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return
  const content = fs.readFileSync(filepath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        args[key] = true
      } else {
        args[key] = next
        i += 1
      }
    }
  }
  return args
}

function normalizeToken(input) {
  return {
    tokenId: input.tokenId || input.id,
    symbol: input.symbol,
    name: input.name,
    category: input.category,
    cmcSymbol: input.cmcSymbol,
    preferredAPI: input.preferredAPI,
    specialCalculation: input.specialCalculation || 'REGULAR',
  }
}

function normalizeTransaction(input) {
  return {
    transactionId: input.transactionId || input.id,
    date: input.date,
    type: input.type,
    tokenSymbol: input.tokenSymbol,
    amount: input.amount,
    priceAtTransaction: input.priceAtTransaction,
    quotaValueAtTransaction: input.quotaValueAtTransaction,
    usdValue: input.usdValue,
  }
}

function assertDefined(value, label) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required field: ${label}`)
  }
}

function readJsonFile(filepath) {
  const absolute = path.resolve(process.cwd(), filepath)
  const content = fs.readFileSync(absolute, 'utf8')
  return JSON.parse(content)
}

function getClient() {
  loadEnvFile(path.resolve(process.cwd(), '.env.local'))

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set. Add it to .env.local.')
  }

  return new ConvexHttpClient(convexUrl)
}

function printUsage() {
  console.log('Portfolio CLI')
  console.log('')
  console.log('Commands:')
  console.log('  bootstrap [--file .portfolio-data.local.json]')
  console.log('  tx --file ./transaction.json')
  console.log('  token --file ./token.json')
  console.log('  settings --file ./settings.json')
}

async function run() {
  const [command, ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)

  if (!command || command === 'help' || command === '--help') {
    printUsage()
    return
  }

  const client = getClient()

  if (command === 'bootstrap') {
    const filepath = args.file || '.portfolio-data.local.json'
    const payload = readJsonFile(filepath)

    const tokens = (payload.tokens || []).map(normalizeToken)
    const transactions = (payload.transactions || []).map(normalizeTransaction)
    const settings = payload.settings || {
      baselineTotalValue: payload.baselineTotalValue,
      initialQuotaValue: payload.initialQuotaValue,
    }

    assertDefined(settings.baselineTotalValue, 'settings.baselineTotalValue')
    assertDefined(settings.initialQuotaValue, 'settings.initialQuotaValue')

    for (const token of tokens) {
      assertDefined(token.tokenId, 'token.tokenId')
      assertDefined(token.symbol, 'token.symbol')
      assertDefined(token.name, 'token.name')
      assertDefined(token.category, 'token.category')
      assertDefined(token.preferredAPI, 'token.preferredAPI')
    }

    for (const tx of transactions) {
      assertDefined(tx.transactionId, 'transaction.transactionId')
      assertDefined(tx.date, 'transaction.date')
      assertDefined(tx.type, 'transaction.type')
      assertDefined(tx.amount, 'transaction.amount')
      assertDefined(tx.usdValue, 'transaction.usdValue')
    }

    const result = await client.mutation(api.portfolioData.replaceSnapshot, {
      tokens,
      transactions,
      settings: {
        baselineTotalValue: Number(settings.baselineTotalValue),
        initialQuotaValue: Number(settings.initialQuotaValue),
      },
    })

    console.log(`Bootstrap completed. Tokens: ${result.tokenCount}, transactions: ${result.transactionCount}`)
    return
  }

  if (command === 'tx') {
    const filepath = args.file
    if (!filepath) {
      throw new Error('Missing --file for tx command.')
    }

    const tx = normalizeTransaction(readJsonFile(filepath))
    assertDefined(tx.transactionId, 'transaction.transactionId')
    assertDefined(tx.date, 'transaction.date')
    assertDefined(tx.type, 'transaction.type')
    assertDefined(tx.amount, 'transaction.amount')
    assertDefined(tx.usdValue, 'transaction.usdValue')

    await client.mutation(api.portfolioData.addTransaction, tx)
    console.log(`Transaction upserted: ${tx.transactionId}`)
    return
  }

  if (command === 'token') {
    const filepath = args.file
    if (!filepath) {
      throw new Error('Missing --file for token command.')
    }

    const token = normalizeToken(readJsonFile(filepath))
    assertDefined(token.tokenId, 'token.tokenId')
    assertDefined(token.symbol, 'token.symbol')
    assertDefined(token.name, 'token.name')
    assertDefined(token.category, 'token.category')
    assertDefined(token.preferredAPI, 'token.preferredAPI')

    await client.mutation(api.portfolioData.upsertToken, token)
    console.log(`Token upserted: ${token.symbol}`)
    return
  }

  if (command === 'settings') {
    const filepath = args.file
    if (!filepath) {
      throw new Error('Missing --file for settings command.')
    }

    const settings = readJsonFile(filepath)
    assertDefined(settings.baselineTotalValue, 'baselineTotalValue')
    assertDefined(settings.initialQuotaValue, 'initialQuotaValue')

    await client.mutation(api.portfolioData.upsertSettings, {
      baselineTotalValue: Number(settings.baselineTotalValue),
      initialQuotaValue: Number(settings.initialQuotaValue),
    })
    console.log('Settings upserted.')
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

run().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
