// Genera public/icon.svg, icon-192.png e icon-512.png sin dependencias externas.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(out, { recursive: true })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1ed760"/><stop offset="1" stop-color="#0b7a3b"/></linearGradient></defs>
<rect width="512" height="512" rx="112" fill="#121212"/>
<circle cx="256" cy="256" r="176" fill="url(#g)"/>
<path d="M150 300c70-28 150-26 222 12M164 252c76-30 160-28 236 10M178 206c80-30 170-28 254 8" fill="none" stroke="#121212" stroke-width="26" stroke-linecap="round"/>
</svg>`
writeFileSync(join(out, 'icon.svg'), svg)

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const cx = size / 2, cy = size / 2, R = size * 0.345, r = size * 0.22
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4
      const dx = x - cx, dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      // fondo redondeado
      const m = size * 0.22
      const inRound = (() => {
        const qx = Math.max(Math.abs(dx) - (cx - m), 0), qy = Math.max(Math.abs(dy) - (cy - m), 0)
        return Math.sqrt(qx * qx + qy * qy) <= m
      })()
      let col = [0, 0, 0, 0]
      if (inRound) col = [18, 18, 18, 255]
      if (d <= R) {
        const t = (dx + dy) / (2 * R) + 0.5
        col = [Math.round(30 + (11 - 30) * t), Math.round(215 + (122 - 215) * t), Math.round(96 + (59 - 96) * t), 255]
      }
      // tres "ondas" (arcos) oscuras
      const ang = Math.atan2(dy, dx)
      for (const k of [0.55, 0.85, 1.15]) {
        const rr = r * k
        if (ang > -2.55 && ang < -0.6 && Math.abs(d - rr) < size * 0.028) col = [18, 18, 18, 255]
      }
      if (d <= r * 0.22) col = [18, 18, 18, 255]
      raw[i] = col[0]; raw[i + 1] = col[1]; raw[i + 2] = col[2]; raw[i + 3] = col[3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
for (const s of [192, 512]) {
  const f = join(out, `icon-${s}.png`)
  if (!existsSync(f)) writeFileSync(f, png(s))
}
console.log('icons ok')
