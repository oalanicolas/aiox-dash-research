import { cn } from "@/lib/utils"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT } from "../foundations/theme"

/* Molecule — single row in a TCO scenario table.
 * Atoms: player tag, setup label, low-high amount, optional baseline mark. */
export function TcoRow({
  player,
  setup,
  low,
  high,
  baseline = false,
  currency = "USD",
}: {
  player: string
  setup: string
  low: number | null
  high: number | null
  baseline?: boolean
  currency?: string
}) {
  const range = formatRange(low, high, currency)

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-1 border-b border-[var(--rule-soft)] px-1 py-2 sm:grid-cols-[88px_minmax(0,1fr)_140px] sm:items-baseline sm:gap-3",
        baseline && "bg-[var(--paper-deep)]",
      )}
    >
      <span
        className={cn(
          "truncate text-[12px]",
          baseline ? "font-bold text-[var(--ink)]" : "text-[var(--ink-2)]",
        )}
        style={{ fontFamily: SANS_FONT }}
      >
        {player}
      </span>
      <span
        className="truncate text-[12px] italic text-[var(--ink-3)]"
        style={{ fontFamily: "var(--serif)" }}
      >
        {setup}
        {baseline && (
          <span
            className="ml-2 not-italic border border-[var(--lime-ink)] px-1 text-[9px] uppercase tracking-[0.1em] text-[var(--lime-ink)]"
            style={{ fontFamily: MONO_FONT }}
          >
            baseline
          </span>
        )}
      </span>
      <span
        className="text-left text-[16px] font-black tracking-[-0.03em] tabular-nums text-[var(--ink)] sm:text-right"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {range}
      </span>
    </div>
  )
}

function formatRange(low: number | null, high: number | null, currency: string): string {
  if (low == null && high == null) return "—"
  const lo = low ?? high ?? 0
  const hi = high ?? low ?? 0
  if (lo === hi) return formatMoney(lo, currency)
  return `${formatMoney(lo, currency)}–${formatMoney(hi, currency)}`
}

function formatMoney(n: number, currency: string): string {
  const sym = currency === "BRL" ? "R$" : currency === "USD" ? "$" : `${currency} `
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return `${sym}${n.toLocaleString("en-US")}`
}
