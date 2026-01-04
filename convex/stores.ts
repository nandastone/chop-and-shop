import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all stores sorted by sortOrder.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const stores = await ctx.db.query("stores").collect();
    return stores.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Create a new store.
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("stores").collect();
    const maxOrder = existing.reduce(
      (max, s) => Math.max(max, s.sortOrder),
      -1
    );
    return await ctx.db.insert("stores", {
      name: args.name,
      sortOrder: maxOrder + 1,
    });
  },
});

// Update a store.
export const update = mutation({
  args: { id: v.id("stores"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name });
  },
});

// Delete a store.
export const remove = mutation({
  args: { id: v.id("stores") },
  handler: async (ctx, args) => {
    // Clear store from any ingredients that reference it.
    const ingredients = await ctx.db.query("ingredients").collect();
    for (const ingredient of ingredients) {
      if (ingredient.storeId === args.id) {
        await ctx.db.patch(ingredient._id, { storeId: undefined });
      }
    }
    await ctx.db.delete(args.id);
  },
});

// Reorder stores (update sortOrder).
export const reorder = mutation({
  args: { orderedIds: v.array(v.id("stores")) },
  handler: async (ctx, args) => {
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], { sortOrder: i });
    }
  },
});
