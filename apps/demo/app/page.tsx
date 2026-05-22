"use client"

import { useActionState, useState } from "react"
import type { AnalyzeState } from "./actions"
import { analyze } from "./actions"

const statusIcon = { pass: "·", warning: "!", error: "×" } as const
const statusColor = {
  pass: "text-zinc-400",
  warning: "text-amber-500",
  error: "text-red-500"
} as const

export default function Home() {
  const [state, formAction, pending] = useActionState<AnalyzeState, FormData>(analyze, {})
  const result = state.data

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 font-sans">
      <form action={formAction}>
        <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center gap-4">
          <span className="text-sm font-medium text-zinc-500 shrink-0">google doc url</span>
          <input
            name="url"
            placeholder="https://docs.google.com/document/d/..."
            className="flex-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded border border-zinc-300 bg-white px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
          >
            {pending ? "analyzing…" : "analyze"}
          </button>
        </header>
      </form>

      {state.error && (
        <div className="mx-6 mt-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {state.error}
        </div>
      )}

      {!result && !pending && (
        <div className="flex items-center justify-center h-[calc(100vh-61px)] text-sm text-zinc-300">
          paste a google doc url and press analyze
        </div>
      )}

      {result && (
        <div className="flex h-[calc(100vh-61px)] overflow-hidden">

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-end px-6 py-2 border-b border-zinc-100 bg-white">
              <CopyButton text={result.html}/>
              <span className="ml-1.5 text-[10px] text-zinc-300">html</span>
            </div>
            <article
              className="flex-1 overflow-y-auto px-12 py-10 prose prose-zinc prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: result.html }}
            />
          </div>

          <div className="w-px bg-zinc-200 shrink-0"/>

          <aside className="w-80 shrink-0 overflow-y-auto bg-white px-6 py-6 flex flex-col gap-6">

            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">meta</h2>
              <dl className="flex flex-col gap-2 text-sm">
                {[
                  ["title", result.meta.metaTitle, result.meta.sources["metaTitle"]],
                  ["description", result.meta.metaDescription, result.meta.sources["metaDescription"]],
                  ["keywords", result.meta.keywords.join(", "), result.meta.sources["keywords"]]
                ].map(([label, value, source]) => (
                  <div key={label}>
                    <dt className="text-xs text-zinc-400 flex items-center gap-1.5">
                      {label}
                      <span className={`text-[10px] ${source === "doc" ? "text-zinc-300" : "text-amber-400"}`}>
                        {source === "doc" ? "from doc" : "ai generated"}
                      </span>
                      <CopyButton text={value as string}/>
                    </dt>
                    <dd className="text-zinc-700 leading-snug mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <div className="h-px bg-zinc-100"/>

            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">checks</h2>
              <p className="text-xs text-zinc-400 mb-4">
                {result.report.summary.passed}{' '}passed &middot;&nbsp;
                {result.report.summary.warnings}{' '}warnings &middot;&nbsp;
                {result.report.summary.errors}{' '}errors
              </p>

              {(["static", "ai"] as const).map(type => {
                const checks = result.report.checks.filter(c => c.type === type)
                return (
                  <div key={type} className="mb-4">
                    <p className="text-xs text-zinc-300 uppercase tracking-widest mb-2">{type}</p>
                    <ul className="flex flex-col gap-2">
                      {checks.map(check => (
                        <li key={check.id}>
                          <div className="flex items-start gap-2 text-sm">
                            <span className={`shrink-0 font-mono mt-px ${statusColor[check.status]}`}>
                              {statusIcon[check.status]}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-zinc-700 leading-snug">{check.message}</span>
                              {check.suggestion && (
                                <span className="text-xs text-zinc-400 leading-snug">{check.suggestion}</span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={copy}
      className="text-[10px] text-zinc-300 border border-zinc-200 rounded px-1.5 py-0.5 hover:text-zinc-500 hover:border-zinc-300 transition-colors"
    >
      {copied ? "copied" : "copy"}
    </button>
  )
}
