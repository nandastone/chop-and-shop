import { Package } from "lucide-react";
import { QuantityStepper } from "./QuantityStepper";

// Grid-style ingredient card with tap-to-add and inline stepper.
export function IngredientCard({
  name,
  quantity,
  onIncrement,
  onDecrement,
  overlay,
}: {
  name: string;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  // Optional overlay element (e.g. edit pencil button) positioned absolutely over the card.
  overlay?: React.ReactNode;
}) {
  const isSelected = quantity > 0;

  return (
    <div className="relative pt-1.5 px-1.5">
      {overlay}

      <div
        className={`w-full flex flex-col items-center rounded-xl transition-all shadow-sm ${
          isSelected ? "bg-coral-50 ring-2 ring-coral-500" : "bg-white"
        }`}
      >
        {/* Tappable card body. */}
        <button
          type="button"
          onClick={onIncrement}
          className="w-full flex flex-col items-center p-2 pb-1"
        >
          <div
            className={`w-9 h-9 rounded-lg mb-1 flex items-center justify-center flex-shrink-0 ${
              isSelected
                ? "bg-coral-200"
                : "bg-gradient-to-br from-coral-100 to-warm-200"
            }`}
          >
            <Package
              className={`w-4 h-4 ${isSelected ? "text-coral-500" : "text-coral-300"}`}
            />
          </div>
          <span
            className={`text-[11px] font-medium text-center truncate w-full ${
              isSelected ? "text-coral-700" : "text-stone-700"
            }`}
          >
            {name}
          </span>
        </button>

        {/* Stepper — always takes space, controls visible when selected. */}
        <QuantityStepper
          quantity={quantity}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          visible={isSelected}
        />
      </div>
    </div>
  );
}
