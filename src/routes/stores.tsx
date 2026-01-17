import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { Plus, Store, Pencil, Trash2, X, Check, Package, Upload, ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import type { Id } from "../../convex/_generated/dataModel";

// Predefined color palette for stores.
const COLOR_PALETTE = [
  "#f97352", // coral
  "#63a348", // sage
  "#e9a36e", // warm
  "#6366f1", // indigo
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
];

export const Route = createFileRoute("/stores")({
  component: StoresPage,
});

function StoresPage() {
  const { data: stores } = useSuspenseQuery(convexQuery(api.stores.list, {}));
  const { data: ingredients } = useSuspenseQuery(
    convexQuery(api.ingredients.list, {})
  );

  // Count ingredients per store.
  const ingredientCountByStore = new Map<string, number>();
  for (const ing of ingredients) {
    if (ing.storeId) {
      ingredientCountByStore.set(
        ing.storeId,
        (ingredientCountByStore.get(ing.storeId) || 0) + 1
      );
    }
  }

  const createStore = useMutation(api.stores.create);
  const updateStore = useMutation(api.stores.update);
  const removeStore = useMutation(api.stores.remove);
  const reorderStores = useMutation(api.stores.reorder);
  const generateUploadUrl = useMutation(api.stores.generateUploadUrl);
  const updateImage = useMutation(api.stores.updateImage);
  const updateColor = useMutation(api.stores.updateColor);
  const removeImage = useMutation(api.stores.removeImage);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreColor, setNewStoreColor] = useState<string | undefined>(undefined);
  const [newStoreImageId, setNewStoreImageId] = useState<Id<"_storage"> | undefined>(undefined);
  const [newStoreImagePreview, setNewStoreImagePreview] = useState<string | null>(null);
  const [isUploadingNew, setIsUploadingNew] = useState(false);

  const [editingStore, setEditingStore] = useState<{
    id: Id<"stores">;
    name: string;
    color?: string;
    imageId?: Id<"_storage">;
    imageUrl?: string | null;
  } | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<Id<"stores"> | null>(null);

  const newImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (
    file: File,
    setImageId: (id: Id<"_storage">) => void,
    setPreview: (url: string) => void,
    setUploading: (loading: boolean) => void
  ) => {
    setUploading(true);
    try {
      // Create preview.
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to Convex.
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await response.json();
      setImageId(storageId);
    } finally {
      setUploading(false);
    }
  };

  const handleAddStore = async () => {
    if (!newStoreName.trim()) return;
    await createStore({
      name: newStoreName.trim(),
      color: newStoreColor,
      imageId: newStoreImageId,
    });
    setNewStoreName("");
    setNewStoreColor(undefined);
    setNewStoreImageId(undefined);
    setNewStoreImagePreview(null);
    setShowAddForm(false);
  };

  const handleUpdateStore = async () => {
    if (!editingStore || !editingStore.name.trim()) return;
    await updateStore({
      id: editingStore.id,
      name: editingStore.name.trim(),
      color: editingStore.color,
      imageId: editingStore.imageId,
    });
    setEditingStore(null);
    setEditImagePreview(null);
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

  const startEditing = (store: typeof stores[0]) => {
    setEditingStore({
      id: store._id,
      name: store.name,
      color: store.color,
      imageId: store.imageId,
      imageUrl: store.imageUrl,
    });
    setEditImagePreview(null);
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

      {/* Add form modal. */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-800">New Store</h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewStoreName("");
                  setNewStoreColor(undefined);
                  setNewStoreImageId(undefined);
                  setNewStoreImagePreview(null);
                }}
                className="p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddStore();
              }}
            >
              {/* Image upload. */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Store Image
                </label>
                <input
                  ref={newImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(
                        file,
                        setNewStoreImageId,
                        setNewStoreImagePreview,
                        setIsUploadingNew
                      );
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => newImageInputRef.current?.click()}
                  disabled={isUploadingNew}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-stone-200 hover:border-coral-300 flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden"
                  style={{
                    backgroundColor: newStoreColor ? `${newStoreColor}15` : undefined,
                  }}
                >
                  {isUploadingNew ? (
                    <span className="text-sm text-stone-400">Uploading...</span>
                  ) : newStoreImagePreview ? (
                    <img
                      src={newStoreImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-stone-300" />
                      <span className="text-sm text-stone-400">Upload image</span>
                    </>
                  )}
                </button>
                {newStoreImagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewStoreImageId(undefined);
                      setNewStoreImagePreview(null);
                    }}
                    className="mt-2 text-sm text-red-500 hover:text-red-600"
                  >
                    Remove image
                  </button>
                )}
              </div>

              {/* Store name. */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Store Name
                </label>
                <input
                  type="text"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="e.g., Coles, Asian Grocer"
                  className="input"
                  autoFocus
                />
              </div>

              {/* Color picker. */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewStoreColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newStoreColor === color
                          ? "ring-2 ring-offset-2 ring-stone-400 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewStoreColor(undefined)}
                    className={`w-8 h-8 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center transition-all ${
                      !newStoreColor
                        ? "ring-2 ring-offset-2 ring-stone-400 scale-110"
                        : "hover:scale-105"
                    }`}
                  >
                    <X className="w-4 h-4 text-stone-400" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewStoreName("");
                    setNewStoreColor(undefined);
                    setNewStoreImageId(undefined);
                    setNewStoreImagePreview(null);
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newStoreName.trim() || isUploadingNew}
                  className="flex-1 btn-primary"
                >
                  Add Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store list. */}
      {stores.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-stone-400 mb-2">
            Tap to view ingredients. Shopping list items are grouped by store order.
          </p>
          {stores.map((store, index) => (
            <div key={store._id}>
              {editingStore?.id === store._id ? (
                <div className="card">
                  {/* Edit form inline. */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateStore();
                    }}
                  >
                    {/* Image upload for edit. */}
                    <div className="mb-3">
                      <input
                        ref={editImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(
                              file,
                              (id) => setEditingStore({ ...editingStore, imageId: id }),
                              setEditImagePreview,
                              setIsUploadingEdit
                            );
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => editImageInputRef.current?.click()}
                        disabled={isUploadingEdit}
                        className="w-full h-24 rounded-xl border-2 border-dashed border-stone-200 hover:border-coral-300 flex flex-col items-center justify-center gap-1 transition-colors overflow-hidden"
                        style={{
                          backgroundColor: editingStore.color ? `${editingStore.color}15` : undefined,
                        }}
                      >
                        {isUploadingEdit ? (
                          <span className="text-sm text-stone-400">Uploading...</span>
                        ) : editImagePreview ? (
                          <img
                            src={editImagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : editingStore.imageUrl ? (
                          <img
                            src={editingStore.imageUrl}
                            alt={editingStore.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <ImageIcon className="w-6 h-6 text-stone-300" />
                            <span className="text-xs text-stone-400">Change image</span>
                          </>
                        )}
                      </button>
                      {(editImagePreview || editingStore.imageUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStore({ ...editingStore, imageId: undefined, imageUrl: null });
                            setEditImagePreview(null);
                          }}
                          className="mt-1 text-xs text-red-500 hover:text-red-600"
                        >
                          Remove image
                        </button>
                      )}
                    </div>

                    {/* Name input. */}
                    <input
                      type="text"
                      value={editingStore.name}
                      onChange={(e) =>
                        setEditingStore({ ...editingStore, name: e.target.value })
                      }
                      className="input py-2 mb-3"
                      autoFocus
                    />

                    {/* Color picker. */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PALETTE.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditingStore({ ...editingStore, color })}
                            className={`w-6 h-6 rounded-full transition-all ${
                              editingStore.color === color
                                ? "ring-2 ring-offset-1 ring-stone-400 scale-110"
                                : "hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => setEditingStore({ ...editingStore, color: undefined })}
                          className={`w-6 h-6 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center transition-all ${
                            !editingStore.color
                              ? "ring-2 ring-offset-1 ring-stone-400 scale-110"
                              : "hover:scale-105"
                          }`}
                        >
                          <X className="w-3 h-3 text-stone-400" />
                        </button>
                      </div>
                    </div>

                    {/* Buttons. */}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isUploadingEdit}
                        className="p-2 rounded-xl bg-sage-100 text-sage-600"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStore(null);
                          setEditImagePreview(null);
                        }}
                        className="p-2 rounded-xl hover:bg-stone-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <Link
                  to="/ingredients"
                  search={{ store: store._id }}
                  className="card flex items-center gap-3 hover:bg-stone-50 transition-colors"
                >
                  {/* Reorder buttons. */}
                  <div
                    className="flex flex-col gap-0.5"
                    onClick={(e) => e.preventDefault()}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleMoveUp(index);
                      }}
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
                      onClick={(e) => {
                        e.preventDefault();
                        handleMoveDown(index);
                      }}
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

                  {/* Store image/icon. */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{
                      backgroundColor: store.color ? `${store.color}20` : "#ffebe5",
                    }}
                  >
                    {store.imageUrl ? (
                      <img
                        src={store.imageUrl}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store
                        className="w-6 h-6"
                        style={{ color: store.color || "#f97352" }}
                      />
                    )}
                  </div>

                  {/* Store info. */}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-stone-700 block truncate">
                      {store.name}
                    </span>
                    {(ingredientCountByStore.get(store._id) || 0) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                        <Package className="w-3 h-3" />
                        <span>
                          {ingredientCountByStore.get(store._id)} ingredient
                          {ingredientCountByStore.get(store._id) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Color indicator dot. */}
                  {store.color && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: store.color }}
                    />
                  )}

                  {/* Edit button. */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      startEditing(store);
                    }}
                    className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete button. */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteConfirm(store._id);
                    }}
                    className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Link>
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
