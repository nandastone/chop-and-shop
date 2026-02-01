import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Check,
  Trash2,
  Home,
  Printer,
} from "lucide-react";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useProfileId } from "~/contexts/ProfileContext";

export const Route = createFileRoute("/$profileId/")({
  component: ShoppingListPage,
});

function ShoppingListPage() {
  const profileId = useProfileId();
  const { data } = useSuspenseQuery(
    convexQuery(api.shoppingList.getAggregated, { profileId })
  );

  const removeDish = useMutation(api.shoppingList.removeDish);
  const setDishCount = useMutation(api.shoppingList.setDishCount);
  const toggleItem = useMutation(api.shoppingList.toggleItem);
  const excludeIngredient = useMutation(api.shoppingList.excludeIngredient);
  const includeIngredient = useMutation(api.shoppingList.includeIngredient);
  const removeManualIngredient = useMutation(api.shoppingList.removeManualIngredient);
  const setManualIngredientQuantity = useMutation(api.shoppingList.setManualIngredientQuantity);
  const addManualIngredient = useMutation(api.shoppingList.addManualIngredient);
  const addMiscItem = useMutation(api.shoppingList.addMiscItem);
  const toggleMiscItem = useMutation(api.shoppingList.toggleMiscItem);
  const removeMiscItem = useMutation(api.shoppingList.removeMiscItem);
  const clearList = useMutation(api.shoppingList.clear);

  const [showMiscInput, setShowMiscInput] = useState(false);
  const [miscItemName, setMiscItemName] = useState("");
  const [miscItemStore, setMiscItemStore] = useState<string>("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleAddMiscItem = async () => {
    if (!miscItemName.trim()) return;
    await addMiscItem({
      profileId,
      name: miscItemName.trim(),
      storeId: miscItemStore ? (miscItemStore as Id<"stores">) : undefined,
    });
    setMiscItemName("");
    setMiscItemStore("");
    setShowMiscInput(false);
  };


  type MiscItem = { id: string; name: string; storeId?: Id<"stores">; checked: boolean };

  // Calculate progress (exclude "have it" items from count).
  // activeItems = ingredient items that are not excluded (marked as "have it at home").
  const activeItems = data.items.filter((item: { isExcluded: boolean }) => !item.isExcluded);
  // totalItems includes all active ingredient items + all misc items.
  const totalItems = activeItems.length + data.miscItems.length;
  const checkedItems =
    activeItems.filter((i: { isChecked: boolean }) => i.isChecked).length +
    data.miscItems.filter((item: MiscItem) => item.checked).length;

  const isEmpty =
    data.selectedDishes.length === 0 && data.miscItems.length === 0;

  return (
    <main className="p-4">
      {/* Header. */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Shopping List</h1>
          {!isEmpty && (
            <p className="text-sm text-stone-500">
              {checkedItems} of {totalItems} items
            </p>
          )}
        </div>
        {!isEmpty && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl text-stone-400 hover:text-coral-500 hover:bg-coral-50 no-print"
              title="Print list"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 no-print"
              title="Clear list"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyState profileId={profileId} />
      ) : (
        <div className="space-y-6">
          {/* Selected dishes. */}
          <section className="no-print">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                Dishes ({data.selectedDishes.length})
              </h2>
              <Link
                to="/$profileId/dishes"
                params={{ profileId }}
                className="text-coral-500 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.selectedDishes.map(({ dish, count }: { dish?: { _id: Id<"dishes">; name: string }; count: number }) =>
                dish ? (
                  <div
                    key={dish._id}
                    className="chip flex items-center gap-2"
                  >
                    <span>{dish.name}</span>
                    <div className="flex items-center bg-white/50 rounded-full">
                      <button
                        onClick={() =>
                          setDishCount({
                            profileId,
                            dishId: dish._id,
                            count: Math.max(0, count - 1),
                          })
                        }
                        className="p-2 rounded-full hover:bg-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">
                        {count}
                      </span>
                      <button
                        onClick={() =>
                          setDishCount({ profileId, dishId: dish._id, count: count + 1 })
                        }
                        className="p-2 rounded-full hover:bg-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeDish({ profileId, dishId: dish._id })}
                      className="p-1.5 rounded-full hover:bg-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null
              )}
            </div>
          </section>

          {/* Shopping items by store. */}
          <section>
            <div className="flex items-center justify-between mb-3 no-print">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                Items to Buy
              </h2>
              <button
                onClick={() => setShowMiscInput(true)}
                className="text-coral-500 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            {showMiscInput && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddMiscItem();
                }}
                className="card mb-4 no-print"
              >
                <input
                  type="text"
                  value={miscItemName}
                  onChange={(e) => setMiscItemName(e.target.value)}
                  placeholder="Item name"
                  className="input mb-2"
                  autoFocus
                />
                <select
                  value={miscItemStore}
                  onChange={(e) => setMiscItemStore(e.target.value)}
                  className="input mb-2"
                >
                  <option value="">Select store (optional)</option>
                  {data.stores.map((store) => (
                    <option key={store._id} value={store._id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMiscInput(false);
                      setMiscItemName("");
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!miscItemName.trim()}
                    className="flex-1 btn-primary"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Render all stores (in order) plus "Other" for no-store items. */}
            <div className="print-list">
              {[...data.stores, null].map((store) => {
                const storeId = store?._id || null;

                // Get dish ingredients for this store.
                const storeIngredients = data.byStore.find(
                  (s: { store?: { _id: string } }) => (s.store?._id || null) === storeId
                )?.items || [];

                // Get misc items for this store.
                const storeMiscItems = data.miscItems.filter(
                  (item: MiscItem) => (item.storeId || null) === storeId
                );

                if (storeIngredients.length === 0 && storeMiscItems.length === 0) return null;

                const storeColor = store?.color;

                return (
                  <div key={storeId || "no-store"} className="mb-4 store-section">
                    <div
                      className="store-header mb-2 flex items-center gap-2"
                      style={{
                        backgroundColor: storeColor ? `${storeColor}20` : undefined,
                        color: storeColor || undefined,
                      }}
                    >
                      {storeColor && (
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: storeColor }}
                        />
                      )}
                      {store?.name || "Other"}
                    </div>
                    <div className="space-y-1">
                      {storeIngredients.map((item: any) => (
                        <ShoppingItem
                          key={item.ingredientId}
                          item={item}
                          onToggle={() =>
                            toggleItem({ profileId, ingredientId: item.ingredientId })
                          }
                          onToggleExclude={() =>
                            item.isExcluded
                              ? includeIngredient({ profileId, ingredientId: item.ingredientId })
                              : excludeIngredient({ profileId, ingredientId: item.ingredientId })
                          }
                          onIncrement={() =>
                            addManualIngredient({ profileId, ingredientId: item.ingredientId, quantity: 1 })
                          }
                          onDecrement={() => {
                            const newQty = item.manualQuantity - 1;
                            if (newQty <= 0) {
                              removeManualIngredient({ profileId, ingredientId: item.ingredientId });
                            } else {
                              setManualIngredientQuantity({ profileId, ingredientId: item.ingredientId, quantity: newQty });
                            }
                          }}
                        />
                      ))}
                      {storeMiscItems.map((item: MiscItem) => (
                        <MiscItemComponent
                          key={item.id}
                          item={item}
                          onToggle={() => toggleMiscItem({ profileId, itemId: item.id })}
                          onRemove={() => removeMiscItem({ profileId, itemId: item.id })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      )}

      {/* Clear confirmation modal. */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-stone-800 mb-2">
              Clear List?
            </h2>
            <p className="text-stone-600 mb-6">
              This will remove all dishes and items from your shopping list.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearList({ profileId });
                  setShowClearConfirm(false);
                }}
                className="flex-1 bg-red-500 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-red-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ShoppingItem({
  item,
  onToggle,
  onToggleExclude,
  onIncrement,
  onDecrement,
}: {
  item: {
    ingredient: { name: string };
    totalCount: number;
    manualQuantity: number;
    fromDishes: string[];
    isChecked: boolean;
    isExcluded: boolean;
  };
  onToggle: () => void;
  onToggleExclude: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const isDimmed = item.isChecked || item.isExcluded;
  const dishCount = item.totalCount - item.manualQuantity;
  const hasManual = item.manualQuantity > 0;

  return (
    <div
      className={`print-item flex items-center gap-3 p-3 bg-white rounded-xl transition-opacity ${
        isDimmed ? "opacity-40" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className={`checkbox ${item.isChecked ? "checkbox-checked" : ""}`}
      >
        {item.isChecked && <Check className="w-4 h-4" />}
      </button>
      <span
        className={`flex-1 font-medium ${
          isDimmed ? "line-through text-stone-400" : "text-stone-700"
        }`}
      >
        {item.ingredient.name}
        {item.totalCount > 1 && (
          <span className={isDimmed ? "text-stone-400" : "text-coral-500"}> ({item.totalCount})</span>
        )}
      </span>
      {/* Quantity stepper for extras. */}
      <div className="flex items-center gap-1 no-print">
        <button
          onClick={onDecrement}
          disabled={!hasManual}
          className={`p-2 rounded-full transition-colors ${
            hasManual
              ? "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
              : "text-stone-200 cursor-not-allowed"
          }`}
          title="Remove one extra"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span
          className={`w-6 text-center text-sm font-semibold ${
            hasManual ? "text-sage-600" : "text-stone-300"
          }`}
          title={hasManual ? `${item.manualQuantity} extra${item.manualQuantity !== 1 ? 's' : ''} (${dishCount} from dishes)` : "No extras added"}
        >
          {item.manualQuantity}
        </span>
        <button
          onClick={onIncrement}
          className="p-2 rounded-full text-stone-500 hover:bg-sage-100 hover:text-sage-700 transition-colors"
          title="Add one extra"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={onToggleExclude}
        className={`p-1.5 rounded-lg transition-colors no-print ${
          item.isExcluded
            ? "text-coral-500 bg-coral-50"
            : "text-stone-300 hover:text-stone-500 hover:bg-stone-100"
        }`}
        title={item.isExcluded ? "Add back to list" : "Have it at home"}
      >
        <Home className="w-4 h-4" />
      </button>
    </div>
  );
}

function MiscItemComponent({
  item,
  onToggle,
  onRemove,
}: {
  item: { name: string; checked: boolean };
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`print-item flex items-center gap-3 p-3 bg-white rounded-xl transition-opacity ${
        item.checked ? "opacity-50" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className={`checkbox ${item.checked ? "checkbox-checked" : ""}`}
      >
        {item.checked && <Check className="w-4 h-4" />}
      </button>
      <span
        className={`flex-1 font-medium ${
          item.checked ? "line-through text-stone-400" : "text-stone-700"
        }`}
      >
        {item.name}
      </span>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 no-print"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmptyState({ profileId }: { profileId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-coral-100 rounded-full flex items-center justify-center mb-4">
        <ShoppingCart className="w-8 h-8 text-coral-500" />
      </div>
      <h3 className="font-semibold text-stone-700 mb-1">List is empty</h3>
      <p className="text-sm text-stone-500 mb-4">
        Add dishes to start building your shopping list
      </p>
      <Link to="/$profileId/dishes" params={{ profileId }} className="btn-primary inline-block">
        Add dishes
      </Link>
    </div>
  );
}
