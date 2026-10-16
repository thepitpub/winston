import 'server-only'
import { clienteDoUsuario, clienteSecreto, ou, talvez } from '../db/clientes'

/*
 * Leituras do Portal. Tudo com o cliente do USUÁRIO: a RLS é quem garante
 * que o membro só lê o que é dele. A única exceção são os comunicados do
 * Lobby, segmentados por função do banco com o id vindo da sessão.
 */

export interface Credencial {
  public_code: string
  status: 'active' | 'suspended' | 'revoked'
  issued_at: string
  version: number
  id: string
}

export async function credencialAtiva(membroId: string): Promise<Credencial | null> {
  const sb = await clienteDoUsuario()
  return talvez(await sb.from('member_credentials').select('id, public_code, status, issued_at, version').eq('member_id', membroId).eq('status', 'active').maybeSingle()) as Credencial | null
}

export interface Movimento {
  id: string
  amount: number
  kind: string
  reason: string
  created_at: string
}

export async function saldoECarteira(membroId: string, limite = 5): Promise<{ saldo: number; ultimo: string | null; movimentos: Movimento[]; total: number }> {
  const sb = await clienteDoUsuario()
  const [b, t] = await Promise.all([
    sb.from('gold_coin_balances').select('balance, last_movement_at').eq('member_id', membroId).maybeSingle(),
    sb.from('gold_coin_transactions').select('id, amount, kind, reason, created_at, gold_coin_accounts!inner(member_id)', { count: 'exact' }).eq('gold_coin_accounts.member_id', membroId).order('created_at', { ascending: false }).limit(Math.max(limite, 1)),
  ])
  return { saldo: b.data?.balance ?? 0, ultimo: b.data?.last_movement_at ?? null, movimentos: (t.data ?? []) as Movimento[], total: t.count ?? 0 }
}

export async function extrato(membroId: string, pagina: number, porPagina = 20) {
  const sb = await clienteDoUsuario()
  const de = (pagina - 1) * porPagina
  const r = await sb.from('gold_coin_transactions').select('id, amount, kind, reason, created_at, reference, gold_coin_accounts!inner(member_id)', { count: 'exact' }).eq('gold_coin_accounts.member_id', membroId).order('created_at', { ascending: false }).range(de, de + porPagina - 1)
  return { linhas: (r.data ?? []) as (Movimento & { reference: string | null })[], total: r.count ?? 0 }
}

export async function notificacoes(membroId: string, limite = 5) {
  const sb = await clienteDoUsuario()
  const [lista, naoLidas] = await Promise.all([
    sb.from('member_notifications').select('id, kind, title, body, link, read_at, created_at').eq('member_id', membroId).order('created_at', { ascending: false }).limit(limite),
    sb.from('member_notifications').select('id', { count: 'exact', head: true }).eq('member_id', membroId).is('read_at', null),
  ])
  // Exibidas no Lobby: passam a lidas (a contagem desta tela ainda mostra as novas).
  const ids = (lista.data ?? []).filter((n) => !n.read_at).map((n) => n.id)
  if (ids.length) await clienteSecreto().from('member_notifications').update({ read_at: new Date().toISOString() }).eq('member_id', membroId).in('id', ids)
  return { lista: lista.data ?? [], naoLidas: naoLidas.count ?? 0 }
}

export async function atividadeRecente(membroId: string, limite = 6) {
  const sb = await clienteDoUsuario()
  const [ck, req] = await Promise.all([
    sb.from('member_checkins').select('id, validated_at, event:checkin_events(name, kind)').eq('member_id', membroId).order('validated_at', { ascending: false }).limit(limite),
    sb.from('concierge_requests').select('id, subject, status, created_at, updated_at').eq('member_id', membroId).order('updated_at', { ascending: false }).limit(limite),
  ])
  type Item = { id: string; quando: string; tipo: 'checkin' | 'solicitacao'; titulo: string; detalhe: string; link?: string }
  const itens: Item[] = [
    ...(ck.data ?? []).map((c) => {
      const ev = Array.isArray(c.event) ? c.event[0] : c.event
      return { id: c.id, quando: c.validated_at, tipo: 'checkin' as const, titulo: ev?.kind === 'house' ? 'Passagem pela casa' : (ev?.name ?? 'Check-in'), detalhe: 'Check-in validado' }
    }),
    ...(req.data ?? []).map((r) => ({ id: r.id, quando: r.updated_at, tipo: 'solicitacao' as const, titulo: r.subject, detalhe: r.status, link: `/requests/${r.id}` })),
  ]
  return itens.sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, limite)
}

export async function membrosNoDiretorio(): Promise<number> {
  const sb = await clienteDoUsuario()
  const r = await sb.from('directory_preferences').select('member_id', { count: 'exact', head: true }).eq('visible', true)
  return r.count ?? 0
}

export async function avisosDoLobby(membroId: string) {
  const adm = clienteSecreto()
  const r = await adm.rpc('ch_comunicados_do_membro', { p_member: membroId, p_page: '/lobby' })
  const avisos = (r.data ?? []).filter((a) => a.kind === 'lobby')
  // Aviso do Lobby é renderizado no servidor: a impressão é registrada aqui
  // (e é ela que esgota a frequência "uma vez").
  if (avisos.length) await adm.from('announcement_impressions').insert(avisos.map((a) => ({ announcement_id: a.id, member_id: membroId, page: '/lobby' })))
  return avisos.map((a) => ({ id: a.id, title: a.title, body: a.body, cta_label: a.cta_label, cta_target: a.cta_target, starts_at: a.starts_at }))
}

export async function solicitacoesDoMembro(membroId: string) {
  const sb = await clienteDoUsuario()
  return ou(await sb.from('concierge_requests').select('id, category, subject, status, priority, created_at, updated_at').eq('member_id', membroId).order('updated_at', { ascending: false }).limit(100))
}

export async function solicitacao(membroId: string, id: string) {
  const sb = await clienteDoUsuario()
  const s = talvez(await sb.from('concierge_requests').select('id, category, subject, status, priority, created_at, updated_at').eq('id', id).eq('member_id', membroId).maybeSingle())
  if (!s) return null
  // RLS: notas internas nunca chegam (policy messages_self exige internal = false).
  const m = ou(await sb.from('concierge_messages').select('id, author_kind, author_name, body, created_at').eq('request_id', id).eq('internal', false).order('created_at'))
  return { ...s, mensagens: m }
}
