import { parseHTML } from "@tkeron/html-parser"
import { extractFromDoc } from "./extract.ts"
import { runChecks } from "./checks"
import { buildMeta } from "./meta/generate.ts"
import { toMarkdown } from "./converter.ts"

const docId = Bun.env.GOOGLE_DOC_ID!

async function fetchGoogleDoc(id: string) {
  const res = await fetch(`https://docs.google.com/document/d/${id}/export?format=html`)
  if (!res.ok) throw new Error(`Failed to fetch doc: ${res.status}`)
  return res.text()
}

const html = await fetchGoogleDoc(docId)

const extracted = extractFromDoc(parseHTML(html))
const markdown = toMarkdown(extracted.bodyHtml)

// run checks and meta generation in parallel
const [report, meta] = await Promise.all([
  runChecks(extracted),
  buildMeta(markdown, extracted.metas),
])

// ---

console.log('\nmeta')
const src = (key: string) => meta.sources[key] === 'doc' ? '[doc]' : '[ai] '
console.log(`  ${src('metaTitle')}       title:       ${meta.metaTitle}`)
console.log(`  ${src('metaDescription')} description: ${meta.metaDescription}`)
console.log(`  ${src('keywords')}        keywords:    ${meta.keywords.join(', ')}`)

// ---

console.log(`\nchecks  ${report.summary.passed} passed · ${report.summary.warnings} warnings · ${report.summary.errors} errors\n`)

const icon = { pass: 'PASS', warning: 'WARN', error: 'FAIL' }
for (const check of report.checks) {
  const tag = `[${check.type}]`.padEnd(8)
  console.log(`${icon[check.status]} ${tag} ${check.message}`)
  if (check.suggestion) console.log(`         → ${check.suggestion}`)
}
