import { MONTHS_PT, type StatusKey } from "./constants"

export function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export function fmtDateShort(iso: string) {
  const parts = iso.split("-")
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}`
}

export function monthLabel(iso: string) {
  const parts = iso.split("-")
  if (parts.length < 2) return iso
  const m = Number(parts[1])
  if (Number.isNaN(m) || m < 1 || m > 12) return iso
  return `${MONTHS_PT[m - 1]} ${parts[0]}`
}

export function monthSigla(iso: string): string {
  const parts = iso.split("-")
  const m = Number(parts[1])
  if (Number.isNaN(m)) return ""
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][m - 1] ?? ""
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round(bytes / 1024)} KB`
}

export function cycleNext<T extends string>(arr: Array<[T, string]>, current: T): T {
  const i = arr.findIndex((x) => x[0] === current)
  return arr[(i + 1) % arr.length][0]
}

export function statusKeyFromRaw(raw: string): StatusKey {
  const s = (raw || "").toLowerCase()
  if (s.includes("completed")) return "completed"
  if (s.includes("partial")) return "partial"
  if (s.includes("missing")) return "missing"
  if (s.includes("legacy")) return "legacy"
  return "all"
}

export function statusLabel(raw: string) {
  const k = statusKeyFromRaw(raw)
  if (k === "completed") return "completa"
  if (k === "partial") return "parcial"
  if (k === "missing") return "sem métricas"
  if (k === "legacy") return "legado"
  return raw
}

export function coverageNumeric(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  const n = Number(raw)
  if (!Number.isNaN(n) && Number.isFinite(n)) return n
  return null
}

export function placeholderMarkdown(
  runTitle: string,
  runSlug: string,
  file: string,
  phase: string,
  size: string,
  schema: string,
  status: string,
  sourceRoot: string,
) {
  return `# ${file}

> _Arquivo ainda não materializado neste MVP read-only. Mostrando metadados._

- **Run:** ${runTitle}
- **Slug:** \`${runSlug}\`
- **Fase:** \`${phase}\`
- **Tamanho:** ${size}
- **Schema:** \`${schema}\`
- **Status:** ${status}

Para visualizar o conteúdo real, sincronize \`${sourceRoot}/${runSlug}/\`.
`
}
