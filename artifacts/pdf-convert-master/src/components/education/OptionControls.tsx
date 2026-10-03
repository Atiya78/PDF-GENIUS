import { cn } from "@/lib/utils";

interface Opt<T> { value: T; label: string }
interface Props<T extends string | number> {
  label: string;
  options: readonly Opt<T>[];
  value: T[] | T;
  onChange: (v: NoInfer<T>) => void;
  multi?: boolean;
  disabled?: boolean;
  hint?: string;
  testId: string;
}

export function ChipGroup<const T extends string | number>({ label, options, value, onChange, multi, disabled, hint, testId }: Props<T>) {
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-gray-900">{label}</legend>
      <div className="flex flex-wrap gap-2" role={multi ? "group" : "radiogroup"} aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role={multi ? undefined : "radio"}
            aria-checked={multi ? undefined : isOn(o.value)}
            aria-pressed={multi ? isOn(o.value) : undefined}
            onClick={() => onChange(o.value)}
            data-testid={`${testId}-${o.value}`}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7433d] disabled:opacity-50",
              isOn(o.value) ? "border-[#f7433d] bg-[#f7433d] text-white" : "border-gray-200 bg-white text-gray-700 hover:border-[#f7433d]/50")}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </fieldset>
  );
}

export const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "bangla", label: "Bangla" },
  { value: "same", label: "Same as document" },
] as const;
