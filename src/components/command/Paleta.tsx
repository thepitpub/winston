'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MODULOS, moduloVisivel } from './modulos'

/**
 * Busca e comandos. ⌘K / Ctrl+K abre; Enter vai. Ir a um módulo, ou
 * buscar um membro por nome, telefone ou código de credencial (a busca de
 * verdade é feita no servidor, na lista de membros).
 */
export function Paleta({ permissoes }: { permissoes: string[] }) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setQ('')
        setI(0)
        dialogo.current?.showModal()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const opcoes = useMemo(() => {
    const termo = q.trim().toLowerCase()
    const mods = MODULOS.filter((m) => moduloVisivel(m, permissoes) && (!termo || m.nome.toLowerCase().includes(termo))).map((m) => ({ rotulo: m.nome, dica: 'Módulo', href: m.href }))
    const busca = termo && permissoes.includes('members.read') ? [{ rotulo: `Buscar membro: “${q.trim()}”`, dica: 'Members', href: `/admin/members?q=${encodeURIComponent(q.trim())}` }] : []
    return [...busca, ...mods]
  }, [q, permissoes])

  const ir = (href: string) => {
    dialogo.current?.close()
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQ('')
          setI(0)
          dialogo.current?.showModal()
        }}
        className="flex h-8 min-w-0 flex-1 items-center gap-3 rounded-xs bg-fundo-2 px-3 text-left text-sm text-discreto shadow-[inset_0_0_0_1px_var(--fio)] hover:text-apagado md:max-w-md"
      >
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.5-4.5" />
        </svg>
        <span className="truncate">Buscar membro ou ir para…</span>
        <kbd className="ml-auto hidden font-mono text-[0.68rem] text-discreto sm:inline">⌘K</kbd>
      </button>
      <dialog ref={dialogo} aria-label="Busca e comandos" className="m-auto mt-[12vh] w-[min(92vw,36rem)] bg-transparent p-0 text-tinta backdrop:bg-fundo/70" onClick={(e) => e.target === dialogo.current && dialogo.current?.close()}>
        <div className="overflow-hidden rounded-xs bg-elevado shadow-[0_30px_80px_-20px_rgba(0,0,0,.9),inset_0_0_0_1px_var(--fio-forte)]">
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setI(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setI((x) => Math.min(x + 1, opcoes.length - 1))
              else if (e.key === 'ArrowUp') setI((x) => Math.max(x - 1, 0))
              else if (e.key === 'Enter' && opcoes[i]) ir(opcoes[i].href)
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-lista"
            aria-activedescendant={opcoes[i] ? `paleta-${i}` : undefined}
            placeholder="Nome, telefone, CH-XXXX-XXXX ou módulo"
            className="h-12 w-full border-b border-[var(--fio)] bg-transparent px-4 text-tinta placeholder:text-discreto focus:outline-none"
          />
          <ul id="paleta-lista" role="listbox" className="max-h-80 overflow-y-auto py-1">
            {opcoes.map((o, k) => (
              <li key={o.href} id={`paleta-${k}`} role="option" aria-selected={k === i}>
                <button type="button" onMouseEnter={() => setI(k)} onClick={() => ir(o.href)} className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${k === i ? 'bg-elevado-3 text-tinta' : 'text-tinta-2'}`}>
                  <span>{o.rotulo}</span>
                  <span className="text-xs text-apagado">{o.dica}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  )
}
