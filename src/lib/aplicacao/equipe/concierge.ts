import 'server-only'
import { ErroDeRegra } from '../../acao'
import { auditar } from '../../auditoria'
import type { ContextoEquipe } from '../../autorizacao/equipe'
import { atalhoDevLigado } from '../../ambiente'
import { clienteSecreto, feito, ou, talvez } from '../../db/clientes'
import { podeTransitar, STATUS_ROTULO, type Prioridade, type StatusSolicitacao } from '../../dominio/concierge'

export async function fila(f: { status?: string; categoria?: string; prioridade?: string; responsavel?: string }) {
  const adm = clienteSecreto()
  let q = adm
    .from('concierge_requests')
    .select('id, subject, category, status, priority, origin, created_at, updated_at, member:members(id, full_name, display_name), concierge_assignments(assignee_user_id, unassigned_at)')
    .order('updated_at', { ascending: false })
    .limit(200)
  if (f.status === 'abertas' || !f.status) q = q.in('status', ['aberta', 'em_atendimento', 'aguardando_membro'])
  else if (f.status !== 'todas') q = q.eq('status', f.status as StatusSolicitacao)
  if (f.categoria) q = q.eq('category', f.categoria as 'outros')
  if (f.prioridade) q = q.eq('priority', f.prioridade as Prioridade)
  // Filtro de responsável no banco, ANTES do limite (antes era no JS, depois dos 200).
  if (f.responsavel) {
    let a = adm.from('concierge_assignments').select('request_id').is('unassigned_at', null)
    if (f.responsavel !== 'sem') a = a.eq('assignee_user_id', /^[0-9a-f-]{36}$/i.test(f.responsavel) ? f.responsavel : '00000000-0000-0000-0000-000000000000')
    const ids = ou(await a).map((x) => x.request_id)
    if (f.responsavel === 'sem') {
      if (ids.length) q = q.not('id', 'in', `(${ids.join(',')})`)
    } else q = q.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  }
  return ou(await q).map((s) => ({
    ...s,
    member: Array.isArray(s.member) ? s.member[0] : s.member,
    responsavel: (s.concierge_assignments ?? []).find((a) => !a.unassigned_at)?.assignee_user_id ?? null,
  }))
}

/** Quem pode receber solicitações. A equipe sintética só aparece no desenvolvimento. */
export async function equipe() {
  let q = clienteSecreto().from('staff_members').select('user_id, full_name').eq('status', 'active')
  if (!atalhoDevLigado()) q = q.eq('is_synthetic', false)
  return ou(await q.order('full_name'))
}

export async function detalhe(id: string) {
  const adm = clienteSecreto()
  const s = talvez(await adm.from('concierge_requests').select('*, member:members(id, full_name, display_name, phone_e164, status)').eq('id', id).maybeSingle())
  if (!s) return null
  const [mensagens, atribuicoes] = await Promise.all([
    adm.from('concierge_messages').select('id, author_kind, author_name, body, internal, created_at').eq('request_id', id).order('created_at'),
    adm.from('concierge_assignments').select('assignee_user_id, assigned_by, assigned_at, unassigned_at').eq('request_id', id).order('assigned_at', { ascending: false }),
  ])
  return { ...s, member: Array.isArray(s.member) ? s.member[0] : s.member, mensagens: mensagens.data ?? [], atribuicoes: atribuicoes.data ?? [] }
}

async function notificarMembro(membroId: string, titulo: string, solicitacaoId: string) {
  await clienteSecreto().from('member_notifications').insert({ member_id: membroId, kind: 'solicitacao', title: titulo, link: `/requests/${solicitacaoId}` })
}

export async function responder(eq: ContextoEquipe, id: string, texto: string, interna: boolean) {
  const adm = clienteSecreto()
  const s = ou(await adm.from('concierge_requests').select('id, member_id, status').eq('id', id).single())
  if (s.status === 'encerrada') throw new ErroDeRegra('Solicitação encerrada.')
  feito(await adm.from('concierge_messages').insert({ request_id: id, author_kind: 'staff', author_user_id: eq.id.userId, author_name: eq.nome, body: texto, internal: interna }))
  if (!interna) {
    const novo: StatusSolicitacao = s.status === 'aberta' ? 'em_atendimento' : (s.status as StatusSolicitacao)
    feito(await adm.from('concierge_requests').update({ status: novo }).eq('id', id))
    await notificarMembro(s.member_id, 'A equipe respondeu à sua solicitação.', id)
  }
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: interna ? 'solicitacao.nota_interna' : 'solicitacao.resposta', membroId: s.member_id, recurso: { tipo: 'concierge_request', id } })
}

export async function mudarStatus(eq: ContextoEquipe, id: string, para: StatusSolicitacao) {
  const adm = clienteSecreto()
  const s = ou(await adm.from('concierge_requests').select('member_id, status').eq('id', id).single())
  if (!podeTransitar(s.status as StatusSolicitacao, para)) throw new ErroDeRegra(`De "${STATUS_ROTULO[s.status as StatusSolicitacao]}" não vai para "${STATUS_ROTULO[para]}".`)
  const agora = new Date().toISOString()
  const r = await adm
    .from('concierge_requests')
    // Encerrar uma resolvida preserva quando ela foi resolvida; reabrir limpa.
    .update({ status: para, closed_at: para === 'encerrada' ? agora : null, ...(para === 'resolvida' ? { resolved_at: agora } : para === 'encerrada' ? {} : { resolved_at: null }) })
    .eq('id', id)
    .eq('status', s.status)
    .select('id')
  if (!r.data?.length) throw new ErroDeRegra('O status mudou enquanto você editava.')
  feito(await adm.from('concierge_messages').insert({ request_id: id, author_kind: 'system', author_name: eq.nome, body: `Status: ${STATUS_ROTULO[para]}.` }))
  if (para === 'aguardando_membro' || para === 'resolvida') await notificarMembro(s.member_id, para === 'resolvida' ? 'Sua solicitação foi resolvida.' : 'A equipe aguarda a sua resposta.', id)
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'solicitacao.status', membroId: s.member_id, recurso: { tipo: 'concierge_request', id }, detalhes: { de: s.status, para } })
}

export async function mudarPrioridade(eq: ContextoEquipe, id: string, prioridade: Prioridade) {
  feito(await clienteSecreto().from('concierge_requests').update({ priority: prioridade }).eq('id', id))
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'solicitacao.prioridade', recurso: { tipo: 'concierge_request', id }, detalhes: { prioridade } })
}

export async function atribuir(eq: ContextoEquipe, id: string, responsavel: string | null) {
  const adm = clienteSecreto()
  if (responsavel) {
    const ok = talvez(await adm.from('staff_members').select('user_id').eq('user_id', responsavel).eq('status', 'active').maybeSingle())
    if (!ok) throw new ErroDeRegra('Responsável inválido.')
  }
  feito(await adm.from('concierge_assignments').update({ unassigned_at: new Date().toISOString() }).eq('request_id', id).is('unassigned_at', null))
  if (responsavel) {
    const r = await adm.from('concierge_assignments').insert({ request_id: id, assignee_user_id: responsavel, assigned_by: eq.id.userId })
    if (r.error) throw new ErroDeRegra('Outra pessoa acabou de atribuir. Recarregue.')
  }
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'solicitacao.atribuida', recurso: { tipo: 'concierge_request', id }, detalhes: { responsavel } })
}
