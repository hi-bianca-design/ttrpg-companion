// WCAG 2.x contrast ratio for hex / rgba() colours. A translucent colour is composited over `under`.
type Rgba = [number, number, number, number]

function parse(color: string): Rgba {
  const c = color.trim()
  if (c.startsWith('#')) {
    const h = c.slice(1)
    const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), 1]
  }
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (!m) throw new Error(`cannot parse colour: ${color}`)
  const [r, g, b, a = '1'] = m[1].split(',').map((s) => s.trim())
  return [Number(r), Number(g), Number(b), Number(a)]
}

function over(top: Rgba, under: Rgba): Rgba {
  const a = top[3]
  return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1) as Rgba
}

function luminance([r, g, b]: Rgba): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(fg: string, bg: string, under = '#0B1D20'): number {
  const base = parse(under)
  const bgc = over(parse(bg), base)
  const fgc = over(parse(fg), bgc)
  const [hi, lo] = [luminance(fgc), luminance(bgc)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}
