'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Relogio } from '@/components/marca/Relogio'
import { entrarPelasPortas } from '../acoes'

gsap.registerPlugin(useGSAP)

/*
 * AS PORTAS DO CONTINENTAL.
 *
 * A fachada é um SVG desenhado aqui (nenhuma imagem): torre art déco em
 * recuos, pilastras de filete dourado, janelas acesas por uma regra fixa,
 * o letreiro CONTINENTAL sobre a marquise, os lampiões e o leque da
 * bandeira da porta. As duas folhas da porta são HTML, para girar em 3D.
 *
 * Ao tocar em Entrar: o letreiro acende como neon, as janelas acendem,
 * as folhas giram para dentro, a luz quente do saguão cresce e a câmera
 * entra pela porta. A sessão é pedida ao servidor em paralelo; a
 * navegação só acontece quando as duas coisas terminam.
 */

const VB = { w: 1200, h: 900 }
const PORTA = { x: 520, y: 600, w: 160, h: 200 }
const pct = (v: number, t: number) => `${(v / t) * 100}%`

/* Janelas: acesas por regra fixa (sem aleatoriedade: o servidor e o navegador desenham igual). */
const acesa = (c: number, l: number) => (c * 7 + l * 13 + c * l) % 5 === 0
const JANELAS_TORRE = Array.from({ length: 8 }, (_, c) => Array.from({ length: 4 }, (_, l) => ({ x: 300 + c * 75 + 19, y: 248 + l * 64, acesa: acesa(c, l) }))).flat()
const JANELAS_ALAS = [200, 900].flatMap((x0, a) => Array.from({ length: 2 }, (_, c) => Array.from({ length: 5 }, (_, l) => ({ x: x0 + 14 + c * 46, y: 400 + l * 74, acesa: acesa(c + a * 3, l + 1) }))).flat())
const RAIOS = Array.from({ length: 13 }, (_, i) => (Math.PI * i) / 12)

export function Portas() {
  const router = useRouter()
  const cena = useRef<HTMLDivElement>(null)
  const raiz = useRef<HTMLElement>(null)
  const [estado, setEstado] = useState<'parado' | 'abrindo' | 'erro'>('parado')
  const [erro, setErro] = useState<string | null>(null)

  // Repouso: o letreiro respira e um fio de luz escapa entre as folhas.
  useGSAP(
    () => {
      gsap.set(cena.current, { xPercent: -50 })
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-entra]', { autoAlpha: 0, y: 14, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.2 })
        gsap.from(cena.current, { yPercent: 6, autoAlpha: 0, duration: 1.6, ease: 'expo.out' })
        gsap.to('[data-letreiro]', { opacity: 0.82, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        gsap.to('[data-fresta]', { opacity: 0.55, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      })
    },
    { scope: raiz },
  )

  const entrar = async () => {
    if (estado === 'abrindo') return
    setEstado('abrindo')
    setErro(null)
    try {
      sessionStorage.setItem('ch_abertura_vista', '1') // a cortina do selo não repete depois das portas
    } catch {}
    const sessao = entrarPelasPortas()
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let animacao: Promise<unknown> = Promise.resolve()
    let tl: gsap.core.Timeline | null = null
    if (!semMovimento) {
      const q = gsap.utils.selector(raiz.current)
      gsap.killTweensOf(q('[data-letreiro], [data-fresta]'))
      tl = gsap.timeline()
      tl.to(q('[data-entra]'), { autoAlpha: 0, y: -10, duration: 0.45, ease: 'power2.in', stagger: 0.04 })
        // O neon acende: dois tremores e firma.
        .to(q('[data-letreiro]'), { keyframes: [{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], duration: 0.5, ease: 'none' }, 0.1)
        .to(q('[data-brilho]'), { opacity: 1, duration: 0.6 }, 0.3)
        .to(q('[data-janela="apagada"]'), { fill: '#d2b67e', fillOpacity: 0.55, duration: 0.25, stagger: { each: 0.02, from: 'random' } }, 0.25)
        .to(q('[data-lampiao]'), { opacity: 0.6, duration: 0.5 }, 0.35)
        // As folhas giram para dentro do saguão.
        .to(q('[data-folha="esq"]'), { rotateY: -108, duration: 1.5, ease: 'power3.inOut' }, 0.7)
        .to(q('[data-folha="dir"]'), { rotateY: 108, duration: 1.5, ease: 'power3.inOut' }, 0.7)
        .to(q('[data-saguao]'), { opacity: 1, scale: 1.08, duration: 1.2, ease: 'power2.out' }, 0.9)
        .to(q('[data-fresta]'), { opacity: 0, duration: 0.3 }, 0.75)
        // A câmera entra pela porta.
        .to(cena.current, { scale: 9, duration: 1.7, ease: 'power3.in' }, 1.45)
        .to(q('[data-ceu]'), { opacity: 0, duration: 0.8 }, 1.6)
        .to(q('[data-clarao]'), { opacity: 1, duration: 0.55, ease: 'power1.in' }, 2.55)
      animacao = tl.then(() => undefined)
    }

    const [r] = await Promise.all([sessao, animacao])
    if (r.ok) {
      router.replace('/lobby')
      return
    }
    // A porta não abriu: volta tudo e diz por quê.
    if (tl) await tl.reverse().then(() => undefined)
    setErro(r.erro)
    setEstado('erro')
  }

  return (
    <main ref={raiz} data-atmosfera="lobby" className="relative h-dvh overflow-hidden" style={{ perspective: '1600px' }}>
      {/* céu noturno e névoa da rua */}
      <div data-ceu aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_100%,#1e2227_0%,#0b0d0f_55%,#060708_100%)]" />

      {/* a cena: proporção fixa 4:3, ancorada no chão e cortada nas laterais em telas estreitas */}
      <div
        ref={cena}
        aria-hidden="true"
        className="absolute bottom-[clamp(6.5rem,15dvh,8.5rem)] left-1/2 aspect-[4/3] h-[max(min(78dvh,75vw),58dvh)] will-change-transform"
        style={{ transformOrigin: `50% ${((PORTA.y + PORTA.h / 2) / VB.h) * 100}%` }}
      >

        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="pedra" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1e2227" />
              <stop offset="1" stopColor="#0f1215" />
            </linearGradient>
            <filter id="neon" x="-20%" y="-60%" width="140%" height="220%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="poça" cx="50%" cy="0%" r="60%">
              <stop offset="0" stopColor="#d2b67e" stopOpacity=".28" />
              <stop offset="1" stopColor="#d2b67e" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* torre em recuos, alas e agulha */}
          <g fill="url(#pedra)" stroke="#b99a62" strokeOpacity=".38" strokeWidth="1.2">
            <rect x="200" y="380" width="100" height="420" />
            <rect x="900" y="380" width="100" height="420" />
            <rect x="300" y="220" width="600" height="580" />
            <rect x="360" y="152" width="480" height="68" />
            <rect x="430" y="98" width="340" height="54" />
            <rect x="520" y="58" width="160" height="40" />
          </g>
          <line x1="600" y1="8" x2="600" y2="58" stroke="#b99a62" strokeWidth="1.4" />
          <circle cx="600" cy="8" r="3" fill="#d2b67e" />
          {/* frisos déco dos recuos */}
          <g stroke="#b99a62" strokeOpacity=".55" strokeWidth="1">
            <path d="M360 162 H840 M430 108 H770 M520 68 H680" />
            <path d="M560 58 L600 30 L640 58" fill="none" />
          </g>
          {/* pilastras */}
          <g stroke="#b99a62" strokeOpacity=".22" strokeWidth="1">
            {Array.from({ length: 9 }, (_, i) => 300 + i * 75).map((x) => (
              <line key={x} x1={x} x2={x} y1="220" y2="505" />
            ))}
          </g>
          {/* janelas */}
          <g>
            {[...JANELAS_TORRE, ...JANELAS_ALAS].map((j, i) => (
              <rect key={i} data-janela={j.acesa ? 'acesa' : 'apagada'} x={j.x} y={j.y} width={j.x < 300 || j.x > 900 ? 26 : 37} height="44" rx="1" fill={j.acesa ? '#d2b67e' : '#0b0d0f'} fillOpacity={j.acesa ? 0.5 : 1} stroke="#b99a62" strokeOpacity=".2" />
            ))}
          </g>

          {/* letreiro sobre a marquise */}
          <rect x="404" y="505" width="392" height="46" fill="#0b0d0f" stroke="#b99a62" strokeOpacity=".7" />
          <g data-brilho opacity=".55" filter="url(#neon)">
            <text x="600" y="539" textAnchor="middle" fontFamily="var(--font-display), serif" fontSize="31" letterSpacing="9" fill="#f1dfae">
              CONTINENTAL
            </text>
          </g>
          <text data-letreiro x="600" y="539" textAnchor="middle" fontFamily="var(--font-display), serif" fontSize="31" letterSpacing="9" fill="#fff6dc" opacity=".95">
            CONTINENTAL
          </text>

          {/* marquise com franja */}
          <path d="M486 552 H714 L734 570 H466 Z" fill="#171a1e" stroke="#b99a62" strokeOpacity=".6" />
          <g stroke="#b99a62" strokeOpacity=".45">
            {Array.from({ length: 27 }, (_, i) => 470 + i * 10).map((x) => (
              <line key={x} x1={x} x2={x} y1="570" y2="576" />
            ))}
          </g>

          {/* bandeira da porta: leque déco */}
          <path d={`M${PORTA.x} 600 V586 A80 30 0 0 1 ${PORTA.x + PORTA.w} 586 V600 Z`} fill="#0f1215" stroke="#b99a62" strokeOpacity=".7" />
          <g stroke="#d2b67e" strokeOpacity=".55" strokeWidth=".9">
            {RAIOS.map((a, i) => (
              <line key={i} x1="600" y1="600" x2={600 - Math.cos(a) * 76} y2={600 - Math.sin(a) * 26} />
            ))}
          </g>
          {/* moldura da porta */}
          <rect x={PORTA.x - 8} y="580" width={PORTA.w + 16} height="222" fill="none" stroke="#b99a62" strokeOpacity=".75" strokeWidth="1.4" />

          {/* lampiões */}
          {[490, 710].map((x) => (
            <g key={x}>
              <circle data-lampiao cx={x} cy="640" r="16" fill="#e0c891" opacity=".28" filter="url(#neon)" />
              <rect x={x - 5} y="630" width="10" height="18" fill="#e0c891" stroke="#b99a62" />
              <line x1={x} x2={x} y1="648" y2="700" stroke="#b99a62" strokeOpacity=".6" />
            </g>
          ))}

          {/* degraus, calçada e o reflexo da luz da porta */}
          <g fill="#14171a" stroke="#b99a62" strokeOpacity=".3">
            <rect x="500" y="800" width="200" height="8" />
            <rect x="484" y="808" width="232" height="8" />
            <rect x="468" y="816" width="264" height="8" />
          </g>
          <ellipse cx="600" cy="826" rx="260" ry="40" fill="url(#poça)" />
        </svg>

        {/* o saguão, na abertura da porta, por cima da fachada e por baixo das folhas: luz quente */}
        <div data-saguao className="absolute opacity-45" style={{ left: pct(PORTA.x, VB.w), top: pct(PORTA.y, VB.h), width: pct(PORTA.w, VB.w), height: pct(PORTA.h, VB.h), background: 'radial-gradient(80% 70% at 50% 60%, #fff3d6 0%, #e0c891 35%, #b99a62 62%, #3d1f27 100%)' }} />

        {/* fresta de luz entre as folhas */}
        <div data-fresta className="absolute w-[2px] -translate-x-1/2 bg-[#fff3d6] opacity-25 blur-[1px]" style={{ left: '50%', top: pct(PORTA.y, VB.h), height: pct(PORTA.h, VB.h) }} />

        {/* as duas folhas da porta, em 3D */}
        <div className="absolute flex" style={{ left: pct(PORTA.x, VB.w), top: pct(PORTA.y, VB.h), width: pct(PORTA.w, VB.w), height: pct(PORTA.h, VB.h), perspective: '900px' }}>
          <Folha lado="esq" />
          <Folha lado="dir" />
        </div>
      </div>

      {/* clarão final: a luz do saguão toma a tela */}
      <div data-clarao aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" style={{ background: 'radial-gradient(60% 60% at 50% 55%, #fff3d6 0%, #d2b67e 45%, #0b0d0f 100%)' }} />

      {/* a interface por cima da cena */}
      <div className="relative z-10 flex h-full flex-col justify-between px-[clamp(1.25rem,5vw,4.5rem)] pt-[calc(var(--safe-top)+1.75rem)] pb-[calc(var(--safe-bottom)+1.75rem)]">
        <div data-entra className="flex items-center justify-between">
          <p className="rotulo text-apagado">
            <span className="hidden sm:inline">Continental Heritage · </span>Private members
          </p>
          <Relogio className="text-apagado" />
        </div>
        <div className="grid justify-items-center gap-4 text-center">
          <h1 data-entra className="sr-only">
            Continental Heritage. Entrar.
          </h1>
          <button
            data-entra
            type="button"
            onClick={entrar}
            disabled={estado === 'abrindo'}
            className="rotulo inline-flex min-h-12 items-center gap-3 rounded-full bg-destaque px-10 text-sobre-destaque shadow-[0_18px_50px_-12px_rgba(210,182,126,.55)] transition-[background,transform] duration-300 hover:bg-destaque-vivo active:scale-[.98] disabled:opacity-80"
          >
            {estado === 'abrindo' ? 'Abrindo as portas…' : 'Entrar'}
          </button>
          <p data-entra className="text-[0.74rem] text-apagado">
            Modo apresentação · você entra como membro de demonstração
          </p>
          {erro ? (
            <p role="alert" className="text-[0.8rem] text-danger">
              {erro}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  )
}

/** Uma folha da porta: obsidiana, bronze e vidro com raios déco; puxador de latão no centro. */
function Folha({ lado }: { lado: 'esq' | 'dir' }) {
  const esq = lado === 'esq'
  return (
    <div
      data-folha={lado}
      className="relative h-full w-1/2 border border-[#b99a62]/70 [backface-visibility:hidden] [transform-style:preserve-3d]"
      style={{ transformOrigin: esq ? 'left center' : 'right center', background: 'linear-gradient(180deg,#1e2227,#0f1215 60%,#171a1e)' }}
    >
      {/* vidro com caixilhos */}
      <div className="absolute inset-x-[16%] top-[9%] bottom-[38%] border border-[#b99a62]/60" style={{ background: 'repeating-linear-gradient(90deg, rgba(210,182,126,.16) 0 1px, transparent 1px 22%), linear-gradient(180deg, rgba(224,200,145,.22), rgba(81,44,53,.35))' }} />
      {/* almofada déco em chevrons */}
      <div className="absolute inset-x-[16%] top-[68%] bottom-[9%] border border-[#b99a62]/45" style={{ background: 'repeating-linear-gradient(135deg, rgba(185,154,98,.18) 0 1px, transparent 1px 7px), repeating-linear-gradient(45deg, rgba(185,154,98,.18) 0 1px, transparent 1px 7px)' }} />
      {/* puxador de latão */}
      <div className={`absolute top-[44%] h-[18%] w-[5%] rounded-full bg-[linear-gradient(90deg,#8a7246,#e0c891,#8a7246)] ${esq ? 'right-[8%]' : 'left-[8%]'}`} />
    </div>
  )
}
