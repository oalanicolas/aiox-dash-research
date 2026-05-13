import type { ObservatoryPersona, ObservatoryPlayerProfile } from "../foundations/types"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { PersonaCard } from "../molecules/persona-card"
import { MONO_FONT, SERIF_FONT } from "../foundations/theme"

/* Organism — Personas view (Reader mode = "personas").
 * Renders a responsive grid of PersonaCards (one per scenario). */
export function PersonasView({
  personas,
  playerProfiles,
}: {
  personas: ObservatoryPersona[]
  playerProfiles: ObservatoryPlayerProfile[]
}) {
  const colorByKey = new Map<string, string>()
  for (const p of playerProfiles) {
    if (p.color) colorByKey.set(p.key, p.color)
  }
  const fallbackPalette = ["#7C9F3F", "#4F7CAC", "#C97A4A", "#8B6FB0", "#10B981", "#3B82F6", "#8B5CF6"]
  const playerColor = (player: string, idx: number) =>
    colorByKey.get(player) ?? fallbackPalette[idx % fallbackPalette.length]

  if (personas.length === 0) {
    return (
      <div className="flex-1 px-4 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-7">
        <p
          className="text-[14px] italic text-[var(--ink-3)]"
          style={{ fontFamily: SERIF_FONT }}
        >
          Nenhuma persona estruturada encontrada neste item.
        </p>
      </div>
    )
  }

  return (
    <LightScrollArea className="flex-1" viewportClassName="px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
      <div className="mx-auto max-w-[1200px]">
        <span
          className="block text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
          style={{ fontFamily: MONO_FONT }}
        >
          {personas.length} personas · scenario-weighted
        </span>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {personas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} playerColor={playerColor} />
          ))}
        </div>
      </div>
    </LightScrollArea>
  )
}
