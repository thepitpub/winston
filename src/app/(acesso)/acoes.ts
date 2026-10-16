'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { executar, ErroDeRegra, formulario, type Resultado } from '@/lib/acao'
import { ambiente } from '@/lib/ambiente'
import { conferirDesafio, conferirLimiteMfa, criarDesafio, emitirSessao, garantirContaDoMembro, lerConvite } from '@/lib/aplicacao/acesso'
import { auditar } from '@/lib/auditoria'
import { membroDaSessao, temFatorVerificado } from '@/lib/autorizacao/membro'
import { sair } from '@/lib/autorizacao/sessao'
import { clienteDoUsuario, clienteSecreto } from '@/lib/db/clientes'
import { paraE164 } from '@/lib/dominio/telefone'

const Telefone = z.string().transform((v, ctx) => {
  const t = paraE164(v)
  if (!t) ctx.addIssue({ code: 'custom', message: 'Telefone inválido. Use DDD e número.' })
  return t ?? ''
})
const Codigo = z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.')

export type EstadoLogin = Resultado<{ etapa: 'codigo' | 'feito'; telefone?: string; manual?: boolean }> | null

/* ------------------------------------------------------------------ login */

export async function pedirCodigoLogin(_: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  return executar(async () => {
    const { telefone } = z.object({ telefone: Telefone }).parse(formulario(fd))
    const m = await clienteSecreto().from('members').select('id, status, user_id').eq('phone_e164', telefone).maybeSingle()
    // Mesma resposta, mesmos limites e mesmo caminho exista ou não o
    // membro: o desafio de quem não é membro ativo é inerte (simulado).
    const elegivel = Boolean(m.data && m.data.status === 'active' && m.data.user_id)
    await criarDesafio({ telefone, finalidade: 'login', membroId: elegivel ? m.data!.id : null, simular: !elegivel })
    return { etapa: 'codigo' as const, telefone, manual: ambiente().CH_OTP_PROVEDOR === 'manual' }
  })
}

export async function conferirCodigoLogin(_: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const r = await executar(async () => {
    const d = z.object({ telefone: Telefone, codigo: Codigo }).parse(formulario(fd))
    const ok = await conferirDesafio({ telefone: d.telefone, finalidade: 'login', codigo: d.codigo })
    const m = await clienteSecreto().from('members').select('user_id, status').eq('id', ok.membroId ?? '').maybeSingle()
    if (!m.data?.user_id || m.data.status !== 'active') throw new ErroDeRegra('Código inválido ou expirado.')
    await emitirSessao(m.data.user_id)
    await auditar({ ator: { userId: m.data.user_id, tipo: 'member' }, acao: 'login.codigo_ok', membroId: ok.membroId })
    return { etapa: 'feito' as const }
  })
  if (r?.ok) redirect((await temFatorVerificado()) ? '/login/mfa' : '/onboarding')
  return r
}

/* -------------------------------------------------------- segundo fator */

export async function verificarMfa(_: Resultado | null, fd: FormData): Promise<Resultado | null> {
  const r = await executar(async () => {
    const { codigo } = z.object({ codigo: Codigo }).parse(formulario(fd))
    const sessao = await membroDaSessao()
    if (!sessao) throw new ErroDeRegra('Entre de novo.')
    await conferirLimiteMfa(sessao.id.userId)
    const sb = await clienteDoUsuario()
    const f = await sb.auth.mfa.listFactors()
    const fator = f.data?.totp.find((x) => x.status === 'verified')
    if (!fator) throw new ErroDeRegra('Nenhum autenticador cadastrado.')
    const v = await sb.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo })
    const s = await membroDaSessao()
    if (v.error) {
      await auditar({ ator: { userId: s?.id.userId ?? null, tipo: 'member' }, acao: 'mfa.incorreto', resultado: 'denied', membroId: s?.membro.id })
      throw new ErroDeRegra('Código do autenticador incorreto.')
    }
    await auditar({ ator: { userId: s?.id.userId ?? null, tipo: 'member' }, acao: 'mfa.ok', membroId: s?.membro.id })
    return undefined
  })
  if (r?.ok) redirect('/lobby')
  return r
}

/* ---------------------------------------------------------------- convite */

export type EstadoConvite = Resultado<{ etapa: 'codigo'; manual: boolean }> | null

export async function pedirCodigoConvite(token: string, _: EstadoConvite, fd: FormData): Promise<EstadoConvite> {
  return executar(async () => {
    const { telefone } = z.object({ telefone: Telefone }).parse(formulario(fd))
    const c = await lerConvite(token)
    if (!c || c.estado !== 'valido') throw new ErroDeRegra('Este convite não está mais válido. Peça um novo à casa.')
    if (c.membro?.phone_e164 !== telefone) {
      await auditar({ ator: { userId: null, tipo: 'anonymous' }, acao: 'convite.telefone_divergente', resultado: 'denied', membroId: c.membroId })
      throw new ErroDeRegra('Este telefone não confere com o do convite. Fale com a casa.')
    }
    await criarDesafio({ telefone, finalidade: 'invite', membroId: c.membroId, conviteId: c.id })
    return { etapa: 'codigo' as const, manual: ambiente().CH_OTP_PROVEDOR === 'manual' }
  })
}

export async function aceitarConvite(token: string, _: EstadoConvite, fd: FormData): Promise<EstadoConvite> {
  const r = await executar(async () => {
    const d = z.object({ telefone: Telefone, codigo: Codigo }).parse(formulario(fd))
    const c = await lerConvite(token)
    if (!c || c.estado !== 'valido') throw new ErroDeRegra('Este convite não está mais válido. Peça um novo à casa.')
    const ok = await conferirDesafio({ telefone: d.telefone, finalidade: 'invite', codigo: d.codigo })
    if (ok.conviteId !== c.id) throw new ErroDeRegra('Código inválido ou expirado.')
    const userId = await garantirContaDoMembro(c.membroId)
    const adm = clienteSecreto()
    const aceite = await adm.from('member_invitations').update({ accepted_at: new Date().toISOString() }).eq('id', c.id).is('accepted_at', null).is('revoked_at', null).select('id')
    if (!aceite.data?.length) throw new ErroDeRegra('Este convite já foi usado.')
    await emitirSessao(userId)
    await auditar({ ator: { userId, tipo: 'member' }, acao: 'convite.aceito', membroId: c.membroId, recurso: { tipo: 'convite', id: c.id } })
    return { etapa: 'codigo' as const, manual: false }
  })
  if (r?.ok) redirect('/onboarding')
  return r
}

/* ------------------------------------------------------------------- sair */

export async function sairDaCasa() {
  const s = await membroDaSessao()
  if (s) await auditar({ ator: { userId: s.id.userId, tipo: 'member' }, acao: 'logout', membroId: s.membro.id })
  await sair()
  redirect('/login')
}
