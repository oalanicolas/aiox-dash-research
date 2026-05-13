import { MONO_FONT, SANS_FONT, observatoryThemeVars } from "@/components/observatory/foundations/theme"

export default function ObservatoryLoading() {
  return (
    <main
      className="grid h-[100dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--paper)] text-[var(--ink)]"
      style={{ ...observatoryThemeVars, fontFamily: SANS_FONT }}
    >
      <header className="border-b border-[rgba(245,244,231,0.13)] bg-[var(--aiox-dark,#050505)]">
        <div className="flex min-h-12 items-center justify-between px-4 sm:px-6">
          <img src="/logo/AIOX-White.svg" alt="AIOX" className="h-5 w-auto" />
          <div className="text-[9px] uppercase tracking-[0.16em] text-white/40" style={{ fontFamily: MONO_FONT }}>
            Carregando observatory
          </div>
        </div>
      </header>
      <section className="grid min-h-0 grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-r border-[var(--rule)] bg-[var(--paper-alt)] p-5">
          <div className="mb-6 h-3 w-28 bg-[var(--ink-faint)]" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-16 border border-[var(--rule-soft)] bg-[var(--paper)]" />
            ))}
          </div>
        </aside>
        <div className="flex items-center justify-center">
          <div className="grid gap-3 text-center">
            <div className="mx-auto h-1.5 w-28 overflow-hidden bg-[var(--ink-faint)]">
              <div className="h-full w-1/2 animate-pulse bg-[var(--lime-ink)]" />
            </div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
              Preparando dados
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
