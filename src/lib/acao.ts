import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { z } from 'zod'
import { log } from './auditoria'
import { ErroDeAcesso } from './autorizacao/equipe'
import { ErroDeDados } from './db/clientes'

export type Resultado<T = undefined> = { ok: true; dados: T; mensagem?: string } | { ok: false; erro: string; campos?: Record<string, string> }

/** Erro de regra de negócio: a mensagem vai para a tela como está. */
export class ErroDeRegra extends Error {
  constructor(
    mensagem: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensagem)
  }
}

/**
 * Envelope de toda Server Action: valida, executa e devolve um resultado
 * serializável. Erro inesperado vira mensagem genérica e log; nada do
 * banco ou da pilha chega ao navegador.
 */
export async function executar<T>(fn: () => Promise<T>, mensagem?: string): Promise<Resultado<T>> {
  try {
    return { ok: true, dados: await fn(), mensagem }
  } catch (e) {
    unstable_rethrow(e)
    if (e instanceof ErroDeRegra) return { ok: false, erro: e.message, campos: e.campos }
    if (e instanceof ErroDeAcesso) return { ok: false, erro: e.message }
    if (e instanceof z.ZodError) {
      const campos: Record<string, string> = {}
      for (const i of e.issues) campos[i.path.join('.')] ??= i.message
      return { ok: false, erro: 'Confira os campos destacados.', campos }
    }
    log('error', 'acao.falhou', { erro: e instanceof Error ? e.message : String(e), codigo: e instanceof ErroDeDados ? e.codigo : undefined })
    return { ok: false, erro: 'Algo saiu do lugar. Tente de novo em instantes.' }
  }
}

/** Lê FormData como objeto simples para o Zod. */
export function formulario(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {}
  fd.forEach((v, k) => {
    if (typeof v === 'string') o[k] = v
  })
  return o
}
