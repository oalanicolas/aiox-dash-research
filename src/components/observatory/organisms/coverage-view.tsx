import { cn } from "@/lib/utils"
import type {
  ObservatoryPlayerProfile,
  ObservatoryTypeSpecific,
} from "../foundations/types"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT, SERIF_FONT } from "../foundations/theme"

/* Organism — Coverage view (Reader mode = "coverage").
 * Codebase-only insights: coverage stack ranking, three-axis card grid, knowledge iceberg. */
export function CoverageView({
  typeSpecific,
  playerProfiles,
}: {
  typeSpecific: ObservatoryTypeSpecific
  playerProfiles: ObservatoryPlayerProfile[]
}) {
  const codebase = typeSpecific.codebase
  const empty =
    !codebase ||
    (codebase.coverageStack.length === 0 &&
      !codebase.threeAxis &&
      codebase.knowledgeIceberg.length === 0)

  if (empty) {
    return (
      <div className="flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">
        <p
          className="text-[14px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          Nenhum bloco codebase estruturado para este item.
        </p>
      </div>
    )
  }

  const playerName = (id: string) =>
    playerProfiles.find((p) => p.key === id)?.name ?? id
  const maxIceberg = Math.max(1, ...(codebase?.knowledgeIceberg.map((i: { total: number }) => i.total) ?? [1]))

  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
      <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-6">
        {codebase && codebase.coverageStack.length > 0 && (
          <section className="border border-[var(--rule)] bg-[var(--paper)] p-5">
            <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
                  style={{ fontFamily: MONO_FONT }}
                >
                  Coverage stack
                </div>
                <p
                  className="mt-3 text-[15px] italic leading-[1.6] text-[var(--ink-2)]"
                  style={{ fontFamily: SERIF_FONT }}
                >
                  Combinações solo, pares ou trios mostram quanto da superfície fica coberta.
                  A linha ideal recebe o acento lime.
                </p>
              </div>
              <div className="space-y-3">
                {codebase.coverageStack.map((entry) => (
                  <div
                    key={entry.combo}
                    className={cn(
                      "border border-[var(--rule)] bg-[var(--paper-alt)] p-4",
                      entry.ideal && "bg-[var(--paper-deep)]",
                    )}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_70px] items-center gap-4">
                      <div className="min-w-0">
                        <div
                          className="truncate text-[16px] font-black text-[var(--ink)]"
                          style={{ fontFamily: DISPLAY_FONT }}
                        >
                          {entry.combo}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.players.map((player) => (
                            <span
                              key={`${entry.combo}-${player}`}
                              className="border border-[var(--rule)] px-2 py-0.5 text-[9px] uppercase text-[var(--ink-3)]"
                              style={{ fontFamily: MONO_FONT }}
                            >
                              {playerName(player)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className="text-right text-[24px] font-black tracking-[-0.05em] text-[var(--ink)]"
                        style={{ fontFamily: DISPLAY_FONT }}
                      >
                        {entry.coverage}%
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-[var(--paper-deep)]">
                      <div
                        className={cn("h-full", entry.ideal ? "bg-[var(--lime-ink)]" : "bg-[var(--ink-dim)]")}
                        style={{
                          width: `${Math.max(0, Math.min(100, entry.coverage))}%`,
                        }}
                      />
                    </div>
                    {entry.synergy !== null && (
                      <div
                        className="mt-2 text-right text-[10px] uppercase text-[var(--ink-3)]"
                        style={{ fontFamily: MONO_FONT }}
                      >
                        synergy {entry.synergy}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {codebase?.threeAxis && (
          <section className="border border-[var(--rule)] bg-[var(--paper)] p-5">
            <div
              className="mb-5 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              Three-axis · {codebase.threeAxis.axes.join(" × ")}
            </div>
            <div className="grid gap-px bg-[var(--rule)] md:grid-cols-2 xl:grid-cols-3">
              {codebase.threeAxis.points.map((point) => (
                <div key={point.id} className="bg-[var(--paper-alt)] p-5">
                  <h3
                    className="text-[18px] font-black tracking-[-0.04em] text-[var(--ink)]"
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {point.label || playerName(point.id)}
                  </h3>
                  {[
                    [codebase.threeAxis!.axes[0], point.y, "#10B981"],
                    [codebase.threeAxis!.axes[1], point.x, "#3B82F6"],
                    [codebase.threeAxis!.axes[2], point.z, "#8B5CF6"],
                  ].map(([axis, value, color]) => (
                    <div key={`${point.id}-${axis}`} className="mt-4">
                      <div
                        className="mb-1 flex justify-between gap-3 text-[9px] uppercase tracking-[0.1em] text-[var(--ink-3)]"
                        style={{ fontFamily: MONO_FONT }}
                      >
                        <span className="truncate">
                          {String(axis).replace(/\s*\([^)]+\)/, "")}
                        </span>
                        <span>{Number(value)}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--paper-deep)]">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, Number(value)))}%`,
                            background: String(color),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {codebase && codebase.knowledgeIceberg.length > 0 && (
          <section className="border border-[var(--rule)] bg-[var(--paper)] p-5">
            <div
              className="mb-5 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              Knowledge iceberg
            </div>
            <div className="space-y-3">
              {codebase.knowledgeIceberg.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[130px_minmax(0,1fr)_74px] sm:items-center sm:gap-4"
                >
                  <div
                    className="truncate text-[13px] font-bold text-[var(--ink)]"
                    style={{ fontFamily: SANS_FONT }}
                  >
                    {playerName(item.id)}
                  </div>
                  <div className="grid h-7 grid-cols-3 overflow-hidden bg-[var(--paper-deep)]">
                    <div
                      className="bg-[var(--ink)]"
                      style={{ width: `${(item.code / maxIceberg) * 100}%` }}
                      title="code"
                    />
                    <div
                      className="bg-[var(--lime-ink)]"
                      style={{ width: `${(item.yaml / maxIceberg) * 100}%` }}
                      title="yaml"
                    />
                    <div
                      className="bg-[var(--warning-ink)]"
                      style={{ width: `${(item.md / maxIceberg) * 100}%` }}
                      title="md"
                    />
                  </div>
                  <div
                    className="text-left text-[11px] uppercase text-[var(--ink-3)] sm:text-right"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {item.ratio.toFixed(2)}x
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </LightScrollArea>
  )
}
