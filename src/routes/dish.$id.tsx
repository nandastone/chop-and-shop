import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { ArrowLeft, Search, Package, X, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/dish/$id")({
  component: EditDishPage,
});

function EditDishPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: dish } = useSuspenseQuery(
    convexQuery(api.dishes.get, { id: id as Id<"dishes"> })
  );
  const { data: allIngredients } = useSuspenseQuery(
    convexQuery(api.ingredients.list, {})
  );

  const updateDish = useMutation(api.dishes.update);
  const deleteDish = useMutation(api.dishes.remove);

  const [name, setName] = useState("");
  const [items, setItems] = useState<
    Map<Id<"ingredients">, { name: string; quantity: number }>
  >(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form with dish data.
  useEffect(() => {
    if (dish) {
      setName(dish.name);
      const ingredientMap = new Map(
        allIngredients.map((i) => [i._id, i.name])
      );
      const newItems = new Map<
        Id<"ingredients">,
        { name: string; quantity: number }
      >();
      for (const item of dish.items) {
        const ingredientName = ingredientMap.get(item.ingredientId) || "Unknown";
        newItems.set(item.ingredientId, {
          name: ingredientName,
          quantity: parseInt(item.quantity) || 1,
        });
      }
      setItems(newItems);
    }
  }, [dish, allIngredients]);

  if (!dish) {
    return (
      <main className="p-4">
        <p className="text-stone-500">Dish not found</p>
      </main>
    );
  }

  const handleSave = async () => {
    if (!name.trim() || items.size === 0) return;
    await updateDish({
      id: id as Id<"dishes">,
      name: name.trim(),
      items: Array.from(items.entries()).map(([ingredientId, { quantity }]) => ({
        ingredientId,
        quantity: String(quantity),
      })),
    });
    navigate({ to: "/" });
  };

  const handleDelete = async () => {
    await deleteDish({ id: id as Id<"dishes"> });
    navigate({ to: "/" });
  };

  const handleTapIngredient = (
    ingredientId: Id<"ingredients">,
    ingredientName: string
  ) => {
    const existing = items.get(ingredientId);
    const newItems = new Map(items);
    if (existing) {
      newItems.set(ingredientId, {
        name: ingredientName,
        quantity: existing.quantity + 1,
      });
    } else {
      newItems.set(ingredientId, { name: ingredientName, quantity: 1 });
    }
    setItems(newItems);
  };

  const handleClearIngredient = (ingredientId: Id<"ingredients">) => {
    const newItems = new Map(items);
    newItems.delete(ingredientId);
    setItems(newItems);
  };

  const filteredIngredients = allIngredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = Array.from(items.values()).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <main className="p-4 pb-24">
      {/* Header. */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="p-2 -ml-2 rounded-xl hover:bg-stone-100"
        >
          <ArrowLeft className="w-6 h-6 text-stone-600" />
        </button>
        <h1 className="text-xl font-bold text-stone-800 flex-1">Edit Dish</h1>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 rounded-xl text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Dish name. */}
      <div className="mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dish name (e.g., Burritos)"
          className="input text-lg font-medium"
        />
      </div>

      {/* Search + clear row. */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        {items.size > 0 && (
          <button
            onClick={() => setItems(new Map())}
            className="px-3 rounded-xl text-red-500 hover:bg-red-50 text-sm font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Ingredient grid. */}
      <div className="mb-6">
        {filteredIngredients.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 mb-4">
              {searchQuery
                ? `No ingredients found for "${searchQuery}"`
                : "No ingredients yet"}
            </p>
            <Link to="/ingredients" className="text-coral-500 font-medium">
              Manage ingredients
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredIngredients.map((ingredient) => {
              const selected = items.get(ingredient._id);
              return (
                <div key={ingredient._id} className="relative pt-2 pl-2">
                  {/* Quantity badge. */}
                  {selected && (
                    <div className="absolute top-0 right-0 w-7 h-7 bg-coral-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg z-10">
                      {selected.quantity}
                    </div>
                  )}

                  {/* Clear button. */}
                  {selected && (
                    <button
                      type="button"
                      onClick={() => handleClearIngredient(ingredient._id)}
                      className="absolute top-0 left-0 w-6 h-6 bg-stone-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleTapIngredient(ingredient._id, ingredient.name)
                    }
                    className={`w-full h-full flex flex-col items-center p-3 rounded-2xl transition-all border-2 ${
                      selected
                        ? "bg-coral-100 border-coral-500"
                        : "bg-white border-stone-200 hover:border-coral-300"
                    }`}
                  >
                    {/* Photo placeholder. */}
                    <div
                      className={`w-12 h-12 rounded-xl mb-2 flex items-center justify-center flex-shrink-0 ${
                        selected
                          ? "bg-coral-200"
                          : "bg-gradient-to-br from-coral-100 to-warm-200"
                      }`}
                    >
                      <Package
                        className={`w-6 h-6 ${
                          selected ? "text-coral-500" : "text-coral-300"
                        }`}
                      />
                    </div>

                    {/* Name. */}
                    <span
                      className={`text-xs font-medium text-center leading-tight line-clamp-2 h-8 ${
                        selected ? "text-coral-700" : "text-stone-700"
                      }`}
                    >
                      {ingredient.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save button. */}
      <button
        onClick={handleSave}
        disabled={!name.trim() || items.size === 0}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        <span>Save Changes</span>
        {items.size > 0 && (
          <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">
            {totalItems}
          </span>
        )}
      </button>

      {/* Delete confirmation modal. */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-stone-800 mb-2">
              Delete Dish?
            </h2>
            <p className="text-stone-600 mb-6">
              Are you sure you want to delete "{name}"? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
