"use client"

import { useCallback, useMemo, useState, type RefObject } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Copy, FileText, FolderOpen } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import type { ObservatoryDocument } from "../foundations/types"
import { LightScrollArea } from "../molecules/light-scroll-area"
import { MONO_FONT, SANS_FONT, observatoryDarkThemeVars } from "../foundations/theme"
import { formatBytes } from "../foundations/utils"

/* Organism — Docs view (Reader mode = "document", bench/research).
 *
 * Visual reference: AIOX Dash v2.html · DOC VIEW section
 *   - doc-shell: grid 1fr 300px (reader + file panel)
 *   - doc-toolbar: doc-path lime + doc-actions (copy, light/dark)
 *   - doc-body: h1 display 36px / h2 display 26px / h3 mono lime small caps
 *   - bullets com ::before lime line 8x1px
 *   - doc-files panel: items numerados (ord) com active state lime + arrow
 *
 * Decision-in-one-click integration:
 *   - file selection é URL-persistida via ?file=<path>
 *   - light/dark mode preserved across navigation
 *   - copy markdown button com confirmação visual
 */
export function DocsView({
  documents,
  selectedFile,
  content,
  sourceRoot,
  runSlug,
  bodyRef,
}: {
  documents: ObservatoryDocument[]
  selectedFile: string
  content: string
  sourceRoot: string
  runSlug: string
  bodyRef?: RefObject<HTMLDivElement | null>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const themeParam = searchParams?.get("doc-theme") === "light" ? "light" : "dark"
  const [copied, setCopied] = useState(false)

  const selectFile = useCallback(
    (file: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      params.set("file", file)
      router.push(`?${params.toString()}`, { scroll: true })
    },
    [router, searchParams],
  )

  const toggleTheme = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (themeParam === "light") params.delete("doc-theme")
    else params.set("doc-theme", "light")
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams, themeParam])

  const copyContent = useCallback(() => {
    if (typeof navigator === "undefined") return
    void navigator.clipboard?.writeText(content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }, [content])

  const ordered = useMemo(() => orderDocumentsByPriority(documents), [documents])

  const docFiles = ordered.filter((d) => /\.(md|mdx)$/i.test(d.file))
  const dataFiles = ordered.filter((d) => /\.(json|yaml|yml|jsonl)$/i.test(d.file))
  const diagramFiles = ordered.filter((d) => /\.mmd$/i.test(d.file))

  const groups: Array<{ key: string; label: string; items: ObservatoryDocument[] }> = []
  if (docFiles.length) groups.push({ key: "md", label: "Markdown", items: docFiles })
  if (dataFiles.length) groups.push({ key: "data", label: "Data & schemas", items: dataFiles })
  if (diagramFiles.length) groups.push({ key: "diagram", label: "Diagramas", items: diagramFiles })

  const path = `${sourceRoot}/${runSlug}/${selectedFile}`
  const selectedDoc = documents.find((d) => d.file === selectedFile)

  return (
    <div
      className="aiox-docs-shell grid min-h-0 flex-1 gap-3 px-3 pb-6 pt-3 sm:gap-4 sm:px-5 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6 lg:pt-4"
      style={observatoryDarkThemeVars}
    >
      {/* Reader column */}
      <section
        className={cn(
          "flex min-w-0 flex-col border border-[var(--rule)]",
          themeParam === "light" ? "bg-[#f5f4e7]" : "bg-[var(--paper)]",
        )}
      >
        {/* Toolbar */}
        <header
          className={cn(
            "flex shrink-0 items-center justify-between gap-3 border-b border-[var(--rule-soft)] px-5 py-2.5",
            themeParam === "light" ? "bg-[#ecebde]" : "bg-[var(--paper-deep)]",
          )}
        >
          <div
            className={cn(
              "min-w-0 truncate text-[11px] tracking-[0.06em]",
              themeParam === "light" ? "text-[#1a1502]" : "text-[var(--lime-ink)]",
            )}
            style={{ fontFamily: MONO_FONT }}
            title={path}
          >
            {path}
          </div>
          <div className="inline-flex shrink-0 gap-1.5">
            <DocAction
              onClick={toggleTheme}
              active={themeParam === "light"}
              label={themeParam === "light" ? "Light" : "Dark"}
              title="Alterna tema do leitor de docs (persiste em URL)"
            />
            <DocAction
              onClick={copyContent}
              icon={copied ? <Check size={11} /> : <Copy size={11} />}
              label={copied ? "Copiado" : "Copiar MD"}
              title="Copia conteúdo markdown para clipboard"
            />
          </div>
        </header>

        {/* Body */}
        <LightScrollArea
          ref={bodyRef}
          className="min-h-0 flex-1"
          viewportClassName={cn(
            "px-6 pb-12 pt-8 sm:px-10 sm:pt-12 lg:px-14",
            themeParam === "light" ? "bg-[#f5f4e7] text-[#231d05]" : "bg-[var(--paper)] text-[var(--ink-2)]",
          )}
        >
          <article
            className={cn(
              "aiox-doc-body mx-auto w-full min-w-0 max-w-[760px]",
              themeParam === "light" && "is-light",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={docMdComponents(themeParam)}>
              {content}
            </ReactMarkdown>
            {selectedDoc?.truncated && (
              <p
                className="mt-10 border-t border-[var(--rule-soft)] pt-4 text-[12px] italic text-[var(--ink-3)]"
                style={{ fontFamily: SANS_FONT }}
              >
                Conteúdo truncado em {formatBytes(40000)} para renderização. Veja o arquivo
                bruto em <code>{path}</code>.
              </p>
            )}
          </article>
        </LightScrollArea>
      </section>

      {/* File panel */}
      <aside className="hidden flex-col border border-[var(--rule)] bg-[var(--paper)] lg:flex">
        <header className="flex shrink-0 items-baseline justify-between border-b border-[var(--rule-soft)] px-5 py-3">
          <span
            className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-dim)]"
            style={{ fontFamily: MONO_FONT }}
          >
            <FolderOpen size={11} className="mr-1.5 inline" />
            Arquivos
          </span>
          <span
            className="text-[10px] font-bold tracking-[0.1em] text-[var(--lime-ink)]"
            style={{ fontFamily: MONO_FONT }}
          >
            {documents.length}
          </span>
        </header>
        <LightScrollArea className="min-h-0 flex-1" viewportClassName="">
          {groups.map((group) => (
            <div key={group.key}>
              <div
                className="sticky top-0 z-10 border-b border-[var(--rule-soft)] bg-[var(--paper-deep)] px-5 py-2 text-[9.5px] uppercase tracking-[0.2em] text-[var(--ink-dim)]"
                style={{ fontFamily: MONO_FONT }}
              >
                {group.label} · {group.items.length}
              </div>
              {group.items.map((doc, idx) => {
                const active = doc.file === selectedFile
                return (
                  <button
                    key={doc.file}
                    type="button"
                    onClick={() => selectFile(doc.file)}
                    className={cn(
                      "grid w-full grid-cols-[34px_minmax(0,1fr)_14px] items-center gap-3 border-b border-[var(--rule-soft)] px-5 py-3 text-left transition-colors",
                      active
                        ? "bg-[var(--paper-deep)]"
                        : "bg-transparent hover:bg-[var(--paper-alt)]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-bold tabular-nums",
                        active ? "text-[var(--lime-ink)]" : "text-[var(--ink-dim)]",
                      )}
                      style={{ fontFamily: MONO_FONT }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span
                        className={cn(
                          "truncate text-[13px] font-semibold",
                          active ? "text-[var(--ink)]" : "text-[var(--ink-2)]",
                        )}
                        style={{ fontFamily: SANS_FONT }}
                      >
                        {prettifyDocTitle(doc.file)}
                      </span>
                      <span
                        className={cn(
                          "truncate text-[10.5px]",
                          active ? "text-[var(--ink-2)]" : "text-[var(--ink-dim)]",
                        )}
                        style={{ fontFamily: MONO_FONT }}
                      >
                        {doc.phase} · {formatBytes(doc.bytes)}
                      </span>
                    </span>
                    <FileText
                      size={12}
                      className={cn(
                        "transition-transform",
                        active ? "text-[var(--lime-ink)]" : "text-[var(--ink-dim)]",
                      )}
                    />
                  </button>
                )
              })}
            </div>
          ))}
        </LightScrollArea>
      </aside>

      <style jsx global>{`
        .aiox-doc-body h1 {
          font-family: var(--font-bb-display), system-ui, sans-serif;
          font-weight: 800;
          font-size: 36px;
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: var(--ink);
          margin: 0 0 18px;
          text-transform: none;
        }
        .aiox-doc-body h2 {
          font-family: var(--font-bb-display), system-ui, sans-serif;
          font-weight: 800;
          font-size: 26px;
          line-height: 1.1;
          letter-spacing: -0.025em;
          color: var(--ink);
          margin: 32px 0 14px;
          text-transform: none;
        }
        .aiox-doc-body h3 {
          font-family: var(--font-bb-mono), ui-monospace, monospace;
          font-weight: 700;
          font-size: 12px;
          color: var(--lime-ink);
          margin: 28px 0 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .aiox-doc-body p {
          font-family: var(--font-bb-sans), system-ui, sans-serif;
          font-size: 15px;
          color: var(--ink-2);
          line-height: 1.7;
          margin: 0 0 16px;
        }
        .aiox-doc-body p strong,
        .aiox-doc-body li strong {
          color: var(--ink);
          font-weight: 600;
        }
        .aiox-doc-body ul {
          margin: 12px 0 18px;
          padding-left: 0;
          list-style: none;
        }
        .aiox-doc-body ul li {
          position: relative;
          padding-left: 22px;
          font-family: var(--font-bb-sans), system-ui, sans-serif;
          font-size: 14.5px;
          color: var(--ink-2);
          line-height: 1.7;
          margin: 6px 0;
        }
        .aiox-doc-body ul li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 12px;
          width: 8px;
          height: 1px;
          background: var(--lime-ink);
        }
        .aiox-doc-body ol {
          margin: 12px 0 18px;
          padding-left: 22px;
        }
        .aiox-doc-body ol li {
          font-family: var(--font-bb-sans), system-ui, sans-serif;
          font-size: 14.5px;
          color: var(--ink-2);
          line-height: 1.7;
          margin: 6px 0;
        }
        .aiox-doc-body code {
          font-family: var(--font-bb-mono), ui-monospace, monospace;
          font-size: 12.5px;
          color: var(--lime-ink);
          background: var(--paper-deep);
          border: 1px solid var(--rule-soft);
          padding: 1px 6px;
        }
        .aiox-doc-body pre {
          margin: 16px 0;
          padding: 16px 18px;
          background: var(--paper-deep);
          border: 1px solid var(--rule-soft);
          overflow-x: auto;
          font-family: var(--font-bb-mono), ui-monospace, monospace;
          font-size: 12.5px;
          line-height: 1.55;
        }
        .aiox-doc-body pre code {
          background: transparent;
          border: 0;
          padding: 0;
          color: var(--ink-2);
        }
        .aiox-doc-body blockquote {
          border-left: 2px solid var(--lime-ink);
          padding-left: 16px;
          margin: 16px 0;
          color: var(--ink-2);
          font-style: italic;
        }
        .aiox-doc-body table {
          border-collapse: collapse;
          margin: 16px 0;
          font-family: var(--font-bb-sans), system-ui, sans-serif;
          font-size: 13px;
          width: 100%;
        }
        .aiox-doc-body th,
        .aiox-doc-body td {
          border: 1px solid var(--rule-soft);
          padding: 8px 12px;
          text-align: left;
        }
        .aiox-doc-body th {
          background: var(--paper-deep);
          font-weight: 600;
          color: var(--ink);
          font-family: var(--font-bb-mono), ui-monospace, monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .aiox-doc-body a {
          color: var(--lime-ink);
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: var(--lime-ink);
          text-decoration-thickness: 1px;
        }
        .aiox-doc-body a:hover {
          background: var(--lime-ink);
          color: #1a1502;
        }
        .aiox-doc-body hr {
          border: 0;
          border-top: 1px solid var(--rule-soft);
          margin: 28px 0 32px;
        }
        .aiox-doc-body.is-light h1,
        .aiox-doc-body.is-light h2 {
          color: #1a1502;
        }
        .aiox-doc-body.is-light h3 {
          color: #5c5c5c;
        }
        .aiox-doc-body.is-light p,
        .aiox-doc-body.is-light ul li,
        .aiox-doc-body.is-light ol li {
          color: #3a3a3a;
        }
        .aiox-doc-body.is-light p strong,
        .aiox-doc-body.is-light li strong {
          color: #1a1502;
        }
        .aiox-doc-body.is-light code {
          background: rgba(0, 0, 0, 0.05);
          color: #1a1502;
          border-color: rgba(0, 0, 0, 0.1);
        }
        .aiox-doc-body.is-light pre {
          background: rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.1);
        }
        .aiox-doc-body.is-light pre code {
          color: #1a1502;
        }
        .aiox-doc-body.is-light ul li::before {
          background: #1a1502;
        }
        .aiox-doc-body.is-light a {
          color: #1a1502;
          text-decoration-color: #1a1502;
        }
      `}</style>
    </div>
  )
}

function DocAction({
  onClick,
  label,
  active = false,
  icon,
  title,
}: {
  onClick: () => void
  label: string
  active?: boolean
  icon?: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
        active
          ? "border-[var(--lime-ink)] bg-[var(--lime-ink)] text-black"
          : "border-[var(--rule-soft)] bg-transparent text-[var(--ink-3)] hover:border-[var(--ink-2)] hover:text-[var(--ink)]",
      )}
      style={{ fontFamily: MONO_FONT }}
    >
      {icon}
      {label}
    </button>
  )
}

function prettifyDocTitle(filename: string): string {
  const stem = filename.replace(/.*\//, "").replace(/\.[^.]+$/, "")
  const lower = stem.toLowerCase()
  if (lower === "readme") return "README"
  if (lower === "index") return "Index"
  if (lower === "license") return "License"
  return stem
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAdr\b/i, "ADR")
    .replace(/\bYaml\b/i, "YAML")
    .replace(/\bJson\b/i, "JSON")
    .replace(/\bUx\b/i, "UX")
    .replace(/\bUi\b/i, "UI")
}

function orderDocumentsByPriority(docs: ObservatoryDocument[]): ObservatoryDocument[] {
  const priority = (file: string) => {
    if (/^(README|INDEX)\.md$/i.test(file)) return 0
    if (/executive-report/i.test(file)) return 1
    if (/scorecard|comparison|matrix/i.test(file)) return 2
    if (/decision|action-plan|roadmap/i.test(file)) return 3
    if (/sources|claims|risk|evidence/i.test(file)) return 4
    if (/playbook|battle/i.test(file)) return 5
    if (file.startsWith("deep/")) return 6
    if (/\.mmd$/i.test(file)) return 7
    if (/\.(json|yaml|yml)$/i.test(file)) return 8
    return 9
  }
  return [...docs].sort((a, b) => priority(a.file) - priority(b.file) || a.file.localeCompare(b.file))
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function docMdComponents(_theme: "light" | "dark"): Record<string, any> {
  return {
    h1: (props: any) => <h1 {...props} />,
    h2: (props: any) => <h2 {...props} />,
    h3: (props: any) => <h3 {...props} />,
    p: (props: any) => <p {...props} />,
    ul: (props: any) => <ul {...props} />,
    ol: (props: any) => <ol {...props} />,
    li: (props: any) => <li {...props} />,
    code: (props: any) => <code {...props} />,
    pre: (props: any) => <pre {...props} />,
    blockquote: (props: any) => <blockquote {...props} />,
    table: (props: any) => <table {...props} />,
    a: (props: any) => <a target={String(props.href || "").startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" {...props} />,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
