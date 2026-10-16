/**
 * Monograma tipográfico no lugar de foto: iniciais em Cormorant dentro de
 * um octógono de filete. Nenhum avatar de imagem existe na plataforma.
 */
export function iniciais(nome: string): string {
  const partes = nome
    .normalize('NFC')
    .split(/\s+/)
    .filter((p) => p && !/^(da|de|do|das|dos|e)$/i.test(p))
  const a = partes[0]?.[0] ?? '?'
  const b = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : ''
  return (a + b).toUpperCase()
}

export function Monograma({ nome, tamanho = 44, destaque = false }: { nome: string; tamanho?: number; destaque?: boolean }) {
  const r = 50
  const o = r * 0.4142 // lado do octógono inscrito
  const pts = [
    [r - o, 0],
    [r + o, 0],
    [2 * r, r - o],
    [2 * r, r + o],
    [r + o, 2 * r],
    [r - o, 2 * r],
    [0, r + o],
    [0, r - o],
  ]
    .map((p) => p.join(','))
    .join(' ')
  return (
    <svg viewBox="-2 -2 104 104" width={tamanho} height={tamanho} aria-hidden="true" className="shrink-0">
      <polygon points={pts} fill={destaque ? '#1e2227' : '#171a1e'} stroke={destaque ? '#b99a62' : 'rgba(185,154,98,.45)'} strokeWidth="1.5" />
      <text x="50" y="62" textAnchor="middle" fontFamily="var(--font-display), serif" fontSize="38" fontWeight="500" fill="#eae4d9">
        {iniciais(nome)}
      </text>
    </svg>
  )
}
