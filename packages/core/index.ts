import { parse } from "node-html-parser"
import { extractFromDoc } from "./extract"
import type { Extracted } from "./types"

export function extractFromHtml(html: string): Extracted {
  return extractFromDoc(parse(html))
}

export { runChecks } from "./checks/index"
export { buildMeta } from "./meta/generate"
export { toMarkdown } from "./converter"
export type { Extracted, Meta, CheckResult, ChecksReport } from "./types"
