'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, type Resultado } from '@/lib/acao'
import { avaliar, confirmarProposta, perguntar } from '@/lib/aplicacao/winston'
import { exigirMembro } from '@/lib/autorizacao/membro'

async function eu() {
  const { membro, id } = await exigirMembro()
  return { id: membro.id, userId: id.userId, nome: membro.display_name || membro.full_name }
}

export async function enviarAoWinston(conversaId: string | null, texto: string, chave: string): Promise<Resultado<{ conversaId: string }>> {
  return executar(async () => {
    const d = z.object({ conversaId: z.uuid().nullable(), texto: z.string().trim().min(1, 'Escreva algo.').max(500, 'No máximo 500 caracteres.'), chave: z.uuid() }).parse({ conversaId, texto, chave })
    const r = await perguntar(await eu(), d.conversaId, d.texto, d.chave)
    revalidatePath('/winston')
    return r
  })
}

export async function confirmarPedido(mensagemId: string): Promise<Resultado<{ id: string }>> {
  return executar(async () => {
    const s = await confirmarProposta(await eu(), z.uuid().parse(mensagemId))
    revalidatePath('/winston')
    revalidatePath('/requests')
    return { id: s.id }
  })
}

export async function avaliarResposta(mensagemId: string, nota: 1 | -1): Promise<Resultado> {
  return executar(async () => {
    await avaliar(await eu(), z.uuid().parse(mensagemId), z.union([z.literal(1), z.literal(-1)]).parse(nota))
    return undefined
  })
}
