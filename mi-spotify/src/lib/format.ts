export function fmtTime(ms: number | null | undefined): string {
  if (!ms || ms < 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
export function fmtTotal(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h} h ${min % 60} min`
}
export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('es').format(n)
}
export function artistNames(artists: { name: string }[] | undefined): string {
  return (artists ?? []).map((a) => a.name).join(', ')
}
export function imageFor(images: { url: string; width: number | null }[] | null | undefined, size: 'sm' | 'md' | 'lg' = 'md'): string {
  if (!images || images.length === 0) return ''
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  if (size === 'lg') return sorted[0].url
  if (size === 'sm') return sorted[sorted.length - 1].url
  return sorted[Math.min(1, sorted.length - 1)].url
}
export function stripHtml(s: string | null | undefined): string {
  if (!s) return ''
  const d = document.createElement('div')
  d.innerHTML = s
  return d.textContent || ''
}
