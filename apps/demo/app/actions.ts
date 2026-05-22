"use server"

import type { ChecksReport, Meta } from "@scalerrs/core"
import { buildMeta, extractFromHtml, runChecks, toMarkdown } from "@scalerrs/core"

function docIdFromUrl(input: string): string | null {
  const match = input.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1]! : input.trim() || null
}

export type AnalyzeState = {
  data?: { html: string; report: ChecksReport; meta: Meta }
  error?: string
}

export async function analyze(prevState: AnalyzeState, formData: FormData): Promise<AnalyzeState> {
  const url = formData.get("url") as string

  const docId = docIdFromUrl(url)
  if (!docId) return { error: "invalid url" }

  const res = await fetch(`https://docs.google.com/document/d/${docId}/export?format=html`)
  if (!res.ok) return { error: `failed to fetch doc: ${res.status}` }

  const html = await res.text()
  const extracted = extractFromHtml(html)
  const markdown = toMarkdown(extracted.bodyHtml)

  const [report, meta] = await Promise.all([
    runChecks(extracted),
    buildMeta(markdown, extracted.metas)
  ])

  return { data: { html: extracted.bodyHtml, report, meta } }
}

