import { MONO_FONT, SANS_FONT, observatoryDarkThemeVars } from "@/components/observatory/foundations/theme"

export default function ObservatoryLoading() {
  return (
    <main
      className="grid h-[100dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--paper)] text-[var(--ink)]"
      style={{ ...observatoryDarkThemeVars, fontFamily: SANS_FONT }}
    >
      <header className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--rule-soft)] bg-[var(--paper)] px-3 py-2 md:grid-cols-[auto_minmax(0,1fr)_auto] md:px-0 md:py-0 md:pr-5">
        <div className="flex min-w-0 items-center gap-3 md:h-full md:border-r md:border-[var(--rule-soft)] md:px-[22px]">
          <img src="/logo/AIOX-White.svg" alt="AIOX" className="h-[18px] w-auto shrink-0" />
          <span className="h-4 w-px shrink-0 bg-[var(--rule-strong)]" />
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--ink)]" style={{ fontFamily: MONO_FONT }}>
            Research
          </span>
        </div>
        <div className="hidden h-full min-w-0 items-stretch md:flex">
          {["Pesquisas", "Bench", "SINKRA Maps", "Demo"].map((label, index) => (
            <span
              key={label}
              className="relative inline-flex h-full min-w-0 items-center gap-2 px-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)] first:text-[var(--lime-ink)] first:after:absolute first:after:inset-x-3.5 first:after:bottom-[-1px] first:after:h-px first:after:bg-[var(--lime-ink)] xl:px-[18px] xl:first:after:inset-x-[18px]"
              style={{ fontFamily: MONO_FONT }}
            >
              <span className="hidden text-[9.5px] tracking-[0.10em] text-[var(--ink-dim)] xl:inline">{String(index + 1).padStart(2, "0")}</span>
              {label}
            </span>
          ))}
        </div>
        <div className="inline-flex h-[30px] items-center gap-2 bg-[var(--lime-ink)] px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-black md:h-8 md:px-3" style={{ fontFamily: MONO_FONT }}>
          <span className="text-[13px] leading-none">+</span>
          Nova pesquisa
        </div>
      </header>
      <section className="grid min-h-0 grid-cols-[minmax(0,1fr)] md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--rule-soft)] bg-[var(--surface,var(--paper-alt))] p-5 md:block">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-2.5 w-36 bg-[var(--ink-faint)]" />
            <div className="h-2.5 w-8 bg-[var(--ink-faint)]" />
          </div>
          <div className="mb-4 h-8 border border-[var(--rule-soft)] bg-[var(--paper)]" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid h-16 grid-cols-[8px_minmax(0,1fr)_42px] items-center gap-3 border-l-2 border-transparent bg-[var(--surface,var(--paper-alt))] px-5">
                <span className="h-2 w-2 bg-[var(--ink-faint)]" />
                <span className="grid gap-2">
                  <span className="h-3 w-4/5 bg-[var(--ink-faint)]" />
                  <span className="h-2 w-3/5 bg-[var(--ink-faint)]" />
                </span>
                <span className="h-4 w-9 bg-[var(--ink-faint)]" />
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0 bg-[var(--paper)]">
          <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--rule-soft)] px-3.5 py-2.5 lg:px-7 lg:py-3.5">
            {["Map", "Ações", "Evidências", "Waves", "Fontes", "Players", "Perguntas", "Doc"].map((label, index) => (
              <span
                key={label}
                className={`inline-flex h-9 shrink-0 items-center gap-2.5 border px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  index === 0
                    ? "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black shadow-[0_0_16px_rgba(209,255,0,0.10)]"
                    : "border-[var(--rule)] bg-[var(--surface,var(--paper-alt))] text-[var(--ink-2)]"
                }`}
                style={{ fontFamily: MONO_FONT }}
              >
                <span className={`border-r pr-2 text-[10px] font-bold tracking-[0.10em] ${index === 0 ? "border-black/20 text-black/60" : "border-[var(--rule-soft)] text-[var(--ink-dim)]"}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {label}
              </span>
            ))}
          </div>
          <div className="grid min-h-[calc(100dvh-109px)] place-items-center px-5">
            <div className="grid w-full max-w-[460px] gap-4 border border-[var(--rule)] bg-[var(--surface,var(--paper-alt))] p-6 text-left">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--lime-ink)]" style={{ fontFamily: MONO_FONT }}>
                    Observatory
                  </div>
                  <div className="mt-2 text-[24px] font-black uppercase leading-none text-[var(--ink)]">
                    Carregando dados
                  </div>
                </div>
                <div className="h-2 w-2 animate-pulse bg-[var(--lime-ink)] shadow-[0_0_12px_rgba(209,255,0,0.75)]" />
              </div>
              <div className="h-1.5 overflow-hidden bg-[var(--ink-faint)]">
                <div className="h-full w-1/2 animate-pulse bg-[var(--lime-ink)] shadow-[0_0_10px_rgba(209,255,0,0.35)]" />
              </div>
              <div className="grid gap-2 border-t border-[var(--rule-soft)] pt-4">
                <div className="h-3 w-5/6 bg-[var(--ink-faint)]" />
                <div className="h-3 w-2/3 bg-[var(--ink-faint)]" />
              </div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]" style={{ fontFamily: MONO_FONT }}>
                Preparando índice, docs e evidências
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
