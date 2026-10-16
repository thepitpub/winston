'use server'

import QRCode from 'qrcode'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { atalhoDevLigado } from '@/lib/ambiente'
import { executar, ErroDeRegra, formulario, type Resultado } from '@/lib/acao'
import { conferirLimiteMfa } from '@/lib/aplicacao/acesso'
import { concluirOnboarding } from '@/lib/aplicacao/onboarding'
import { auditar } from '@/lib/auditoria'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { clienteDoUsuario, clienteSecreto, feito } from '@/lib/db/clientes'

export type Cadastro = { fatorId: string; svg: string; segredo: string; uri: string }

/** Começa o cadastro do Google Authenticator (TOTP nativo do Supabase Auth). */
export async function iniciarAutenticador(): Promise<Resultado<Cadastro>> {
  return executar(async () => {
    await exigirMembro({ onboarding: true })
    const sb = await clienteDoUsuario()
    // Cadastros pela metade não se acumulam.
    const f = await sb.auth.mfa.listFactors()
    if (f.data?.totp.some((x) => x.status === 'verified')) throw new ErroDeRegra('Já existe um autenticador cadastrado. Para trocá-lo, fale com a casa.')
    for (const x of f.data?.all ?? []) if (x.status === 'unverified') await sb.auth.mfa.unenroll({ factorId: x.id })
    const e = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Continental ${new Date().toISOString().slice(0, 10)}`, issuer: 'Continental Heritage' })
    if (e.error || !e.data) throw new ErroDeRegra('Não consegui iniciar o autenticador. Tente de novo.')
    const svg = await QRCode.toString(e.data.totp.uri, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0b0d0f', light: '#eae4d9' } })
    return { fatorId: e.data.id, svg, segredo: e.data.totp.secret, uri: e.data.totp.uri }
  })
}

export async function confirmarAutenticador(fatorId: string, _: Resultado | null, fd: FormData): Promise<Resultado | null> {
  const r = await executar(async () => {
    const s = await exigirMembro({ onboarding: true })
    const { codigo } = z.object({ codigo: z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.') }).parse(formulario(fd))
    await conferirLimiteMfa(s.id.userId)
    const sb = await clienteDoUsuario()
    const v = await sb.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo })
    if (v.error) {
      await auditar({ ator: { userId: s.id.userId, tipo: 'member' }, acao: 'mfa.incorreto', resultado: 'denied', membroId: s.membro.id })
      throw new ErroDeRegra('Código incorreto. Confira o relógio do celular e tente o código seguinte.')
    }
    await auditar({ ator: { userId: s.id.userId, tipo: 'member' }, acao: 'mfa.cadastrado', membroId: s.membro.id })
    return undefined
  })
  if (r?.ok) redirect('/onboarding')
  return r
}

const Preferencias = z.object({
  visible: z.enum(['sim', 'nao']),
  display_name: z.string().trim().max(80).optional(),
  profession: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
})

/** Última etapa: escolha de privacidade (padrão: privado) e ativação. */
export async function concluir(_: Resultado | null, fd: FormData): Promise<Resultado | null> {
  const r = await executar(async () => {
    const s = await exigirMembro({ onboarding: true })
    if (s.id.aal !== 'aal2' && !(s.membro.is_synthetic && atalhoDevLigado())) throw new ErroDeRegra('Cadastre o autenticador antes de concluir.')
    const d = Preferencias.parse(formulario(fd))
    await concluirOnboarding(s.membro.id, s.id.userId)
    const visivel = d.visible === 'sim'
    feito(
      await clienteSecreto()
        .from('directory_preferences')
        .update({
          visible: visivel,
          display_name: d.display_name || null,
          profession: d.profession || null,
          company: d.company || null,
          city: d.city || null,
          consented_at: visivel ? new Date().toISOString() : null,
        })
        .eq('member_id', s.membro.id),
    )
    await auditar({ ator: { userId: s.id.userId, tipo: 'member' }, acao: 'diretorio.preferencias', membroId: s.membro.id, detalhes: { visivel } })
    return undefined
  })
  if (r?.ok) redirect('/lobby')
  return r
}
