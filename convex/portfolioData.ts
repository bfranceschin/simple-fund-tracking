import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SETTINGS_KEY = "default";

const tokenValidator = {
  tokenId: v.string(),
  symbol: v.string(),
  name: v.string(),
  category: v.union(
    v.literal("Btc"),
    v.literal("Eth"),
    v.literal("AI"),
    v.literal("Gaming/Meme"),
    v.literal("Defi"),
    v.literal("Micro"),
    v.literal("Privacy")
  ),
  cmcSymbol: v.optional(v.string()),
  preferredAPI: v.union(v.literal("coingecko"), v.literal("coinmarketcap")),
  specialCalculation: v.optional(
    v.union(v.literal("ETH_AMOUNT"), v.literal("BTC_AMOUNT"), v.literal("REGULAR"))
  ),
} as const;

const transactionValidator = {
  transactionId: v.string(),
  date: v.string(),
  type: v.union(v.literal("DEPOSIT"), v.literal("WITHDRAW"), v.literal("BUY"), v.literal("SELL")),
  tokenSymbol: v.optional(v.string()),
  amount: v.number(),
  priceAtTransaction: v.optional(v.number()),
  quotaValueAtTransaction: v.optional(v.number()),
  usdValue: v.number(),
} as const;

const settingsValidator = {
  baselineTotalValue: v.number(),
  initialQuotaValue: v.number(),
} as const;

export const getSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const [tokens, transactions, settingsDoc] = await Promise.all([
      ctx.db.query("portfolioTokens").order("asc").collect(),
      ctx.db.query("portfolioTransactions").order("asc").collect(),
      ctx.db
        .query("portfolioSettings")
        .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
        .unique(),
    ]);

    return {
      tokens: tokens.map((t) => ({
        id: t.tokenId,
        symbol: t.symbol,
        name: t.name,
        category: t.category,
        cmcSymbol: t.cmcSymbol,
        preferredAPI: t.preferredAPI,
        specialCalculation: t.specialCalculation,
      })),
      transactions: transactions.map((tx) => ({
        id: tx.transactionId,
        date: tx.date,
        type: tx.type,
        tokenSymbol: tx.tokenSymbol,
        amount: tx.amount,
        priceAtTransaction: tx.priceAtTransaction,
        quotaValueAtTransaction: tx.quotaValueAtTransaction,
        usdValue: tx.usdValue,
      })),
      settings: settingsDoc
        ? {
            baselineTotalValue: settingsDoc.baselineTotalValue,
            initialQuotaValue: settingsDoc.initialQuotaValue,
          }
        : null,
    };
  },
});

export const replaceSnapshot = mutation({
  args: {
    tokens: v.array(v.object(tokenValidator)),
    transactions: v.array(v.object(transactionValidator)),
    settings: v.object(settingsValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const [existingTokens, existingTransactions, existingSettings, existingDaily] = await Promise.all([
      ctx.db.query("portfolioTokens").collect(),
      ctx.db.query("portfolioTransactions").collect(),
      ctx.db.query("portfolioSettings").collect(),
      ctx.db.query("portfolioDaily").collect(),
    ]);

    await Promise.all([
      ...existingTokens.map((doc) => ctx.db.delete(doc._id)),
      ...existingTransactions.map((doc) => ctx.db.delete(doc._id)),
      ...existingSettings.map((doc) => ctx.db.delete(doc._id)),
      ...existingDaily.map((doc) => ctx.db.delete(doc._id)),
    ]);

    for (const token of args.tokens) {
      await ctx.db.insert("portfolioTokens", {
        ...token,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const tx of args.transactions) {
      await ctx.db.insert("portfolioTransactions", {
        ...tx,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("portfolioSettings", {
      key: SETTINGS_KEY,
      baselineTotalValue: args.settings.baselineTotalValue,
      initialQuotaValue: args.settings.initialQuotaValue,
      createdAt: now,
      updatedAt: now,
    });

    return {
      tokenCount: args.tokens.length,
      transactionCount: args.transactions.length,
    };
  },
});

async function deleteDailyFromDate(ctx: any, fromDate: string) {
  const docs = await ctx.db
    .query("portfolioDaily")
    .withIndex("by_date", (q: any) => q.gte("date", fromDate))
    .collect();

  await Promise.all(docs.map((doc: any) => ctx.db.delete(doc._id)));
}

export const addTransaction = mutation({
  args: transactionValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("portfolioTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .unique();

    const now = Date.now();

    if (existing) {
      const invalidationDate = existing.date < args.date ? existing.date : args.date;
      await deleteDailyFromDate(ctx, invalidationDate);
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    await deleteDailyFromDate(ctx, args.date);

    return ctx.db.insert("portfolioTransactions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertToken = mutation({
  args: tokenValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("portfolioTokens")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("portfolioTokens", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertSettings = mutation({
  args: settingsValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("portfolioSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        baselineTotalValue: args.baselineTotalValue,
        initialQuotaValue: args.initialQuotaValue,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("portfolioSettings", {
      key: SETTINGS_KEY,
      baselineTotalValue: args.baselineTotalValue,
      initialQuotaValue: args.initialQuotaValue,
      createdAt: now,
      updatedAt: now,
    });
  },
});
