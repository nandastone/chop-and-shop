import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { Plus, Search, Pencil, Trash2, X, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/ingredients")({
  component: IngredientsPage,
});

function IngredientsPage() {
  const { data: ingredients } = useSuspenseQuery(
    convexQuery(api.ingredients.list, {})
  );
  const { data: stores } = useSuspenseQuery(convexQuery(api.stores.list, {}));
  const { data: shoppingList } = useSuspenseQuery(
    convexQuery(api.shoppingList.get, {})
  );

  const createIngredient = useMutation(api.ingredients.create);
  const updateIngredient = useMutation(api.ingredients.update);
  const deleteIngredient = useMutation(api.ingredients.remove);
  const addToList = useMutation(api.shoppingList.addManualIngredient);

  const [search, setSearch] = useState("");
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
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  // Build a map of manual ingredient quantities.
  const manualQuantities = new Map(
    (shoppingList.manualIngredients || []).map(
      (i: { ingredientId: Id<"ingredients">; quantity: number }) => [i.ingredientId, i.quantity]
    )
  );

  const filteredIngredients = ingredients
    .filter((ing) => ing.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreateError("");

    // Client-side duplicate check.
    const nameLower = newName.trim().toLowerCase();
    const duplicate = ingredients.find(
      (i) => i.name.toLowerCase() === nameLower
    );
    if (duplicate) {
      setCreateError(`"${duplicate.name}" already exists`);
      return;
    }

    await createIngredient({
      name: newName.trim(),
      storeId: newStore ? (newStore as Id<"stores">) : undefined,
    });
    toast.success(`Added "${newName.trim()}"`);
    setNewName("");
    setNewStore("");
    setShowAddModal(false);
  };

  const handleUpdate = async () => {
    if (!editingIngredient || !editingIngredient.name.trim()) return;
    setEditError("");

    // Client-side duplicate check (excluding self).
    const nameLower = editingIngredient.name.trim().toLowerCase();
    const duplicate = ingredients.find(
      (i) => i._id !== editingIngredient.id && i.name.toLowerCase() === nameLower
    );
    if (duplicate) {
      setEditError(`"${duplicate.name}" already exists`);
      return;
    }

    await updateIngredient({
      id: editingIngredient.id,
      name: editingIngredient.name.trim(),
      storeId: editingIngredient.storeId,
    });
    toast.success("Ingredient updated");
    setEditingIngredient(null);
  };

  const handleDelete = async (id: Id<"ingredients">) => {
    await deleteIngredient({ id });
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
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
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
            const isInList = inListQuantity > 0;
            return (
              <div key={ingredient._id} className="relative pt-1.5 px-1.5">
                {/* Quantity badge. */}
                {isInList && (
                  <div className="absolute top-0.5 right-1 w-5 h-5 bg-sage-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow z-10">
                    {inListQuantity}
                  </div>
                )}

                {/* Edit button. */}
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

                <button
                  type="button"
                  onClick={() => addToList({ ingredientId: ingredient._id })}
                  className={`w-full h-full flex flex-col items-center p-2 rounded-xl transition-all border-2 ${
                    isInList
                      ? "bg-sage-100 border-sage-500"
                      : "bg-white border-stone-200 hover:border-sage-300"
                  }`}
                >
                  {/* Photo placeholder. */}
                  <div
                    className={`w-9 h-9 rounded-lg mb-1 flex items-center justify-center flex-shrink-0 ${
                      isInList
                        ? "bg-sage-200"
                        : "bg-gradient-to-br from-coral-100 to-warm-200"
                    }`}
                  >
                    <Package
                      className={`w-4 h-4 ${
                        isInList ? "text-sage-600" : "text-coral-300"
                      }`}
                    />
                  </div>

                  {/* Name. */}
                  <span
                    className={`text-[11px] font-medium text-center truncate w-full ${
                      isInList ? "text-sage-700" : "text-stone-700"
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

      {/* Add modal. */}
      {showAddModal && (
        <Modal onClose={() => { setShowAddModal(false); setCreateError(""); }} title="New Ingredient">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setCreateError(""); }}
              placeholder="Ingredient name"
              className={`input mb-3 ${createError ? "border-red-500" : ""}`}
              autoFocus
            />
            {createError && (
              <p className="text-red-500 text-sm mb-3 -mt-2">{createError}</p>
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
                onClick={() => { setShowAddModal(false); setCreateError(""); }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim()}
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
          onClose={() => { setEditingIngredient(null); setEditError(""); }}
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
              onChange={(e) => {
                setEditingIngredient({ ...editingIngredient, name: e.target.value });
                setEditError("");
              }}
              placeholder="Ingredient name"
              className={`input mb-3 ${editError ? "border-red-500" : ""}`}
              autoFocus
            />
            {editError && (
              <p className="text-red-500 text-sm mb-3 -mt-2">{editError}</p>
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
                  setEditError("");
                }}
                className="p-2.5 rounded-xl text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => { setEditingIngredient(null); setEditError(""); }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editingIngredient.name.trim()}
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
