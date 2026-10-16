import Link from 'next/link'
import type { ReactNode } from 'react'
import { cx } from '@/components/ui/ui'

/*
 * Kit do Command: a mesma gramática editorial do Portal (rótulo mono,
 * filetes, números em serifa), em densidade de sala de operação. Quase
 * nenhuma caixa: o que separa é o filete.
 */

export function Cabecalho({ codigo, titulo, descricao, acoes }: { codigo: string; titulo: string; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <header className="grid gap-4 pb-2">
      <p className="rotulo flex items-center gap-4 text-apagado">
        <span className="text-destaque">{codigo.split(' · ')[0]}</span>
        <span>{codigo.split(' · ').slice(1).join(' · ')}</span>
        <span aria-hidden="true" className="h-px max-w-48 min-w-10 flex-1 bg-[var(--fio-forte)]" />
      </p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="font-display text-[clamp(2.4rem,4.4vw,3.75rem)] leading-[0.95] text-tinta">{titulo}</h1>
          {descricao ? <p className="max-w-3xl text-[0.8rem] leading-relaxed text-apagado">{descricao}</p> : null}
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
      </div>
    </header>
  )
}

export function Bloco({ titulo, acao, children, className }: { titulo?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('grid content-start gap-4 border-t border-[var(--fio-forte)] pt-4', className)}>
      {titulo || acao ? (
        <header className="flex items-center justify-between gap-3">
          {titulo ? <h2 className="rotulo text-tinta">{titulo}</h2> : <span />}
          {acao}
        </header>
      ) : null}
      {children}
    </section>
  )
}

/** Número de operação: rótulo mono em cima, valor em serifa grande. */
export function Indicador({ rotulo, valor, detalhe, href, tom }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; href?: string; tom?: 'ouro' | 'perigo' | 'atencao' }) {
  const cor = tom === 'perigo' ? 'text-danger' : tom === 'atencao' ? 'text-attention' : tom === 'ouro' ? 'text-destaque' : 'text-tinta'
  const corpo = (
    <>
      <p className="rotulo text-discreto">{rotulo}</p>
      <p className={cx('numerico font-display text-[clamp(2.6rem,4vw,3.6rem)] leading-[0.9]', cor)}>{valor}</p>
      {detalhe ? <p className="text-[0.74rem] text-apagado">{detalhe}</p> : null}
    </>
  )
  const base = 'group grid content-start gap-3 border-t border-[var(--fio)] pt-4 pb-2'
  return href ? (
    <Link href={href} className={cx(base, 'transition-colors hover:border-destaque')}>
      {corpo}
    </Link>
  ) : (
    <div className={base}>{corpo}</div>
  )
}

export function Tabela({ legenda, children }: { legenda: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border-b border-[var(--fio)]">
      <table className="w-full min-w-[40rem] border-collapse text-[0.82rem]">
        <caption className="sr-only">{legenda}</caption>
        {children}
      </table>
    </div>
  )
}

/** Cabeçalho de coluna ordenável por URL (?ordem=campo&dir=asc|desc). */
export function Th({ children, campo, ordem, dir, base, alinhar }: { children: ReactNode; campo?: string; ordem?: string; dir?: string; base?: URLSearchParams; alinhar?: 'direita' }) {
  const classe = cx('rotulo border-b border-[var(--fio-forte)] px-3 pt-1 pb-2.5 text-left !text-[0.62rem] text-discreto', alinhar === 'direita' && 'text-right')
  if (!campo || !base) return <th scope="col" className={classe}>{children}</th>
  const ativo = ordem === campo
  const prox = new URLSearchParams(base)
  prox.set('ordem', campo)
  prox.set('dir', ativo && dir === 'asc' ? 'desc' : 'asc')
  prox.delete('p')
  return (
    <th scope="col" className={classe} aria-sort={ativo ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <Link href={`?${prox}`} className="inline-flex items-center gap-1 hover:text-tinta">
        {children}
        <span aria-hidden="true" className={ativo ? 'text-destaque' : 'text-discreto/50'}>
          {ativo ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </Link>
    </th>
  )
}

export function Td({ children, className, mono, colSpan }: { children: ReactNode; className?: string; mono?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cx('border-t border-[var(--fio)] px-3 py-3 align-middle', mono && 'numerico font-mono text-[0.8rem]', className)}>
      {children}
    </td>
  )
}

export function Paginacao({ pagina, total, porPagina, base }: { pagina: number; total: number; porPagina: number; base: URLSearchParams }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const link = (p: number) => {
    const u = new URLSearchParams(base)
    u.set('p', String(p))
    return `?${u}`
  }
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between text-xs text-apagado">
      <span className="numerico font-mono">
        {total === 0 ? 0 : (pagina - 1) * porPagina + 1}–{Math.min(total, pagina * porPagina)} de {total}
      </span>
      <span className="flex items-center gap-1">
        {pagina > 1 ? (
          <Link href={link(pagina - 1)} className="rotulo sublinha-traco px-2.5 py-1.5 hover:text-tinta">
            ← Anterior
          </Link>
        ) : null}
        <span className="numerico px-2 font-mono">
          {pagina}/{paginas}
        </span>
        {pagina < paginas ? (
          <Link href={link(pagina + 1)} className="rotulo sublinha-traco px-2.5 py-1.5 hover:text-tinta">
            Próxima →
          </Link>
        ) : null}
      </span>
    </nav>
  )
}

export function SemPermissao() {
  return (
    <div className="grid gap-3 border-t border-[var(--fio-forte)] py-10">
      <p className="font-display text-display-sm text-tinta-2 italic">Sem acesso a este módulo.</p>
      <p className="text-[0.82rem] text-apagado">O seu papel não inclui esta permissão. Peça a um super admin em Audit & Settings.</p>
    </div>
  )
}

/** Barra de filtros por GET: formulário simples, URL compartilhável. */
export function Filtros({ children }: { children: ReactNode }) {
  return (
    <form className="flex flex-wrap items-end gap-x-5 gap-y-3" role="search">
      {children}
      <button type="submit" className="rotulo h-9 rounded-full px-5 text-tinta shadow-[inset_0_0_0_1px_currentColor] transition-colors hover:bg-destaque hover:text-sobre-destaque hover:shadow-none">
        Filtrar
      </button>
    </form>
  )
}

export const entradaCompacta = 'h-9 bg-transparent px-0 text-[0.84rem] text-tinta placeholder:text-discreto border-b border-[var(--fio-forte)] focus:border-destaque focus:outline-none [&>option]:bg-elevado'
