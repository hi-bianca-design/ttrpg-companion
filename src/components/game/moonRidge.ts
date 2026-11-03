// Mountain geometry for MoonHero, drawn like a two-tone screenprint: a dark body, a moonlit face on each peak's
// slope that turns toward the moon (split from the dark side by an irregular edge running down from the
// summit), and small dark outcrops cut into the light. Coordinates are on a GRID_W x GRID_H grid; the
// component stretches them to the screen.

export type Pt = [number, number]

export const GRID_W = 400
export const GRID_H = 88

/** The far range's outline, left to right. Summits: (58,24), (230,4), (330,14). */
export const BACK_CREST: Pt[] = [
  [0, 52], [30, 40], [58, 24], [68, 30], [78, 36], [92, 34], [106, 42], [120, 50], [136, 44], [150, 38], [170, 29],
  [190, 20], [210, 12], [230, 4], [250, 14], [262, 22], [280, 32], [300, 28], [318, 20], [330, 14], [350, 26],
  [372, 34], [400, 30],
]

/**
 * Moonlit faces: the left slope of the two right-hand peaks, the right slope of the left-hand one. `crest`
 * follows the outline (straight, sharp); `edge` is the soft, irregular line that closes the face back up to
 * the summit and is drawn as a smooth curve.
 */
export type LitFace = { crest: Pt[]; edge: Pt[] }
export const LIT: LitFace[] = [
  // Main peak: from the summit down toward the moon.
  {
    crest: [[230, 4], [210, 12], [190, 20], [170, 29], [150, 38], [136, 44], [120, 50]],
    edge: [[125, 60], [140, 57], [150, 68], [165, 63], [172, 78], [188, 71], [196, 86], [208, 74], [214, 60], [204, 55], [212, 44], [222, 36], [218, 24], [226, 14]],
  },
  // Right peak.
  {
    crest: [[330, 14], [318, 20], [300, 28], [280, 32]],
    edge: [[288, 44], [300, 40], [304, 55], [316, 48], [322, 64], [330, 50], [326, 38], [332, 28], [328, 20]],
  },
  // Left peak, lit on its right slope.
  {
    crest: [[58, 24], [68, 30], [78, 36], [92, 34], [106, 42], [120, 50]],
    edge: [[112, 58], [100, 54], [96, 67], [84, 60], [78, 75], [70, 62], [64, 50], [60, 38]],
  },
]

/** Dark outcrops cut into the lit faces: slim diagonal slivers, like the rock showing through. */
export const ROCKS: Pt[][] = [
  [[180, 36], [186, 34], [193, 46], [188, 48]],
  [[158, 50], [164, 48], [171, 62], [165, 64]],
  [[198, 42], [202, 40], [206, 54], [201, 55]],
  [[308, 40], [313, 38], [318, 52], [313, 53]],
  [[84, 44], [88, 43], [92, 54], [88, 55]],
]

/** Low foothills in front, a dark band with a lightly broken top edge. */
export const FRONT_CREST: Pt[] = [
  [0, 66], [24, 60], [46, 63], [66, 55], [96, 62], [124, 69], [150, 63], [178, 58], [212, 51], [240, 58], [268, 64],
  [292, 68], [320, 60], [352, 54], [376, 61], [400, 65],
]
