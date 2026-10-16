'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { sairDaCasa } from '@/app/(acesso)/acoes'
import { Marca } from '@/components/marca/Marca'
import { Monograma } from '@/components/marca/Monograma'
import { Relogio } from '@/components/marca/Relogio'
import { abrirSino } from './sino'

/*
 * O cabeçalho da casa, na gramática do Wine Garden: letreiro à esquerda,
 * navegação em mono versal ao centro, ação principal em pílula à direita
 * (lá RESERVAR, aqui SERVICE BELL) e o MENU de tela cheia. É sempre
 * obsidiana translúcida, porque as seções embaixo trocam de atmosfera
 * (inclusive para o papel marfim); ao rolar, ganha o filete inferior.
 */

export const SALAS = [
  { href: '/lobby', nome: 'Grand Lobby', curto: 'Lobby', texto: 'A recepção: avisos, atividade e o Winston à mão.' },
  { href: '/credential', nome: 'The Credential', curto: 'Credencial', texto: 'O seu cartão e o código de entrada.' },
  { href: '/directory', nome: 'The Directory', curto: 'Diretório', texto: 'Quem escolheu ser encontrado.' },
  { href: '/winston', nome: 'Winston Concierge', curto: 'Winston', texto: 'Pergunte. O que pedir ação vira solicitação.' },
  { href: '/gold-coins', nome: 'Gold Coins', curto: 'Coins', texto: 'O saldo e o livro de lançamentos.' },
  { href: '/requests', nome: 'Solicitações', curto: 'Pedidos', texto: 'O que você pediu à casa.' },
  { href: '/settings', nome: 'Configurações', curto: 'Ajustes', texto: 'Nome, diretório, telefone e sessões.' },
] as const

const ativo = (atual: string, href: string) => atual === href || atual.startsWith(href + '/')

/* Rolagem como store externo: sem setState em efeito. */
const inscreverRolagem = (f: () => void) => {
  window.addEventListener('scroll', f, { passive: true })
  return () => window.removeEventListener('scroll', f)
}
const rolou = () => window.scrollY > 24

export function Cabecalho({ nome }: { nome: string }) {
  const atual = usePathname()
  const condensado = useSyncExternalStore(inscreverRolagem, rolou, () => false)
  const menu = useRef<HTMLDialogElement>(null)
  const [aberto, setAberto] = useState(false)

  // Trocar de página fecha o menu.
  useEffect(() => {
    menu.current?.close()
  }, [atual])

  return (
    <>
      <header
        data-atmosfera="lobby"
        className={[
          'fixed inset-x-0 top-0 z-40 pt-[var(--safe-top)] transition-[background-color,backdrop-filter,box-shadow] duration-500',
          '!bg-[color-mix(in_oklab,var(--color-fundo)_90%,transparent)] backdrop-blur-xl',
          condensado ? 'shadow-[0_1px_0_var(--fio)]' : '',
        ].join(' ')}
      >
        <div className="mx-auto flex h-[var(--cabecalho-h)] w-full max-w-[1440px] items-center justify-between gap-6 px-[clamp(1.125rem,4.2vw,4.5rem)]">
          <Link href="/lobby" className="flex min-h-11 items-center" aria-label="Continental Heritage, Grand Lobby">
            <Marca />
          </Link>

          <nav aria-label="Salas da casa" className="hidden xl:block">
            <ul className="flex items-center gap-[clamp(1.1rem,2vw,2.25rem)]">
              {SALAS.slice(0, 6).map((s) => (
                <li key={s.href}>
                  <Link href={s.href} aria-current={ativo(atual, s.href) ? 'page' : undefined} className="rotulo sublinha-traco inline-flex min-h-11 items-center text-tinta-2 hover:text-tinta aria-[current=page]:text-destaque">
                    {s.curto}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-[clamp(.75rem,1.5vw,1.5rem)]">
            <button type="button" onClick={abrirSino} className="rotulo hidden min-h-10 items-center gap-2.5 rounded-full px-5 text-tinta shadow-[inset_0_0_0_1px_currentColor] transition-colors duration-300 hover:bg-destaque hover:text-sobre-destaque hover:shadow-[inset_0_0_0_1px_var(--color-destaque)] sm:inline-flex">
              <IconeSino />
              Service Bell
            </button>
            <button
              type="button"
              onClick={() => {
                menu.current?.showModal()
                setAberto(true)
              }}
              aria-haspopup="dialog"
              aria-expanded={aberto}
              className="rotulo inline-flex min-h-11 items-center gap-3 text-tinta"
            >
              Menu
              <span aria-hidden="true" className="grid w-6 gap-[5px]">
                <span className="h-px bg-current" />
                <span className="h-px w-4 justify-self-end bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <dialog
        ref={menu}
        aria-label="Menu da casa"
        onClose={() => setAberto(false)}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-tinta backdrop:bg-transparent open:animate-[menu-entra_.5s_var(--ease-brand)]"
      >
        <div data-atmosfera="veludo" className="textura flex min-h-dvh flex-col">
          <div className="mx-auto flex h-[var(--cabecalho-h)] w-full max-w-[1440px] shrink-0 items-center justify-between px-[clamp(1.125rem,4.2vw,4.5rem)] pt-[var(--safe-top)]">
            <Marca />
            <button type="button" onClick={() => menu.current?.close()} className="rotulo inline-flex min-h-11 items-center gap-3">
              Fechar
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="mx-auto grid w-full max-w-[1440px] flex-1 content-center gap-12 px-[clamp(1.125rem,4.2vw,4.5rem)] py-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end">
            <nav aria-label="Salas da casa">
              <ol className="border-b border-[var(--fio)]">
                {SALAS.map((s, i) => (
                  <li key={s.href}>
                    <Link href={s.href} aria-current={ativo(atual, s.href) ? 'page' : undefined} className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 border-t border-[var(--fio)] py-3 sm:py-4">
                      <span className="numerico font-mono text-[0.72rem] text-discreto">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-display text-[clamp(2rem,5.2vw,3.6rem)] leading-none transition-colors group-hover:text-destaque group-hover:italic group-aria-[current=page]:text-destaque group-aria-[current=page]:italic">{s.nome}</span>
                      <span className="hidden max-w-[22ch] text-right text-[0.78rem] text-apagado md:block">{s.texto}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="grid content-end gap-8">
              <div className="flex items-center gap-4">
                <Monograma nome={nome} tamanho={52} destaque />
                <div className="min-w-0">
                  <p className="truncate font-display text-[1.7rem] leading-tight">{nome}</p>
                  <Relogio className="text-apagado" />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    menu.current?.close()
                    abrirSino()
                  }}
                  className="rotulo inline-flex min-h-11 items-center gap-2.5 rounded-full bg-destaque px-6 text-sobre-destaque transition-colors hover:bg-destaque-vivo"
                >
                  <IconeSino />
                  Service Bell
                </button>
                <form action={sairDaCasa}>
                  <button type="submit" className="rotulo inline-flex min-h-11 items-center rounded-full px-6 shadow-[inset_0_0_0_1px_currentColor] transition-colors hover:bg-tinta hover:text-fundo">
                    Sair da casa
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  )
}

/** No celular: quatro salas e o sino ao centro, dentro da área segura. */
export function BarraMovel() {
  const atual = usePathname()
  const itens = [SALAS[0], SALAS[1], null, SALAS[3], SALAS[4]] as const
  return (
    <nav data-atmosfera="lobby" aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-40 !bg-[color-mix(in_oklab,var(--color-fundo)_90%,transparent)] pb-[var(--safe-bottom)] shadow-[0_-1px_0_var(--fio)] backdrop-blur-xl sm:hidden">
      <ul className="grid grid-cols-5 items-center">
        {itens.map((s, i) =>
          s ? (
            <li key={s.href}>
              <Link href={s.href} aria-current={ativo(atual, s.href) ? 'page' : undefined} className="rotulo grid min-h-14 place-items-center !text-[0.6rem] text-discreto aria-[current=page]:text-destaque">
                {s.curto}
              </Link>
            </li>
          ) : (
            <li key={i} className="grid place-items-center">
              <button type="button" onClick={abrirSino} aria-label="Service Bell: falar com a equipe" className="grid size-12 place-items-center rounded-full bg-destaque text-sobre-destaque shadow-[0_8px_30px_-8px_var(--color-destaque)]">
                <IconeSino />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}

function IconeSino() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5 17h14l-1.5-2.2V11a5.5 5.5 0 0 0-11 0v3.8z" />
      <path d="M3 20h18M12 4v1.5M10.3 20a1.7 1.7 0 0 0 3.4 0" />
    </svg>
  )
}
