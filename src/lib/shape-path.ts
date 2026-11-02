export type Shape = 'hex' | 'chamfer' | 'arch' | 'sheet'

export type PathOpts = {
  /** Horizontal depth of the pointed ends on `hex`. */
  point?: number
  /** Corner cut on `chamfer`. */
  chamfer?: number
  /** Height of the pointed top on `arch`. */
  rise?: number
  /** Pull the outline in from the box edge (half the stroke width, so strokes stay inside). */
  inset?: number
}

const SHEET_RADIUS = 20

const n = (v: number) => Math.round(v * 100) / 100

/**
 * SVG path `d` for a surface of the given size. Depths clamp to the space available, and a surface
 * with no size yet (before layout) yields an empty path, never NaN.
 */
export function shapePath(shape: Shape, width: number, height: number, opts: PathOpts = {}): string {
  const { point = 14, chamfer = 8, rise = 54, inset = 0 } = opts
  const w = width - 2 * inset
  const h = height - 2 * inset
  if (!(w > 0) || !(h > 0)) return ''
  const x = (v: number) => n(v + inset)
  const y = (v: number) => n(v + inset)
  const pts = (list: Array<[number, number]>) =>
    list.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${x(px)} ${y(py)}`).join(' ') + ' Z'

  if (shape === 'hex') {
    const p = Math.min(point, w / 2)
    return pts([[p, 0], [w - p, 0], [w, h / 2], [w - p, h], [p, h], [0, h / 2]])
  }
  if (shape === 'chamfer') {
    const c = Math.min(chamfer, w / 2, h / 2)
    return pts([[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]])
  }
  if (shape === 'sheet') {
    // An iOS-style drawer: rounded top corners, square bottom that runs off the screen edge.
    const r = Math.min(SHEET_RADIUS, w / 2, h)
    return `M${x(0)} ${y(h)} L${x(0)} ${y(r)} A${r} ${r} 0 0 1 ${x(r)} ${y(0)} L${x(w - r)} ${y(0)} A${r} ${r} 0 0 1 ${x(w)} ${y(r)} L${x(w)} ${y(h)} Z`
  }
  const r = Math.min(rise, h)
  return pts([[0, r], [w / 2, 0], [w, r], [w, h], [0, h]])
}
