import 'server-only'
import { ambiente } from '../../ambiente'
import { ErroDeRegra } from '../../acao'
import { auditar } from '../../auditoria'
import type { ContextoEquipe } from '../../autorizacao/equipe'
import { clienteSecreto, feito, ou, talvez } from '../../db/clientes'
import { lerTokenDeCredencial } from '../../dominio/cripto'

export type ResultadoValidacao = 'validated' | 'not_found' | 'already_validated' | 'suspended' | 'no_permission' | 'event_closed' | 'exception_granted'

export async function eventos() {
  return ou(await clienteSecreto().from('checkin_events').select('*').order('starts_at', { ascending: false }).limit(100))
}

export async function salvarEvento(eq: ContextoEquipe, id: string | null, d: { name: string; kind: 'house' | 'event'; location: string | null; starts_at: string; ends_at: string | null; duplicate_policy: 'once_per_event' | 'once_per_day' | 'unlimited'; status: 'draft' | 'open' | 'closed'; visible_to_members: boolean }) {
  const adm = clienteSecreto()
  if (id) feito(await adm.from('checkin_events').update(d).eq('id', id))
  else id = ou(await adm.from('checkin_events').insert({ ...d, created_by: eq.id.userId }).select('id').single()).id
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'checkin.evento_salvo', recurso: { tipo: 'checkin_event', id } })
  return id
}

/**
 * Localiza o membro pelo que a recepção tem em mãos: QR dinâmico da
 * credencial (assinado, 60 s), código público CH-XXXX-XXXX, ou nome.
 * Nome pode trazer vários: a recepção escolhe.
 */
export async function localizar(consulta: string): Promise<{ origem: 'qr' | 'credential_code' | 'manual'; candidatos: { id: string; full_name: string; status: string; public_code: string | null; is_synthetic: boolean }[]; aviso?: string }> {
  const adm = clienteSecreto()
  const q = consulta.trim()
  if (q.startsWith('CH1.')) {
    const t = lerTokenDeCredencial(ambiente().CH_SEGREDO, q)
    if (!t) return { origem: 'qr', candidatos: [] }
    const c = talvez(await adm.from('member_credentials').select('member_id, status, version, public_code').eq('id', t.credencialId).maybeSingle())
    if (!c || c.version !== t.versao || c.status !== 'active') return { origem: 'qr', candidatos: [] }
    const m = ou(await adm.from('members').select('id, full_name, status, is_synthetic').eq('id', c.member_id).single())
    return { origem: 'qr', candidatos: [{ ...m, public_code: c.public_code }] }
  }
  if (/^CH-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(q)) {
    const c = talvez(await adm.from('member_credentials').select('member_id, public_code, status').eq('public_code', q.toUpperCase()).maybeSingle())
    if (!c) return { origem: 'credential_code', candidatos: [] }
    // Cartão suspenso ou revogado não abre a porta, mesmo que o membro tenha outro ativo.
    if (c.status !== 'active') return { origem: 'credential_code', candidatos: [], aviso: c.status === 'suspended' ? 'Credencial suspensa.' : 'Credencial revogada.' }
    const m = ou(await adm.from('members').select('id, full_name, status, is_synthetic').eq('id', c.member_id).single())
    return { origem: 'credential_code', candidatos: [{ ...m, public_code: c.public_code }] }
  }
  const termo = q.replace(/[%,()*\\"']/g, ' ').slice(0, 60)
  if (termo.length < 2) return { origem: 'manual', candidatos: [] }
  const r = ou(await adm.from('members').select('id, full_name, status, is_synthetic, member_credentials(public_code, status)').or(`full_name.ilike.%${termo}%,display_name.ilike.%${termo}%`).limit(8))
  return {
    origem: 'manual',
    candidatos: r.map((m) => ({ id: m.id, full_name: m.full_name, status: m.status, is_synthetic: m.is_synthetic, public_code: m.member_credentials?.find((c) => c.status === 'active')?.public_code ?? null })),
  }
}

/**
 * A origem registrada é a que o servidor consegue provar AGORA: QR ainda
 * válido e do mesmo membro, ou código CH ativo do mesmo membro. O que o
 * navegador diz não conta.
 */
async function origemConfirmada(membroId: string, consulta: string): Promise<'qr' | 'credential_code' | 'manual'> {
  const q = consulta.trim()
  const adm = clienteSecreto()
  if (q.startsWith('CH1.')) {
    const t = lerTokenDeCredencial(ambiente().CH_SEGREDO, q)
    if (!t) return 'manual'
    const c = talvez(await adm.from('member_credentials').select('member_id, status, version').eq('id', t.credencialId).maybeSingle())
    return c && c.member_id === membroId && c.status === 'active' && c.version === t.versao ? 'qr' : 'manual'
  }
  if (/^CH-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(q)) {
    const c = talvez(await adm.from('member_credentials').select('member_id, status').eq('public_code', q.toUpperCase()).maybeSingle())
    if (c && c.member_id === membroId && c.status !== 'active') throw new ErroDeRegra('Credencial suspensa ou revogada.')
    return c && c.member_id === membroId ? 'credential_code' : 'manual'
  }
  return 'manual'
}

export async function validar(eq: ContextoEquipe, p: { membroId: string; eventoId: string; consulta: string; excecao: string | null }) {
  if (p.excecao && !eq.permissoes.has('checkins.manage')) throw new ErroDeRegra('Exceção de duplicidade exige permissão de gestão de check-in.')
  const origem = await origemConfirmada(p.membroId, p.consulta)
  const r = await clienteSecreto().rpc('ch_validar_checkin', { p_member: p.membroId, p_event: p.eventoId, p_operator: eq.id.userId, p_source: origem, p_query: p.consulta.slice(0, 120), p_exception_reason: p.excecao ?? undefined })
  if (r.error) throw new Error(r.error.message)
  const d = r.data as { result: ResultadoValidacao; checkin_id?: string; status?: string; motivo?: string }
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: `checkin.${d.result}`, membroId: p.membroId, recurso: { tipo: 'checkin_event', id: p.eventoId }, resultado: d.result === 'validated' || d.result === 'exception_granted' ? 'success' : 'denied', detalhes: { origem, excecao: Boolean(p.excecao), motivo: d.motivo } })
  return d
}

/** Tentativa sem permissão também deixa rastro no log de validação. */
export async function registrarSemPermissao(userId: string, eventoId: string | null, consulta: string) {
  await clienteSecreto().from('checkin_validation_logs').insert({ operator_user_id: userId, event_id: eventoId, query: consulta.slice(0, 120), source: 'manual', result: 'no_permission' })
}

export async function logs(eventoId: string | null, limite = 50) {
  let q = clienteSecreto().from('checkin_validation_logs').select('id, at, result, source, reason, query, member:members(full_name), event:checkin_events(name), operator_user_id').order('at', { ascending: false }).limit(limite)
  if (eventoId) q = q.eq('event_id', eventoId)
  const linhas = ou(await q)
  const ops = [...new Set(linhas.map((l) => l.operator_user_id).filter(Boolean))] as string[]
  const nomes = ops.length ? ou(await clienteSecreto().from('staff_members').select('user_id, full_name').in('user_id', ops)) : []
  const porId = new Map(nomes.map((n) => [n.user_id, n.full_name]))
  return linhas.map((l) => ({ ...l, operador: l.operator_user_id ? (porId.get(l.operator_user_id) ?? '—') : '—' }))
}
