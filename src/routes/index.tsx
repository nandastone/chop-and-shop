import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { Plus, Minus, Search, ChefHat } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/")({
  component: DishesPage,
});

function DishesPage() {
  const { data: dishes } = useSuspenseQuery(
    convexQuery(api.dishes.listWithIngredients, {})
  );
  const { data: shoppingList } = useSuspenseQuery(
    convexQuery(api.shoppingList.get, {})
  );
  const [search, setSearch] = useState("");

  // Build a map of dish ID -> count in shopping list.
  const dishCounts = new Map(
    shoppingList.selectedDishes.map((d: { dishId: Id<"dishes">; count: number }) => [d.dishId, d.count])
  );

  const filteredDishes = dishes.filter((dish) =>
    dish.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="p-4">
      {/* Header. */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Dishes</h1>
          <p className="text-sm text-stone-500">Your meal library</p>
        </div>
        <Link
          to="/dish/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add</span>
        </Link>
      </div>

      {/* Search. */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          placeholder="Search dishes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Dish list. */}
      {filteredDishes.length === 0 ? (
        <EmptyState hasSearch={search.length > 0} />
      ) : (
        <div className="space-y-3">
          {filteredDishes.map((dish) => (
            <DishCard key={dish._id} dish={dish} listCount={dishCounts.get(dish._id) || 0} />
          ))}
        </div>
      )}
    </main>
  );
}

function DishCard({
  dish,
  listCount,
}: {
  dish: {
    _id: string;
    name: string;
    items: Array<{
      ingredientId: string;
      quantity: string;
      ingredient?: { name: string } | undefined;
    }>;
  };
  listCount: number;
}) {
  const addDish = useMutation(api.shoppingList.addDish);
  const setDishCount = useMutation(api.shoppingList.setDishCount);

  const isInList = listCount > 0;

  return (
    <Link
      to="/dish/$id"
      params={{ id: dish._id }}
      className={`card block ${isInList ? "ring-2 ring-coral-300 bg-coral-50/50" : ""}`}
    >
      {/* Header row with name and controls. */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-stone-800 flex-1">{dish.name}</h3>
        {isInList ? (
          <div
            className="flex items-center gap-1 bg-coral-100 rounded-xl"
            onClick={(e) => e.preventDefault()}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                setDishCount({
                  dishId: dish._id as Id<"dishes">,
                  count: Math.max(0, listCount - 1),
                });
              }}
              className="p-2 rounded-xl text-coral-600 hover:bg-coral-200 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-coral-700 w-5 text-center">
              {listCount}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                setDishCount({
                  dishId: dish._id as Id<"dishes">,
                  count: listCount + 1,
                });
              }}
              className="p-2 rounded-xl text-coral-600 hover:bg-coral-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              addDish({ dishId: dish._id as Id<"dishes"> });
              toast.success(`"${dish.name}" added to list`);
            }}
            className="p-2 rounded-xl bg-coral-100 text-coral-600 hover:bg-coral-200 transition-colors"
            title="Add to shopping list"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Details. */}
      <p className="text-sm text-stone-500 mt-1">
        {dish.items.length} ingredient{dish.items.length !== 1 ? "s" : ""}
      </p>
      {dish.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {dish.items.slice(0, 4).map((item, i) => (
            <span
              key={i}
              className="text-xs bg-warm-100 text-stone-600 px-2 py-0.5 rounded-full"
            >
              {item.ingredient?.name || "Unknown"}
            </span>
          ))}
          {dish.items.length > 4 && (
            <span className="text-xs text-stone-400">
              +{dish.items.length - 4} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-coral-100 rounded-full flex items-center justify-center mb-4">
        <ChefHat className="w-8 h-8 text-coral-500" />
      </div>
      {hasSearch ? (
        <>
          <h3 className="font-semibold text-stone-700 mb-1">No dishes found</h3>
          <p className="text-sm text-stone-500">
            Try a different search term
          </p>
        </>
      ) : (
        <>
          <h3 className="font-semibold text-stone-700 mb-1">No dishes yet</h3>
          <p className="text-sm text-stone-500 mb-4">
            Add your first dish to get started
          </p>
          <Link to="/dish/new" className="btn-primary">
            Add your first dish
          </Link>
        </>
      )}
    </div>
  );
}
