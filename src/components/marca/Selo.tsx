import { useId } from 'react'

/**
 * O selo da casa. Vetorial puro: anel duplo, legenda em texto sobre o
 * caminho circular, rosa-dos-ventos de doze pontas e o "C" em Cormorant.
 * `data-traco` marca os elementos que a abertura desenha com stroke-dash.
 */
export function Selo({ tamanho = 120, className, legenda = 'CONTINENTAL · HERITAGE · PRIVATE MEMBERS ·' }: { tamanho?: number; className?: string; legenda?: string }) {
  const id = useId().replace(/:/g, '')
  const pontas = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <svg viewBox="0 0 200 200" width={tamanho} height={tamanho} className={className} role="img" aria-label="Selo do Continental Heritage">
      <defs>
        <path id={`anel-${id}`} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
        <linearGradient id={`ouro-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d2b67e" />
          <stop offset="0.5" stopColor="#b99a62" />
          <stop offset="1" stopColor="#8a7246" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#ouro-${id})`}>
        <circle data-traco cx="100" cy="100" r="96" strokeWidth="1" />
        <circle data-traco cx="100" cy="100" r="90" strokeWidth="0.6" />
        <circle data-traco cx="100" cy="100" r="60" strokeWidth="0.8" />
        <circle data-traco cx="100" cy="100" r="56" strokeWidth="0.4" />
        {pontas.map((a) => (
          <path key={a} data-traco d="M100 46 L103 56 L100 60 L97 56 Z" strokeWidth="0.6" transform={`rotate(${a} 100 100)`} />
        ))}
      </g>
      <text fill="#b99a62" fontFamily="var(--font-sans), sans-serif" fontSize="9.4" letterSpacing="3.1" fontWeight="600">
        <textPath href={`#anel-${id}`}>{legenda}</textPath>
      </text>
      <text x="100" y="117" textAnchor="middle" fill="#eae4d9" fontFamily="var(--font-display), serif" fontSize="52" fontStyle="italic" fontWeight="500">
        C
      </text>
    </svg>
  )
}
