import type { Metadata } from 'next'
import Link from 'next/link'
import { Secao, TituloPagina } from '@/components/editorial/Editorial'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { clienteDoUsuario } from '@/lib/db/clientes'
import { dataCurta } from '@/lib/datas'
import { Conversa, type MensagemWinston } from './Conversa'

export const metadata: Metadata = { title: 'Winston Concierge' }

/**
 * WINSTON CONCIERGE. Conversas persistidas, lidas pela RLS do membro.
 * O motor é determinístico enquanto nenhum provedor de IA estiver ligado,
 * e a tela diz isso.
 */
export default async function Winston({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirMembro()
  const sp = await searchParams
  const sb = await clienteDoUsuario()
  const conversas = (await sb.from('concierge_conversations').select('id, title, last_message_at').order('last_message_at', { ascending: false }).limit(30)).data ?? []
  const pedida = typeof sp.c === 'string' ? sp.c : null
  const atual = pedida === 'nova' ? null : (conversas.find((c) => c.id === pedida) ?? (typeof sp.pergunta === 'string' ? null : conversas[0]) ?? null)
  const mensagens: MensagemWinston[] = atual
    ? ((await sb.from('concierge_messages').select('id, author_kind, body, feedback, metadata, created_at').eq('conversation_id', atual.id).order('created_at')).data ?? []).map((m) => ({
        id: m.id,
        autor: m.author_kind as MensagemWinston['autor'],
        texto: m.body,
        nota: m.feedback as 1 | -1 | null,
        cartoes: ((m.metadata as { cartoes?: MensagemWinston['cartoes'] })?.cartoes ?? []) as MensagemWinston['cartoes'],
        proposta: ((m.metadata as { proposta?: MensagemWinston['proposta'] })?.proposta ?? null) as MensagemWinston['proposta'],
      }))
    : []

  return (
    <Secao atmosfera="veludo" className="min-h-[calc(100dvh-var(--cabecalho-h))]">
      <div className="grid gap-12">
        <TituloPagina
          chamada="Winston Concierge"
          numero="03"
          linha1="Às suas"
          linha2="ordens."
          curva="onda"
          texto="O Winston consulta só o que é seu e o que os membros escolheram mostrar. Respostas por regras fixas: nenhum modelo de IA está conectado a esta conversa. Tudo que pede ação da casa vira solicitação, com a sua confirmação."
        />
        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Conversas" className="hidden content-start gap-5 lg:grid">
            <Link href="/winston?c=nova" className="rotulo inline-flex min-h-10 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_currentColor] transition-colors hover:bg-destaque hover:text-sobre-destaque hover:shadow-none">
              + Nova conversa
            </Link>
            <ul className="border-t border-[var(--fio)]">
              {conversas.map((c) => (
                <li key={c.id}>
                  <Link href={`/winston?c=${c.id}`} aria-current={atual?.id === c.id ? 'page' : undefined} className="group grid gap-0.5 border-b border-[var(--fio)] py-3 text-tinta-2 hover:text-tinta aria-[current=page]:text-destaque">
                    <span className="truncate font-display text-[1.15rem] leading-tight group-aria-[current=page]:italic">{c.title ?? 'Conversa'}</span>
                    <span className="rotulo numerico !text-[0.6rem] text-discreto">{dataCurta(c.last_message_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Conversa key={atual?.id ?? 'nova'} conversaId={atual?.id ?? null} mensagens={mensagens} perguntaInicial={typeof sp.pergunta === 'string' ? sp.pergunta.slice(0, 500) : null} />
        </div>
      </div>
    </Secao>
  )
}
