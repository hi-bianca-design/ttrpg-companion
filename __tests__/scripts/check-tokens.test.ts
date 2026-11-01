import path from 'path'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { checkFiles, ENFORCED_ROOTS } = require('../../scripts/check-tokens.mjs')

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

  const tmp = (content: string) => {
    const fs = require('fs')
    const os = require('os')
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ct-')), 'x.tsx')
    fs.writeFileSync(f, content)
    return f
  }

  it('flags a hex inside a real comment line', () => {
    const v = checkFiles([tmp('// #ff0000\n')])
    expect(v.map((x: { rule: string }) => x.rule)).toEqual(['hex-literal'])
  })

  it('flags suffixed RN style props in inline styles, single and multi-line', () => {
    const single = checkFiles([tmp('<V style={{ paddingHorizontal: 13 }} />\n')])
    expect(single.map((x: { rule: string }) => x.rule)).toEqual(['inline-style'])
    const multi = checkFiles([tmp('<V\n  style={{\n    flex: 1,\n    rowGap: 5,\n    borderTopLeftRadius: 3,\n  }}\n/>\n')])
    expect(multi.map((x: { rule: string }) => x.rule)).toEqual(['inline-style'])
    expect(checkFiles([tmp('<V style={{ marginTop: 4 }} />\n')])).toHaveLength(1)
  })

  it('flags off-scale utilities with variants, negatives and decimals', () => {
    const fs = require('fs')
    const os = require('os')
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ct-')), 'x.tsx')
    fs.writeFileSync(f, '<V className="dark:p-5 active:gap-10 mt-0.5 -mx-5 w-32 p-4 w-1/2 inset-0" />\n')
    const texts = checkFiles([f]).map((x: { text: string }) => x.text)
    expect(texts).toHaveLength(5)
  })

  it('enforces tokens across app/ as well as feature code', () => {
    expect(ENFORCED_ROOTS).toEqual(expect.arrayContaining(['app', 'src/features', 'src/components/game', 'src/systems']))
  })
})
