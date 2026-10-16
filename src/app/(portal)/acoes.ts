'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, formulario, type Resultado } from '@/lib/acao'
import { abrirSolicitacao, responderComoMembro } from '@/lib/aplicacao/solicitacoes'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { clienteSecreto } from '@/lib/db/clientes'
import { CATEGORIAS } from '@/lib/dominio/concierge'

const NovaSolicitacao = z.object({
  categoria: z.enum(CATEGORIAS, { message: 'Escolha uma categoria.' }),
  assunto: z.string().trim().min(3, 'Diga o assunto em poucas palavras.').max(140),
  mensagem: z.string().trim().min(3, 'Escreva a sua mensagem.').max(4000),
  chave: z.uuid(),
})

/** Service Bell: abre uma solicitação. Reenvio com a mesma chave não duplica. */
export async function tocarSino(_: Resultado<{ id: string }> | null, fd: FormData): Promise<Resultado<{ id: string }>> {
  return executar(async () => {
    const { membro, id } = await exigirMembro()
    const d = NovaSolicitacao.parse(formulario(fd))
    const r = await abrirSolicitacao({ membroId: membro.id, userId: id.userId, nome: membro.display_name || membro.full_name, categoria: d.categoria, assunto: d.assunto, mensagem: d.mensagem, chave: d.chave })
    revalidatePath('/requests')
    return { id: r.id }
  }, 'Recebido. A equipe responde por aqui e em Solicitações.')
}

export async function responderSolicitacao(solicitacaoId: string, _: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const { membro, id } = await exigirMembro()
    const { mensagem } = z.object({ mensagem: z.string().trim().min(1, 'Escreva algo.').max(4000) }).parse(formulario(fd))
    await responderComoMembro({ membroId: membro.id, userId: id.userId, nome: membro.display_name || membro.full_name, solicitacaoId, mensagem })
    revalidatePath(`/requests/${solicitacaoId}`)
    return undefined
  })
}

/* --------------------------------------------------------------- comunicados */

export interface ComunicadoVisivel {
  id: string
  title: string
  body: string
  cta_label: string | null
  cta_target: string | null
  kind: 'modal' | 'banner' | 'lobby'
  frequency: 'once' | 'session' | 'always' | 'until_ack'
}

/** Comunicados que este membro deve ver nesta página: segmentação no banco. */
export async function comunicadosDaPagina(pagina: string): Promise<ComunicadoVisivel[]> {
  const { membro } = await exigirMembro()
  const r = await clienteSecreto().rpc('ch_comunicados_do_membro', { p_member: membro.id, p_page: pagina.slice(0, 120) })
  if (r.error) return []
  return (r.data ?? [])
    .filter((a) => a.kind !== 'lobby')
    .map((a) => ({ id: a.id, title: a.title, body: a.body, cta_label: a.cta_label, cta_target: a.cta_target, kind: a.kind as ComunicadoVisivel['kind'], frequency: a.frequency as ComunicadoVisivel['frequency'] }))
}

const Evento = z.object({ id: z.uuid(), tipo: z.enum(['impressao', 'clique', 'fechar', 'reconhecer']), pagina: z.string().max(120), dispositivo: z.enum(['mobile', 'desktop']) })

/** Registra o que o membro fez com o comunicado (só os que ele pode ver). */
export async function registrarComunicado(e: z.infer<typeof Evento>): Promise<void> {
  const { membro } = await exigirMembro()
  const d = Evento.parse(e)
  const adm = clienteSecreto()
  // Impressão: só de comunicado que o banco diz ser para este membro aqui.
  // Clique/fechar/reconhecer: só depois de uma impressão registrada.
  const permitido =
    d.tipo === 'impressao'
      ? ((await adm.rpc('ch_comunicados_do_membro', { p_member: membro.id, p_page: d.pagina })).data ?? []).some((a) => a.id === d.id)
      : ((await adm.from('announcement_impressions').select('id', { count: 'exact', head: true }).eq('announcement_id', d.id).eq('member_id', membro.id)).count ?? 0) > 0
  if (!permitido) return
  if (d.tipo === 'impressao') await adm.from('announcement_impressions').insert({ announcement_id: d.id, member_id: membro.id, page: d.pagina, device: d.dispositivo })
  else if (d.tipo === 'clique') await adm.from('announcement_clicks').insert({ announcement_id: d.id, member_id: membro.id, page: d.pagina })
  else await adm.from('announcement_dismissals').insert({ announcement_id: d.id, member_id: membro.id, page: d.pagina, kind: d.tipo === 'reconhecer' ? 'acknowledge' : 'dismiss' })
}
