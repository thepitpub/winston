'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, type Resultado } from '@/lib/acao'
import { pedirConexao, responderConexao } from '@/lib/aplicacao/diretorio'
import { exigirMembro } from '@/lib/autorizacao/membro'

async function eu() {
  const { membro, id } = await exigirMembro()
  return { id: membro.id, userId: id.userId, nome: membro.display_name || membro.full_name }
}

export async function conectar(alvo: string, _: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const a = z.uuid().parse(alvo)
    const msg = z.string().trim().max(400).optional().parse(fd.get('mensagem') ?? undefined)
    await pedirConexao(await eu(), a, msg || null)
    revalidatePath(`/directory/${a}`)
    return undefined
  }, 'Pedido enviado.')
}

export async function agirConexao(conexaoId: string, acao: 'aceitar' | 'recusar' | 'bloquear' | 'cancelar'): Promise<Resultado> {
  return executar(async () => {
    await responderConexao(await eu(), z.uuid().parse(conexaoId), z.enum(['aceitar', 'recusar', 'bloquear', 'cancelar']).parse(acao))
    revalidatePath('/directory', 'layout')
    return undefined
  })
}
