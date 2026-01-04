import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all ingredients.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("ingredients").collect();
  },
});

// Search ingredients by name (for autocomplete/filtering).
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("ingredients").collect();
    if (!args.query) return all;
    const lower = args.query.toLowerCase();
    return all.filter((i) => i.name.toLowerCase().includes(lower));
  },
});

// Create a new ingredient.
export const create = mutation({
  args: {
    name: v.string(),
    storeId: v.optional(v.id("stores")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ingredients", {
      name: args.name,
      storeId: args.storeId,
    });
  },
});

// Update an ingredient.
export const update = mutation({
  args: {
    id: v.id("ingredients"),
    name: v.string(),
    storeId: v.optional(v.id("stores")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      storeId: args.storeId,
    });
  },
});

// Delete an ingredient.
export const remove = mutation({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    // Remove from any dishes that use it.
    const dishes = await ctx.db.query("dishes").collect();
    for (const dish of dishes) {
      const filtered = dish.items.filter(
        (item) => item.ingredientId !== args.id
      );
      if (filtered.length !== dish.items.length) {
        await ctx.db.patch(dish._id, { items: filtered });
      }
    }
    await ctx.db.delete(args.id);
  },
});
