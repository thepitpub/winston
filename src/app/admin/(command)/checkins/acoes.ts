'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, ErroDeRegra, formulario, type Resultado } from '@/lib/acao'
import { localizar, registrarSemPermissao, salvarEvento, validar, type ResultadoValidacao } from '@/lib/aplicacao/equipe/checkins'
import { contextoDaEquipe, ErroDeAcesso, exigirPermissao } from '@/lib/autorizacao/equipe'

const Evento = z.object({
  id: z.union([z.literal(''), z.uuid()]),
  name: z.string().trim().min(1, 'Nome obrigatório.').max(140),
  kind: z.enum(['house', 'event']),
  location: z.string().trim().max(140),
  starts_at: z.string().min(1, 'Início obrigatório.'),
  ends_at: z.string(),
  duplicate_policy: z.enum(['once_per_event', 'once_per_day', 'unlimited']),
  status: z.enum(['draft', 'open', 'closed']),
  visible_to_members: z.enum(['on']).optional(),
})

/** datetime-local vem no horário de Brasília. */
const iso = (v: string) => (v ? new Date(`${v}:00-03:00`).toISOString() : null)

export async function salvar(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('checkins.manage')
    const d = Evento.parse(formulario(fd))
    const inicio = iso(d.starts_at)!
    const fim = iso(d.ends_at)
    if (fim && fim <= inicio) throw new ErroDeRegra('O fim precisa ser depois do início.', { ends_at: 'Depois do início.' })
    await salvarEvento(eq, d.id || null, { name: d.name, kind: d.kind, location: d.location || null, starts_at: inicio, ends_at: fim, duplicate_policy: d.duplicate_policy, status: d.status, visible_to_members: d.visible_to_members === 'on' })
    revalidatePath('/admin/checkins')
    return undefined
  }, 'Evento salvo.')
}

export type Candidato = { id: string; full_name: string; status: string; public_code: string | null; is_synthetic: boolean }

export async function buscar(consulta: string): Promise<Resultado<{ origem: 'qr' | 'credential_code' | 'manual'; candidatos: Candidato[]; aviso?: string }>> {
  return executar(async () => {
    await exigirPermissao('checkins.validate')
    return localizar(z.string().max(300).parse(consulta))
  })
}

export async function validarCheckin(p: { membroId: string; eventoId: string; consulta: string; excecao: string }): Promise<Resultado<{ result: ResultadoValidacao; motivo?: string }>> {
  return executar(async () => {
    const d = z.object({ membroId: z.uuid(), eventoId: z.uuid(), consulta: z.string().max(300), excecao: z.string().trim().max(300) }).parse(p)
    let eq
    try {
      eq = await exigirPermissao('checkins.validate')
    } catch (e) {
      const c = await contextoDaEquipe()
      if (e instanceof ErroDeAcesso && !(c instanceof ErroDeAcesso)) await registrarSemPermissao(c.id.userId, d.eventoId, d.consulta)
      return { result: 'no_permission' as const }
    }
    const r = await validar(eq, { membroId: d.membroId, eventoId: d.eventoId, consulta: d.consulta, excecao: d.excecao || null })
    revalidatePath('/admin/checkins')
    return { result: r.result, motivo: r.motivo }
  })
}
