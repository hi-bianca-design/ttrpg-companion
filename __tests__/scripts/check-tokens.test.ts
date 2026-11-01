import path from 'path'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { checkFiles } = require('../../scripts/check-tokens.mjs')

const fx = (name: string) => path.join(__dirname, 'fixtures', name)

describe('check-tokens', () => {
  it('flags one violation per rule in bad.tsx', () => {
    const v = checkFiles([fx('bad.tsx')])
    expect(v.map((x: { rule: string }) => x.rule)).toEqual([
      'hex-literal',
      'rgb-literal',
      'inline-style',
      'arbitrary-value',
      'off-scale',
    ])
    expect(v[0]).toMatchObject({ file: fx('bad.tsx'), line: 2 })
  })

  it('returns nothing for token-only good.tsx', () => {
    expect(checkFiles([fx('good.tsx')])).toEqual([])
  })

  it('flags a hex inside a comment', () => {
    const v = checkFiles([fx('bad.tsx')])
    expect(v.some((x: { rule: string }) => x.rule === 'hex-literal')).toBe(true)
  })

  it('flags off-scale utilities with variants, negatives and decimals', () => {
    const fs = require('fs')
    const os = require('os')
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ct-')), 'x.tsx')
    fs.writeFileSync(f, '<V className="dark:p-5 active:gap-10 mt-0.5 -mx-5 w-32 p-4 w-1/2 inset-0" />\n')
    const texts = checkFiles([f]).map((x: { text: string }) => x.text)
    expect(texts).toHaveLength(5)
  })
})
