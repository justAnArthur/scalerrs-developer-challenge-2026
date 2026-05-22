import type { CheckResult, ChecksReport, Extracted } from "../types.ts"
import { runStaticChecks } from "./static.ts"
import { runAiChecks } from "./ai.ts"
import { toMarkdown } from "../converter.ts"

export { toMarkdown }

export async function runChecks(extracted: Extracted): Promise<ChecksReport & { markdown: string }> {
  const markdown = toMarkdown(extracted.bodyHtml)

  // run static and ai checks in parallel
  const [staticChecks, aiChecks] = await Promise.all([
    runStaticChecks(extracted),
    runAiChecks(markdown)
  ])

  const checks: CheckResult[] = [...staticChecks, ...aiChecks]

  const summary = {
    passed: checks.filter(c => c.status === 'pass').length,
    warnings: checks.filter(c => c.status === 'warning').length,
    errors: checks.filter(c => c.status === 'error').length
  }

  return { checks, summary, markdown }
}

