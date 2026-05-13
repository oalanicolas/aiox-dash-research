"use client"

import { forwardRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/* Molecule — scroll container with editorial polish.
 * 1 ação: encapsular scroll vertical com fade gradient top/bottom + indicador lateral lime.
 * Brought from light tone. Forwards ref to the scrolling viewport. */
type Props = {
  children: ReactNode
  className?: string
  viewportClassName?: string
  fadeColor?: string
}

export const LightScrollArea = forwardRef<HTMLDivElement, Props>(function LightScrollArea(
  { children, className, viewportClassName, fadeColor = "var(--paper)" },
  ref,
) {
  return (
    <div className={cn("relative min-h-0 overflow-hidden", className)}>
      <div
        ref={ref}
        className={cn(
          "h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          viewportClassName,
        )}
      >
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-5"
        style={{ background: `linear-gradient(to bottom, ${fadeColor}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
        style={{ background: `linear-gradient(to top, ${fadeColor}, transparent)` }}
      />
      <div className="pointer-events-none absolute right-1.5 top-1/2 h-16 w-px -translate-y-1/2 bg-[var(--ink-faint)]">
        <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-[var(--lime-ink)]" />
      </div>
    </div>
  )
})
