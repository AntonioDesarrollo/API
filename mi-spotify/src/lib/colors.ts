/** Obtiene un color dominante de una imagen (carátula) para el fondo dinámico. */
const cache = new Map<string, string>()

export async function dominantColor(url: string): Promise<string | null> {
  if (!url) return null
  if (cache.has(url)) return cache.get(url)!
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    const size = 24
    c.width = size
    c.height = size
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, size, size)
    const data = ctx.getImageData(0, 0, size, size).data
    let r = 0, g = 0, b = 0, n = 0
    for (let i = 0; i < data.length; i += 4) {
      const [pr, pg, pb] = [data[i], data[i + 1], data[i + 2]]
      const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb)
      const sat = max === 0 ? 0 : (max - min) / max
      const w = 0.3 + sat // pesa más los píxeles saturados
      r += pr * w; g += pg * w; b += pb * w; n += w
    }
    const col = `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`
    cache.set(url, col)
    return col
  } catch {
    return null
  }
}
