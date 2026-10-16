import { useId } from 'react'

/**
 * Guilhoché: o padrão de cédula e de título ao portador, gerado por
 * matemática. Cada anel é UMA roseta polar r(θ) = R + A·sin(nθ) e suas
 * cópias rotacionadas (girar a curva equivale a defasar o seno), o que
 * mantém o SVG leve. Fundo da credencial e das portas, sem imagem.
 */
function roseta(R: number, A: number, n: number): string {
  const passos = n * 16
  let d0 = ''
  for (let i = 0; i <= passos; i++) {
    const t = (i / passos) * Math.PI * 2
    const r = R + A * Math.sin(n * t)
    d0 += `${i === 0 ? 'M' : 'L'}${(r * Math.cos(t)).toFixed(1)},${(r * Math.sin(t)).toFixed(1)}`
  }
  return d0 + 'Z'
}

const ANEIS = [
  { d: roseta(96, 9, 24), n: 24, copias: 14 },
  { d: roseta(70, 7, 18), n: 18, copias: 12 },
  { d: roseta(44, 5, 12), n: 12, copias: 10 },
]

export function Guilhoche({ className, opacidade = 0.22 }: { className?: string; opacidade?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="-120 -120 240 240" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        {ANEIS.map((a, i) => (
          <path key={i} id={`g${id}-${i}`} d={a.d} />
        ))}
      </defs>
      <g fill="none" stroke="#b99a62" strokeWidth="0.22" opacity={opacidade}>
        {ANEIS.flatMap((a, i) =>
          Array.from({ length: a.copias }, (_, k) => (
            <use key={`${i}-${k}`} href={`#g${id}-${i}`} transform={`rotate(${((360 / a.n) * k) / a.copias})`} />
          )),
        )}
      </g>
    </svg>
  )
}

/** Linhas finas paralelas, como o fundo de um papel de segurança. */
export function Hachura({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" width="100%" height="100%">
      <defs>
        <pattern id="hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(185,154,98,.07)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hachura)" />
    </svg>
  )
}
