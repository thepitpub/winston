import Link from 'next/link'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ botão */

type Variante = 'ouro' | 'linha' | 'fantasma' | 'perigo'
/*
 * Botões de balcão: pílula, mono em versal, como o RESERVAR do Wine Garden.
 * `ouro` é a ação principal (preenchido); `linha` contorna com a cor do
 * texto e preenche ao passar.
 */
const VARIANTE: Record<Variante, string> = {
  ouro: 'bg-destaque text-sobre-destaque hover:bg-destaque-vivo',
  linha: 'text-tinta shadow-[inset_0_0_0_1px_currentColor] hover:bg-tinta hover:text-fundo hover:shadow-[inset_0_0_0_1px_var(--color-tinta)]',
  fantasma: 'text-tinta-2 hover:text-tinta hover:bg-elevado-2',
  perigo: 'text-danger shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-danger)_55%,transparent)] hover:bg-danger hover:text-fundo',
}
const BASE_BOTAO =
  'inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full px-6 font-mono text-[0.72rem] font-medium uppercase tracking-[0.14em] transition-[background,color,box-shadow,transform] duration-300 ease-[var(--ease-brand)] active:scale-[.985] disabled:pointer-events-none disabled:opacity-45'

export function Botao({ variante = 'ouro', bloco, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; bloco?: boolean }) {
  return (
    <button {...p} className={cx(BASE_BOTAO, VARIANTE[variante], bloco && 'w-full', className)}>
      {children}
    </button>
  )
}

export function BotaoLink({ href, variante = 'linha', bloco, className, children }: { href: string; variante?: Variante; bloco?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx(BASE_BOTAO, VARIANTE[variante], bloco && 'w-full', className)}>
      {children}
    </Link>
  )
}

/* ------------------------------------------------------------------ campo */

export function Campo({ rotulo, id, erro, dica, children }: { rotulo: string; id: string; erro?: string; dica?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="rotulo text-apagado">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-msg`} role="alert" className="text-[0.82rem] text-danger">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-msg`} className="text-[0.82rem] text-apagado">
          {dica}
        </p>
      ) : null}
    </div>
  )
}

/* Campo de ficha: só o sublinhado, como a busca da carta de vinhos. */
const BASE_ENTRADA =
  'min-h-12 w-full bg-transparent px-0 text-tinta placeholder:text-discreto border-b border-[var(--fio-forte)] transition-[border-color] focus:border-destaque focus:outline-none aria-[invalid=true]:border-danger'

export function Entrada(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(BASE_ENTRADA, p.className)} />
}
export function AreaTexto(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx('min-h-32 w-full rounded-xs bg-transparent p-3.5 leading-relaxed text-tinta placeholder:text-discreto shadow-[inset_0_0_0_1px_var(--fio-forte)] transition-shadow focus:shadow-[inset_0_0_0_1px_var(--color-destaque)] focus:outline-none aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--color-danger)]', p.className)} />
}
export function Selecao(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...p}
      className={cx(
        BASE_ENTRADA,
        "appearance-none bg-[length:10px_6px] bg-[right_2px_center] bg-no-repeat pr-6 [background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='%23b99a62' stroke-width='1.2'/></svg>\")] [&>option]:bg-elevado [&>option]:text-tinta",
        p.className,
      )}
    />
  )
}

/* ------------------------------------------------------------- superfícies */

/** Painel editorial: filete em cima, rótulo mono, sem caixa. */
export function Painel({ titulo, acao, children, className, id }: { titulo?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section aria-labelledby={titulo && id ? `${id}-t` : undefined} className={cx('grid content-start gap-5 border-t border-[var(--fio-forte)] pt-5', className)}>
      {titulo || acao ? (
        <header className="flex items-baseline justify-between gap-3">
          {titulo ? (
            <h2 id={id ? `${id}-t` : undefined} className="rotulo text-tinta">
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

type Tom = 'ok' | 'atencao' | 'perigo' | 'neutro' | 'ouro' | 'info'
const TOM: Record<Tom, string> = {
  ok: 'text-ok',
  atencao: 'text-attention',
  perigo: 'text-danger',
  neutro: 'text-apagado',
  ouro: 'text-destaque',
  info: 'text-info',
}
/** Etiqueta de estado: ponto aceso e rótulo mono, como o "Aberto agora". */
export function Etiqueta({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span className={cx('rotulo inline-flex items-center gap-2 whitespace-nowrap', TOM[tom])}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  )
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-2 py-2">
      <p className="font-display text-[1.6rem] leading-tight text-tinta-2 italic">{titulo}</p>
      {texto ? <p className="max-w-prose text-[0.84rem] leading-relaxed text-apagado">{texto}</p> : null}
      {acao}
    </div>
  )
}

export function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="esqueleto h-4" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  )
}

export function Aviso({ tom = 'neutro', children }: { tom?: 'ok' | 'perigo' | 'neutro' | 'atencao'; children: ReactNode }) {
  const cor = { ok: 'text-ok', perigo: 'text-danger', neutro: 'text-tinta-2', atencao: 'text-attention' }[tom]
  return (
    <p role={tom === 'perigo' ? 'alert' : 'status'} className={cx('text-[0.84rem]', cor)}>
      {children}
    </p>
  )
}

export { cx }
