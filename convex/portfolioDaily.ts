import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("portfolioDaily")
      .withIndex("by_date", (q) => {
        if (args.startDate && args.endDate) {
          return q.gte("date", args.startDate).lte("date", args.endDate);
        }
        if (args.startDate) {
          return q.gte("date", args.startDate);
        }
        if (args.endDate) {
          return q.lte("date", args.endDate);
        }
        return q;
      })
      .order("asc")
      .collect();
  },
});

export const upsert = mutation({
  args: {
    date: v.string(),
    portfolioValue: v.number(),
    totalShares: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("portfolioDaily")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        portfolioValue: args.portfolioValue,
        totalShares: args.totalShares,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("portfolioDaily", {
      date: args.date,
      portfolioValue: args.portfolioValue,
      totalShares: args.totalShares,
      createdAt: now,
      updatedAt: now,
    });
  },
});
