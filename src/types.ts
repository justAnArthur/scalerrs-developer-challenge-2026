export type Extracted = {
  title?: string
  images: { src: string; alt: string }[]
  links: { href: string; text: string }[]
  metas: Record<string, string>
}

export type CheckResult = {
  status: 'pass' | 'warning' | 'error'
  message: string
  suggestion?: string
}

export type ChecksReport = {
  checks: CheckResult[]
  summary: { passed: number; warnings: number; errors: number }
}

