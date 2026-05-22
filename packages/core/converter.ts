import TurndownService from 'turndown'

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

// strip style/script noise that google docs injects
td.remove(['style', 'script', 'head'])

export function toMarkdown(html: string): string {
  return td.turndown(html)
}

