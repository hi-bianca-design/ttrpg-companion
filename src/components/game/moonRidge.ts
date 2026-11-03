// Mountain geometry for MoonHero: a stack of distant ridges, each a flat silhouette, hazy at the back and
// darker toward the front (atmospheric perspective), with the back ones tall. Crests are jagged but soft,
// generated once from a fixed seed so the range is the same on every launch. Coordinates are on a
// GRID_W x GRID_H grid; the component stretches them to the screen.

export type Pt = [number, number]

export const GRID_W = 400
export const GRID_H = 88
const CEILING = 2
const FLOOR_MARGIN = 20

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Midpoint displacement: each pass splits every segment and nudges the new point up or down. */
function roughen(points: Pt[], levels: number, roughness: number, rand: () => number): Pt[] {
  let out = points
  for (let l = 0; l < levels; l++) {
    const next: Pt[] = []
    for (let i = 0; i < out.length - 1; i++) {
      const [ax, ay] = out[i]
      const [bx, by] = out[i + 1]
      const run = bx - ax
      const y = (ay + by) / 2 + (rand() - 0.5) * run * roughness
      next.push(out[i], [(ax + bx) / 2, Math.min(GRID_H - FLOOR_MARGIN, Math.max(CEILING, y))])
    }
    next.push(out[out.length - 1])
    out = next
  }
  return out
}

const rand = rng(20261103)

const LEVELS = 2
const STEP = 2 ** LEVELS
const MOON_X = GRID_W / 2

const CONTROLS: Pt[][] = [
  [[0, 28], [38, 12], [86, 26], [130, 4], [182, 24], [226, 8], [276, 28], [322, 6], [366, 22], [400, 14]],
  [[0, 44], [48, 28], [102, 42], [152, 20], [206, 40], [252, 24], [304, 44], [352, 26], [400, 40]],
  [[0, 56], [60, 44], [122, 58], [182, 42], [240, 56], [300, 44], [362, 58], [400, 50]],
  [[0, 68], [70, 60], [150, 71], [230, 62], [310, 71], [380, 62], [400, 67]],
]

/** Ridges from the farthest (first, tallest, faintest) to the nearest (last, lowest, darkest). */
export const RANGES: Pt[][] = CONTROLS.map((points, i) => roughen(points, LEVELS, 0.4 - i * 0.06, rand))

/**
 * Block shadows, one list per ridge: on every peak, the slope turned away from the moon is cut off by a
 * straight edge falling from the summit, like the flat planes of a woodcut. Straight lines only.
 */
export const SHADOWS: Pt[][][] = CONTROLS.map((points, r) => {
  const crest = RANGES[r]
  const planes: Pt[][] = []
  for (let i = 1; i < points.length - 1; i++) {
    const [left, here, right] = [points[i - 1], points[i], points[i + 1]]
    if (here[1] >= left[1] || here[1] >= right[1]) continue
    const awayLeft = here[0] < MOON_X
    const valley = awayLeft ? left : right
    const k = i * STEP
    const slope = awayLeft ? crest.slice(k - STEP, k + 1).reverse() : crest.slice(k, k + STEP + 1)
    const foot: Pt = [here[0] + (valley[0] - here[0]) * 0.18, GRID_H]
    planes.push([...slope, [valley[0], GRID_H], foot])
  }
  return planes
})
