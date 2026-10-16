import 'server-only'
import { cache } from 'react'
import { ambiente } from '../ambiente'
import { contextoDaRequisicao, log } from '../auditoria'
import { clienteDoUsuario, clienteSecreto } from '../db/clientes'
import { hashDeIp } from '../dominio/cripto'

export interface Identidade {
  userId: string
  sessionId: string
  aal: 'aal1' | 'aal2'
}

const TOQUE_MS = 5 * 60_000

/**
 * Quem está na requisição, com o JWT VERIFICADO (getClaims confere a
 * assinatura). Uma sessão revogada pela casa vale como sessão nenhuma,
 * mesmo com o JWT ainda dentro da validade.
 */
export const identidade = cache(async (): Promise<Identidade | null> => {
  const sb = await clienteDoUsuario()
  const { data, error } = await sb.auth.getClaims()
  if (error || !data?.claims?.sub || !data.claims.session_id) return null
  const c = data.claims
  const id: Identidade = { userId: c.sub, sessionId: String(c.session_id), aal: c.aal === 'aal2' ? 'aal2' : 'aal1' }

  const adm = clienteSecreto()
  const s = await adm.from('member_sessions').select('revoked_at, last_seen_at').eq('id', id.sessionId).maybeSingle()
  if (s.data?.revoked_at) {
    log('info', 'sessao.revogada_em_uso', {})
    return null
  }
  if (!s.data) {
    // Sessão nunca vista: se houve revogação do usuário DEPOIS da emissão
    // deste token, ela vale como revogada (o access token ainda não expirou).
    const iat = typeof c.iat === 'number' ? new Date(c.iat * 1000).toISOString() : null
    if (iat) {
      const r = await adm.from('member_sessions').select('id', { count: 'exact', head: true }).eq('user_id', id.userId).gt('revoked_at', iat).neq('revoke_reason', 'logout')
      if ((r.count ?? 0) > 0) return null
    }
    await registrarSessao(id)
  } else if (Date.now() - new Date(s.data.last_seen_at).getTime() > TOQUE_MS) {
    await adm.from('member_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', id.sessionId)
  }
  return id
})

/** Grava a sessão (id = session_id do JWT) para poder listar e revogar. */
export async function registrarSessao(id: { userId: string; sessionId: string }) {
  const adm = clienteSecreto()
  const [m, s] = await Promise.all([
    adm.from('members').select('id').eq('user_id', id.userId).maybeSingle(),
    adm.from('staff_members').select('user_id').eq('user_id', id.userId).maybeSingle(),
  ])
  const { ip, ua } = await contextoDaRequisicao()
  await adm
    .from('member_sessions')
    .upsert(
      { id: id.sessionId, user_id: id.userId, member_id: m.data?.id ?? null, is_staff: Boolean(s.data), user_agent: ua, ip_hash: hashDeIp(ambiente().CH_SEGREDO, ip) },
      { onConflict: 'id', ignoreDuplicates: true },
    )
}

/** Sai desta sessão (local) e marca a revogação. */
export async function sair(motivo = 'logout') {
  const id = await identidade()
  const sb = await clienteDoUsuario()
  if (id) {
    await clienteSecreto().from('member_sessions').update({ revoked_at: new Date().toISOString(), revoke_reason: motivo }).eq('id', id.sessionId).is('revoked_at', null)
  }
  await sb.auth.signOut({ scope: 'local' })
}

/** Derruba TODAS as sessões de um usuário: no Auth (refresh tokens) e na nossa tabela. */
export async function revogarTodas(userId: string, porQuem: string | null, motivo: string) {
  const adm = clienteSecreto()
  await adm.rpc('ch_revogar_sessoes_auth', { p_user: userId })
  await adm.from('member_sessions').update({ revoked_at: new Date().toISOString(), revoked_by: porQuem, revoke_reason: motivo }).eq('user_id', userId).is('revoked_at', null)
}
