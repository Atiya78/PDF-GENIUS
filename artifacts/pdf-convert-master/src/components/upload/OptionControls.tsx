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
      <p className="text-sm font-medium text-gray-900">{label}</p>
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
                on ? "border-[#f7433d] bg-[#f7433d]/10 text-[#c8312c]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {o.label}
              {o.hint && <span className="block text-[11px] font-normal text-gray-500">{o.hint}</span>}
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
      <label htmlFor={testId} className="flex items-center justify-between text-sm font-medium text-gray-900">
        <span>Quality</span><span className="text-gray-600">{value}</span>
      </label>
      <input
        id={testId} type="range" min={10} max={100} step={1} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#f7433d]" data-testid={testId}
      />
      <p className="text-xs text-gray-500">Higher quality gives larger files (10 to 100).</p>
    </div>
  );
}

export const SettingsPanel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section aria-label={title} className="mx-auto w-full max-w-xl space-y-5 rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5">
    <h4 className="text-base font-semibold text-gray-900">{title}</h4>
    {children}
  </section>
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input
    ref={ref}
    {...props}
    className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-[#f7433d] focus:outline-none focus:ring-2 focus:ring-[#f7433d]/20 ${props.className ?? ""}`}
  />
));
TextInput.displayName = "TextInput";
