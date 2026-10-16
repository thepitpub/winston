import 'server-only'
import { ambiente } from '../ambiente'
import { ErroDeRegra } from '../acao'
import { auditar, contextoDaRequisicao, log } from '../auditoria'
import { registrarSessao } from '../autorizacao/sessao'
import { clienteDoUsuario, clienteSecreto, feito, ou, talvez } from '../db/clientes'
import { cifrar, hashDeIp, hashDoCodigo, iguais, novoCodigo, novoToken, sha256 } from '../dominio/cripto'
import { emailInterno, estadoDoConvite, estadoDoDesafio, podeEnviar } from '../dominio/regras-acesso'
import { provedorOtp, type Finalidade } from '../integracoes/otp'

async function ajuste<T>(chave: string, padrao: T): Promise<T> {
  const r = await clienteSecreto().from('app_settings').select('value').eq('key', chave).maybeSingle()
  return (r.data?.value as T) ?? padrao
}

/* --------------------------------------------------- código temporário */

/**
 * Cria e entrega um desafio. `simular` é o caminho de quem NÃO pode
 * receber código (telefone sem membro ativo): grava um desafio inerte,
 * passa pelos mesmos limites e consultas e não envia nada. Assim a
 * resposta, os limites e o tempo não revelam quem é membro.
 */
export async function criarDesafio(p: { telefone: string; finalidade: Finalidade; membroId: string | null; conviteId?: string | null; simular?: boolean }): Promise<void> {
  const e = ambiente()
  const adm = clienteSecreto()
  const agora = Date.now()
  // Faxina: código cifrado de desafio vencido não fica guardado.
  await adm.from('auth_otp_challenges').update({ code_cipher: null }).lt('expires_at', new Date(agora).toISOString()).not('code_cipher', 'is', null)

  const maxEnvios = await ajuste('otp_max_envios_10min', 3)
  const recentes = ou(await adm.from('auth_otp_challenges').select('created_at').eq('phone_e164', p.telefone).gte('created_at', new Date(agora - 24 * 3_600_000).toISOString()))
  if (!podeEnviar(recentes, maxEnvios, 10 * 60_000, agora) || recentes.length >= 12) throw new ErroDeRegra('Muitos códigos pedidos para este número. Aguarde e tente mais tarde.')

  const { ip } = await contextoDaRequisicao()
  const ipHash = hashDeIp(e.CH_SEGREDO, ip)
  if (ipHash) {
    const doIp = ou(await adm.from('auth_otp_challenges').select('created_at').eq('ip_hash', ipHash).gte('created_at', new Date(agora - 60 * 60_000).toISOString()))
    if (doIp.length >= 20) throw new ErroDeRegra('Muitas tentativas a partir desta rede. Tente mais tarde.')
  }

  // Só o desafio mais novo vale (é o que conferirDesafio lê). Os anteriores
  // vencem agora e perdem o código cifrado: a fila de entrega manual não
  // mostra código superado.
  await adm
    .from('auth_otp_challenges')
    .update({ code_cipher: null, expires_at: new Date(agora).toISOString() })
    .eq('phone_e164', p.telefone)
    .eq('purpose', p.finalidade)
    .is('consumed_at', null)
    .gt('expires_at', new Date(agora).toISOString())

  const provedor = provedorOtp()
  const codigo = novoCodigo()
  const validade = await ajuste('otp_validade_segundos', 600)
  const max = await ajuste('otp_max_tentativas', 5)
  const id = crypto.randomUUID()
  feito(
    await adm.from('auth_otp_challenges').insert({
      id,
      purpose: p.finalidade,
      phone_e164: p.telefone,
      member_id: p.membroId,
      invitation_id: p.conviteId ?? null,
      code_hash: hashDoCodigo(e.CH_SEGREDO, id, codigo),
      code_cipher: !p.simular && provedor.nome === 'manual' ? cifrar(e.CH_SEGREDO, codigo) : null,
      provider: provedor.nome,
      delivery_status: p.simular ? 'failed' : 'pending',
      max_attempts: p.simular ? 0 : max,
      expires_at: new Date(agora + validade * 1000).toISOString(),
      ip_hash: ipHash,
    }),
  )
  if (p.simular) return
  const envio = await provedor.enviar(p.telefone, codigo, p.finalidade)
  await adm.from('auth_otp_challenges').update({ delivery_status: envio.status }).eq('id', id)
  await auditar({ ator: { userId: null, tipo: 'anonymous' }, acao: `otp.${p.finalidade}.emitido`, membroId: p.membroId, recurso: { tipo: 'otp', id }, detalhes: { provedor: provedor.nome, entrega: envio.status } })
  // Falha de envio não muda a resposta (não revela membro); fica no log e na trilha.
  if (envio.status === 'failed') log('warn', 'otp.envio_falhou', { finalidade: p.finalidade, detalhe: envio.detalhe })
}

/** Confere o código do desafio mais recente. Conta a tentativa antes de comparar. */
export async function conferirDesafio(p: { telefone: string; finalidade: Finalidade; codigo: string }): Promise<{ desafioId: string; membroId: string | null; conviteId: string | null }> {
  const e = ambiente()
  const adm = clienteSecreto()
  const generico = new ErroDeRegra('Código inválido ou expirado.')
  const d = talvez(
    await adm
      .from('auth_otp_challenges')
      .select('id, member_id, invitation_id, code_hash, attempts, max_attempts, expires_at, consumed_at')
      .eq('phone_e164', p.telefone)
      .eq('purpose', p.finalidade)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  )
  if (!d || estadoDoDesafio(d, Date.now()) !== 'valido') throw generico
  // Tentativa conta com trava otimista: dois envios simultâneos não ganham duas chances.
  const r = await adm.from('auth_otp_challenges').update({ attempts: d.attempts + 1 }).eq('id', d.id).eq('attempts', d.attempts).select('id')
  if (!r.data?.length) throw generico
  if (!/^\d{6}$/.test(p.codigo) || !iguais(d.code_hash, hashDoCodigo(e.CH_SEGREDO, d.id, p.codigo))) {
    await auditar({ ator: { userId: null, tipo: 'anonymous' }, acao: `otp.${p.finalidade}.incorreto`, resultado: 'denied', membroId: d.member_id, recurso: { tipo: 'otp', id: d.id } })
    throw generico
  }
  const c = await adm.from('auth_otp_challenges').update({ consumed_at: new Date().toISOString(), code_cipher: null }).eq('id', d.id).is('consumed_at', null).select('id')
  if (!c.data?.length) throw generico
  return { desafioId: d.id, membroId: d.member_id, conviteId: d.invitation_id }
}

/**
 * Limite próprio do segundo fator: 5 erros em 15 minutos bloqueiam aquele
 * usuário, independentemente do IP (as chamadas saem todas do servidor).
 */
export async function conferirLimiteMfa(userId: string): Promise<void> {
  const r = await clienteSecreto()
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('actor_user_id', userId)
    .in('action', ['mfa.incorreto', 'equipe.mfa_incorreto'])
    .gte('at', new Date(Date.now() - 15 * 60_000).toISOString())
  if ((r.count ?? 0) >= 5) throw new ErroDeRegra('Muitas tentativas com o autenticador. Aguarde 15 minutos.')
}

/* --------------------------------------------------------------- sessão */

/**
 * Emite a sessão do Supabase Auth para um usuário já verificado por nós:
 * gera o link mágico no servidor (sem enviar nada) e o troca pela sessão
 * no cliente com cookie. É assim que o login por telefone vira identidade
 * Supabase sem depender do provedor de SMS do próprio Supabase.
 */
export async function emitirSessao(userId: string): Promise<void> {
  const adm = clienteSecreto()
  const u = await adm.auth.admin.getUserById(userId)
  const email = u.data.user?.email
  if (!email) throw new Error('usuário sem identificador interno')
  const link = await adm.auth.admin.generateLink({ type: 'magiclink', email })
  const hash = link.data.properties?.hashed_token
  if (!hash) throw new Error(`generateLink: ${link.error?.message}`)
  const sb = await clienteDoUsuario()
  const v = await sb.auth.verifyOtp({ token_hash: hash, type: 'magiclink' })
  if (v.error || !v.data.session) throw new Error(`verifyOtp: ${v.error?.message}`)
  const claims = (await sb.auth.getClaims()).data?.claims
  if (claims?.session_id) await registrarSessao({ userId, sessionId: String(claims.session_id) })
}

/**
 * Cria (uma vez) a conta Auth do membro, ligada ao registro existente.
 * Sem telefone no Auth: o Auth é compartilhado com o LABPUB e o telefone
 * de acesso vive em `members`, onde é único.
 */
export async function garantirContaDoMembro(membroId: string): Promise<string> {
  const adm = clienteSecreto()
  const m = ou(await adm.from('members').select('user_id').eq('id', membroId).single())
  if (m.user_id) return m.user_id
  const u = await adm.auth.admin.createUser({ email: emailInterno(membroId), email_confirm: true, app_metadata: { member_id: membroId, tipo: 'membro' } })
  if (u.error || !u.data.user) throw new Error(`createUser: ${u.error?.message}`)
  const userId = u.data.user.id
  const r = await adm.from('members').update({ user_id: userId }).eq('id', membroId).is('user_id', null).select('id')
  if (!r.data?.length) {
    await adm.auth.admin.deleteUser(userId)
    throw new ErroDeRegra('Este convite já foi usado.')
  }
  await adm.from('member_roles').insert({ user_id: userId, role: 'member' })
  return userId
}

/* -------------------------------------------------------------- convites */

export async function emitirConvite(membroId: string, porQuem: string): Promise<{ link: string; expira: string }> {
  const e = ambiente()
  const adm = clienteSecreto()
  const m = ou(await adm.from('members').select('status, phone_e164').eq('id', membroId).single())
  if (m.status === 'revoked' || m.status === 'suspended') throw new ErroDeRegra('Membro suspenso ou revogado não recebe convite. Reative primeiro.')
  if (m.status === 'active') throw new ErroDeRegra('Este membro já está ativo. Para recuperar acesso, use "Recuperar acesso".')
  if (!m.phone_e164) throw new ErroDeRegra('Cadastre o telefone antes de convidar: o convite é confirmado por código no telefone.')
  const dias = await ajuste('convite_validade_dias', 7)
  // Um convite vivo por vez: os anteriores são revogados.
  await adm.from('member_invitations').update({ revoked_at: new Date().toISOString(), revoked_by: porQuem }).eq('member_id', membroId).is('accepted_at', null).is('revoked_at', null)
  const token = novoToken()
  const expira = new Date(Date.now() + dias * 86_400_000).toISOString()
  const c = ou(await adm.from('member_invitations').insert({ member_id: membroId, token_hash: sha256(token), expires_at: expira, created_by: porQuem }).select('id').single())
  if (m.status === 'pending') await adm.from('members').update({ status: 'invited' }).eq('id', membroId)
  await auditar({ ator: { userId: porQuem, tipo: 'staff' }, acao: 'convite.emitido', membroId, recurso: { tipo: 'convite', id: c.id }, detalhes: { validade_dias: dias } })
  return { link: `${e.CH_URL}/invite/${token}`, expira }
}

export async function lerConvite(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const adm = clienteSecreto()
  const c = talvez(
    await adm.from('member_invitations').select('id, member_id, expires_at, accepted_at, revoked_at, member:members(full_name, display_name, phone_e164, status)').eq('token_hash', sha256(token)).maybeSingle(),
  )
  if (!c) return null
  const membro = Array.isArray(c.member) ? c.member[0] : c.member
  // Convite só vale para quem está "convidado": suspenso, revogado ou de volta a pendente fecha a porta.
  const estado = membro?.status === 'invited' ? estadoDoConvite(c, Date.now()) : c.accepted_at ? 'aceito' : 'revogado'
  return { id: c.id, membroId: c.member_id, estado, membro }
}
