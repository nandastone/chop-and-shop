import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { Plus, Minus, Search, ChefHat, Pencil } from "lucide-react";
import { useState } from "react";
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

  const filteredDishes = dishes
    .filter((dish) => dish.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

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
      quantity: number;
      ingredient?: { name: string } | undefined;
    }>;
  };
  listCount: number;
  profileId: string;
}) {
  const navigate = useNavigate();
  const addDish = useMutation(api.shoppingList.addDish);
  const setDishCount = useMutation(api.shoppingList.setDishCount);

  const isInList = listCount > 0;
  const [expanded, setExpanded] = useState(false);
  const visibleLimit = 6;

  const handleCardClick = () => {
    addDish({ profileId, dishId: dish._id as Id<"dishes"> });
  };

  const visibleItems = expanded ? dish.items : dish.items.slice(0, visibleLimit);
  const hiddenCount = dish.items.length - visibleLimit;

  return (
    <div
      className={`card relative transition-all ${isInList ? "ring-2 ring-coral-500 bg-coral-50" : ""}`}
    >
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

      <div className="flex items-start gap-3">
        {/* Clickable card content. */}
        <button
          type="button"
          onClick={handleCardClick}
          className="flex-1 text-left"
        >
          <h3 className="font-semibold text-stone-800 mb-1">{dish.name}</h3>
          <p className="text-sm text-stone-500">
            {dish.items.length} ingredient{dish.items.length !== 1 ? "s" : ""}
          </p>
        </button>

        {/* Stepper. */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isInList ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setDishCount({
                    profileId,
                    dishId: dish._id as Id<"dishes">,
                    count: listCount - 1,
                  })
                }
                className="w-7 h-7 rounded-full bg-coral-500 text-white flex items-center justify-center hover:bg-coral-600"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-bold text-coral-700 min-w-[1.25rem] text-center">
                {listCount}
              </span>
              <button
                type="button"
                onClick={() =>
                  addDish({ profileId, dishId: dish._id as Id<"dishes"> })
                }
                className="w-7 h-7 rounded-full bg-coral-500 text-white flex items-center justify-center hover:bg-coral-600"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCardClick}
              className="w-7 h-7 rounded-full bg-coral-500 text-white flex items-center justify-center hover:bg-coral-600"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Ingredient chips — full width. */}
      {dish.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {visibleItems.map((item, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-0.5 rounded-full ${
                isInList
                  ? "bg-coral-200 text-coral-800"
                  : "bg-warm-100 text-stone-600"
              }`}
            >
              {item.ingredient?.name || "Unknown"}
            </span>
          ))}
          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={`text-xs font-medium px-2 py-0.5 ${
                isInList ? "text-coral-600" : "text-stone-400"
              }`}
            >
              +{hiddenCount} more
            </button>
          )}
        </div>
      )}
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
