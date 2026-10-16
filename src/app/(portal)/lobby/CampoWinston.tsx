'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

const SUGESTOES = ['Qual é o meu saldo de Gold Coins?', 'Quem no diretório trabalha com investimentos?', 'Preciso de ajuda com a minha credencial']

/**
 * O balcão do Winston no Lobby: uma linha só, como a busca da carta de
 * vinhos do Wine Garden. Escreve aqui, a conversa continua em /winston.
 */
export function CampoWinston() {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const ir = (t: string) => router.push(`/winston?c=nova&pergunta=${encodeURIComponent(t.slice(0, 500))}`)
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (texto.trim()) ir(texto.trim())
  }
  return (
    <div className="grid gap-5">
      <form onSubmit={enviar} className="group flex items-center gap-4 border-y border-[var(--fio)] py-2 transition-colors focus-within:border-[var(--fio-forte)]">
        <span aria-hidden="true" className="rotulo hidden shrink-0 text-destaque sm:block">
          Winston ·
        </span>
        <label htmlFor="winston-lobby" className="sr-only">
          Pergunte ao Winston
        </label>
        <input
          id="winston-lobby"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Diga ao Winston do que precisa…"
          maxLength={500}
          className="min-h-14 min-w-0 flex-1 bg-transparent font-display text-[clamp(1.35rem,2.6vw,2rem)] text-tinta placeholder:text-discreto placeholder:italic focus:outline-none"
        />
        <button type="submit" className="rotulo inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-tinta shadow-[inset_0_0_0_1px_currentColor] transition-colors hover:bg-destaque hover:text-sobre-destaque hover:shadow-none disabled:opacity-40" disabled={!texto.trim()}>
          Pedir <span aria-hidden="true">→</span>
        </button>
      </form>
      <ul className="flex flex-wrap gap-x-7 gap-y-2" aria-label="Sugestões">
        {SUGESTOES.map((s) => (
          <li key={s}>
            <button type="button" onClick={() => ir(s)} className="sublinha-traco text-left text-[0.8rem] text-apagado transition-colors hover:text-tinta">
              <span aria-hidden="true" className="mr-2 text-destaque">↳</span>
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
