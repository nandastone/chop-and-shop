import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { Plus, Search, ChefHat } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: DishesPage,
});

function DishesPage() {
  const { data: dishes } = useSuspenseQuery(
    convexQuery(api.dishes.listWithIngredients, {})
  );
  const [search, setSearch] = useState("");

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
            <DishCard key={dish._id} dish={dish} />
          ))}
        </div>
      )}
    </main>
  );
}

function DishCard({
  dish,
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
}) {
  const addDish = useMutation(api.shoppingList.addDish);

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <Link to="/dish/$id" params={{ id: dish._id }} className="flex-1">
          <h3 className="font-semibold text-stone-800">{dish.name}</h3>
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
        <button
          onClick={() => addDish({ dishId: dish._id as any })}
          className="ml-3 p-2 rounded-xl bg-coral-100 text-coral-600 hover:bg-coral-200 transition-colors"
          title="Add to shopping list"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
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
