import { parseHTML } from "@tkeron/html-parser"
import { extractFromDoc } from "./extract.ts"
import type { Extracted } from "./types.ts"

export function extractFromHtml(html: string): Extracted {
  return extractFromDoc(parseHTML(html))
}

export { runChecks } from "./checks/index.ts"
export { buildMeta } from "./meta/generate.ts"
export { toMarkdown } from "./converter.ts"
export type { Extracted, Meta, CheckResult, ChecksReport } from "./types.ts"
