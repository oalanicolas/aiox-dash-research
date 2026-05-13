import { cn } from "@/lib/utils"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT } from "../foundations/theme"

/* Molecule — one dimension weight slider with baseline + delta-colored value.
 * Composes a horizontal range input over a single grid row. */
export function WeightSlider({
  id,
  label,
  value,
  baseline,
  min = 0,
  max = 30,
  step = 1,
  onChange,
}: {
  id: string
  label: string
  value: number
  baseline: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}) {
  const isAbove = value > baseline
  const isBelow = value < baseline

  return (
    <label className="grid grid-cols-[38px_minmax(0,1fr)_34px] items-center gap-3">
      <span
        className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]"
        style={{ fontFamily: MONO_FONT }}
      >
        {id}
      </span>
      <span className="min-w-0">
        <span className="mb-1 flex items-baseline justify-between gap-3">
          <span
            className="truncate text-[13px] font-bold text-[var(--ink)]"
            style={{ fontFamily: SANS_FONT }}
          >
            {label}
          </span>
          <span
            className="text-[9px] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            base {baseline}
          </span>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--ink)]"
        />
      </span>
      <span
        className={cn(
          "text-right text-[16px] font-black",
          isAbove ? "text-[var(--lime-ink)]" : isBelow ? "text-[var(--warning-ink)]" : "text-[var(--ink)]",
        )}
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {value}
      </span>
    </label>
  )
}
