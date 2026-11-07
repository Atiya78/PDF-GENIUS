import React from "react";

export function OptionGroup<T extends string | number>({
  label, value, options, onChange, disabled, testIdPrefix,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  testIdPrefix: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-2">
      <p className="text-sm font-medium text-[#1c1917]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              data-testid={`${testIdPrefix}-${o.value}`}
              className={`min-w-[4rem] rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7433d]/40 disabled:opacity-50 ${
                on ? "border-[#f7433d] bg-[#f7433d]/10 text-[#c8312c]" : "border-[#e7e0d5] bg-white text-[#57534e] hover:border-[#e7e0d5]"
              }`}
            >
              {o.label}
              {o.hint && <span className="block text-[11px] font-normal text-[#57534e]">{o.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function QualitySlider({ value, onChange, disabled, testId }: { value: number; onChange: (n: number) => void; disabled?: boolean; testId: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={testId} className="flex items-center justify-between text-sm font-medium text-[#1c1917]">
        <span>Quality</span><span className="text-[#57534e]">{value}</span>
      </label>
      <input
        id={testId} type="range" min={10} max={100} step={1} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#f7433d]" data-testid={testId}
      />
      <p className="text-xs text-[#57534e]">Higher quality gives larger files (10 to 100).</p>
    </div>
  );
}

export const SettingsPanel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section aria-label={title} className="mx-auto w-full max-w-xl space-y-5 rounded-xl border border-[#e7e0d5] bg-[#faf7f2]/60 p-4 sm:p-5">
    <h4 className="text-base font-semibold text-[#1c1917]">{title}</h4>
    {children}
  </section>
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input
    ref={ref}
    {...props}
    className={`w-full rounded-lg border border-[#e7e0d5] bg-white px-3 py-2.5 text-[#1c1917] focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20 ${props.className ?? ""}`}
  />
));
TextInput.displayName = "TextInput";
