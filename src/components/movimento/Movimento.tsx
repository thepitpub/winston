'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Fragment, useRef, type ElementType, type ReactNode } from 'react'

gsap.registerPlugin(useGSAP)

/** Movimento só acontece se o usuário não pediu menos movimento. */
const COM_MOVIMENTO = '(prefers-reduced-motion: no-preference)'

/**
 * Entrada em cascata dos filhos marcados com `data-revela`. O conteúdo já
 * está no DOM e é interativo desde o primeiro quadro: a animação só desloca
 * e acende; nada espera o GSAP para poder ser clicado.
 */
export function Revela({ children, className, as: Tag = 'div', atraso = 0 }: { children: ReactNode; className?: string; as?: ElementType; atraso?: number }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(COM_MOVIMENTO, () => {
        const alvos = ref.current?.querySelectorAll('[data-revela]')
        if (!alvos?.length) return
        gsap.from(alvos, { y: 18, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: atraso, clearProps: 'all' })
      })
      return () => mm.revert()
    },
    { scope: ref },
  )
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}

/**
 * Título com máscara tipográfica: cada palavra sobe por trás de uma janela.
 * O texto inteiro continua no DOM como texto, para leitores de tela.
 */
export function TituloMascara({ texto, as: Tag = 'h1', className, atraso = 0.1 }: { texto: string; as?: ElementType; className?: string; atraso?: number }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(COM_MOVIMENTO, () => {
        gsap.from(ref.current!.querySelectorAll('[data-palavra]'), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: atraso })
      })
      return () => mm.revert()
    },
    { scope: ref },
  )
  const palavras = texto.split(' ')
  return (
    <Tag ref={ref} className={className} aria-label={texto}>
      {palavras.map((p, i) => (
        <Fragment key={i}>
          <span aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <span data-palavra className="inline-block">
              {p}
            </span>
          </span>
          {i < palavras.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  )
}

/** Filete que se desenha da esquerda para a direita. */
export function LinhaRevela({ className, atraso = 0.2 }: { className?: string; atraso?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(COM_MOVIMENTO, () => {
        gsap.from(ref.current, { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'power3.inOut', delay: atraso })
      })
      return () => mm.revert()
    },
    { scope: ref },
  )
  return <div ref={ref} className={['filete', className].filter(Boolean).join(' ')} aria-hidden="true" />
}

/** Contador que sobe até o valor. O valor final já é o texto acessível. */
export function Contador({ valor, className }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      const mm = gsap.matchMedia()
      mm.add(COM_MOVIMENTO, () => {
        const obj = { n: 0 }
        gsap.to(obj, {
          n: valor,
          duration: 1.4,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = Math.round(obj.n).toLocaleString('pt-BR')
          },
        })
      })
      return () => mm.revert()
    },
    { dependencies: [valor], scope: ref },
  )
  return (
    <span ref={ref} className={['numerico', className].filter(Boolean).join(' ')}>
      {valor.toLocaleString('pt-BR')}
    </span>
  )
}

/**
 * Título em duas linhas, a assinatura editorial emprestada do Wine Garden:
 * a primeira em romano, a segunda em itálico na cor do destaque ("O mundo
 * todo, / taça a taça." vira "A sua / credencial."). Cada palavra sobe por
 * trás de uma máscara; o título inteiro é texto para o leitor de tela.
 */
export function TituloDuplo({ linha1, linha2, as: Tag = 'h1', className, atraso = 0.1 }: { linha1: string; linha2?: string; as?: ElementType; className?: string; atraso?: number }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(COM_MOVIMENTO, () => {
        gsap.from(ref.current!.querySelectorAll('[data-palavra]'), { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.055, delay: atraso })
      })
      return () => mm.revert()
    },
    { scope: ref },
  )
  const linha = (t: string, italico: boolean) => (
    <span aria-hidden="true" className={['block', italico ? 'inflexao pl-[0.04em]' : ''].join(' ')}>
      {t.split(' ').map((p, i, a) => (
        <Fragment key={i}>
          <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
            <span data-palavra className="inline-block">
              {p}
            </span>
          </span>
          {/* O espaço fica FORA da caixa: dentro de inline-block ele colapsa. */}
          {i < a.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  )
  return (
    <Tag ref={ref} className={className} aria-label={[linha1, linha2].filter(Boolean).join(' ')}>
      {linha(linha1, false)}
      {linha2 ? linha(linha2, true) : null}
    </Tag>
  )
}
