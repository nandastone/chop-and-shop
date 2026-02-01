import { mutation } from "../_generated/server";

// One-time migration to convert dish item quantities from string to number.
export const quantityStringToNumber = mutation({
  args: {},
  handler: async (ctx) => {
    const dishes = await ctx.db.query("dishes").collect();
    let updated = 0;

    for (const dish of dishes) {
      const newItems = dish.items.map((item: { ingredientId: any; quantity: any }) => ({
        ingredientId: item.ingredientId,
        quantity: typeof item.quantity === "string"
          ? (parseInt(item.quantity) || 1)
          : item.quantity,
      }));

      await ctx.db.patch(dish._id, { items: newItems });
      updated++;
    }

    return { message: "Migration complete", dishesUpdated: updated };
  },
});
