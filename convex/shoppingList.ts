import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Type for the shopping list document.
type ShoppingListDoc = {
  _id: Id<"shoppingList">;
  selectedDishes: Array<{ dishId: Id<"dishes">; count: number }>;
  excludedIngredientIds: Id<"ingredients">[];
  checkedIngredientIds: Id<"ingredients">[];
  miscItems: Array<{
    id: string;
    name: string;
    storeId?: Id<"stores">;
    checked: boolean;
  }>;
};

// Default empty list for queries when no list exists yet.
const emptyList = {
  selectedDishes: [] as Array<{ dishId: Id<"dishes">; count: number }>,
  excludedIngredientIds: [] as Id<"ingredients">[],
  checkedIngredientIds: [] as Id<"ingredients">[],
  miscItems: [] as Array<{
    id: string;
    name: string;
    storeId?: Id<"stores">;
    checked: boolean;
  }>,
};

// Get the shopping list for reading (queries).
async function getListForRead(ctx: { db: any }) {
  const existing = await ctx.db.query("shoppingList").first();
  return existing || { _id: null, ...emptyList };
}

// Get or create the shopping list for writing (mutations).
async function getOrCreateList(ctx: {
  db: any;
}): Promise<ShoppingListDoc> {
  const existing = await ctx.db.query("shoppingList").first();
  if (existing) return existing;

  const id = await ctx.db.insert("shoppingList", {
    selectedDishes: [],
    excludedIngredientIds: [],
    checkedIngredientIds: [],
    miscItems: [],
  });
  return await ctx.db.get(id);
}

// Get the current shopping list.
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await getListForRead(ctx);
  },
});

// Get the aggregated shopping list with all details.
export const getAggregated = query({
  args: {},
  handler: async (ctx) => {
    const list = await getListForRead(ctx);
    const dishes = await ctx.db.query("dishes").collect();
    const ingredients = await ctx.db.query("ingredients").collect();
    const stores = await ctx.db.query("stores").collect();

    const dishMap = new Map(dishes.map((d: any) => [d._id, d]));
    const ingredientMap = new Map(ingredients.map((i: any) => [i._id, i]));
    const storeMap = new Map(stores.map((s: any) => [s._id, s]));

    // Aggregate ingredients from selected dishes.
    const aggregated = new Map<
      string,
      {
        ingredientId: Id<"ingredients">;
        ingredient: (typeof ingredients)[0];
        totalCount: number;
        quantities: string[];
        fromDishes: string[];
      }
    >();

    for (const { dishId, count } of list.selectedDishes) {
      const dish = dishMap.get(dishId);
      if (!dish) continue;

      for (const item of dish.items) {
        const existing = aggregated.get(item.ingredientId);
        const ingredient = ingredientMap.get(item.ingredientId);
        if (!ingredient) continue;

        if (existing) {
          existing.totalCount += count;
          for (let i = 0; i < count; i++) {
            existing.quantities.push(item.quantity);
          }
          if (!existing.fromDishes.includes(dish.name)) {
            existing.fromDishes.push(dish.name);
          }
        } else {
          aggregated.set(item.ingredientId, {
            ingredientId: item.ingredientId,
            ingredient,
            totalCount: count,
            quantities: Array(count).fill(item.quantity),
            fromDishes: [dish.name],
          });
        }
      }
    }

    // Convert to array and add status.
    const items = Array.from(aggregated.values()).map((item) => ({
      ...item,
      store: item.ingredient.storeId
        ? storeMap.get(item.ingredient.storeId)
        : null,
      isExcluded: list.excludedIngredientIds.includes(item.ingredientId),
      isChecked: list.checkedIngredientIds.includes(item.ingredientId),
    }));

    // Sort by store order, then by name.
    items.sort((a, b) => {
      const aOrder = a.store?.sortOrder ?? 999;
      const bOrder = b.store?.sortOrder ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.ingredient.name.localeCompare(b.ingredient.name);
    });

    // Group by store.
    const byStore = new Map<string | null, typeof items>();
    for (const item of items) {
      const storeKey = item.store?._id ?? null;
      const existing = byStore.get(storeKey) ?? [];
      existing.push(item);
      byStore.set(storeKey, existing);
    }

    // Enrich misc items with store details.
    const miscItemsWithStore = list.miscItems.map((item: any) => ({
      ...item,
      store: item.storeId ? storeMap.get(item.storeId) : null,
    }));

    return {
      selectedDishes: list.selectedDishes.map(
        ({ dishId, count }: { dishId: Id<"dishes">; count: number }) => ({
          dish: dishMap.get(dishId),
          count,
        })
      ),
      items,
      byStore: Array.from(byStore.entries()).map(([storeId, items]) => ({
        store: storeId ? storeMap.get(storeId as Id<"stores">) : null,
        items,
      })),
      miscItems: miscItemsWithStore,
      stores: stores.sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    };
  },
});

// Add a dish to the list.
export const addDish = mutation({
  args: { dishId: v.id("dishes") },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    const existing = list.selectedDishes.find(
      (d: { dishId: Id<"dishes">; count: number }) => d.dishId === args.dishId
    );

    if (existing) {
      // Increment count.
      const updated = list.selectedDishes.map(
        (d: { dishId: Id<"dishes">; count: number }) =>
          d.dishId === args.dishId ? { ...d, count: d.count + 1 } : d
      );
      await ctx.db.patch(list._id, { selectedDishes: updated });
    } else {
      // Add new.
      await ctx.db.patch(list._id, {
        selectedDishes: [
          ...list.selectedDishes,
          { dishId: args.dishId, count: 1 },
        ],
      });
    }
  },
});

// Remove a dish from the list.
export const removeDish = mutation({
  args: { dishId: v.id("dishes") },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    const updated = list.selectedDishes.filter(
      (d: { dishId: Id<"dishes">; count: number }) => d.dishId !== args.dishId
    );
    await ctx.db.patch(list._id, { selectedDishes: updated });
  },
});

// Set dish count.
export const setDishCount = mutation({
  args: { dishId: v.id("dishes"), count: v.number() },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    if (args.count <= 0) {
      const updated = list.selectedDishes.filter(
        (d: { dishId: Id<"dishes">; count: number }) => d.dishId !== args.dishId
      );
      await ctx.db.patch(list._id, { selectedDishes: updated });
    } else {
      const existing = list.selectedDishes.find(
        (d: { dishId: Id<"dishes">; count: number }) => d.dishId === args.dishId
      );
      if (existing) {
        const updated = list.selectedDishes.map(
          (d: { dishId: Id<"dishes">; count: number }) =>
            d.dishId === args.dishId ? { ...d, count: args.count } : d
        );
        await ctx.db.patch(list._id, { selectedDishes: updated });
      } else {
        await ctx.db.patch(list._id, {
          selectedDishes: [
            ...list.selectedDishes,
            { dishId: args.dishId, count: args.count },
          ],
        });
      }
    }
  },
});

// Exclude an ingredient (already have it).
export const excludeIngredient = mutation({
  args: { ingredientId: v.id("ingredients") },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    if (!list.excludedIngredientIds.includes(args.ingredientId)) {
      await ctx.db.patch(list._id, {
        excludedIngredientIds: [
          ...list.excludedIngredientIds,
          args.ingredientId,
        ],
      });
    }
  },
});

// Include an ingredient (undo exclude).
export const includeIngredient = mutation({
  args: { ingredientId: v.id("ingredients") },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    await ctx.db.patch(list._id, {
      excludedIngredientIds: list.excludedIngredientIds.filter(
        (id: Id<"ingredients">) => id !== args.ingredientId
      ),
    });
  },
});

// Check an item (bought).
export const checkItem = mutation({
  args: { ingredientId: v.id("ingredients") },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    if (!list.checkedIngredientIds.includes(args.ingredientId)) {
      await ctx.db.patch(list._id, {
        checkedIngredientIds: [
          ...list.checkedIngredientIds,
          args.ingredientId,
        ],
      });
    }
  },
});

// Uncheck an item.
export const uncheckItem = mutation({
  args: { ingredientId: v.id("ingredients") },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    await ctx.db.patch(list._id, {
      checkedIngredientIds: list.checkedIngredientIds.filter(
        (id: Id<"ingredients">) => id !== args.ingredientId
      ),
    });
  },
});

// Toggle item checked state.
export const toggleItem = mutation({
  args: { ingredientId: v.id("ingredients") },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    const isChecked = list.checkedIngredientIds.includes(args.ingredientId);
    if (isChecked) {
      await ctx.db.patch(list._id, {
        checkedIngredientIds: list.checkedIngredientIds.filter(
          (id: Id<"ingredients">) => id !== args.ingredientId
        ),
      });
    } else {
      await ctx.db.patch(list._id, {
        checkedIngredientIds: [
          ...list.checkedIngredientIds,
          args.ingredientId,
        ],
      });
    }
  },
});

// Add a misc item.
export const addMiscItem = mutation({
  args: {
    name: v.string(),
    storeId: v.optional(v.id("stores")),
  },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    const id = crypto.randomUUID();
    await ctx.db.patch(list._id, {
      miscItems: [
        ...list.miscItems,
        { id, name: args.name, storeId: args.storeId, checked: false },
      ],
    });
    return id;
  },
});

// Remove a misc item.
export const removeMiscItem = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    await ctx.db.patch(list._id, {
      miscItems: list.miscItems.filter(
        (item: { id: string }) => item.id !== args.itemId
      ),
    });
  },
});

// Toggle misc item checked.
export const toggleMiscItem = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    const list = await getOrCreateList(ctx);
    await ctx.db.patch(list._id, {
      miscItems: list.miscItems.map(
        (item: {
          id: string;
          name: string;
          storeId?: Id<"stores">;
          checked: boolean;
        }) =>
          item.id === args.itemId ? { ...item, checked: !item.checked } : item
      ),
    });
  },
});

// Clear the entire list.
export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const list = await getOrCreateList(ctx);
    await ctx.db.patch(list._id, {
      selectedDishes: [],
      excludedIngredientIds: [],
      checkedIngredientIds: [],
      miscItems: [],
    });
  },
});
