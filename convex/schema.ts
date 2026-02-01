import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Stores - where ingredients are bought.
  stores: defineTable({
    profileId: v.string(),
    name: v.string(),
    sortOrder: v.number(),
    color: v.optional(v.string()), // Hex color code for store branding.
    imageId: v.optional(v.id("_storage")), // Convex file storage ID for store image.
  }).index("by_profile", ["profileId"]),

  // Ingredients - global catalog with default store.
  ingredients: defineTable({
    profileId: v.string(),
    name: v.string(),
    storeId: v.optional(v.id("stores")),
  }).index("by_profile", ["profileId"]).index("by_name", ["name"]),

  // Dishes - meal templates with their ingredient lists.
  dishes: defineTable({
    profileId: v.string(),
    name: v.string(),
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        quantity: v.string(),
      })
    ),
  }).index("by_profile", ["profileId"]).index("by_name", ["name"]),

  // Shopping list - single active list at a time per profile.
  shoppingList: defineTable({
    profileId: v.string(),
    selectedDishes: v.array(
      v.object({
        dishId: v.id("dishes"),
        count: v.number(),
      })
    ),
    // Manually added ingredients (not from dishes).
    manualIngredients: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("ingredients"),
          quantity: v.number(),
        })
      )
    ),
    excludedIngredientIds: v.array(v.id("ingredients")),
    checkedIngredientIds: v.array(v.id("ingredients")),
    miscItems: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        storeId: v.optional(v.id("stores")),
        checked: v.boolean(),
      })
    ),
  }).index("by_profile", ["profileId"]),
});
