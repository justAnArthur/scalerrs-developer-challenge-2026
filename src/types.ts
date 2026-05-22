export type Extracted = {
  title?: string
  headingsList: string[]
  wordCount: number
  images: { src: string; alt: string }[]
  links: { href: string; text: string }[]
  metas: Record<string, string>
  bodyHtml: string
}

export type CheckResult = {
  id: string
  type: 'static' | 'ai'
  status: 'pass' | 'warning' | 'error'
  message: string
  suggestion?: string
}

export type ChecksReport = {
  checks: CheckResult[]
  summary: { passed: number; warnings: number; errors: number }
}
