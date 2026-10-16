'use client'

import { useAcao } from '@/components/ui/useAcao'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { AreaTexto, Aviso, Botao, Campo, Entrada, Selecao } from '@/components/ui/ui'
import { CATEGORIAS, CATEGORIA_ROTULO } from '@/lib/dominio/concierge'
import { tocarSino } from '@/app/(portal)/acoes'
import { EVENTO_SINO } from './sino'

/**
 * O Service Bell: sempre à mão (cabeçalho, menu, barra do celular), abre
 * uma folha de solicitação. Cada
 * abertura monta um formulário novo com chave própria; enviar duas vezes
 * a mesma não duplica, e reabrir depois de um envio começa do zero.
 * Usa <dialog> nativo: foco preso, Esc fecha, fundo inerte.
 */
export function ServiceBell() {
  const ref = useRef<HTMLDialogElement>(null)
  const [rodada, setRodada] = useState<{ n: number; chave: string } | null>(null)
  const id = useId()

  // Qualquer botão da casa toca o sino (cabeçalho, barra do celular, menu).
  useEffect(() => {
    const abrir = () => {
      setRodada((r) => ({ n: (r?.n ?? 0) + 1, chave: crypto.randomUUID() }))
      ref.current?.showModal()
    }
    window.addEventListener(EVENTO_SINO, abrir)
    return () => window.removeEventListener(EVENTO_SINO, abrir)
  }, [])
  const fechar = () => ref.current?.close()

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-t`}
      className="m-0 mt-auto h-auto max-h-[92dvh] w-full max-w-none bg-transparent p-0 text-tinta backdrop:bg-[rgb(11_13_15/.72)] backdrop:backdrop-blur-sm open:animate-[sobe_.5s_var(--ease-brand)] sm:mr-0 sm:ml-auto sm:h-dvh sm:max-h-none sm:w-[min(32rem,100vw)]"
      onClick={(e) => e.target === ref.current && fechar()}
    >
      <div data-atmosfera="veludo" className="textura grid min-h-full content-start gap-8 overflow-y-auto px-[clamp(1.25rem,4vw,2.75rem)] pt-7 pb-[calc(2rem+var(--safe-bottom))] sm:pt-[calc(var(--safe-top)+2rem)]">
        <header className="grid gap-5">
          <div className="flex items-center justify-between gap-4">
            <p className="rotulo flex items-center gap-3 text-apagado">
              <span className="text-destaque">◆</span> Service Bell
            </p>
            <button type="button" onClick={fechar} className="rotulo inline-flex min-h-11 items-center gap-2 text-tinta-2 hover:text-tinta" aria-label="Fechar">
              Fechar
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <h2 id={`${id}-t`} className="font-display text-display-md">
            Como podemos <span className="inflexao">ajudar?</span>
          </h2>
          <p className="text-[0.84rem] leading-relaxed text-apagado">A equipe inteira vê o pedido e responde por aqui. Você acompanha em Solicitações.</p>
        </header>
        {rodada ? <FormSino key={rodada.n} chave={rodada.chave} aoFechar={fechar} /> : null}
      </div>
    </dialog>
  )
}

function FormSino({ chave, aoFechar }: { chave: string; aoFechar: () => void }) {
  const [estado, enviar, pendente] = useAcao(tocarSino)
  const id = useId()
  const ok = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (estado?.ok) ok.current?.focus()
  }, [estado])

  if (estado?.ok) {
    return (
      <div className="grid gap-4">
        <Aviso tom="ok">{estado.mensagem}</Aviso>
        <Link ref={ok} href={`/requests/${estado.dados.id}`} onClick={aoFechar} className="text-sm text-destaque underline underline-offset-4">
          Acompanhar a solicitação
        </Link>
      </div>
    )
  }
  const campos = estado && !estado.ok ? (estado.campos ?? {}) : {}
  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <input type="hidden" name="chave" value={chave} />
      <Campo rotulo="Categoria" id={`${id}-cat`} erro={campos.categoria}>
        <Selecao id={`${id}-cat`} name="categoria" defaultValue="concierge">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_ROTULO[c]}
            </option>
          ))}
        </Selecao>
      </Campo>
      <Campo rotulo="Assunto" id={`${id}-ass`} erro={campos.assunto}>
        <Entrada id={`${id}-ass`} name="assunto" maxLength={140} required aria-invalid={campos.assunto ? true : undefined} aria-describedby={`${id}-ass-msg`} />
      </Campo>
      <Campo rotulo="Mensagem" id={`${id}-msg`} erro={campos.mensagem}>
        <AreaTexto id={`${id}-msg`} name="mensagem" maxLength={4000} required aria-invalid={campos.mensagem ? true : undefined} />
      </Campo>
      {estado && !estado.ok && !Object.keys(campos).length ? <Aviso tom="perigo">{estado.erro}</Aviso> : null}
      <Botao type="submit" disabled={pendente} bloco>
        {pendente ? 'Enviando…' : 'Enviar à equipe'}
      </Botao>
    </form>
  )
}
