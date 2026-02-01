import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all ingredients.
export const list = query({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ingredients")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
  },
});

// Search ingredients by name (for autocomplete/filtering).
export const search = query({
  args: { profileId: v.string(), query: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("ingredients")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    if (!args.query) return all;
    const lower = args.query.toLowerCase();
    return all.filter((i) => i.name.toLowerCase().includes(lower));
  },
});

// Create a new ingredient.
export const create = mutation({
  args: {
    profileId: v.string(),
    name: v.string(),
    storeId: v.optional(v.id("stores")),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name (case-insensitive).
    const existing = await ctx.db
      .query("ingredients")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    const nameLower = args.name.toLowerCase().trim();
    const duplicate = existing.find(
      (i) => i.name.toLowerCase().trim() === nameLower
    );
    if (duplicate) {
      throw new Error(`Ingredient "${duplicate.name}" already exists`);
    }

    return await ctx.db.insert("ingredients", {
      profileId: args.profileId,
      name: args.name.trim(),
      storeId: args.storeId,
    });
  },
});

// Update an ingredient.
export const update = mutation({
  args: {
    profileId: v.string(),
    id: v.id("ingredients"),
    name: v.string(),
    storeId: v.optional(v.id("stores")),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name (case-insensitive), excluding self.
    const existing = await ctx.db
      .query("ingredients")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    const nameLower = args.name.toLowerCase().trim();
    const duplicate = existing.find(
      (i) => i._id !== args.id && i.name.toLowerCase().trim() === nameLower
    );
    if (duplicate) {
      throw new Error(`Ingredient "${duplicate.name}" already exists`);
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      storeId: args.storeId,
    });
  },
});

// Delete an ingredient.
export const remove = mutation({
  args: { profileId: v.string(), id: v.id("ingredients") },
  handler: async (ctx, args) => {
    // Remove from any dishes that use it.
    const dishes = await ctx.db
      .query("dishes")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
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
