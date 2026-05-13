import { TriangleAlert } from "lucide-react"

/* Atom-as-molecule wrapper — TriangleAlert at fixed size, ink-warning color.
 * One responsibility: signal "inferred value, not from canonical source". */
export function InferredFlag({ size = 10, title }: { size?: number; title?: string }) {
  return (
    <TriangleAlert
      size={size}
      strokeWidth={1.75}
      className="text-[var(--warning-ink)]"
      aria-label={title ?? "Valor inferido (não veio de metrics.yaml canônico)"}
    />
  )
}
