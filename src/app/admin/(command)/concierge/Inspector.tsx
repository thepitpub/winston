'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Bloco, entradaCompacta } from '@/components/command/kit'
import { useAcao } from '@/components/ui/useAcao'
import { Aviso, Botao } from '@/components/ui/ui'
import { dataHora } from '@/lib/datas'
import { PRIORIDADES, STATUS_ROTULO_EQUIPE, TRANSICOES, type StatusSolicitacao } from '@/lib/dominio/concierge'
import { definirPrioridade, definirResponsavel, definirStatus, enviarResposta } from './acoes'

type Detalhe = {
  id: string
  subject: string
  status: string
  priority: string
  member: { id: string; full_name: string; display_name: string | null } | null
  mensagens: { id: string; author_kind: string; author_name: string | null; body: string; internal: boolean; created_at: string }[]
  atribuicoes: { assignee_user_id: string; unassigned_at: string | null }[]
}

export function Inspector({ s, pessoas, podeResponder, podeAtribuir }: { s: Detalhe; pessoas: { user_id: string; full_name: string }[]; podeResponder: boolean; podeAtribuir: boolean }) {
  const [estado, enviar, p] = useAcao(enviarResposta.bind(null, s.id))
  const [erro, setErro] = useState<string | null>(null)
  const [pend, iniciar] = useTransition()
  const form = useRef<HTMLFormElement>(null)
  const atual = s.atribuicoes.find((a) => !a.unassigned_at)?.assignee_user_id ?? ''
  // Selects controlados: se a ação falha, voltam ao valor que está no banco.
  const [prioridade, setPrioridade] = useState(s.priority)
  const [responsavel, setResponsavel] = useState(atual)
  useEffect(() => {
    if (estado?.ok) form.current?.reset()
  }, [estado])
  const rodar = (f: () => Promise<{ ok: boolean; erro?: string }>, desfazer?: () => void) =>
    iniciar(async () => {
      const r = await f()
      if (!r.ok) desfazer?.()
      setErro(r.ok ? null : (r.erro ?? 'Erro'))
    })
  const st = s.status as StatusSolicitacao

  return (
    <Bloco titulo="Inspector">
      <div className="grid gap-1">
        <p className="font-display text-xl leading-tight">{s.subject}</p>
        {s.member ? (
          <Link href={`/admin/members/${s.member.id}`} className="text-xs text-destaque hover:underline">
            {s.member.display_name || s.member.full_name}
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-[0.66rem] tracking-wider text-apagado uppercase">
          Status
          <select value={st} disabled={!podeResponder || pend} onChange={(e) => rodar(() => definirStatus(s.id, e.target.value))} className={entradaCompacta}>
            <option value={st}>{STATUS_ROTULO_EQUIPE[st]}</option>
            {TRANSICOES[st].map((t) => (
              <option key={t} value={t}>
                → {STATUS_ROTULO_EQUIPE[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[0.66rem] tracking-wider text-apagado uppercase">
          Prioridade
          <select
            value={prioridade}
            disabled={!podeResponder || pend}
            onChange={(e) => {
              const antes = prioridade
              const novo = e.target.value
              setPrioridade(novo)
              rodar(() => definirPrioridade(s.id, novo), () => setPrioridade(antes))
            }}
            className={entradaCompacta}
          >
            {PRIORIDADES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[0.66rem] tracking-wider text-apagado uppercase">
          Responsável
          <select
            value={responsavel}
            disabled={!podeAtribuir || pend}
            onChange={(e) => {
              const antes = responsavel
              const novo = e.target.value
              setResponsavel(novo)
              rodar(() => definirResponsavel(s.id, novo), () => setResponsavel(antes))
            }}
            className={entradaCompacta}
          >
            <option value="">—</option>
            {pessoas.map((x) => (
              <option key={x.user_id} value={x.user_id}>
                {x.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {erro ? <Aviso tom="perigo">{erro}</Aviso> : null}
      <ol className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1" aria-label="Histórico">
        {s.mensagens.map((m) => (
          <li key={m.id} className={`grid gap-1 rounded-xs p-2.5 text-sm ${m.internal ? 'bg-burgundy/35 shadow-[inset_2px_0_0_var(--color-burgundy-bright)]' : m.author_kind === 'member' ? 'bg-fundo-2' : m.author_kind === 'system' ? 'text-xs text-discreto' : 'bg-elevado-3'}`}>
            <span className="text-[0.66rem] tracking-wider text-apagado uppercase">
              {m.internal ? 'Nota interna · ' : ''}
              {m.author_kind === 'member' ? 'Membro' : m.author_kind === 'winston' ? 'Winston' : (m.author_name ?? 'Equipe')} · {dataHora(m.created_at)}
            </span>
            <span className="leading-relaxed whitespace-pre-line">{m.body}</span>
          </li>
        ))}
      </ol>
      {podeResponder && st !== 'encerrada' ? (
        <form ref={form} onSubmit={enviar} className="grid gap-2">
          <label htmlFor="resposta" className="sr-only">
            Resposta
          </label>
          <textarea id="resposta" name="texto" rows={3} maxLength={4000} required className={`${entradaCompacta} h-auto py-2`} placeholder="Responder ao membro…" />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-tinta-2">
              <input type="checkbox" name="interna" className="accent-[var(--color-burgundy-bright)]" /> Nota interna (o membro não vê)
            </label>
            <Botao type="submit" variante="ouro" disabled={p} className="!min-h-9">
              Enviar
            </Botao>
          </div>
          {estado && !estado.ok ? <Aviso tom="perigo">{estado.erro}</Aviso> : null}
        </form>
      ) : null}
    </Bloco>
  )
}
