import 'server-only'
import { ErroDeRegra } from '../../acao'
import { auditar } from '../../auditoria'
import type { ContextoEquipe } from '../../autorizacao/equipe'
import { revogarTodas } from '../../autorizacao/sessao'
import { clienteSecreto, feito, ou, talvez } from '../../db/clientes'
import { TRANSICOES, type StatusConta } from '../../dominio/regras-acesso'
import { emitirConvite } from '../acesso'
import { emitirCredencial } from '../onboarding'

/*
 * Serviços do Command para membros. Todos recebem o contexto da equipe JÁ
 * autorizado (exigirPermissao na ação/página) e usam a chave secreta.
 */

const ORDENAVEIS = { nome: 'full_name', status: 'status', numero: 'founder_number', criado: 'created_at' } as const

export async function listarMembros(f: { q?: string; status?: string; categoria?: string; ordem?: string; dir?: string; pagina: number }, porPagina = 25) {
  const adm = clienteSecreto()
  let q = adm.from('members').select('id, full_name, display_name, status, category, founder_number, phone_e164, is_synthetic, user_id, created_at, member_credentials(public_code, status)', { count: 'exact' })
  // Tira o que tem significado na sintaxe do filtro do PostgREST (inclusive aspas).
  const termo = (f.q ?? '').trim().replace(/[%,()*\\"']/g, ' ').slice(0, 60)
  if (termo) {
    const cod = /^CH-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(termo) ? termo.toUpperCase() : null
    if (cod) {
      const c = talvez(await adm.from('member_credentials').select('member_id').eq('public_code', cod).maybeSingle())
      q = q.eq('id', c?.member_id ?? '00000000-0000-0000-0000-000000000000')
    } else {
      const digitos = termo.replace(/\D/g, '')
      q = q.or([`full_name.ilike.%${termo}%`, `display_name.ilike.%${termo}%`, digitos.length >= 4 ? `phone_e164.ilike.%${digitos}%` : null].filter(Boolean).join(','))
    }
  }
  if (f.status && ['pending', 'invited', 'active', 'suspended', 'revoked'].includes(f.status)) q = q.eq('status', f.status as StatusConta)
  if (f.categoria && ['founder', 'member', 'honorary'].includes(f.categoria)) q = q.eq('category', f.categoria as 'founder')
  // Object.hasOwn: ?ordem=constructor não pode cair no protótipo.
  const coluna = f.ordem && Object.hasOwn(ORDENAVEIS, f.ordem) ? ORDENAVEIS[f.ordem as keyof typeof ORDENAVEIS] : 'founder_number'
  const de = (f.pagina - 1) * porPagina
  const r = await q.order(coluna, { ascending: f.dir !== 'desc', nullsFirst: false }).order('full_name').range(de, de + porPagina - 1)
  if (r.error) throw new Error(r.error.message)
  return { linhas: r.data, total: r.count ?? 0 }
}

export async function fichaDoMembro(id: string) {
  const adm = clienteSecreto()
  const m = talvez(await adm.from('members').select('*').eq('id', id).maybeSingle())
  if (!m) return null
  const [perfil, credenciais, convites, sessoes, saldo, transacoes, checkins, pedidos, dir] = await Promise.all([
    adm.from('member_profiles').select('*').eq('member_id', id).maybeSingle(),
    adm.from('member_credentials').select('id, public_code, status, version, issued_at, revoked_at').eq('member_id', id).order('issued_at', { ascending: false }),
    adm.from('member_invitations').select('id, created_at, expires_at, accepted_at, revoked_at').eq('member_id', id).order('created_at', { ascending: false }).limit(10),
    m.user_id ? adm.from('member_sessions').select('id, user_agent, created_at, last_seen_at, revoked_at, revoke_reason').eq('user_id', m.user_id).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
    adm.from('gold_coin_balances').select('balance, account_id').eq('member_id', id).maybeSingle(),
    adm.from('gold_coin_transactions').select('id, amount, kind, reason, created_at, operator_user_id, reverses_id, gold_coin_accounts!inner(member_id)').eq('gold_coin_accounts.member_id', id).order('created_at', { ascending: false }).limit(25),
    adm.from('member_checkins').select('id, validated_at, source, exception_reason, event:checkin_events(name)').eq('member_id', id).order('validated_at', { ascending: false }).limit(15),
    adm.from('concierge_requests').select('id, subject, status, priority, created_at').eq('member_id', id).order('created_at', { ascending: false }).limit(10),
    adm.from('directory_preferences').select('visible, display_name, profession, company, city, consented_at, moderation_status').eq('member_id', id).maybeSingle(),
  ])
  let fatores = 0
  if (m.user_id) {
    const f = await adm.auth.admin.mfa.listFactors({ userId: m.user_id })
    fatores = (f.data?.factors ?? []).filter((x) => x.status === 'verified').length
  }
  return {
    membro: m,
    perfil: perfil.data,
    credenciais: credenciais.data ?? [],
    convites: convites.data ?? [],
    sessoes: sessoes.data ?? [],
    saldo: saldo.data?.balance ?? 0,
    transacoes: transacoes.data ?? [],
    checkins: checkins.data ?? [],
    pedidos: pedidos.data ?? [],
    diretorio: dir.data,
    fatores,
  }
}

/** Leitura da inteligência privada: só com cs.read (checado antes) e sempre auditada. */
export async function inteligencia(eq: ContextoEquipe, membroId: string) {
  const r = talvez(await clienteSecreto().from('member_private_cs').select('*').eq('member_id', membroId).maybeSingle())
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'cs.leitura', membroId, recurso: { tipo: 'member_private_cs', id: membroId } })
  return r
}

export async function salvarNotaInterna(eq: ContextoEquipe, membroId: string, nota: string) {
  feito(await clienteSecreto().from('member_private_cs').upsert({ member_id: membroId, internal_notes: nota || null, updated_by: eq.id.userId }, { onConflict: 'member_id' }))
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'cs.edicao', membroId, detalhes: { campos: ['internal_notes'] } })
}

/** Últimos 4 dígitos: o bastante para a trilha, sem guardar o número inteiro de novo. */
const finalDoTelefone = (t: string | null) => (t ? `…${t.slice(-4)}` : null)

export async function editarMembro(eq: ContextoEquipe, id: string, d: { display_name: string | null; category: 'founder' | 'member' | 'honorary'; joined_at: string | null; phone_e164: string | null }) {
  const adm = clienteSecreto()
  const antes = ou(await adm.from('members').select('status, phone_e164, display_name, category, joined_at').eq('id', id).single())
  const trocouTelefone = antes.phone_e164 !== d.phone_e164
  if (trocouTelefone && !d.phone_e164 && (antes.status === 'invited' || antes.status === 'active' || antes.status === 'suspended'))
    throw new ErroDeRegra('Este membro entra pelo telefone: troque o número, não apague.', { telefone: 'Obrigatório para quem tem acesso.' })
  const r = await adm.from('members').update(d).eq('id', id)
  if (r.error) throw new ErroDeRegra(r.error.code === '23505' ? 'Telefone já usado por outro membro.' : 'Não consegui salvar.')
  const campos = (Object.keys(d) as (keyof typeof d)[]).filter((k) => antes[k] !== d[k])
  await auditar({
    ator: { userId: eq.id.userId, tipo: 'staff' },
    acao: 'membro.editado',
    membroId: id,
    detalhes: { campos, ...(trocouTelefone ? { telefone: { de: finalDoTelefone(antes.phone_e164), para: finalDoTelefone(d.phone_e164) } } : {}) },
  })
  if (trocouTelefone && antes.status !== 'pending') {
    await adm.from('member_notifications').insert({ member_id: id, kind: 'seguranca', title: 'Seu telefone de acesso foi alterado pela equipe.', body: 'Se você não pediu, toque o Service Bell imediatamente.' })
  }
}

export async function mudarStatus(eq: ContextoEquipe, id: string, para: StatusConta, motivo: string) {
  const adm = clienteSecreto()
  const m = ou(await adm.from('members').select('status, user_id').eq('id', id).single())
  if (!TRANSICOES[m.status as StatusConta].includes(para)) throw new ErroDeRegra(`Não é possível passar de ${m.status} para ${para}.`)
  const r = await adm.from('members').update({ status: para }).eq('id', id).eq('status', m.status).select('id')
  if (!r.data?.length) throw new ErroDeRegra('O status mudou enquanto você editava. Recarregue.')
  if ((para === 'suspended' || para === 'revoked') && m.user_id) await revogarTodas(m.user_id, eq.id.userId, `status:${para}`)
  if (m.status === 'invited') {
    await adm.from('member_invitations').update({ revoked_at: new Date().toISOString(), revoked_by: eq.id.userId }).eq('member_id', id).is('accepted_at', null).is('revoked_at', null)
  }
  if (para === 'revoked') {
    await adm.from('member_credentials').update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: eq.id.userId }).eq('member_id', id).eq('status', 'active')
    await adm.from('member_invitations').update({ revoked_at: new Date().toISOString(), revoked_by: eq.id.userId }).eq('member_id', id).is('accepted_at', null).is('revoked_at', null)
  }
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'membro.status', membroId: id, detalhes: { de: m.status, para, motivo } })
}

export async function convidar(eq: ContextoEquipe, id: string) {
  return emitirConvite(id, eq.id.userId)
}

export async function revogarConvite(eq: ContextoEquipe, conviteId: string) {
  const adm = clienteSecreto()
  const r = await adm.from('member_invitations').update({ revoked_at: new Date().toISOString(), revoked_by: eq.id.userId }).eq('id', conviteId).is('accepted_at', null).is('revoked_at', null).select('member_id')
  if (!r.data?.length) throw new ErroDeRegra('Convite já aceito ou revogado.')
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'convite.revogado', membroId: r.data[0]!.member_id, recurso: { tipo: 'convite', id: conviteId } })
}

/**
 * Recuperar acesso (celular perdido): remove os fatores do autenticador,
 * derruba as sessões e emite um convite novo. A identidade da pessoa deve
 * ter sido confirmada pela casa ANTES (a ação pede a justificativa).
 */
export async function recuperarAcesso(eq: ContextoEquipe, id: string, justificativa: string) {
  const adm = clienteSecreto()
  const m = ou(await adm.from('members').select('user_id, status, phone_e164').eq('id', id).single())
  if (m.status !== 'active') throw new ErroDeRegra('Recuperação é para membros ativos.')
  // Pré-condição do convite ANTES de qualquer passo destrutivo.
  if (!m.phone_e164) throw new ErroDeRegra('Cadastre o telefone antes: o novo convite é confirmado por código no telefone.')
  // A trilha registra o início, para que uma falha no meio não fique invisível.
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'acesso.recuperacao_iniciada', membroId: id, detalhes: { justificativa } })
  const r = await adm.from('members').update({ status: 'invited' }).eq('id', id).eq('status', 'active').select('id')
  if (!r.data?.length) throw new ErroDeRegra('O status mudou enquanto você agia. Recarregue.')
  if (m.user_id) {
    const f = await adm.auth.admin.mfa.listFactors({ userId: m.user_id })
    for (const x of f.data?.factors ?? []) await adm.auth.admin.mfa.deleteFactor({ userId: m.user_id, id: x.id })
    await revogarTodas(m.user_id, eq.id.userId, 'recuperacao')
  }
  const c = await emitirConvite(id, eq.id.userId)
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'acesso.recuperado', membroId: id, detalhes: { justificativa } })
  return c
}

export async function revogarSessoes(eq: ContextoEquipe, id: string) {
  const m = ou(await clienteSecreto().from('members').select('user_id').eq('id', id).single())
  if (!m.user_id) throw new ErroDeRegra('Este membro ainda não tem conta.')
  await revogarTodas(m.user_id, eq.id.userId, 'equipe')
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'sessoes.revogadas', membroId: id })
}

export async function acaoCredencial(eq: ContextoEquipe, membroId: string, acao: 'emitir' | 'suspender' | 'reativar' | 'revogar') {
  const adm = clienteSecreto()
  if (acao === 'emitir') {
    const m = ou(await adm.from('members').select('status').eq('id', membroId).single())
    if (m.status !== 'active') throw new ErroDeRegra('Só membros ativos recebem credencial.')
    const viva = talvez(await adm.from('member_credentials').select('status').eq('member_id', membroId).in('status', ['active', 'suspended']).limit(1).maybeSingle())
    if (viva) throw new ErroDeRegra(viva.status === 'active' ? 'Já existe uma credencial ativa.' : 'Há uma credencial suspensa: reative ou revogue antes de emitir outra.')
    await emitirCredencial(membroId, eq.id.userId)
    return
  }
  const de = acao === 'reativar' ? 'suspended' : acao === 'suspender' ? 'active' : null
  let q = adm.from('member_credentials').update(acao === 'revogar' ? { status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: eq.id.userId } : { status: acao === 'suspender' ? 'suspended' : 'active' }).eq('member_id', membroId)
  q = de ? q.eq('status', de) : q.in('status', ['active', 'suspended'])
  const r = await q.select('id')
  if (r.error) throw new ErroDeRegra(r.error.code === '23505' ? 'Já existe uma credencial ativa.' : 'Não consegui atualizar.')
  if (!r.data?.length) throw new ErroDeRegra('Nenhuma credencial nesse estado.')
  await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: `credencial.${acao}`, membroId })
}
