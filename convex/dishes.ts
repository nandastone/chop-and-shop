import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all dishes.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("dishes").collect();
  },
});

// Get a single dish by ID.
export const get = query({
  args: { id: v.id("dishes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get dishes with their ingredient details.
export const listWithIngredients = query({
  args: {},
  handler: async (ctx) => {
    const dishes = await ctx.db.query("dishes").collect();
    const ingredients = await ctx.db.query("ingredients").collect();
    const ingredientMap = new Map(ingredients.map((i) => [i._id, i]));

    return dishes.map((dish) => ({
      ...dish,
      items: dish.items.map((item) => ({
        ...item,
        ingredient: ingredientMap.get(item.ingredientId),
      })),
    }));
  },
});

// Create a new dish.
export const create = mutation({
  args: {
    name: v.string(),
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        quantity: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dishes", {
      name: args.name,
      items: args.items,
    });
  },
});

// Update a dish.
export const update = mutation({
  args: {
    id: v.id("dishes"),
    name: v.string(),
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        quantity: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      items: args.items,
    });
  },
});

// Delete a dish.
export const remove = mutation({
  args: { id: v.id("dishes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
