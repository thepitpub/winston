'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, formulario, type Resultado } from '@/lib/acao'
import { atribuir, mudarPrioridade, mudarStatus, responder } from '@/lib/aplicacao/equipe/concierge'
import { exigirPermissao } from '@/lib/autorizacao/equipe'
import { PRIORIDADES, STATUS } from '@/lib/dominio/concierge'

const recarregar = () => revalidatePath('/admin/concierge')

export async function enviarResposta(id: string, _: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('concierge.respond')
    const d = z.object({ texto: z.string().trim().min(1, 'Escreva a resposta.').max(4000), interna: z.enum(['on']).optional() }).parse(formulario(fd))
    await responder(eq, z.uuid().parse(id), d.texto, d.interna === 'on')
    recarregar()
    return undefined
  }, 'Enviado.')
}

export async function definirStatus(id: string, para: string): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('concierge.respond')
    await mudarStatus(eq, z.uuid().parse(id), z.enum(STATUS).parse(para))
    recarregar()
    return undefined
  })
}

export async function definirPrioridade(id: string, p: string): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('concierge.respond')
    await mudarPrioridade(eq, z.uuid().parse(id), z.enum(PRIORIDADES).parse(p))
    recarregar()
    return undefined
  })
}

export async function definirResponsavel(id: string, responsavel: string): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('concierge.assign')
    await atribuir(eq, z.uuid().parse(id), responsavel ? z.uuid().parse(responsavel) : null)
    recarregar()
    return undefined
  })
}
