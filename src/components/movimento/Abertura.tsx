'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef, useSyncExternalStore } from 'react'
import { Selo } from '@/components/marca/Selo'

gsap.registerPlugin(useGSAP)

const CHAVE = 'ch_abertura_vista'
const lerVista = () => {
  try {
    return sessionStorage.getItem(CHAVE) === '1'
  } catch {
    return true
  }
}
const semInscricao = () => () => {}

/**
 * A abertura: o selo se desenha, o nome sobe por trás de uma máscara e a
 * cortina se recolhe. Uma vez por sessão, nunca com movimento reduzido, e
 * nunca bloqueia: qualquer clique ou tecla encerra na hora, e a página por
 * trás já está pronta e acessível.
 */
export function Abertura() {
  const jaVista = useSyncExternalStore(semInscricao, lerVista, () => true)
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (jaVista || !ref.current) return
      const el = ref.current
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        el.style.display = 'none'
      })
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tracos = el.querySelectorAll<SVGGeometryElement>('[data-traco]')
        tracos.forEach((t) => {
          const len = t.getTotalLength?.() ?? 600
          t.style.strokeDasharray = `${len}`
          t.style.strokeDashoffset = `${len}`
        })
        const tl = gsap.timeline({
          onComplete: () => {
            el.style.display = 'none'
          },
        })
        tl.to(tracos, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: 0.03 })
          .from(el.querySelectorAll('[data-letra]'), { yPercent: 120, duration: 0.9, ease: 'expo.out', stagger: 0.035 }, '-=0.7')
          .from(el.querySelector('[data-sub]'), { autoAlpha: 0, y: 8, duration: 0.6 }, '-=0.4')
          .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '+=0.35')
        const pular = () => tl.progress(1)
        window.addEventListener('pointerdown', pular, { once: true })
        window.addEventListener('keydown', pular, { once: true })
        return () => {
          window.removeEventListener('pointerdown', pular)
          window.removeEventListener('keydown', pular)
        }
      })
      try {
        sessionStorage.setItem(CHAVE, '1')
      } catch {
        /* sem storage: a abertura volta na próxima visita, e tudo bem */
      }
      return () => mm.revert()
    },
    { dependencies: [jaVista] },
  )

  if (jaVista) return null
  const nome = 'CONTINENTAL'
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="textura fixed inset-0 z-[100] grid place-items-center bg-fundo"
      style={{ clipPath: 'inset(0 0 0 0)', pointerEvents: 'none' }}
    >
      <div className="grid justify-items-center gap-6">
        <Selo tamanho={132} />
        <p className="font-display text-[clamp(2rem,7vw,3.6rem)] leading-none tracking-[0.18em] text-tinta">
          {nome.split('').map((l, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom">
              <span data-letra className="inline-block">
                {l}
              </span>
            </span>
          ))}
        </p>
        <p data-sub className="rotulo text-destaque">
          Heritage · Private Members
        </p>
      </div>
    </div>
  )
}
