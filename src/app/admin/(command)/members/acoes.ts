'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, ErroDeRegra, formulario, type Resultado } from '@/lib/acao'
import { lancarCoins } from '@/lib/aplicacao/coins'
import { acaoCredencial, convidar, editarMembro, mudarStatus, recuperarAcesso, revogarConvite, revogarSessoes, salvarNotaInterna } from '@/lib/aplicacao/equipe/membros'
import { exigirPermissao } from '@/lib/autorizacao/equipe'
import { paraE164 } from '@/lib/dominio/telefone'

const Id = z.uuid()
const recarregar = (id: string) => revalidatePath(`/admin/members/${id}`)

export async function salvarCadastro(id: string, _: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('members.write')
    const d = z
      .object({
        display_name: z.string().trim().max(80),
        category: z.enum(['founder', 'member', 'honorary']),
        joined_at: z.union([z.literal(''), z.iso.date('Data inválida.')]),
        telefone: z.string().trim(),
      })
      .parse(formulario(fd))
    const tel = d.telefone ? paraE164(d.telefone) : null
    if (d.telefone && !tel) throw new ErroDeRegra('Telefone inválido.', { telefone: 'Telefone inválido.' })
    await editarMembro(eq, Id.parse(id), { display_name: d.display_name || null, category: d.category, joined_at: d.joined_at || null, phone_e164: tel })
    recarregar(id)
    return undefined
  }, 'Cadastro salvo.')
}

export async function alterarStatus(id: string, _: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('members.write')
    const d = z.object({ para: z.enum(['pending', 'invited', 'active', 'suspended', 'revoked']), motivo: z.string().trim().min(5, 'Justifique em poucas palavras.').max(300) }).parse(formulario(fd))
    await mudarStatus(eq, Id.parse(id), d.para, d.motivo)
    recarregar(id)
    return undefined
  }, 'Status alterado.')
}

export async function emitirConvite(id: string): Promise<Resultado<{ link: string; expira: string }>> {
  return executar(async () => {
    const eq = await exigirPermissao('invitations.manage')
    const r = await convidar(eq, Id.parse(id))
    recarregar(id)
    return r
  })
}

export async function cancelarConvite(membroId: string, conviteId: string): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('invitations.manage')
    await revogarConvite(eq, Id.parse(conviteId))
    recarregar(membroId)
    return undefined
  })
}

export async function recuperar(id: string, _: Resultado<{ link: string; expira: string }> | null, fd: FormData): Promise<Resultado<{ link: string; expira: string }>> {
  return executar(async () => {
    const eq = await exigirPermissao('invitations.manage')
    const { justificativa } = z.object({ justificativa: z.string().trim().min(10, 'Diga como a identidade foi confirmada.').max(300) }).parse(formulario(fd))
    const r = await recuperarAcesso(eq, Id.parse(id), justificativa)
    recarregar(id)
    return r
  })
}

export async function derrubarSessoes(id: string): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('sessions.revoke')
    await revogarSessoes(eq, Id.parse(id))
    recarregar(id)
    return undefined
  }, 'Sessões encerradas.')
}

export async function credencial(id: string, acao: 'emitir' | 'suspender' | 'reativar' | 'revogar'): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('members.write')
    await acaoCredencial(eq, Id.parse(id), z.enum(['emitir', 'suspender', 'reativar', 'revogar']).parse(acao))
    recarregar(id)
    return undefined
  })
}

export async function ajustarCoins(id: string, _: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('coins.adjust')
    const d = z
      .object({
        valor: z.coerce.number().int('Valor inteiro.').refine((n) => n !== 0, 'Diferente de zero.').refine((n) => Math.abs(n) <= 100000, 'Valor fora do limite.'),
        motivo: z.string().trim().min(5, 'Motivo obrigatório (mín. 5 caracteres).').max(300),
        chave: z.uuid(),
      })
      .parse(formulario(fd))
    await lancarCoins({ membroId: Id.parse(id), valor: d.valor, tipo: 'adjustment', motivo: d.motivo, chave: `ajuste:${d.chave}`, operador: eq.id.userId })
    recarregar(id)
    return undefined
  }, 'Lançamento registrado.')
}

export async function salvarNota(id: string, _: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    // Quem grava a nota tem de poder lê-la: senão sobrescreveria às cegas.
    await exigirPermissao('cs.read')
    const eq = await exigirPermissao('cs.write')
    const { nota } = z.object({ nota: z.string().max(4000) }).parse(formulario(fd))
    await salvarNotaInterna(eq, Id.parse(id), nota.trim())
    recarregar(id)
    return undefined
  }, 'Nota salva.')
}
