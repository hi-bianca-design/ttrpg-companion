import fs from 'fs'
import path from 'path'

const png = fs.readFileSync(path.join(__dirname, '../../assets/grain.png'))

test('assets/grain.png is a 256x256 RGBA PNG', () => {
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  expect(png.readUInt32BE(16)).toBe(256)
  expect(png.readUInt32BE(20)).toBe(256)
  expect(png[24]).toBe(8) // bit depth
  expect(png[25]).toBe(6) // colour type: RGBA
})

test('the grain is translucent noise, not a solid fill', () => {
  expect(png.length).toBeGreaterThan(20_000)
})
