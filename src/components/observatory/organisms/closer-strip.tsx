"use client"

import {
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ObservatoryDocument, ObservatoryRunSummary } from "../foundations/types"
import { FileChip } from "../molecules/file-chip"
import { MONO_FONT, SERIF_FONT } from "../foundations/theme"

type CorePhase = { label: string; key: string; on: boolean }

const LS_HEIGHT = "aiox.clean.closer.h"
const LS_COLLAPSED = "aiox.clean.closer.collapsed"

const DEFAULT_HEIGHT = 110

/* Organism — bottom closer strip.
 *
 * Horizontal navigation of artifacts (chips) + flow line + stop reason.
 * NOT redundant with InspectorPane:
 *   - InspectorPane (right aside, 320px) = vertical lists, 4 tabs, deep
 *   - CloserStrip (bottom, ~110px) = horizontal file timeline + run flow
 *
 * Supports drag-to-resize (40px → 60vh) and collapse via chevron. */
export function CloserStrip({
  artifactDocs,
  selectedFile,
  onSelectFile,
  selectedRun,
  corePhases,
  stopNote,
}: {
  artifactDocs: ObservatoryDocument[]
  selectedFile: string
  onSelectFile: (file: string) => void
  selectedRun: ObservatoryRunSummary
  corePhases: CorePhase[]
  stopNote: string
}) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try {
      return window.localStorage.getItem(LS_COLLAPSED) === "1"
    } catch {
      return false
    }
  })
  const [height, setHeight] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_HEIGHT
    try {
      const h = parseInt(window.localStorage.getItem(LS_HEIGHT) ?? "", 10)
      if (Number.isNaN(h)) return DEFAULT_HEIGHT
      const max = Math.round(window.innerHeight * 0.6)
      return Math.max(80, Math.min(max, h))
    } catch {
      return DEFAULT_HEIGHT
    }
  })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ y: number; h: number } | null>(null)

  function onDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (collapsed) return
    dragRef.current = { y: e.clientY, h: height }
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d) return
    const dy = d.y - e.clientY
    const max = Math.round(window.innerHeight * 0.6)
    const next = Math.max(80, Math.min(max, d.h + dy))
    setHeight(next)
  }
  function onUp() {
    if (dragRef.current) {
      try {
        localStorage.setItem(LS_HEIGHT, String(height))
      } catch {
        /* noop */
      }
    }
    dragRef.current = null
    setDragging(false)
  }
  function toggle() {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(LS_COLLAPSED, next ? "1" : "0")
      } catch {
        /* noop */
      }
      return next
    })
  }

  return (
    <div
      className="relative flex shrink-0 flex-col border-t border-[var(--rule)] bg-[var(--paper-alt)]"
      style={{
        height: collapsed ? 32 : height,
        minHeight: 32,
        maxHeight: "60vh",
        transition: dragging ? "none" : "height 0.28s cubic-bezier(.4,.0,.2,1)",
      }}
    >
      {/* drag handle (top edge) */}
      {!collapsed && (
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="absolute left-0 right-0 top-[-4px] z-[5] h-2 cursor-ns-resize before:absolute before:left-1/2 before:top-[3px] before:h-0.5 before:w-9 before:-translate-x-1/2 before:bg-[var(--ink-faint)] before:transition-all hover:before:w-14 hover:before:bg-[var(--ink)]"
          title="Arraste para redimensionar"
        />
      )}

      {/* compact bar — visible whether collapsed or not */}
      <div
        className={cn(
          "flex h-[32px] shrink-0 select-none items-center gap-3 px-4",
          !collapsed && "border-b border-[var(--rule-soft)]",
        )}
      >
        <span
          className="flex items-baseline gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]"
          style={{ fontFamily: MONO_FONT }}
        >
          <span>Artifacts</span>
          <span
            className="text-[12px] italic normal-case tracking-[0] text-[var(--ink-dim)]"
            style={{ fontFamily: SERIF_FONT }}
          >
            {artifactDocs.length} files
          </span>
        </span>

        {/* mini flow dots */}
        <span
          className="ml-3 flex items-center gap-1 text-[9.5px] uppercase tracking-[0.1em] text-[var(--ink-dim)]"
          style={{ fontFamily: MONO_FONT }}
        >
          {corePhases.map((p) => (
            <span
              key={p.key}
              title={p.label}
              className={cn(
                "inline-block h-[7px] w-[7px] rounded-full border border-[var(--ink-faint)] bg-[var(--paper)]",
                p.on && "border-[var(--lime-ink)] bg-[var(--lime-ink)]",
              )}
            />
          ))}
        </span>

        <span className="flex-1" />

        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-6 w-6 items-center justify-center border border-[var(--ink-faint)] text-[var(--ink-3)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
          title={collapsed ? "Expandir (J)" : "Recolher (J)"}
        >
          <ChevronDown
            size={12}
            strokeWidth={2}
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* expanded content */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* horizontal file chips */}
          <div className="flex overflow-x-auto border-b border-[var(--rule-soft)] [scrollbar-width:thin]">
            {artifactDocs.map((doc, i) => (
              <FileChip
                key={doc.file}
                index={i}
                file={doc.file}
                phase={doc.phase}
                bytes={doc.bytes}
                isActive={doc.file === selectedFile}
                onSelect={() => onSelectFile(doc.file)}
              />
            ))}
          </div>

          {/* stop reason row */}
          <div
            className="flex items-baseline gap-3 px-4 py-2 text-[12px] italic leading-[1.4] text-[var(--ink-2)]"
            style={{ fontFamily: SERIF_FONT }}
          >
            <span
              className="shrink-0 text-[10px] uppercase not-italic tracking-[0.16em] text-[var(--ink-dim)]"
              style={{ fontFamily: MONO_FONT }}
            >
              Stop reason
            </span>
            <span className="truncate">— {stopNote}</span>
            <span className="ml-auto shrink-0 text-[10px] not-italic tracking-[0.04em] text-[var(--ink-dim)]" style={{ fontFamily: MONO_FONT }}>
              schema · {selectedRun.schema}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
