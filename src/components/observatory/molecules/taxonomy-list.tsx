import { DISPLAY_FONT, MONO_FONT, SERIF_FONT } from "../foundations/theme"

/* Molecule — taxonomia categórica com count + descrição.
 * 1 ação: mostrar runs classificados em categorias (e.g. stop-reason). */
export type TaxonomyItem = {
  cat: string
  it: string
  count: number
  desc: string
}

export function TaxonomyList({ items, total }: { items: TaxonomyItem[]; total: number }) {
  return (
    <div className="flex flex-col">
      {items.map((it, i) => {
        const pct = total === 0 ? 0 : (it.count / total) * 100
        const isLast = i === items.length - 1
        return (
          <div
            key={it.cat}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline py-2.5 ${
              isLast ? "" : "border-b border-[var(--rule-soft)]"
            }`}
          >
            <span
              className="text-[14px] font-bold tracking-[-0.005em] text-[var(--ink)]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {it.cat}
              <span
                className="ml-1.5 text-[13px] font-normal italic text-[var(--ink-dim)]"
                style={{ fontFamily: SERIF_FONT }}
              >
                {it.it}
              </span>
            </span>
            <span
              className="text-[11px] tracking-[0.06em] text-[var(--ink-3)]"
              style={{ fontFamily: MONO_FONT }}
            >
              <strong
                className="mr-1.5 text-[18px] font-extrabold text-[var(--ink)]"
                style={{ fontFamily: DISPLAY_FONT }}
              >
                {it.count}
              </strong>
              {pct.toFixed(0)}%
            </span>
            <div
              className="col-span-2 mt-1 text-[12.5px] italic leading-[1.45] text-[var(--ink-dim)]"
              style={{ fontFamily: SERIF_FONT }}
            >
              {it.desc}
            </div>
          </div>
        )
      })}
    </div>
  )
}
