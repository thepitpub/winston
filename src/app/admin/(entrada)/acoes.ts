'use server'

import QRCode from 'qrcode'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { executar, ErroDeRegra, formulario, type Resultado } from '@/lib/acao'
import { conferirLimiteMfa } from '@/lib/aplicacao/acesso'
import { auditar } from '@/lib/auditoria'
import { registrarSessao, sair } from '@/lib/autorizacao/sessao'
import { ambiente } from '@/lib/ambiente'
import { contextoDaEquipe, ErroDeAcesso } from '@/lib/autorizacao/equipe'
import { clienteDoUsuario, clienteSecreto } from '@/lib/db/clientes'
import { hmac } from '@/lib/dominio/cripto'

const Entrada = z.object({ email: z.email('E-mail inválido.'), senha: z.string().min(8, 'Senha inválida.') })

/**
 * Limite próprio por e-mail: 5 falhas em 15 minutos. O limite do Supabase
 * vê só o IP do servidor (todas as chamadas saem dele), então não protege
 * uma conta específica. O e-mail vai para a trilha só como hash.
 */
const hashDoEmail = (email: string) => hmac(ambiente().CH_SEGREDO, `equipe:${email}`).slice(0, 32)
async function conferirLimiteEntrada(emailHash: string) {
  const r = await clienteSecreto()
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('action', 'equipe.login_falhou')
    .eq('details->>email_hash', emailHash)
    .gte('at', new Date(Date.now() - 15 * 60_000).toISOString())
  if ((r.count ?? 0) >= 5) throw new ErroDeRegra('Muitas tentativas para este e-mail. Aguarde 15 minutos.')
}

/** E-mail e senha só abrem AAL1; o Command inteiro exige o autenticador (AAL2). */
export async function entrarEquipe(_: Resultado | null, fd: FormData): Promise<Resultado | null> {
  const r = await executar(async () => {
    const d = Entrada.parse(formulario(fd))
    const emailHash = hashDoEmail(d.email.toLowerCase())
    await conferirLimiteEntrada(emailHash)
    const sb = await clienteDoUsuario()
    const s = await sb.auth.signInWithPassword({ email: d.email.toLowerCase(), password: d.senha })
    if (s.error || !s.data.user) {
      await auditar({ ator: { userId: null, tipo: 'anonymous' }, acao: 'equipe.login_falhou', resultado: 'denied', detalhes: { email_hash: emailHash } })
      throw new ErroDeRegra('E-mail ou senha não conferem.')
    }
    const pessoa = await clienteSecreto().from('staff_members').select('status').eq('user_id', s.data.user.id).maybeSingle()
    if (pessoa.data?.status !== 'active') {
      await sb.auth.signOut({ scope: 'local' })
      await auditar({ ator: { userId: s.data.user.id, tipo: 'staff' }, acao: 'equipe.login_sem_acesso', resultado: 'denied' })
      throw new ErroDeRegra('E-mail ou senha não conferem.')
    }
    const claims = (await sb.auth.getClaims()).data?.claims
    if (claims?.session_id) await registrarSessao({ userId: s.data.user.id, sessionId: String(claims.session_id) })
    await auditar({ ator: { userId: s.data.user.id, tipo: 'staff' }, acao: 'equipe.login_senha_ok' })
    return undefined
  })
  if (r?.ok) redirect('/admin/mfa')
  return r
}

export async function verificarMfaEquipe(_: Resultado | null, fd: FormData): Promise<Resultado | null> {
  const r = await executar(async () => {
    const { codigo } = z.object({ codigo: z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.') }).parse(formulario(fd))
    const sb = await clienteDoUsuario()
    const u = (await sb.auth.getClaims()).data?.claims
    if (!u?.sub) throw new ErroDeRegra('Entre de novo.')
    await conferirLimiteMfa(u.sub)
    const f = await sb.auth.mfa.listFactors()
    const fator = f.data?.totp.find((x) => x.status === 'verified')
    if (!fator) throw new ErroDeRegra('Cadastre o autenticador primeiro.')
    const v = await sb.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo })
    if (v.error) {
      await auditar({ ator: { userId: u?.sub ?? null, tipo: 'staff' }, acao: 'equipe.mfa_incorreto', resultado: 'denied' })
      throw new ErroDeRegra('Código incorreto.')
    }
    await auditar({ ator: { userId: u?.sub ?? null, tipo: 'staff' }, acao: 'equipe.login_ok' })
    return undefined
  })
  if (r?.ok) redirect('/admin')
  return r
}

export async function iniciarMfaEquipe(): Promise<Resultado<{ fatorId: string; svg: string; segredo: string; uri: string }>> {
  return executar(async () => {
    const sb = await clienteDoUsuario()
    const c = (await sb.auth.getClaims()).data?.claims
    if (!c?.sub) throw new ErroDeRegra('Entre de novo.')
    const pessoa = await clienteSecreto().from('staff_members').select('status').eq('user_id', c.sub).maybeSingle()
    if (pessoa.data?.status !== 'active') throw new ErroDeRegra('Sem acesso.')
    const f = await sb.auth.mfa.listFactors()
    if (f.data?.totp.some((x) => x.status === 'verified')) throw new ErroDeRegra('Já existe um autenticador cadastrado.')
    for (const x of f.data?.all ?? []) if (x.status === 'unverified') await sb.auth.mfa.unenroll({ factorId: x.id })
    const e = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Command ${new Date().toISOString().slice(0, 10)}`, issuer: 'Continental Command' })
    if (e.error || !e.data) throw new ErroDeRegra('Não consegui iniciar o autenticador.')
    const svg = await QRCode.toString(e.data.totp.uri, { type: 'svg', margin: 0, color: { dark: '#0b0d0f', light: '#eae4d9' } })
    return { fatorId: e.data.id, svg, segredo: e.data.totp.secret, uri: e.data.totp.uri }
  })
}

export async function confirmarMfaEquipe(fatorId: string, _: Resultado | null, fd: FormData): Promise<Resultado | null> {
  const r = await executar(async () => {
    const { codigo } = z.object({ codigo: z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.') }).parse(formulario(fd))
    const sb = await clienteDoUsuario()
    const antes = (await sb.auth.getClaims()).data?.claims
    if (!antes?.sub) throw new ErroDeRegra('Entre de novo.')
    await conferirLimiteMfa(antes.sub)
    const v = await sb.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo })
    if (v.error) {
      await auditar({ ator: { userId: antes.sub, tipo: 'staff' }, acao: 'equipe.mfa_incorreto', resultado: 'denied' })
      throw new ErroDeRegra('Código incorreto.')
    }
    const c = (await sb.auth.getClaims()).data?.claims
    await auditar({ ator: { userId: c?.sub ?? null, tipo: 'staff' }, acao: 'equipe.mfa_cadastrado' })
    return undefined
  })
  if (r?.ok) redirect('/admin')
  return r
}

const NovaSenha = z
  .object({ senha: z.string().min(12, 'Mínimo de 12 caracteres.').max(128), confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, { message: 'As senhas não conferem.', path: ['confirmacao'] })

/** Troca da senha provisória: exige a sessão completa da equipe (AAL2). */
export async function trocarSenhaEquipe(_: Resultado | null, fd: FormData): Promise<Resultado | null> {
  const r = await executar(async () => {
    const c = await contextoDaEquipe()
    if (c instanceof ErroDeAcesso) throw c
    const d = NovaSenha.parse(formulario(fd))
    const adm = clienteSecreto()
    const u = await adm.auth.admin.updateUserById(c.id.userId, { password: d.senha })
    if (u.error) throw new ErroDeRegra('O Auth recusou esta senha. Escolha outra, mais longa.', { senha: 'Recusada.' })
    const m = await adm.from('staff_members').update({ must_change_password: false }).eq('user_id', c.id.userId)
    if (m.error) throw new Error(m.error.message)
    await auditar({ ator: { userId: c.id.userId, tipo: 'staff' }, acao: 'equipe.senha_trocada' })
    return undefined
  })
  if (r?.ok) redirect('/admin')
  return r
}

export async function sairEquipe() {
  await sair()
  redirect('/admin/login')
}
