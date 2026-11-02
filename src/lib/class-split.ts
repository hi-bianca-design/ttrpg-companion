// Placement classes belong to a shaped plate; everything else (text, padding, gap, height) styles its content.
const LAYOUT = /^(?:[a-z0-9-]+:)*-?(?:m[trblxyse]?|flex|grow|shrink|basis|w|min-w|max-w|self)(?:-|$)/

export function splitClassName(className?: string): { plate: string; content: string } {
  const plate: string[] = []
  const content: string[] = []
  for (const token of (className ?? '').split(/\s+/).filter(Boolean)) (LAYOUT.test(token) ? plate : content).push(token)
  return { plate: plate.join(' '), content: content.join(' ') }
}
