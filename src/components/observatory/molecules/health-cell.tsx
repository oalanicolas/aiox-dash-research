import { cn } from "@/lib/utils"
import { DISPLAY_FONT, MONO_FONT, SERIF_FONT } from "../foundations/theme"
import { InferredFlag } from "./inferred-flag"

/* Molecule — key + value, 1 ação (mostrar 1 métrica do run health).
 * Atoms: label (mono) + optional inferred flag + value (display ou serif when text). */
export function HealthCell({
  k,
  v,
  dim,
  isText,
  inferred,
}: {
  k: string
  v: string
  dim?: boolean
  isText?: boolean
  inferred?: boolean
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline border-t border-[var(--rule-soft)] py-2">
      <span
        className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]"
        style={{ fontFamily: MONO_FONT }}
      >
        {k}
        {inferred && <InferredFlag size={9} title={`${k} inferido`} />}
      </span>
      <span
        className={cn(
          "text-[18px] font-bold leading-none tracking-[-0.02em]",
          dim && "font-normal text-[var(--ink-dim)]",
          isText && "text-[13px] italic font-normal tracking-[0] text-[var(--ink-3)]",
        )}
        style={{ fontFamily: isText ? SERIF_FONT : DISPLAY_FONT }}
      >
        {v}
      </span>
    </div>
  )
}
