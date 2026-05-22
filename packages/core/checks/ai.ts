import type { CheckResult } from "../types"
import { callAnthropic } from "../anthropic"

// shape the AI returns for each check
type AiCheck = {
  id: string
  label: string
  passed: boolean
  message: string
}

async function fetchChecks(prompt: string): Promise<AiCheck[]> {
  const text = await callAnthropic(prompt)
  const parsed = JSON.parse(text) as { checks: AiCheck[] }
  return parsed.checks
}

function toCheckResult(c: AiCheck): CheckResult {
  return {
    id: c.id,
    type: 'ai',
    status: c.passed ? 'pass' : 'warning',
    message: `${c.label}: ${c.message}`
  }
}

// ---

export async function runAiChecks(markdown: string): Promise<CheckResult[]> {
  const prompt = `you are an seo content analyst. analyze this article and return quality check results as json.

rules:
- return ONLY valid json, no markdown, no backticks
- "passed" is true if the check is satisfied, false if there is an issue
- keep messages short and specific
- for "product-links": passed if the article has a reasonable number of product/shop links relative to its length (not zero, not excessive - e.g. every sentence); identify links by context (anchor text, surrounding copy, url patterns like /products/ /shop/ /buy/)

article (markdown):
${markdown.slice(0, 10000)}

return this exact structure:
{
  "checks": [
    { "id": "structure",        "label": "logical structure",         "passed": true,  "message": "..." },
    { "id": "lexical",          "label": "lexical quality",           "passed": true,  "message": "..." },
    { "id": "repetition",       "label": "no repetitive content",     "passed": true,  "message": "..." },
    { "id": "sentence-length",  "label": "sentence length",           "passed": true,  "message": "..." },
    { "id": "transitions",      "label": "section transitions",       "passed": true,  "message": "..." },
    { "id": "keyword-stuffing", "label": "no keyword stuffing",       "passed": true,  "message": "..." },
    { "id": "cta",              "label": "call to action present",    "passed": true,  "message": "..." },
    { "id": "tone",             "label": "consistent tone",           "passed": true,  "message": "..." },
    { "id": "product-links",    "label": "product link balance",      "passed": true,  "message": "..." }
  ]
}`

  const raw = await fetchChecks(prompt)
  return raw.map(toCheckResult)
}
