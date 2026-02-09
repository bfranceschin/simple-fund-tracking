import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  portfolioTokens: defineTable({
    tokenId: v.string(),
    symbol: v.string(),
    name: v.string(),
    category: v.union(
      v.literal("Btc"),
      v.literal("Eth"),
      v.literal("AI"),
      v.literal("Gaming/Meme"),
      v.literal("Defi"),
      v.literal("Micro")
    ),
    cmcSymbol: v.optional(v.string()),
    preferredAPI: v.union(v.literal("coingecko"), v.literal("coinmarketcap")),
    specialCalculation: v.optional(
      v.union(v.literal("ETH_AMOUNT"), v.literal("BTC_AMOUNT"), v.literal("REGULAR"))
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_token_id", ["tokenId"]),

  portfolioTransactions: defineTable({
    transactionId: v.string(),
    date: v.string(),
    type: v.union(
      v.literal("DEPOSIT"),
      v.literal("WITHDRAW"),
      v.literal("BUY"),
      v.literal("SELL")
    ),
    tokenSymbol: v.optional(v.string()),
    amount: v.number(),
    priceAtTransaction: v.optional(v.number()),
    quotaValueAtTransaction: v.optional(v.number()),
    usdValue: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_transaction_id", ["transactionId"])
    .index("by_date", ["date"]),

  portfolioSettings: defineTable({
    key: v.string(),
    baselineTotalValue: v.number(),
    initialQuotaValue: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  portfolioDaily: defineTable({
    date: v.string(),
    portfolioValue: v.number(),
    totalShares: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_date", ["date"]),
});
