'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { Aviso, Botao } from '@/components/ui/ui'
import { CATEGORIA_ROTULO, type Categoria } from '@/lib/dominio/concierge'
import { avaliarResposta, confirmarPedido, enviarAoWinston } from './acoes'

export interface MensagemWinston {
  id: string
  autor: 'member' | 'winston' | 'staff' | 'system'
  texto: string
  nota: 1 | -1 | null
  cartoes: { titulo: string; subtitulo?: string; link?: string }[]
  proposta: { categoria: string; assunto: string } | null
}

export function Conversa({ conversaId, mensagens, perguntaInicial }: { conversaId: string | null; mensagens: MensagemWinston[]; perguntaInicial: string | null }) {
  const router = useRouter()
  // Pergunta vinda do Lobby só PREENCHE o campo: enviar é sempre um gesto do membro.
  const [texto, setTexto] = useState(perguntaInicial ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  const [confirmados, setConfirmados] = useState<Record<string, string>>({})
  const fim = useRef<HTMLDivElement>(null)

  const enviar = (t: string) =>
    iniciar(async () => {
      setErro(null)
      const r = await enviarAoWinston(conversaId, t, crypto.randomUUID())
      if (!r.ok) return setErro(r.erro)
      setTexto('')
      router.replace(`/winston?c=${r.dados.conversaId}`, { scroll: false })
    })

  // Só desce até o fim quando chega mensagem nova; ao abrir, o título fica à vista.
  const quantas = useRef(mensagens.length)
  useEffect(() => {
    if (mensagens.length > quantas.current) fim.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
    quantas.current = mensagens.length
  }, [mensagens.length])

  const aoEnviar = (e: FormEvent) => {
    e.preventDefault()
    if (texto.trim()) enviar(texto.trim())
  }

  return (
    <section className="grid min-h-[58dvh] grid-rows-[1fr_auto] border-t border-[var(--fio-forte)]" aria-label="Conversa com o Winston">
      <ol className="grid content-start gap-8 py-8" aria-live="polite">
        {mensagens.length === 0 && !pendente ? (
          <li className="max-w-[30ch] font-display text-display-sm text-tinta-2 italic">Em que posso ajudar? Saldo, credencial, alguém do diretório, eventos ou um pedido à equipe.</li>
        ) : null}
        {mensagens.map((m) => (
          <li key={m.id} className={`grid max-w-[88%] gap-2 ${m.autor === 'member' ? 'justify-self-end' : ''}`}>
            <p className={`rotulo ${m.autor === 'member' ? 'justify-self-end text-apagado' : 'text-destaque'}`}>{m.autor === 'member' ? 'Você' : '◆ Winston'}</p>
            <p className={`leading-relaxed whitespace-pre-line ${m.autor === 'member' ? 'rounded-[4px] bg-elevado-2 px-4 py-3 text-[0.88rem]' : 'font-display text-[clamp(1.4rem,2.4vw,1.85rem)] leading-[1.2] text-tinta'}`}>{m.texto}</p>
            {m.cartoes.length ? (
              <ul className="grid gap-2">
                {m.cartoes.map((c, i) => (
                  <li key={i}>
                    {c.link ? (
                      <Link href={c.link} className="block rounded-xs px-4 py-2.5 shadow-[inset_0_0_0_1px_var(--fio-forte)] hover:bg-elevado-2">
                        <span className="block text-tinta">{c.titulo}</span>
                        {c.subtitulo ? <span className="block text-sm text-apagado">{c.subtitulo}</span> : null}
                      </Link>
                    ) : (
                      <div className="rounded-xs px-4 py-2.5 shadow-[inset_0_0_0_1px_var(--fio)]">
                        <span className="block text-tinta">{c.titulo}</span>
                        {c.subtitulo ? <span className="block text-sm text-apagado">{c.subtitulo}</span> : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {m.proposta ? (
              confirmados[m.id] ? (
                <Link href={`/requests/${confirmados[m.id]}`} className="text-sm text-destaque underline underline-offset-4">
                  Solicitação enviada. Acompanhar.
                </Link>
              ) : (
                <div className="flex flex-wrap items-center gap-4 border-y border-dashed border-[var(--fio-forte)] py-3">
                  <span className="text-sm text-tinta-2">
                    Enviar à equipe como <strong className="text-tinta">{CATEGORIA_ROTULO[m.proposta.categoria as Categoria] ?? m.proposta.categoria}</strong>?
                  </span>
                  <Botao
                    variante="linha"
                    disabled={pendente}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await confirmarPedido(m.id)
                        if (r.ok) setConfirmados((c) => ({ ...c, [m.id]: r.dados.id }))
                        else setErro(r.erro)
                      })
                    }
                  >
                    Confirmar envio
                  </Botao>
                </div>
              )
            ) : null}
            {m.autor === 'winston' ? <Avaliacao id={m.id} nota={m.nota} /> : null}
          </li>
        ))}
        {pendente ? <li className="font-display text-[1.4rem] text-apagado italic">Winston está consultando…</li> : null}
        <div ref={fim} />
      </ol>
      <form onSubmit={aoEnviar} className="sticky bottom-[calc(4.5rem+var(--safe-bottom))] grid gap-2 border-t border-[var(--fio-forte)] bg-fundo py-4 sm:bottom-0">
        {erro ? <Aviso tom="perigo">{erro}</Aviso> : null}
        <div className="flex gap-3">
          <label htmlFor="winston-msg" className="sr-only">
            Mensagem ao Winston
          </label>
          <input id="winston-msg" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} placeholder="Escreva ao Winston…" className="min-h-14 min-w-0 flex-1 bg-transparent font-display text-[1.5rem] text-tinta placeholder:text-discreto placeholder:italic focus:outline-none" />
          <Botao type="submit" disabled={pendente || !texto.trim()}>
            Enviar
          </Botao>
        </div>
      </form>
    </section>
  )
}

function Avaliacao({ id, nota }: { id: string; nota: 1 | -1 | null }) {
  const [atual, setAtual] = useState(nota)
  const [, iniciar] = useTransition()
  const dar = (n: 1 | -1) =>
    iniciar(async () => {
      const r = await avaliarResposta(id, n)
      if (r.ok) setAtual(n)
    })
  return (
    <div className="flex items-center gap-1 text-discreto" role="group" aria-label="Avaliar resposta">
      <button type="button" onClick={() => dar(1)} aria-pressed={atual === 1} className="grid size-9 place-items-center rounded-xs hover:text-tinta aria-pressed:text-ok" aria-label="Resposta útil">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7" />
        </svg>
      </button>
      <button type="button" onClick={() => dar(-1)} aria-pressed={atual === -1} className="grid size-9 place-items-center rounded-xs hover:text-tinta aria-pressed:text-danger" aria-label="Resposta não ajudou">
        <svg viewBox="0 0 24 24" className="size-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7" />
        </svg>
      </button>
    </div>
  )
}
