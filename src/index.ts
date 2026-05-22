import { parseHTML } from "@tkeron/html-parser"
import { extractFromDoc } from "./extract.ts"
import { runChecks } from "./checks.ts"

const docId = Bun.env.GOOGLE_DOC_ID!

async function fetchGoogleDoc(id: string) {
  const res = await fetch(`https://docs.google.com/document/d/${id}/export?format=html`)
  if (!res.ok) throw new Error(`Failed to fetch doc: ${res.status}`)
  return res.text()
}

const html = await fetchGoogleDoc(docId)
await Bun.write('./index.html', html)

const extracted = extractFromDoc(parseHTML(html))
console.log('extracted', extracted)

const report = await runChecks(extracted)

console.log(`${report.summary.passed} passed · ${report.summary.warnings} warnings · ${report.summary.errors} errors\n`)

for (const check of report.checks) {
  const icon = { pass: 'YES', warning: 'WARN', error: 'ERROR' }[check.status]
  console.log(`${icon} [${check.status.toUpperCase()}] ${check.message}`)
  if (check.suggestion) console.log(`  → ${check.suggestion}`)
}