// Genera iconos de launcher (incl. adaptativos) y splash para android/ sin dependencias externas.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const res = join(root, 'android', 'app', 'src', 'main', 'res')
if (!existsSync(res)) {
  console.log('No hay proyecto android/ (ejecuta npx cap add android). Nada que hacer.')
  process.exit(0)
}

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
function encodePng(w, h, pixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const i = y * (w * 4 + 1) + 1 + x * 4
      const [r, g, b, a] = pixel(x, y)
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

/** Dibuja el logo (círculo verde con ondas) centrado en (cx,cy) con radio R. Devuelve color o null. */
function logo(x, y, cx, cy, R) {
  const dx = x - cx, dy = y - cy
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d > R) return null
  const t = (dx + dy) / (2 * R) + 0.5
  let col = [Math.round(30 + (11 - 30) * t), Math.round(215 + (122 - 215) * t), Math.round(96 + (59 - 96) * t), 255]
  const r = R * 0.64
  const ang = Math.atan2(dy, dx)
  for (const k of [0.55, 0.85, 1.15]) {
    if (ang > -2.55 && ang < -0.6 && Math.abs(d - r * k) < R * 0.08) col = [18, 18, 18, 255]
  }
  if (d <= r * 0.22) col = [18, 18, 18, 255]
  return col
}
const DARK = [18, 18, 18, 255]
function rounded(x, y, w, h, m) {
  const cx = w / 2, cy = h / 2
  const qx = Math.max(Math.abs(x - cx) - (cx - m), 0), qy = Math.max(Math.abs(y - cy) - (cy - m), 0)
  return Math.sqrt(qx * qx + qy * qy) <= m
}

const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
for (const [dpi, s] of Object.entries(sizes)) {
  const dir = join(res, `mipmap-${dpi}`)
  // icono clásico: fondo oscuro redondeado + logo
  writeFileSync(join(dir, 'ic_launcher.png'), encodePng(s, s, (x, y) => (rounded(x, y, s, s, s * 0.2) ? logo(x, y, s / 2, s / 2, s * 0.36) ?? DARK : [0, 0, 0, 0])))
  // icono redondo
  writeFileSync(join(dir, 'ic_launcher_round.png'), encodePng(s, s, (x, y) => (Math.hypot(x - s / 2, y - s / 2) <= s / 2 ? logo(x, y, s / 2, s / 2, s * 0.36) ?? DARK : [0, 0, 0, 0])))
  // capa frontal del icono adaptativo (108dp, zona segura 66%)
  const f = Math.round(s * 2.25)
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), encodePng(f, f, (x, y) => logo(x, y, f / 2, f / 2, f * 0.27) ?? [0, 0, 0, 0]))
}

// Splash: mismo tamaño que los archivos que trae Capacitor, fondo oscuro y logo al centro.
function pngSize(file) {
  const b = readFileSync(file)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}
for (const d of readdirSync(res)) {
  const f = join(res, d, 'splash.png')
  if (d.startsWith('drawable') && existsSync(f) && statSync(f).isFile()) {
    const [w, h] = pngSize(f)
    const R = Math.min(w, h) * 0.14
    writeFileSync(f, encodePng(w, h, (x, y) => logo(x, y, w / 2, h / 2, R) ?? DARK))
  }
}
console.log('android assets ok')
