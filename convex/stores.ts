import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all stores sorted by sortOrder, with image URLs.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const stores = await ctx.db.query("stores").collect();
    const storesWithImages = await Promise.all(
      stores.map(async (store) => ({
        ...store,
        imageUrl: store.imageId ? await ctx.storage.getUrl(store.imageId) : null,
      }))
    );
    return storesWithImages.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Generate an upload URL for store images.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Create a new store.
export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("stores").collect();
    const maxOrder = existing.reduce(
      (max, s) => Math.max(max, s.sortOrder),
      -1
    );
    return await ctx.db.insert("stores", {
      name: args.name,
      sortOrder: maxOrder + 1,
      color: args.color,
      imageId: args.imageId,
    });
  },
});

// Update a store.
export const update = mutation({
  args: {
    id: v.id("stores"),
    name: v.string(),
    color: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// Update store color only.
export const updateColor = mutation({
  args: {
    id: v.id("stores"),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { color: args.color });
  },
});

// Update store image only.
export const updateImage = mutation({
  args: {
    id: v.id("stores"),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Delete old image if exists.
    const store = await ctx.db.get(args.id);
    if (store?.imageId && args.imageId !== store.imageId) {
      await ctx.storage.delete(store.imageId);
    }
    await ctx.db.patch(args.id, { imageId: args.imageId });
  },
});

// Remove store image.
export const removeImage = mutation({
  args: { id: v.id("stores") },
  handler: async (ctx, args) => {
    const store = await ctx.db.get(args.id);
    if (store?.imageId) {
      await ctx.storage.delete(store.imageId);
      await ctx.db.patch(args.id, { imageId: undefined });
    }
  },
});

// Delete a store.
export const remove = mutation({
  args: { id: v.id("stores") },
  handler: async (ctx, args) => {
    const store = await ctx.db.get(args.id);

    // Delete store image if exists.
    if (store?.imageId) {
      await ctx.storage.delete(store.imageId);
    }

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
