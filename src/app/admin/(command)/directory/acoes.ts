'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, type Resultado } from '@/lib/acao'
import { auditar } from '@/lib/auditoria'
import { exigirPermissao } from '@/lib/autorizacao/equipe'
import { clienteSecreto, feito } from '@/lib/db/clientes'

export async function moderar(membroId: string, ocultar: boolean, nota: string): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('directory.moderate')
    const id = z.uuid().parse(membroId)
    const n = ocultar ? z.string().trim().min(3, 'Diga o motivo.').max(300).parse(nota) : null
    feito(await clienteSecreto().from('directory_preferences').update({ moderation_status: ocultar ? 'hidden' : 'ok', moderation_note: n, moderated_by: eq.id.userId }).eq('member_id', id))
    await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: ocultar ? 'diretorio.ocultado' : 'diretorio.republicado', membroId: id, detalhes: { nota: n } })
    revalidatePath('/admin/directory')
    return undefined
  })
}
