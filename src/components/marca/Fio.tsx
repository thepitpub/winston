'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useId, useRef } from 'react'
import { cx } from '@/components/ui/ui'

gsap.registerPlugin(useGSAP)

/*
 * O FIO — o traço pontilhado da casa.
 *
 * No Wine Garden a linha pontilhada liga uma origem a outra, sempre curva.
 * Aqui ela vira o fio de ouro do Continental: sai do título, ondula como a
 * fita de um telégrafo e termina numa moeda (o selo de duas voltas). Nunca
 * reta. Desenha-se da esquerda para a direita, por máscara, sem mexer no
 * espaçamento dos pontos. Com movimento reduzido, já aparece pronta.
 */

const CURVAS = {
  onda: 'M4 46 C 120 8, 230 8, 340 34 S 560 74, 690 40 S 880 6, 984 30',
  subida: 'M4 66 C 160 70, 300 58, 430 40 S 700 8, 984 16',
  descida: 'M4 14 C 180 10, 330 26, 470 44 S 760 72, 984 62',
} as const

export function Fio({ className, curva = 'onda', moeda = true, atraso = 0.35 }: { className?: string; curva?: keyof typeof CURVAS; moeda?: boolean; atraso?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')
  const d = CURVAS[curva]
  // Altura da ponta da curva, em % da caixa (o viewBox tem 80 de altura).
  const fimY = { onda: 30, subida: 16, descida: 62 }[curva] / 80
  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(el.querySelector('[data-mascara]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', delay: atraso })
        gsap.from(el.querySelector('[data-moeda]'), { scale: 0, duration: 0.6, ease: 'back.out(2)', delay: atraso + 1.55 })
      })
      return () => mm.revert()
    },
    { scope: ref },
  )
  return (
    <div ref={ref} className={cx('relative h-14 w-full sm:h-20', className)} aria-hidden="true">
      <svg viewBox="0 0 1000 80" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="-10" y="-20" width="1020" height="120">
            <path data-mascara d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth="18" strokeDasharray="1" />
          </mask>
        </defs>
        <path d={d} fill="none" style={{ stroke: 'var(--traco)' }} strokeWidth="1.25" strokeDasharray="5 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" mask={`url(#m${id})`} />
      </svg>
      {moeda ? (
        <span data-moeda className="absolute right-0 grid size-[15px] translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--traco)]" style={{ top: `${fimY * 100}%` }}>
          <span className="size-[7px] rounded-full border border-[var(--traco)] bg-[color-mix(in_oklab,var(--traco)_35%,transparent)]" />
        </span>
      ) : null}
    </div>
  )
}
