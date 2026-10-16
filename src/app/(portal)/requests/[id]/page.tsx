import type { Metadata } from 'next'
import { Secao } from '@/components/editorial/Editorial'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Etiqueta, Painel } from '@/components/ui/ui'
import { solicitacao } from '@/lib/aplicacao/portal'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { dataHora } from '@/lib/datas'
import { CATEGORIA_ROTULO, membroPodeEscrever, STATUS_ROTULO, TOM_STATUS, type Categoria, type StatusSolicitacao } from '@/lib/dominio/concierge'
import { Responder } from './Responder'

export const metadata: Metadata = { title: 'Solicitação' }

export default async function Solicitacao({ params }: { params: Promise<{ id: string }> }) {
  const { membro } = await exigirMembro()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const s = await solicitacao(membro.id, id)
  if (!s) notFound()
  const status = s.status as StatusSolicitacao
  return (
    <Secao atmosfera="registro" className="min-h-[calc(100dvh-var(--cabecalho-h))]">
      <div className="grid max-w-3xl gap-10">
      <header className="grid gap-3">
        <Link href="/requests" className="rotulo sublinha-traco justify-self-start text-apagado hover:text-destaque">
          ← Solicitações
        </Link>
        <h1 className="font-display text-display-lg">{s.subject}</h1>
        <div className="flex flex-wrap gap-2">
          <Etiqueta tom={TOM_STATUS[status]}>{STATUS_ROTULO[status]}</Etiqueta>
          <Etiqueta>{CATEGORIA_ROTULO[s.category as Categoria]}</Etiqueta>
        </div>
      </header>
      <Painel>
        <ol className="grid gap-5" aria-label="Conversa">
          {s.mensagens.map((m) => (
            <li key={m.id} className={`grid max-w-[85%] gap-1 ${m.author_kind === 'member' ? 'justify-self-end text-right' : ''}`}>
              <p className="rotulo text-apagado">
                {m.author_kind === 'member' ? 'Você' : m.author_kind === 'winston' ? 'Winston' : (m.author_name ?? 'A casa')} · {dataHora(m.created_at)}
              </p>
              <p className={`rounded-[4px] px-4 py-3 text-left text-[0.88rem] leading-relaxed whitespace-pre-line ${m.author_kind === 'member' ? 'bg-destaque text-sobre-destaque' : 'bg-elevado shadow-[inset_0_0_0_1px_var(--fio)]'}`}>{m.body}</p>
            </li>
          ))}
        </ol>
      </Painel>
      {membroPodeEscrever(status) ? <Responder id={s.id} /> : <p className="text-sm text-apagado">Esta solicitação foi encerrada. Para um novo assunto, use o Service Bell.</p>}
      </div>
    </Secao>
  )
}
