import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { ArrowLeft, Search, Package, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { useProfileId } from "~/contexts/ProfileContext";
import { IngredientCard } from "~/components/IngredientCard";

export const Route = createFileRoute("/$profileId/dish/new")({
  component: NewDishPage,
});

function NewDishPage() {
  const profileId = useProfileId();
  const navigate = useNavigate();
  const { data: allIngredients } = useSuspenseQuery(
    convexQuery(api.ingredients.list, { profileId })
  );
  const { data: stores } = useSuspenseQuery(convexQuery(api.stores.list, { profileId }));

  const createDish = useMutation(api.dishes.create);
  const createIngredient = useMutation(api.ingredients.create);
  const addDishToList = useMutation(api.shoppingList.addDish);

  const [name, setName] = useState("");
  const [items, setItems] = useState<
    Map<Id<"ingredients">, { name: string; quantity: number }>
  >(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientStore, setNewIngredientStore] = useState<string>("");
  // Real-time duplicate detection.
  const ingredientDuplicate = newIngredientName.trim()
    ? allIngredients.find(
        (i) => i.name.toLowerCase() === newIngredientName.trim().toLowerCase()
      )
    : null;

  const handleCreateIngredient = async () => {
    if (!newIngredientName.trim() || ingredientDuplicate) return;
    const ingredientName = newIngredientName.trim();

    const newId = await createIngredient({
      profileId,
      name: ingredientName,
      storeId: newIngredientStore
        ? (newIngredientStore as Id<"stores">)
        : undefined,
    });
    // Auto-select the new ingredient.
    const newItems = new Map(items);
    newItems.set(newId, { name: ingredientName, quantity: 1 });
    setItems(newItems);
    setNewIngredientName("");
    setNewIngredientStore("");
    setShowAddModal(false);
  };

  const handleSave = async () => {
    if (!name.trim() || items.size === 0) return;
    const dishId = await createDish({
      profileId,
      name: name.trim(),
      items: Array.from(items.entries()).map(([ingredientId, { quantity }]) => ({
        ingredientId,
        quantity,
      })),
    });
    // Auto-add the new dish to the shopping list.
    await addDishToList({ profileId, dishId });
    toast.success(`"${name.trim()}" added to list`);
    navigate({ to: "/$profileId", params: { profileId } });
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

  const handleDecrementIngredient = (ingredientId: Id<"ingredients">) => {
    const existing = items.get(ingredientId);
    if (!existing) return;
    const newItems = new Map(items);
    if (existing.quantity <= 1) {
      newItems.delete(ingredientId);
    } else {
      newItems.set(ingredientId, { ...existing, quantity: existing.quantity - 1 });
    }
    setItems(newItems);
  };

  const filteredIngredients = allIngredients
    .filter((ing) => ing.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = Array.from(items.values()).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <main className="p-4 pb-24">
      {/* Header. */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate({ to: "/$profileId/dishes", params: { profileId } })}
          className="p-2 -ml-2 rounded-xl hover:bg-stone-100"
        >
          <ArrowLeft className="w-6 h-6 text-stone-600" />
        </button>
        <h1 className="text-xl font-bold text-stone-800">New Dish</h1>
      </div>

      {/* Dish name. */}
      <div className="mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dish name (e.g., Burritos)"
          className="input text-lg font-medium"
          autoFocus
        />
      </div>

      {/* Search + add + clear row. */}
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
        <button
          onClick={() => {
            setNewIngredientName(searchQuery);
            setShowAddModal(true);
          }}
          className="px-3 rounded-xl bg-coral-500 text-white hover:bg-coral-600 text-sm font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
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
            <button
              onClick={() => {
                setNewIngredientName(searchQuery);
                setShowAddModal(true);
              }}
              className="btn-primary"
            >
              Add ingredient
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {filteredIngredients.map((ingredient) => {
              const selected = items.get(ingredient._id);
              return (
                <IngredientCard
                  key={ingredient._id}
                  name={ingredient.name}
                  quantity={selected?.quantity || 0}
                  onIncrement={() =>
                    handleTapIngredient(ingredient._id, ingredient.name)
                  }
                  onDecrement={() => handleDecrementIngredient(ingredient._id)}
                />
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
        <span>Save Dish</span>
        {items.size > 0 && (
          <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">
            {totalItems}
          </span>
        )}
      </button>

      {/* Add ingredient modal. */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-800">
                New Ingredient
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateIngredient();
              }}
            >
              <input
                type="text"
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
                placeholder="Ingredient name"
                className={`input mb-3 ${ingredientDuplicate ? "border-red-500" : ""}`}
                autoFocus
              />
              {ingredientDuplicate && (
                <p className="text-red-500 text-sm mb-3 -mt-2">"{ingredientDuplicate.name}" already exists silly billy</p>
              )}
              <select
                value={newIngredientStore}
                onChange={(e) => setNewIngredientStore(e.target.value)}
                className="input mb-4"
              >
                <option value="">Select store (optional)</option>
                {stores.map((store) => (
                  <option key={store._id} value={store._id}>
                    {store.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newIngredientName.trim() || !!ingredientDuplicate}
                  className="flex-1 btn-primary"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
