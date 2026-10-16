import 'server-only'
import { headers } from 'next/headers'
import { ambiente } from './ambiente'
import { clienteSecreto } from './db/clientes'
import { hashDeIp } from './dominio/cripto'
import type { Json } from './db/tipos.gerados'

export type Ator = { userId: string | null; tipo: 'member' | 'staff' | 'system' | 'anonymous' }

export interface EventoDeAuditoria {
  ator: Ator
  acao: string
  recurso?: { tipo: string; id?: string | null }
  membroId?: string | null
  resultado?: 'success' | 'denied' | 'error'
  detalhes?: Record<string, unknown>
}

export async function contextoDaRequisicao(): Promise<{ ip: string | null; ua: string | null }> {
  try {
    const h = await headers()
    return { ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip'), ua: h.get('user-agent')?.slice(0, 240) ?? null }
  } catch {
    return { ip: null, ua: null }
  }
}

/**
 * Registra na trilha (append-only no banco) e escreve um log estruturado.
 * Detalhes nunca devem carregar conteúdo sigiloso (CS, códigos, tokens):
 * só ids, contagens e nomes de campos.
 */
export async function auditar(e: EventoDeAuditoria): Promise<void> {
  const { ip, ua } = await contextoDaRequisicao()
  const linha = {
    actor_user_id: e.ator.userId,
    actor_kind: e.ator.tipo,
    action: e.acao,
    resource_type: e.recurso?.tipo ?? null,
    resource_id: e.recurso?.id ?? null,
    member_id: e.membroId ?? null,
    result: e.resultado ?? 'success',
    ip_hash: hashDeIp(ambiente().CH_SEGREDO, ip),
    user_agent: ua,
    details: (e.detalhes ?? {}) as Json,
  }
  log('info', 'auditoria', { acao: e.acao, resultado: linha.result, recurso: linha.resource_type, ator: e.ator.tipo })
  const r = await clienteSecreto().from('audit_logs').insert(linha)
  if (r.error) log('error', 'auditoria.falhou', { acao: e.acao, erro: r.error.message })
}

/** Log estruturado em JSON (Vercel coleta stdout). Sem dado pessoal. */
export function log(nivel: 'info' | 'warn' | 'error', evento: string, campos: Record<string, unknown> = {}) {
  const linha = JSON.stringify({ t: new Date().toISOString(), nivel, evento, ...campos })
  if (nivel === 'error') console.error(linha)
  else if (nivel === 'warn') console.warn(linha)
  else console.log(linha)
}
