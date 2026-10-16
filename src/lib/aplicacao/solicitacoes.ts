import 'server-only'
import { ErroDeRegra } from '../acao'
import { auditar } from '../auditoria'
import { clienteSecreto, feito, ou, talvez } from '../db/clientes'
import { membroPodeEscrever, statusAposMensagemDoMembro, type Categoria, type StatusSolicitacao } from '../dominio/concierge'

/**
 * Abre uma solicitação na fila compartilhada. A chave de idempotência vem
 * do formulário (uma por abertura do painel): reenvio acidental devolve a
 * mesma solicitação em vez de criar outra.
 */
export async function abrirSolicitacao(p: {
  membroId: string
  userId: string
  nome: string
  categoria: Categoria
  assunto: string
  mensagem: string
  chave: string
  origem?: 'service_bell' | 'winston'
  conversaId?: string | null
}): Promise<{ id: string; duplicada: boolean }> {
  const adm = clienteSecreto()
  const ja = talvez(await adm.from('concierge_requests').select('id, member_id').eq('idempotency_key', p.chave).maybeSingle())
  if (ja) {
    if (ja.member_id !== p.membroId) throw new ErroDeRegra('Chave de envio inválida.')
    await garantirPrimeiraMensagem(ja.id, p)
    return { id: ja.id, duplicada: true }
  }
  const ins = await adm
    .from('concierge_requests')
    .insert({ member_id: p.membroId, category: p.categoria, subject: p.assunto, origin: p.origem ?? 'service_bell', conversation_id: p.conversaId ?? null, idempotency_key: p.chave })
    .select('id')
    .single()
  if (ins.error) {
    if (ins.error.code === '23505') {
      const r = ou(await adm.from('concierge_requests').select('id, member_id').eq('idempotency_key', p.chave).single())
      if (r.member_id !== p.membroId) throw new ErroDeRegra('Chave de envio inválida.')
      await garantirPrimeiraMensagem(r.id, p)
      return { id: r.id, duplicada: true }
    }
    throw new Error(ins.error.message)
  }
  feito(await adm.from('concierge_messages').insert({ request_id: ins.data.id, author_kind: 'member', author_user_id: p.userId, author_name: p.nome, body: p.mensagem }))
  await auditar({ ator: { userId: p.userId, tipo: 'member' }, acao: 'solicitacao.aberta', membroId: p.membroId, recurso: { tipo: 'concierge_request', id: ins.data.id }, detalhes: { categoria: p.categoria, origem: p.origem ?? 'service_bell' } })
  return { id: ins.data.id, duplicada: false }
}

/** Reenvio de uma abertura que falhou no meio: a mensagem inicial não se perde. */
async function garantirPrimeiraMensagem(id: string, p: { userId: string; nome: string; mensagem: string }) {
  const adm = clienteSecreto()
  const n = await adm.from('concierge_messages').select('id', { count: 'exact', head: true }).eq('request_id', id)
  if ((n.count ?? 0) === 0) feito(await adm.from('concierge_messages').insert({ request_id: id, author_kind: 'member', author_user_id: p.userId, author_name: p.nome, body: p.mensagem }))
}

export async function responderComoMembro(p: { membroId: string; userId: string; nome: string; solicitacaoId: string; mensagem: string }) {
  const adm = clienteSecreto()
  const s = talvez(await adm.from('concierge_requests').select('id, member_id, status').eq('id', p.solicitacaoId).maybeSingle())
  if (!s || s.member_id !== p.membroId) throw new ErroDeRegra('Solicitação não encontrada.')
  if (!membroPodeEscrever(s.status as StatusSolicitacao)) throw new ErroDeRegra('Esta solicitação foi encerrada. Abra uma nova pelo Service Bell.')
  feito(await adm.from('concierge_messages').insert({ request_id: s.id, author_kind: 'member', author_user_id: p.userId, author_name: p.nome, body: p.mensagem }))
  const novo = statusAposMensagemDoMembro(s.status as StatusSolicitacao)
  if (novo !== s.status) feito(await adm.from('concierge_requests').update({ status: novo }).eq('id', s.id).eq('status', s.status))
  else feito(await adm.from('concierge_requests').update({ updated_at: new Date().toISOString() }).eq('id', s.id))
}
