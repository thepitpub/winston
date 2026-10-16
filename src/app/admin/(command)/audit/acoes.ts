'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, ErroDeRegra, formulario, type Resultado } from '@/lib/acao'
import { auditar } from '@/lib/auditoria'
import { exigirPermissao } from '@/lib/autorizacao/equipe'
import { revogarTodas } from '@/lib/autorizacao/sessao'
import { ambiente } from '@/lib/ambiente'
import { clienteSecreto, feito, talvez } from '@/lib/db/clientes'
import type { Json } from '@/lib/db/tipos.gerados'

const Ajustes = z.object({
  mfa_obrigatorio_membro: z.enum(['true', 'false']).transform((v) => v === 'true'),
  otp_validade_segundos: z.coerce.number().int().min(120).max(1800),
  otp_max_tentativas: z.coerce.number().int().min(3).max(10),
  otp_max_envios_10min: z.coerce.number().int().min(1).max(10),
  convite_validade_dias: z.coerce.number().int().min(1).max(30),
  winston_limite_hora: z.coerce.number().int().min(5).max(200),
})

/** Alvo de ação de equipe tem de ser pessoa da equipe (o Auth é compartilhado com o LABPUB). */
async function exigirPessoaDaEquipe(userId: string) {
  const p = talvez(await clienteSecreto().from('staff_members').select('is_synthetic, status').eq('user_id', userId).maybeSingle())
  if (!p) throw new ErroDeRegra('Esta conta não é da equipe.')
  return p
}

export async function salvarAjustes(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('settings.manage')
    const d = Ajustes.parse(formulario(fd))
    // Com entrega manual, a equipe vê o código temporário: o autenticador do
    // membro é o que impede alguém da casa de entrar no lugar dele.
    if (!d.mfa_obrigatorio_membro && ambiente().CH_OTP_PROVEDOR === 'manual')
      throw new ErroDeRegra('Com a entrega manual de códigos, o autenticador do membro não pode ser desligado.', { mfa_obrigatorio_membro: 'Exigido com entrega manual.' })
    const adm = clienteSecreto()
    for (const [key, value] of Object.entries(d)) feito(await adm.from('app_settings').upsert({ key, value: value as Json, updated_by: eq.id.userId, updated_at: new Date().toISOString() }))
    await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'ajustes.salvos', detalhes: d })
    revalidatePath('/admin/audit')
    return undefined
  }, 'Ajustes salvos.')
}

export async function definirPapel(userId: string, papel: string): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('roles.manage')
    const u = z.uuid().parse(userId)
    const p = z.enum(['super_admin', 'admin', 'staff']).parse(papel)
    if (u === eq.id.userId) throw new ErroDeRegra('Ninguém altera o próprio papel.')
    await exigirPessoaDaEquipe(u)
    // Troca atômica no banco: se algo falha, o papel antigo continua.
    const r = await clienteSecreto().rpc('ch_definir_papel', { p_user: u, p_role: p, p_by: eq.id.userId })
    if (r.error) throw new Error(r.error.message)
    await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'papel.alterado', recurso: { tipo: 'staff', id: u }, detalhes: { papel: p } })
    revalidatePath('/admin/audit')
    return undefined
  })
}

export async function concederCs(userId: string, conceder: boolean): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('roles.manage')
    const u = z.uuid().parse(userId)
    if (u === eq.id.userId) throw new ErroDeRegra('Ninguém concede acesso a si mesmo.')
    const adm = clienteSecreto()
    const alvo = await exigirPessoaDaEquipe(u)
    if (conceder && alvo.is_synthetic) throw new ErroDeRegra('Identidade sintética não recebe acesso à inteligência privada.')
    if (conceder && alvo.status !== 'active') throw new ErroDeRegra('Só pessoa ativa da equipe recebe esse acesso.')
    if (conceder) feito(await adm.from('user_permissions').upsert([{ user_id: u, permission: 'cs.read', granted_by: eq.id.userId }, { user_id: u, permission: 'cs.write', granted_by: eq.id.userId }]))
    else feito(await adm.from('user_permissions').delete().eq('user_id', u).in('permission', ['cs.read', 'cs.write']))
    await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: conceder ? 'cs.acesso_concedido' : 'cs.acesso_revogado', recurso: { tipo: 'staff', id: u } })
    revalidatePath('/admin/audit')
    return undefined
  })
}

export async function statusEquipe(userId: string, ativo: boolean): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('roles.manage')
    const u = z.uuid().parse(userId)
    if (u === eq.id.userId) throw new ErroDeRegra('Ninguém suspende a si mesmo.')
    await exigirPessoaDaEquipe(u)
    feito(await clienteSecreto().from('staff_members').update({ status: ativo ? 'active' : 'suspended' }).eq('user_id', u))
    if (!ativo) await revogarTodas(u, eq.id.userId, 'equipe_suspensa')
    await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: ativo ? 'equipe.reativada' : 'equipe.suspensa', recurso: { tipo: 'staff', id: u } })
    revalidatePath('/admin/audit')
    return undefined
  })
}
