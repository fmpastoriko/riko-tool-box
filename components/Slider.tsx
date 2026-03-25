interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
  step?: number;
}

export default function Slider({
  label,
  value,
  min,
  max,
  unit = "",
  onChange,
  step = 1,
}: SliderProps) {
  return (
    <div className="card space-y-1 flex-shrink-0">
      <div className="flex items-center justify-between">
        <p className="section-label mb-0" style={{ color: "var(--muted)" }}>
          {label}
        </p>
        <p className="text-xs font-mono" style={{ color: "var(--accent)" }}>
          {value}
          {unit}
        </p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
