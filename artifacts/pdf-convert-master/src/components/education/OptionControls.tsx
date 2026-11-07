import { cn } from "@/lib/utils";
import { useId } from "react";
import { Minus, Plus } from "lucide-react";

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

/** Option group with real radio (single) or checkbox (multi) semantics. */
export function ChipGroup<const T extends string | number>({ label, options, value, onChange, multi, disabled, hint, testId }: Props<T>) {
  const name = useId();
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="edu-label mb-2.5">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = isOn(o.value);
          return (
            <label key={String(o.value)} className={cn("edu-choice", on && "edu-choice-on", disabled && "opacity-50")}>
              <input
                type={multi ? "checkbox" : "radio"}
                name={name}
                value={String(o.value)}
                checked={on}
                onChange={() => onChange(o.value)}
                data-testid={`${testId}-${o.value}`}
                className="edu-choice-input"
              />
              <span aria-hidden="true" className={cn("edu-mark", multi && "edu-mark-sq")} />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-2 text-xs leading-relaxed text-[#57534e]">{hint}</p>}
    </fieldset>
  );
}

export const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "bangla", label: "Bangla" },
  { value: "same", label: "Same as PDF" },
] as const;

export function CountInput({ label, min, max, value, onChange, disabled }: {
  label: string; min: number; max: number; value: number; onChange: (value: number) => void; disabled?: boolean;
}) {
  const id = useId();
  const step = (d: number) => onChange(Math.max(min, Math.min(max, (Number.isFinite(value) && value ? value : min) + d)));
  const stepBtn = "flex h-11 w-10 items-center justify-center text-[#57534e] transition-colors hover:bg-[#f3eee6] hover:text-[#1c1917] disabled:opacity-40";
  return <div>
    <label htmlFor={id} className="edu-label mb-2.5">{label}</label>
    <div className="inline-flex items-stretch overflow-hidden rounded-[9px] border border-[#e7e0d5] bg-white focus-within:border-[#1c1917] focus-within:ring-[3px] focus-within:ring-[#f7433d]/20">
      <button type="button" className={stepBtn} disabled={disabled || value <= min} onClick={() => step(-1)} aria-label={`Decrease ${label.toLowerCase()}`}><Minus className="h-4 w-4" aria-hidden="true" /></button>
      <input id={id} type="number" min={min} max={max} step={1} value={value || ""} disabled={disabled}
        onChange={event => onChange(Number(event.target.value))}
        className="edu-mono h-11 w-16 border-x border-[#e7e0d5] bg-transparent text-center text-[15px] font-semibold text-[#1c1917] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-describedby={`${id}-hint`} />
      <button type="button" className={stepBtn} disabled={disabled || value >= max} onClick={() => step(1)} aria-label={`Increase ${label.toLowerCase()}`}><Plus className="h-4 w-4" aria-hidden="true" /></button>
    </div>
    <p id={`${id}-hint`} className="mt-2 text-xs text-[#57534e]">Any whole number from {min} to {max}.</p>
  </div>;
}
