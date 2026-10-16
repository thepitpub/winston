'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MODULOS, moduloVisivel } from './modulos'

/**
 * Trilho compacto do Command: códigos de duas letras (como placas de
 * corredor), o nome aparece ao lado em telas largas. Só mostra o que a
 * pessoa pode abrir; quem protege é o servidor.
 */
export function Trilho({ permissoes }: { permissoes: string[] }) {
  const atual = usePathname()
  const visiveis = MODULOS.filter((m) => moduloVisivel(m, permissoes))
  return (
    <nav aria-label="Módulos do Command" className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r border-[var(--fio)] bg-fundo md:flex xl:w-56">
      <Link href="/admin" className="flex h-16 items-center gap-3 border-b border-[var(--fio)] px-4" aria-label="Continental Command, Overview">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-burgundy font-display text-lg text-marfim italic">C</span>
        <span className="hidden leading-none xl:grid xl:gap-1">
          <span className="font-display text-[1.05rem] tracking-[0.18em] text-tinta">CONTINENTAL</span>
          <span className="font-display text-[0.95rem] text-destaque italic">Command</span>
        </span>
      </Link>
      <ul className="grid gap-px py-3">
        {visiveis.map((m) => {
          const ativo = m.href === '/admin' ? atual === '/admin' : atual.startsWith(m.href)
          return (
            <li key={m.href}>
              <Link
                href={m.href}
                title={m.nome}
                aria-current={ativo ? 'page' : undefined}
                className="group relative flex h-11 items-center gap-3 px-4 text-[0.8rem] text-tinta-2 transition-colors hover:text-tinta aria-[current=page]:text-tinta"
              >
                {ativo ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-px bg-destaque" /> : null}
                <span className="numerico grid w-8 place-items-center font-mono text-[0.66rem] tracking-[0.14em] text-discreto group-aria-[current=page]:text-destaque">{m.codigo}</span>
                <span className="hidden truncate font-display text-[1.15rem] leading-none group-hover:italic group-aria-[current=page]:italic xl:inline">{m.nome}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** No celular: a mesma navegação como faixa rolável no topo. */
export function TrilhoMovel({ permissoes }: { permissoes: string[] }) {
  const atual = usePathname()
  const visiveis = MODULOS.filter((m) => moduloVisivel(m, permissoes))
  return (
    <nav aria-label="Módulos do Command" className="flex gap-1 overflow-x-auto border-b border-[var(--fio)] bg-fundo px-2 py-1.5 md:hidden">
      {visiveis.map((m) => {
        const ativo = m.href === '/admin' ? atual === '/admin' : atual.startsWith(m.href)
        return (
          <Link key={m.href} href={m.href} aria-current={ativo ? 'page' : undefined} className="rotulo shrink-0 px-3 py-2.5 whitespace-nowrap text-apagado aria-[current=page]:text-destaque">
            {m.nome}
          </Link>
        )
      })}
    </nav>
  )
}
