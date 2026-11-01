// Design-token enforcement: line-based regex scan of feature code.
// Usage: node scripts/check-tokens.mjs  (exits 1 and prints violations)
import fs from 'node:fs'
import path from 'node:path'

export const ENFORCED_ROOTS = ['src/features', 'src/components/game', 'src/systems', 'app']

const EXEMPT = [
  /(^|\/)src\/lib\/theme\.ts$/,
  /(^|\/)src\/components\/ui\//,
  /(^|\/)global\.css$/,
  /(^|\/)tailwind\.config\.js$/,
]

const SCAN_EXT = /\.(ts|tsx)$/
const SPACING_STEPS = new Set(['0', '1', '2', '3', '4', '6', '8', '11'])

const HEX = /#[0-9a-fA-F]{3,8}\b/
const RGB = /rgba?\(/
const STYLE_OPEN = /style=\{\{/
const STYLE_PROPS = /\b(color|backgroundColor|fontSize|padding\w*|margin\w*|\w*[gG]ap|border\w*Radius)\s*:/
const ARBITRARY = /-\[/
const SPACING_UTILS = [
  'px', 'py', 'pt', 'pb', 'pl', 'pr', 'ps', 'pe', 'p',
  'mx', 'my', 'mt', 'mb', 'ml', 'mr', 'ms', 'me', 'm',
  'gap-x', 'gap-y', 'gap', 'space-x', 'space-y',
  'min-w', 'min-h', 'max-w', 'max-h', 'w', 'h', 'size',
  'inset-x', 'inset-y', 'inset', 'top', 'right', 'bottom', 'left',
  'translate-x', 'translate-y',
]
const OFF_SCALE = new RegExp(
  `(?<![\\w-])(?:[a-z0-9-]+:)*-?(?:${SPACING_UTILS.join('|')})-(\\d+(?:\\.\\d+)?)(?![\\w./-])`,
  'g',
)

function isExempt(file) {
  const rel = file.split(path.sep).join('/')
  return EXEMPT.some((re) => re.test(rel))
}

function scanFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const out = []
  lines.forEach((text, i) => {
    const add = (rule) => out.push({ file, line: i + 1, rule, text: text.trim() })
    if (HEX.test(text)) add('hex-literal')
    if (RGB.test(text)) add('rgb-literal')
    if (STYLE_OPEN.test(text)) {
      // Literal object styles only; gather up to the closing `}}` (max 10 lines).
      let chunk = text.slice(text.search(STYLE_OPEN))
      for (let j = i; j < Math.min(i + 10, lines.length) && !chunk.includes('}}'); j++) {
        chunk += '\n' + lines[j + 1]
      }
      if (STYLE_PROPS.test(chunk.split('}}')[0])) add('inline-style')
    }
    if (ARBITRARY.test(text)) add('arbitrary-value')
    for (const m of text.matchAll(OFF_SCALE)) {
      if (!SPACING_STEPS.has(m[1])) add('off-scale')
    }
  })
  return out
}

export function checkFiles(paths) {
  return paths
    .filter((p) => SCAN_EXT.test(p) && !isExempt(p))
    .flatMap(scanFile)
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    return e.isDirectory() ? walk(full) : [full]
  })
}

function main() {
  const files = ENFORCED_ROOTS.filter((r) => fs.existsSync(r)).flatMap(walk)
  const violations = checkFiles(files)
  for (const v of violations) console.error(`${v.file}:${v.line} [${v.rule}] ${v.text}`)
  if (violations.length) {
    console.error(`\n${violations.length} design-token violation(s).`)
    process.exit(1)
  }
}

if (process.argv[1] && path.basename(process.argv[1]) === 'check-tokens.mjs') main()
