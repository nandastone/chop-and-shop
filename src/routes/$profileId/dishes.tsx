import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { Plus, Search, ChefHat, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { useProfileId } from "~/contexts/ProfileContext";

export const Route = createFileRoute("/$profileId/dishes")({
  component: DishesPage,
});

function DishesPage() {
  const profileId = useProfileId();
  const { data: dishes } = useSuspenseQuery(
    convexQuery(api.dishes.listWithIngredients, { profileId })
  );
  const { data: shoppingList } = useSuspenseQuery(
    convexQuery(api.shoppingList.get, { profileId })
  );
  const [search, setSearch] = useState("");

  // Build a map of dish ID -> count in shopping list.
  const dishCounts = new Map<Id<"dishes">, number>(
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
          to="/$profileId/dish/new"
          params={{ profileId }}
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
        <EmptyState hasSearch={search.length > 0} profileId={profileId} />
      ) : (
        <div className="space-y-3">
          {filteredDishes.map((dish) => (
            <DishCard key={dish._id} dish={dish} listCount={dishCounts.get(dish._id) || 0} profileId={profileId} />
          ))}
        </div>
      )}
    </main>
  );
}

function DishCard({
  dish,
  listCount,
  profileId,
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
  profileId: string;
}) {
  const navigate = useNavigate();
  const addDish = useMutation(api.shoppingList.addDish);

  const isInList = listCount > 0;

  const handleCardClick = () => {
    addDish({ profileId, dishId: dish._id as Id<"dishes"> });
    toast.success(`"${dish.name}" added to list`);
  };

  return (
    <div className="card relative">
      {/* Quantity badge. */}
      {isInList && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-coral-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow z-10">
          {listCount}
        </div>
      )}

      {/* Edit button. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate({ to: "/$profileId/dish/$id", params: { profileId, id: dish._id } });
        }}
        className="absolute -top-2 -left-2 w-6 h-6 bg-stone-400 text-white rounded-full flex items-center justify-center shadow hover:bg-stone-600 z-10"
      >
        <Pencil className="w-3 h-3" />
      </button>

      {/* Clickable card content. */}
      <button
        type="button"
        onClick={handleCardClick}
        className="w-full text-left"
      >
        <h3 className="font-semibold text-stone-800 mb-1">{dish.name}</h3>
        <p className="text-sm text-stone-500">
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
      </button>
    </div>
  );
}

function EmptyState({ hasSearch, profileId }: { hasSearch: boolean; profileId: string }) {
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
          <Link to="/$profileId/dish/new" params={{ profileId }} className="btn-primary">
            Add your first dish
          </Link>
        </>
      )}
    </div>
  );
}
