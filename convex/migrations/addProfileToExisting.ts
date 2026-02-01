import { v } from "convex/values";
import { mutation } from "../_generated/server";

// One-time migration to add profileId to all existing records.
// Run this after deploying the schema changes with the profileId you want to assign.
export const addProfileToExisting = mutation({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    const { profileId } = args;
    let updated = { stores: 0, ingredients: 0, dishes: 0, shoppingLists: 0 };

    // Update all stores.
    const stores = await ctx.db.query("stores").collect();
    for (const store of stores) {
      if (!(store as any).profileId) {
        await ctx.db.patch(store._id, { profileId });
        updated.stores++;
      }
    }

    // Update all ingredients.
    const ingredients = await ctx.db.query("ingredients").collect();
    for (const ingredient of ingredients) {
      if (!(ingredient as any).profileId) {
        await ctx.db.patch(ingredient._id, { profileId });
        updated.ingredients++;
      }
    }

    // Update all dishes.
    const dishes = await ctx.db.query("dishes").collect();
    for (const dish of dishes) {
      if (!(dish as any).profileId) {
        await ctx.db.patch(dish._id, { profileId });
        updated.dishes++;
      }
    }

    // Update all shopping lists.
    const shoppingLists = await ctx.db.query("shoppingList").collect();
    for (const list of shoppingLists) {
      if (!(list as any).profileId) {
        await ctx.db.patch(list._id, { profileId });
        updated.shoppingLists++;
      }
    }

    return {
      message: `Migration complete for profile ${profileId}`,
      updated,
    };
  },
});
