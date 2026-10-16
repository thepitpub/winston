import Link from 'next/link'
import type { ElementType, ReactNode } from 'react'
import { Fio } from '@/components/marca/Fio'
import { Revela, TituloDuplo } from '@/components/movimento/Movimento'
import { cx } from '@/components/ui/ui'

/*
 * Peças editoriais da casa. A gramática vem do Wine Garden (seção de
 * página inteira que troca de atmosfera, rótulo mono com filete, título em
 * duas linhas, linha de números, lista numerada com filetes); o vocabulário
 * vem do Continental (o livro de registro, o fio de ouro, as moedas).
 */

export type Atmosfera = 'lobby' | 'registro' | 'veludo' | 'bronze'

/** Seção de largura total que declara a sua atmosfera. */
export function Secao({ atmosfera = 'lobby', children, className, interno, id, as: Tag = 'section', rotulo }: { atmosfera?: Atmosfera; children: ReactNode; className?: string; interno?: string; id?: string; as?: ElementType; rotulo?: string }) {
  return (
    <Tag id={id} data-atmosfera={atmosfera} aria-label={rotulo} className={cx('textura w-full', className)}>
      <div className={cx('mx-auto w-full max-w-[1440px] px-[clamp(1.125rem,4.2vw,4.5rem)] py-[clamp(3.25rem,8vh,6.5rem)]', interno)}>{children}</div>
    </Tag>
  )
}

/** Rótulo de abertura: mono em versal, com filete que segue até ~20rem. */
export function Chamada({ children, numero, className }: { children: ReactNode; numero?: string; className?: string }) {
  return (
    <p className={cx('rotulo flex items-center gap-4 text-apagado', className)}>
      {numero ? <span className="numerico text-destaque">{numero}</span> : null}
      <span>{children}</span>
      <span aria-hidden="true" className="h-px min-w-10 max-w-48 flex-1 bg-[var(--fio-forte)]" />
    </p>
  )
}

/** Cabeçalho de página: chamada, título em duas linhas, fio de ouro e o que vier abaixo. */
export function TituloPagina({ chamada, numero, linha1, linha2, texto, fio = true, curva, children, tamanho = 'xl', lateral, nivel = 'h1' }: { nivel?: 'h1' | 'h2'; chamada: ReactNode; numero?: string; linha1: string; linha2?: string; texto?: ReactNode; fio?: boolean; curva?: 'onda' | 'subida' | 'descida'; children?: ReactNode; tamanho?: 'mega' | 'xl' | 'lg'; lateral?: ReactNode }) {
  const t = { mega: 'text-display-mega', xl: 'text-display-xl', lg: 'text-display-lg' }[tamanho]
  return (
    <header className="grid content-start gap-6">
      <Revela>
        <div data-revela className="flex flex-wrap items-center justify-between gap-4">
          <Chamada numero={numero} className="min-w-0 flex-1">
            {chamada}
          </Chamada>
          {lateral}
        </div>
      </Revela>
      <TituloDuplo as={nivel} linha1={linha1} linha2={linha2} className={cx('font-display text-tinta', t)} />
      {fio ? <Fio curva={curva} className="-mt-3 max-w-5xl sm:-mt-6" /> : null}
      {texto ? (
        <Revela atraso={0.3}>
          <div data-revela className="max-w-[62ch] text-[0.95rem] leading-relaxed text-tinta-2">
            {texto}
          </div>
        </Revela>
      ) : null}
      {children}
    </header>
  )
}

/** A linha de números: rótulo mono em cima, valor embaixo. Sem caixa. */
export function Numeros({ itens, className }: { itens: { rotulo: string; valor: ReactNode; href?: string }[]; className?: string }) {
  return (
    <dl className={cx('flex flex-wrap gap-x-[clamp(1.75rem,4vw,4rem)] gap-y-5', className)}>
      {itens.map((i) => (
        <div key={i.rotulo} className="grid gap-1.5">
          <dt className="rotulo text-discreto">{i.rotulo}</dt>
          <dd className="numerico font-mono text-[0.95rem] text-tinta">
            {i.href ? (
              <Link href={i.href} className="sublinha-traco hover:text-destaque">
                {i.valor}
              </Link>
            ) : (
              i.valor
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Lista numerada com filetes, como a carta de um salão: 01, 02, 03… */
export function ListaNumerada({ children, className, rotulo }: { children: ReactNode; className?: string; rotulo?: string }) {
  return (
    <ol aria-label={rotulo} className={cx('border-b border-[var(--fio)]', className)}>
      {children}
    </ol>
  )
}

export function ItemNumerado({ numero, titulo, texto, href, meta, externo }: { numero: string; titulo: ReactNode; texto?: ReactNode; href?: string; meta?: ReactNode; externo?: boolean }) {
  const corpo = (
    <>
      <span className="numerico pt-[0.55em] font-mono text-[0.72rem] text-discreto">{numero}</span>
      <span className="min-w-0">
        <span className="block font-display text-[clamp(1.55rem,2.6vw,2.15rem)] leading-[1.05] text-tinta transition-[color] duration-300 group-hover:text-destaque group-hover:italic">{titulo}</span>
        {texto ? <span className="mt-1.5 block text-[0.84rem] leading-relaxed text-apagado">{texto}</span> : null}
      </span>
      <span className="flex items-center gap-4 self-center">
        {meta}
        {href ? (
          <span aria-hidden="true" className="font-mono text-tinta-2 transition-transform duration-300 ease-[var(--ease-brand)] group-hover:translate-x-1.5 group-hover:text-destaque">
            →
          </span>
        ) : null}
      </span>
    </>
  )
  const classe = 'group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-x-4 border-t border-[var(--fio)] py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:py-6'
  return (
    <li>
      {href ? (
        externo ? (
          <a href={href} className={classe} target="_blank" rel="noopener noreferrer">
            {corpo}
          </a>
        ) : (
          <Link href={href} className={classe}>
            {corpo}
          </Link>
        )
      ) : (
        <div className={classe}>{corpo}</div>
      )}
    </li>
  )
}

/** O livro de registro: "Rótulo ........ valor", linha a linha. */
export function Livro({ itens, className }: { itens: { rotulo: ReactNode; valor: ReactNode }[]; className?: string }) {
  return (
    <dl className={cx('grid gap-3.5', className)}>
      {itens.map((i, k) => (
        <div key={k} className="flex items-baseline gap-3 text-[0.9rem]">
          <dt className="shrink-0 text-apagado">{i.rotulo}</dt>
          <span aria-hidden="true" className="pontilhado" />
          <dd className="numerico min-w-0 text-right text-tinta">{i.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Bloco de conteúdo dentro de uma seção: filete em cima e rótulo mono. */
export function Bloco({ titulo, numero, acao, children, className, id }: { titulo?: ReactNode; numero?: string; acao?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section aria-labelledby={titulo && id ? `${id}-t` : undefined} className={cx('grid content-start gap-5 border-t border-[var(--fio-forte)] pt-5', className)}>
      {titulo || acao ? (
        <header className="flex items-baseline justify-between gap-3">
          {titulo ? (
            <h2 id={id ? `${id}-t` : undefined} className="rotulo flex items-baseline gap-3 text-tinta">
              {numero ? <span className="numerico text-destaque">{numero}</span> : null}
              {titulo}
            </h2>
          ) : (
            <span />
          )}
          {acao}
        </header>
      ) : null}
      {children}
    </section>
  )
}

/** Link de ação discreto, em mono, que se sublinha ao passar. */
export function LinkMono({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx('rotulo sublinha-traco text-apagado hover:text-destaque', className)}>
      {children}
    </Link>
  )
}
