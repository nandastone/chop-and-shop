import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { Plus, Search, Pencil, Trash2, X, Package } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { useProfileId } from "~/contexts/ProfileContext";
import { IngredientCard } from "~/components/IngredientCard";

export const Route = createFileRoute("/$profileId/ingredients")({
  component: IngredientsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    store: (search.store as string) || undefined,
  }),
});

function IngredientsPage() {
  const profileId = useProfileId();
  const { store: storeFilter } = Route.useSearch();
  const navigate = useNavigate();

  const { data: ingredients } = useSuspenseQuery(
    convexQuery(api.ingredients.list, { profileId })
  );
  const { data: stores } = useSuspenseQuery(convexQuery(api.stores.list, { profileId }));
  const { data: shoppingList } = useSuspenseQuery(
    convexQuery(api.shoppingList.get, { profileId })
  );

  const createIngredient = useMutation(api.ingredients.create);
  const updateIngredient = useMutation(api.ingredients.update);
  const deleteIngredient = useMutation(api.ingredients.remove);
  const addToList = useMutation(api.shoppingList.addManualIngredient);
  const setQuantity = useMutation(api.shoppingList.setManualIngredientQuantity);

  const [search, setSearch] = useState("");

  const setStoreFilter = (store: string | undefined) => {
    navigate({
      to: "/$profileId/ingredients",
      params: { profileId },
      search: { store },
      replace: true,
    });
  };

  const selectedChipRef = useRef<HTMLButtonElement>(null);

  // Scroll selected chip into view.
  useEffect(() => {
    if (storeFilter && selectedChipRef.current) {
      selectedChipRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [storeFilter]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<{
    id: Id<"ingredients">;
    name: string;
    storeId?: Id<"stores">;
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [newStore, setNewStore] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"ingredients"> | null>(
    null
  );
  // Real-time duplicate detection for add modal.
  const createDuplicate = newName.trim()
    ? ingredients.find(
        (i) => i.name.toLowerCase() === newName.trim().toLowerCase()
      )
    : null;

  // Real-time duplicate detection for edit modal (excluding self).
  const editDuplicate =
    editingIngredient && editingIngredient.name.trim()
      ? ingredients.find(
          (i) =>
            i._id !== editingIngredient.id &&
            i.name.toLowerCase() === editingIngredient.name.trim().toLowerCase()
        )
      : null;

  // Build a map of manual ingredient quantities.
  const manualQuantities = new Map<Id<"ingredients">, number>(
    (shoppingList.manualIngredients || []).map(
      (i: { ingredientId: Id<"ingredients">; quantity: number }) => [i.ingredientId, i.quantity]
    )
  );

  const filteredIngredients = ingredients
    .filter((ing) => {
      // Filter by search.
      if (search && !ing.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Filter by store.
      if (storeFilter === "none") {
        return !ing.storeId;
      }
      if (storeFilter && ing.storeId !== storeFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Count ingredients per store for filter chips.
  const ingredientCountByStore = new Map<string | null, number>();
  for (const ing of ingredients) {
    const key = ing.storeId || null;
    ingredientCountByStore.set(key, (ingredientCountByStore.get(key) || 0) + 1);
  }

  const handleCreate = async () => {
    if (!newName.trim() || createDuplicate) return;

    await createIngredient({
      profileId,
      name: newName.trim(),
      storeId: newStore ? (newStore as Id<"stores">) : undefined,
    });
    toast.success(`Added "${newName.trim()}"`);
    setNewName("");
    setNewStore("");
    setShowAddModal(false);
  };

  const handleUpdate = async () => {
    if (!editingIngredient || !editingIngredient.name.trim() || editDuplicate) return;

    await updateIngredient({
      profileId,
      id: editingIngredient.id,
      name: editingIngredient.name.trim(),
      storeId: editingIngredient.storeId,
    });
    toast.success("Ingredient updated");
    setEditingIngredient(null);
  };

  const handleDelete = async (id: Id<"ingredients">) => {
    await deleteIngredient({ profileId, id });
    setDeleteConfirm(null);
  };

  return (
    <main className="p-4 pb-24">
      {/* Header. */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Ingredients</h1>
          <p className="text-sm text-stone-500">
            {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add</span>
        </button>
      </div>

      {/* Search. */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Store filter chips. */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 -mx-4 px-4">
        <button
          onClick={() => setStoreFilter(undefined)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !storeFilter
              ? "bg-coral-500 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          All ({ingredients.length})
        </button>
        {stores.map((store) => {
          const count = ingredientCountByStore.get(store._id) || 0;
          if (count === 0) return null;
          const isSelected = storeFilter === store._id;
          const storeColor = store.color;
          return (
            <button
              key={store._id}
              ref={isSelected ? selectedChipRef : undefined}
              onClick={() => setStoreFilter(store._id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? "text-white"
                  : "text-stone-600 hover:opacity-80"
              }`}
              style={{
                backgroundColor: isSelected
                  ? storeColor || "#f97352"
                  : storeColor
                    ? `${storeColor}20`
                    : "#f5f5f4",
                color: isSelected ? "white" : storeColor || "#57534e",
              }}
            >
              {storeColor && !isSelected && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: storeColor }}
                />
              )}
              {store.name} ({count})
            </button>
          );
        })}
        {(ingredientCountByStore.get(null) || 0) > 0 && (
          <button
            ref={storeFilter === "none" ? selectedChipRef : undefined}
            onClick={() => setStoreFilter("none")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              storeFilter === "none"
                ? "bg-coral-500 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            No store ({ingredientCountByStore.get(null)})
          </button>
        )}
      </div>

      {/* Ingredient grid. */}
      {filteredIngredients.length === 0 ? (
        <EmptyState
          hasSearch={search.length > 0}
          onAdd={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {filteredIngredients.map((ingredient) => {
            const inListQuantity = manualQuantities.get(ingredient._id) || 0;
            return (
              <IngredientCard
                key={ingredient._id}
                name={ingredient.name}
                quantity={inListQuantity}
                onIncrement={() =>
                  addToList({ profileId, ingredientId: ingredient._id })
                }
                onDecrement={() =>
                  setQuantity({
                    profileId,
                    ingredientId: ingredient._id,
                    quantity: inListQuantity - 1,
                  })
                }
                overlay={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIngredient({
                        id: ingredient._id,
                        name: ingredient.name,
                        storeId: ingredient.storeId,
                      });
                    }}
                    className="absolute top-0.5 left-1 w-5 h-5 bg-stone-400 text-white rounded-full flex items-center justify-center shadow hover:bg-stone-600 z-10"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                }
              />
            );
          })}
        </div>
      )}

      {/* Add modal. */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} title="New Ingredient">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ingredient name"
              className={`input mb-3 ${createDuplicate ? "border-red-500" : ""}`}
              autoFocus
            />
            {createDuplicate && (
              <p className="text-red-500 text-sm mb-3 -mt-2">"{createDuplicate.name}" already exists silly billy</p>
            )}
            <select
              value={newStore}
              onChange={(e) => setNewStore(e.target.value)}
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
                disabled={!newName.trim() || !!createDuplicate}
                className="flex-1 btn-primary"
              >
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal. */}
      {editingIngredient && (
        <Modal
          onClose={() => setEditingIngredient(null)}
          title="Edit Ingredient"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            <input
              type="text"
              value={editingIngredient.name}
              onChange={(e) =>
                setEditingIngredient({ ...editingIngredient, name: e.target.value })
              }
              placeholder="Ingredient name"
              className={`input mb-3 ${editDuplicate ? "border-red-500" : ""}`}
              autoFocus
            />
            {editDuplicate && (
              <p className="text-red-500 text-sm mb-3 -mt-2">"{editDuplicate.name}" already exists silly billy</p>
            )}
            <select
              value={editingIngredient.storeId || ""}
              onChange={(e) =>
                setEditingIngredient({
                  ...editingIngredient,
                  storeId: e.target.value
                    ? (e.target.value as Id<"stores">)
                    : undefined,
                })
              }
              className="input mb-4"
            >
              <option value="">No store</option>
              {stores.map((store) => (
                <option key={store._id} value={store._id}>
                  {store.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirm(editingIngredient.id);
                  setEditingIngredient(null);
                }}
                className="p-2.5 rounded-xl text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editingIngredient.name.trim() || !!editDuplicate}
                className="flex-1 btn-primary"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation. */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)} title="Delete Ingredient?">
          <p className="text-stone-600 mb-4">
            This will remove the ingredient from all dishes that use it.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              className="flex-1 bg-red-500 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-100"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  hasSearch,
  onAdd,
}: {
  hasSearch: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-coral-100 rounded-full flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-coral-500" />
      </div>
      {hasSearch ? (
        <>
          <h3 className="font-semibold text-stone-700 mb-1">
            No ingredients found
          </h3>
          <p className="text-sm text-stone-500">Try a different search term</p>
        </>
      ) : (
        <>
          <h3 className="font-semibold text-stone-700 mb-1">
            No ingredients yet
          </h3>
          <p className="text-sm text-stone-500 mb-4">
            Add ingredients to build your library
          </p>
          <button onClick={onAdd} className="btn-primary">
            Add your first ingredient
          </button>
        </>
      )}
    </div>
  );
}
