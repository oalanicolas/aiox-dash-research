import type { Components } from "react-markdown"
import { cn } from "@/lib/utils"

function withoutMarkdownNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node: _node, ...rest } = props
  return rest
}

/* Paper-aesthetic markdown renderer. Foundations — not classified
 * as an atom because it bypasses the 5-question protocol (token-like). */
export const markdownComponents: Components = {
  h1: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <h1
      {...rest}
      className="mb-4 mt-0 font-[var(--font-bb-display)] text-[32px] font-extrabold leading-[1.1] tracking-[-0.015em] text-[var(--ink)]"
    >
      {children}
    </h1>
    )
  },
  h2: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <h2
      {...rest}
      className="mb-3 mt-10 font-[var(--font-bb-display)] text-[24px] font-extrabold leading-[1.15] tracking-[-0.015em] text-[var(--ink)]"
    >
      {children}
    </h2>
    )
  },
  h3: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <h3
      {...rest}
      className="mb-2 mt-7 font-[var(--font-bb-sans)] text-[16px] font-semibold leading-[1.3] tracking-[-0.005em] text-[var(--ink)]"
    >
      {children}
    </h3>
    )
  },
  p: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <p {...rest} className="mb-4 text-[16px] leading-[1.72] text-[var(--ink)]">
      {children}
    </p>
    )
  },
  ul: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <ul {...rest} className="mb-4 list-disc pl-6 text-[16px] leading-[1.72] text-[var(--ink)] marker:text-[var(--ink-3)]">
      {children}
    </ul>
    )
  },
  ol: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <ol
      {...rest}
      className="mb-4 list-decimal pl-6 text-[16px] leading-[1.72] text-[var(--ink)] marker:font-[var(--font-bb-mono)] marker:text-[var(--ink-3)]"
    >
      {children}
    </ol>
    )
  },
  li: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <li {...rest} className="mt-1">
      {children}
    </li>
    )
  },
  strong: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <strong {...rest} className="font-semibold text-[var(--ink)]">
      {children}
    </strong>
    )
  },
  em: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <em {...rest} className="italic text-[var(--ink-2)]">
      {children}
    </em>
    )
  },
  hr: (props) => {
    const rest = withoutMarkdownNode(props)
    return <hr {...rest} className="my-8 border-0 border-t border-[var(--rule)]" />
  },
  blockquote: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <blockquote
      {...rest}
      className="my-5 border-l-2 border-[var(--ink)] px-4 py-1 font-[var(--serif)] text-[17px] italic leading-[1.5] text-[var(--ink-2)]"
    >
      {children}
    </blockquote>
    )
  },
  code: (props) => {
    const { children, className, ...rest } = withoutMarkdownNode(props)
    const isBlock = className?.includes("language-")
    if (isBlock) {
      return (
        <code {...rest} className={cn("font-[var(--font-bb-mono)] text-[12.5px] leading-[1.65] text-[var(--paper)]", className)}>
          {children}
        </code>
      )
    }
    return (
      <code
        {...rest}
        className="rounded-[2px] bg-[var(--paper-deep)] px-[0.4em] py-[0.08em] font-[var(--font-bb-mono)] text-[0.86em] text-[var(--ink)]"
      >
        {children}
      </code>
    )
  },
  pre: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <pre
      {...rest}
      className="mb-5 overflow-x-auto rounded-[2px] bg-[var(--ink)] px-[22px] py-[18px] font-[var(--font-bb-mono)] text-[12.5px] leading-[1.65] text-[var(--paper)]"
    >
      {children}
    </pre>
    )
  },
  table: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <div className="mb-5 overflow-x-auto">
      <table {...rest} className="w-full border-collapse text-[13.5px]">
        {children}
      </table>
    </div>
    )
  },
  th: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <th
      {...rest}
      className="border-b-[1.5px] border-[var(--ink)] px-[14px] py-[10px] text-left font-[var(--font-bb-mono)] text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--ink-3)]"
    >
      {children}
    </th>
    )
  },
  td: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <td {...rest} className="border-b border-[var(--rule)] px-[14px] py-[10px] text-[var(--ink)]">
      {children}
    </td>
    )
  },
  a: (props) => {
    const { children, ...rest } = withoutMarkdownNode(props)
    return (
    <a
      {...rest}
      className="border-b border-[var(--ink-faint)] text-[var(--ink)] no-underline transition-colors hover:border-[var(--ink)]"
    >
      {children}
    </a>
    )
  },
}
