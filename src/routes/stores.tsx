import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { Plus, Store, Pencil, Trash2, X, Check } from "lucide-react";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/stores")({
  component: StoresPage,
});

function StoresPage() {
  const { data: stores } = useSuspenseQuery(convexQuery(api.stores.list, {}));

  const createStore = useMutation(api.stores.create);
  const updateStore = useMutation(api.stores.update);
  const removeStore = useMutation(api.stores.remove);
  const reorderStores = useMutation(api.stores.reorder);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [editingStore, setEditingStore] = useState<{
    id: Id<"stores">;
    name: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"stores"> | null>(null);

  const handleAddStore = async () => {
    if (!newStoreName.trim()) return;
    await createStore({ name: newStoreName.trim() });
    setNewStoreName("");
    setShowAddForm(false);
  };

  const handleUpdateStore = async () => {
    if (!editingStore || !editingStore.name.trim()) return;
    await updateStore({ id: editingStore.id, name: editingStore.name.trim() });
    setEditingStore(null);
  };

  const handleDeleteStore = async (id: Id<"stores">) => {
    await removeStore({ id });
    setDeleteConfirm(null);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...stores];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    await reorderStores({ orderedIds: newOrder.map((s) => s._id) });
  };

  const handleMoveDown = async (index: number) => {
    if (index === stores.length - 1) return;
    const newOrder = [...stores];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];
    await reorderStores({ orderedIds: newOrder.map((s) => s._id) });
  };

  return (
    <main className="p-4">
      {/* Header. */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Stores</h1>
          <p className="text-sm text-stone-500">
            Manage where you shop
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add</span>
        </button>
      </div>

      {/* Add form. */}
      {showAddForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddStore();
          }}
          className="card mb-4"
        >
          <label className="block text-sm font-medium text-stone-600 mb-2">
            Store Name
          </label>
          <input
            type="text"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="e.g., Coles, Asian Grocer"
            className="input mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewStoreName("");
              }}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newStoreName.trim()}
              className="flex-1 btn-primary"
            >
              Add Store
            </button>
          </div>
        </form>
      )}

      {/* Store list. */}
      {stores.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-stone-400 mb-2">
            Drag to reorder. Shopping list items will be grouped by store in this order.
          </p>
          {stores.map((store, index) => (
            <div key={store._id} className="card">
              {editingStore?.id === store._id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateStore();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={editingStore.name}
                    onChange={(e) =>
                      setEditingStore({ ...editingStore, name: e.target.value })
                    }
                    className="flex-1 input py-2"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-sage-100 text-sage-600"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStore(null)}
                    className="p-2 rounded-xl hover:bg-stone-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-stone-300 hover:text-stone-500 disabled:opacity-30"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === stores.length - 1}
                      className="p-1 text-stone-300 hover:text-stone-500 disabled:opacity-30"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-coral-100 flex items-center justify-center">
                    <Store className="w-5 h-5 text-coral-500" />
                  </div>
                  <span className="flex-1 font-medium text-stone-700">
                    {store.name}
                  </span>
                  <button
                    onClick={() =>
                      setEditingStore({ id: store._id, name: store.name })
                    }
                    className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(store._id)}
                    className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation. */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-stone-800 mb-2">
              Delete Store?
            </h2>
            <p className="text-stone-600 mb-6">
              Ingredients assigned to this store will become unassigned.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStore(deleteConfirm)}
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-coral-100 rounded-full flex items-center justify-center mb-4">
        <Store className="w-8 h-8 text-coral-500" />
      </div>
      <h3 className="font-semibold text-stone-700 mb-1">No stores yet</h3>
      <p className="text-sm text-stone-500">
        Add stores to organize your shopping list by location
      </p>
    </div>
  );
}
