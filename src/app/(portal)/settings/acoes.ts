'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ambiente, atalhoDevLigado } from '@/lib/ambiente'
import { executar, ErroDeRegra, formulario, type Resultado } from '@/lib/acao'
import { conferirDesafio, criarDesafio } from '@/lib/aplicacao/acesso'
import { auditar } from '@/lib/auditoria'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { clienteSecreto, feito, talvez } from '@/lib/db/clientes'
import { paraE164 } from '@/lib/dominio/telefone'

const lista = (v: string | undefined) => (v ?? '').split(/[;,]/).map((x) => x.trim()).filter(Boolean).slice(0, 15)

// Campos dentro de <fieldset disabled> não são enviados: tudo tem padrão.
const Diretorio = z.object({
  visible: z.enum(['sim', 'nao']),
  display_name: z.string().trim().max(80).default(''),
  profession: z.string().trim().max(120).default(''),
  company: z.string().trim().max(120).default(''),
  city: z.string().trim().max(80).default(''),
  interests: z.string().max(600).default(''),
  skills: z.string().max(600).default(''),
  description: z.string().trim().max(600).default(''),
  contact_whatsapp: z.enum(['on']).optional(),
  contact_email: z.union([z.literal(''), z.email('E-mail inválido.')]).default(''),
  contact_instagram: z.string().trim().max(60).default(''),
  contact_linkedin: z.union([z.literal(''), z.url('Informe o endereço completo do LinkedIn.').startsWith('https://', 'Use https://')]).default(''),
})

/** Preferências do diretório: consentimento explícito, campo a campo. */
export async function salvarDiretorio(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const { membro, id } = await exigirMembro()
    const d = Diretorio.parse(formulario(fd))
    const visivel = d.visible === 'sim'
    const atual = talvez(await clienteSecreto().from('directory_preferences').select('visible, consented_at').eq('member_id', membro.id).maybeSingle())
    if (!visivel) {
      // Retirar o consentimento só desliga a visibilidade; o resto fica guardado para quando voltar.
      feito(await clienteSecreto().from('directory_preferences').upsert({ member_id: membro.id, visible: false, consented_at: null }))
      await auditar({ ator: { userId: id.userId, tipo: 'member' }, acao: 'diretorio.consentimento_retirado', membroId: membro.id })
      revalidatePath('/settings')
      return undefined
    }
    feito(
      await clienteSecreto()
        .from('directory_preferences')
        .upsert({
          member_id: membro.id,
          visible: visivel,
          display_name: d.display_name || null,
          profession: d.profession || null,
          company: d.company || null,
          city: d.city || null,
          interests: lista(d.interests),
          skills: lista(d.skills),
          description: d.description || null,
          contact_whatsapp: d.contact_whatsapp === 'on',
          contact_email: d.contact_email || null,
          contact_instagram: d.contact_instagram || null,
          contact_linkedin: d.contact_linkedin || null,
          consented_at: visivel ? (atual?.visible ? atual.consented_at : new Date().toISOString()) : null,
        }),
    )
    await auditar({ ator: { userId: id.userId, tipo: 'member' }, acao: 'diretorio.preferencias', membroId: membro.id, detalhes: { visivel, whatsapp: d.contact_whatsapp === 'on' } })
    revalidatePath('/settings')
    return undefined
  }, 'Preferências salvas.')
}

export async function salvarNome(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const { membro, id } = await exigirMembro()
    const { nome } = z.object({ nome: z.string().trim().min(1, 'Informe um nome.').max(80) }).parse(formulario(fd))
    feito(await clienteSecreto().from('members').update({ display_name: nome }).eq('id', membro.id))
    await auditar({ ator: { userId: id.userId, tipo: 'member' }, acao: 'perfil.editado', membroId: membro.id, detalhes: { campos: ['display_name'] } })
    revalidatePath('/', 'layout')
    return undefined
  }, 'Nome atualizado.')
}

/* ---------------------------------------------------------- troca de telefone */

export type EstadoTelefone = Resultado<{ etapa: 'codigo'; telefone: string; manual: boolean } | { etapa: 'feito' }> | null

export async function pedirTrocaTelefone(_: EstadoTelefone, fd: FormData): Promise<EstadoTelefone> {
  return executar(async () => {
    const { membro, id } = await exigirMembro()
    if (id.aal !== 'aal2' && !(membro.is_synthetic && atalhoDevLigado())) throw new ErroDeRegra('Confirme o autenticador antes de trocar o telefone.')
    const telefone = paraE164(String(fd.get('telefone') ?? ''))
    if (!telefone) throw new ErroDeRegra('Telefone inválido.', { telefone: 'Telefone inválido.' })
    // Não revela se o número é de outro membro: a checagem acontece na confirmação.
    await criarDesafio({ telefone, finalidade: 'phone_change', membroId: membro.id })
    return { etapa: 'codigo' as const, telefone, manual: ambiente().CH_OTP_PROVEDOR === 'manual' }
  })
}

export async function confirmarTrocaTelefone(_: EstadoTelefone, fd: FormData): Promise<EstadoTelefone> {
  return executar(async () => {
    const { membro, id } = await exigirMembro()
    const d = z.object({ telefone: z.string(), codigo: z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.') }).parse(formulario(fd))
    const telefone = paraE164(d.telefone)
    if (!telefone) throw new ErroDeRegra('Telefone inválido.')
    const ok = await conferirDesafio({ telefone, finalidade: 'phone_change', codigo: d.codigo })
    if (ok.membroId !== membro.id) throw new ErroDeRegra('Código inválido ou expirado.')
    const adm = clienteSecreto()
    const r = await adm.from('members').update({ phone_e164: telefone }).eq('id', membro.id)
    if (r.error) throw new ErroDeRegra('Não foi possível usar este telefone. Fale com a casa.')
    await adm.from('member_notifications').insert({ member_id: membro.id, kind: 'seguranca', title: 'Seu telefone de acesso foi alterado.', body: 'Se não foi você, use o Service Bell imediatamente.' })
    await auditar({ ator: { userId: id.userId, tipo: 'member' }, acao: 'telefone.trocado', membroId: membro.id })
    revalidatePath('/settings')
    return { etapa: 'feito' as const }
  })
}

/* ------------------------------------------------------------------- sessões */

export async function encerrarSessao(sessaoId: string): Promise<Resultado> {
  return executar(async () => {
    const { membro, id } = await exigirMembro()
    const s = z.uuid().parse(sessaoId)
    if (s === id.sessionId) throw new ErroDeRegra('Para esta sessão, use "Sair".')
    const adm = clienteSecreto()
    const r = await adm.from('member_sessions').update({ revoked_at: new Date().toISOString(), revoked_by: id.userId, revoke_reason: 'membro' }).eq('id', s).eq('user_id', id.userId).is('revoked_at', null).select('id')
    if (!r.data?.length) throw new ErroDeRegra('Sessão não encontrada.')
    // Derruba também no Auth: o refresh token daquele aparelho morre.
    await adm.rpc('ch_revogar_sessao_auth', { p_session: s, p_user: id.userId })
    await auditar({ ator: { userId: id.userId, tipo: 'member' }, acao: 'sessao.revogada', membroId: membro.id, recurso: { tipo: 'sessao', id: s } })
    revalidatePath('/settings')
    return undefined
  })
}
