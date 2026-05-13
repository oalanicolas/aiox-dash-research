import type {
  ObservatoryCategoricalWinner,
  ObservatoryCliff,
  ObservatoryDecisionNode,
  ObservatoryEditorsNote,
  ObservatoryTiebreaker,
} from "../foundations/types"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { DISPLAY_FONT, MONO_FONT, SANS_FONT, SERIF_FONT } from "../foundations/theme"

/* Organism — Decision Support view (Reader mode = "decision").
 * Three vertical sections: Decision Tree · Tiebreakers · Cliffs.
 * Each section omits itself when empty. */
export function DecisionView({
  decisionTree,
  tiebreakers,
  cliffs,
  categorical,
  editorsNote,
}: {
  decisionTree: ObservatoryDecisionNode[]
  tiebreakers: ObservatoryTiebreaker[]
  cliffs: ObservatoryCliff[]
  categorical: ObservatoryCategoricalWinner[]
  editorsNote: ObservatoryEditorsNote | null
}) {
  const empty =
    decisionTree.length === 0 &&
    tiebreakers.length === 0 &&
    cliffs.length === 0 &&
    categorical.length === 0 &&
    !editorsNote

  if (empty) {
    return (
      <div className="flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">
        <p
          className="text-[14px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          Sem dados de decisão estruturados (tree, tiebreakers, cliffs).
        </p>
      </div>
    )
  }

  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
      <div className="mx-auto w-full min-w-0 max-w-[1000px] space-y-10">
        {editorsNote && (
          <section className="border border-[var(--rule)] bg-[var(--paper-alt)] p-5">
            <div
              className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              Editor's note · {editorsNote.date || "sem data"}
            </div>
            <h3
              className="mt-2 text-[20px] font-black leading-none tracking-[-0.05em] text-[var(--ink)] sm:text-[24px] lg:text-[28px]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {editorsNote.title}
            </h3>
            {editorsNote.byline && (
              <div
                className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                style={{ fontFamily: MONO_FONT }}
              >
                {editorsNote.byline}
              </div>
            )}
            <div className="mt-4 space-y-3">
              {editorsNote.paragraphs.map((paragraph, index) => (
                <p
                  key={`${editorsNote.title}-${index}`}
                  className="text-[15px] italic leading-[1.65] text-[var(--ink-2)]"
                  style={{ fontFamily: SERIF_FONT }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        )}

        {categorical.length > 0 && (
          <section>
            <h4
              className="text-[20px] font-black uppercase tracking-[-0.03em] text-[var(--ink)]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              Categorical Winners · {categorical.length}
            </h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {categorical.map((item, index) => (
                <article key={`${item.dimension}-${index}`} className="border border-[var(--rule-soft)] bg-[var(--paper-alt)] p-4">
                  <div
                    className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {item.dimension}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className="text-[22px] font-black tracking-[-0.05em] text-[var(--ink)]"
                      style={{ fontFamily: DISPLAY_FONT }}
                    >
                      {item.winner}
                    </span>
                    {item.loser && (
                      <span
                        className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]"
                        style={{ fontFamily: MONO_FONT }}
                      >
                        vence {item.loser}
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <p
                      className="mt-2 text-[13px] italic leading-[1.55] text-[var(--ink-2)]"
                      style={{ fontFamily: SERIF_FONT }}
                    >
                      {item.note}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {decisionTree.length > 0 && (
          <section>
            <h4
              className="text-[20px] font-black uppercase tracking-[-0.03em] text-[var(--ink)]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              Decision Tree
            </h4>
            <div className="mt-3 border-t border-[var(--ink)]">
              {decisionTree.map((node, idx) => (
                <div
                  key={`tree-${idx}`}
                  className="grid grid-cols-1 gap-2 border-b border-[var(--rule-soft)] py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-3"
                >
                  <span
                    className="text-[14px] font-bold leading-[1.4] text-[var(--ink)]"
                    style={{ fontFamily: SANS_FONT }}
                  >
                    {node.q}
                  </span>
                  <span
                    className="text-[13px] leading-[1.45] text-[var(--ink-2)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    <span className="text-[var(--lime-ink)]">yes →</span> {node.yes || "—"}
                  </span>
                  <span
                    className="text-[13px] leading-[1.45] text-[var(--ink-3)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    <span className="text-[var(--ink-dim)]">no →</span> {node.no || "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tiebreakers.length > 0 && (
          <section>
            <h4
              className="text-[20px] font-black uppercase tracking-[-0.03em] text-[var(--ink)]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              Tiebreakers · {tiebreakers.length}
            </h4>
            <div className="mt-3 border-t border-[var(--ink)]">
              {tiebreakers.map((tb) => (
                <div
                  key={tb.id}
                  className="grid grid-cols-1 items-baseline gap-2 border-b border-[var(--rule-soft)] py-3 md:grid-cols-[40px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-3"
                >
                  <span
                    className="text-[10px] tracking-[0.12em] text-[var(--ink-dim)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    {tb.id}
                  </span>
                  <span
                    className="text-[14px] leading-[1.4] text-[var(--ink)]"
                    style={{ fontFamily: SANS_FONT }}
                  >
                    {tb.q}
                  </span>
                  <span
                    className="text-[12px] leading-[1.45] text-[var(--ink-2)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    <span className="text-[var(--lime-ink)]">yes →</span> {tb.yes || "—"}
                  </span>
                  <span
                    className="text-[12px] leading-[1.45] text-[var(--ink-3)]"
                    style={{ fontFamily: MONO_FONT }}
                  >
                    <span className="text-[var(--ink-dim)]">no →</span> {tb.no || "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {cliffs.length > 0 && (
          <section>
            <h4
              className="text-[20px] font-black uppercase tracking-[-0.03em] text-[var(--ink)]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              Cliffs · {cliffs.length}
            </h4>
            <div className="mt-3 border-t border-[var(--ink)]">
              {cliffs.map((cliff, idx) => (
                <div
                  key={`cliff-${idx}`}
                  className="border-b border-[var(--rule-soft)] py-3"
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="text-[11px] uppercase tracking-[0.12em] text-[var(--warning-ink)]"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      {cliff.player}
                    </span>
                    <span
                      className="text-[14px] font-bold leading-[1.4] text-[var(--ink)]"
                      style={{ fontFamily: SANS_FONT }}
                    >
                      {cliff.trigger}
                    </span>
                  </div>
                  <p
                    className="mt-1 text-[13px] italic leading-[1.55] text-[var(--ink-2)]"
                    style={{ fontFamily: SERIF_FONT }}
                  >
                    {cliff.impact}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </LightScrollArea>
  )
}
