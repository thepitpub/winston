'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, ErroDeRegra, type Resultado } from '@/lib/acao'
import { alternar, idsDoPublico, salvar, tamanhoDoPublico, type DadosComunicado } from '@/lib/aplicacao/equipe/comunicados'
import { exigirPermissao } from '@/lib/autorizacao/equipe'

const Comunicado = z
  .object({
    title: z.string().trim().min(1, 'Título obrigatório.').max(120),
    body: z.string().trim().min(1, 'Texto obrigatório.').max(1200),
    cta_label: z.string().trim().max(40),
    cta_target: z.string().trim().max(300),
    kind: z.enum(['modal', 'banner', 'lobby']),
    frequency: z.enum(['once', 'session', 'always', 'until_ack']),
    priority: z.coerce.number().int().min(0).max(100),
    publico: z.enum(['todos', 'segmento']),
    statuses: z.array(z.enum(['pending', 'invited', 'active', 'suspended', 'revoked'])),
    categories: z.array(z.enum(['founder', 'member', 'honorary'])),
    pages: z.array(z.string().regex(/^\/[a-z-]*$/)),
    starts_at: z.string().min(1, 'Início obrigatório.'),
    ends_at: z.string(),
    active: z.boolean(),
  })
  .refine((d) => !d.cta_label === !d.cta_target, { message: 'Botão precisa de texto e destino juntos.', path: ['cta_target'] })
  .refine((d) => !d.cta_target || /^(\/(?!\/)[a-z0-9/_-]*|https:\/\/.+)$/i.test(d.cta_target), { message: 'Destino: rota do Portal (/lobby) ou https://', path: ['cta_target'] })

export type EntradaComunicado = z.input<typeof Comunicado>

const iso = (v: string) => (v ? new Date(`${v}:00-03:00`).toISOString() : null)

/** Público do segmento. `ids` são membros específicos já gravados, preservados na edição. */
function audiencia(d: { publico: 'todos' | 'segmento'; statuses: string[]; categories: string[] }, ids: string[]): DadosComunicado['audience'] {
  if (d.publico === 'todos') return { all: true }
  if (!d.statuses.length && !d.categories.length && !ids.length) throw new ErroDeRegra('Escolha ao menos um critério de segmento.', { publico: 'Critério obrigatório.' })
  return { ...(d.statuses.length && { statuses: d.statuses }), ...(d.categories.length && { categories: d.categories }), ...(ids.length && { member_ids: ids }) }
}

function paraDados(d: z.infer<typeof Comunicado>, ids: string[]): DadosComunicado {
  const audience = audiencia(d, ids)
  const inicio = iso(d.starts_at)!
  const fim = iso(d.ends_at)
  if (fim && fim <= inicio) throw new ErroDeRegra('O fim precisa ser depois do início.', { ends_at: 'Depois do início.' })
  return { title: d.title, body: d.body, cta_label: d.cta_label || null, cta_target: d.cta_target || null, kind: d.kind, frequency: d.frequency, priority: d.priority, audience, pages: d.kind === 'lobby' ? ['/lobby'] : d.pages, starts_at: inicio, ends_at: fim, active: d.active }
}

export async function salvarComunicado(id: string | null, entrada: EntradaComunicado): Promise<Resultado<{ id: string }>> {
  return executar(async () => {
    const eq = await exigirPermissao('announcements.manage')
    const alvo = id ? z.uuid().parse(id) : null
    const ids = alvo ? await idsDoPublico(alvo) : []
    const novo = await salvar(eq, alvo, paraDados(Comunicado.parse(entrada), ids))
    revalidatePath('/admin/announcements')
    return { id: novo }
  }, 'Comunicado salvo.')
}

export async function contarPublico(id: string | null, entrada: Pick<EntradaComunicado, 'publico' | 'statuses' | 'categories'>): Promise<Resultado<number>> {
  return executar(async () => {
    await exigirPermissao('announcements.manage')
    const d = z.object({ publico: z.enum(['todos', 'segmento']), statuses: z.array(z.string()), categories: z.array(z.string()) }).parse(entrada)
    const ids = id ? await idsDoPublico(z.uuid().parse(id)) : []
    if (d.publico === 'segmento' && !d.statuses.length && !d.categories.length && !ids.length) return 0
    return tamanhoDoPublico(audiencia(d, ids))
  })
}

export async function ativar(id: string, ativo: boolean): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('announcements.manage')
    await alternar(eq, z.uuid().parse(id), ativo)
    revalidatePath('/admin/announcements')
    return undefined
  })
}
