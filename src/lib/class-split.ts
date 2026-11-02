// Placement classes belong to a shaped plate; everything else (text, padding, gap, height) styles its content.
const LAYOUT = /^(?:[a-z0-9-]+:)*(?:-?(?:m[trblxyse]?|grow|shrink|basis|opacity|w|min-w|max-w|self)(?:-|$)|flex-(?:\d+|auto|none|initial)$)/

export function splitClassName(className?: string): { plate: string; content: string } {
  const plate: string[] = []
  const content: string[] = []
  for (const token of (className ?? '').split(/\s+/).filter(Boolean)) (LAYOUT.test(token) ? plate : content).push(token)
  return { plate: plate.join(' '), content: content.join(' ') }
}
