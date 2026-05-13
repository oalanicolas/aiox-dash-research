import { MONO_FONT } from "../foundations/theme"

/* Molecule — button que cicla um valor de lista [key, label].
 * 1 ação: ciclar. 3 atoms: prefix (opcional), label bold, arrow ▾. */
export function ChipCycler({
  label,
  prefix,
  onCycle,
}: {
  label: string
  prefix?: string
  onCycle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onCycle}
      className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
      style={{ fontFamily: MONO_FONT }}
    >
      {prefix && <span>{prefix}</span>}
      <strong className="font-medium text-[var(--ink)]">{label}</strong>
      <span className="text-[9px] text-[var(--ink-faint)]">▾</span>
    </button>
  )
}
