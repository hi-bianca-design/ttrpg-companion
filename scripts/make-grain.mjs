// Writes assets/grain.png: 256x256 translucent black/white speckle, tiled over every screen for the
// printed-paper grain (spec §4.2). Node built-ins only; seeded so the output is reproducible.
// Usage: node scripts/make-grain.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const SIZE = 256
let seed = 0x9e3779b9
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), 8 + data.length)
  return out
}

const rows = []
for (let y = 0; y < SIZE; y++) {
  const row = Buffer.alloc(1 + SIZE * 4) // filter byte 0 + RGBA
  for (let x = 0; x < SIZE; x++) {
    const light = rand() < 0.5
    const strength = rand() < 0.45 ? 0 : Math.round(rand() * 120)
    const o = 1 + x * 4
    row[o] = row[o + 1] = row[o + 2] = light ? 255 : 0
    row[o + 3] = strength
  }
  rows.push(row)
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
const out = path.join(import.meta.dirname, '..', 'assets', 'grain.png')
fs.writeFileSync(out, png)
console.log(`wrote ${out} (${png.length} bytes)`)
