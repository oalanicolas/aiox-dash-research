import type { ObservatoryTco } from "../foundations/types"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { TcoRow } from "../molecules/tco-row"
import { DISPLAY_FONT, MONO_FONT, SERIF_FONT } from "../foundations/theme"

/* Organism — TCO view (Reader mode = "tco").
 * One column per scenario (smb/mid/scale/…), rows ordered by lowest cost. */
export function TcoView({ tco }: { tco: ObservatoryTco }) {
  if (tco.scenarios.length === 0) {
    return (
      <div className="flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">
        <p
          className="text-[14px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          Nenhum cenário TCO estruturado encontrado.
        </p>
      </div>
    )
  }

  const cols = Math.min(tco.scenarios.length, 3)

  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
            style={{ fontFamily: MONO_FONT }}
          >
            TCO Comparison · {tco.currency} · {tco.unit || "annualized"}
          </span>
        </div>

        <div
          className="mt-4 grid gap-6"
          style={{
            /* CSS auto-fit keeps scenarios readable: stacks on mobile,
               flows to `cols` on wide screens. minmax(260px,1fr) guarantees
               each scenario has enough room for its rows before flowing. */
            gridTemplateColumns: `repeat(auto-fit, minmax(min(260px, 100%), 1fr))`,
            // hint the natural max-cols
            ['--tco-cols' as string]: String(cols),
          }}
        >
          {tco.scenarios.map((scenario) => {
            const sortedRows = [...scenario.rows].sort((a, b) => {
              const aMin = a.low ?? a.high ?? 0
              const bMin = b.low ?? b.high ?? 0
              return aMin - bMin
            })
            return (
              <section key={scenario.id} className="border-t border-[var(--ink)] pt-3">
                <h4
                  className="text-[17px] font-black uppercase tracking-[-0.03em] text-[var(--ink)] sm:text-[20px]"
                  style={{ fontFamily: DISPLAY_FONT }}
                >
                  {scenario.id.toUpperCase()}
                </h4>
                {scenario.label && (
                  <span
                    className="mt-1 block text-[12px] italic text-[var(--ink-3)]"
                    style={{ fontFamily: SERIF_FONT }}
                  >
                    {scenario.label}
                  </span>
                )}
                <div className="mt-3">
                  {sortedRows.map((row, idx) => (
                    <TcoRow
                      key={`${scenario.id}-${row.player}-${idx}`}
                      player={row.player}
                      setup={row.setup}
                      low={row.low}
                      high={row.high}
                      baseline={row.baseline}
                      currency={tco.currency}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </LightScrollArea>
  )
}
