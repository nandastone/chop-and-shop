import { Plus, Minus } from "lucide-react";

// Inline quantity stepper with - [qty] + controls.
export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  visible,
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  visible: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-1 pb-1.5 w-full px-1 ${visible ? "visible" : "invisible"}`}
    >
      <button
        type="button"
        onClick={onDecrement}
        className="w-6 h-6 rounded-full bg-coral-500 text-white flex items-center justify-center hover:bg-coral-600"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="text-xs font-bold text-coral-700 min-w-[1.25rem] text-center">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        className="w-6 h-6 rounded-full bg-coral-500 text-white flex items-center justify-center hover:bg-coral-600"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
