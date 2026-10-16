/*
 * Regras puras de acesso. Sem banco e sem relógio implícito: recebem o
 * "agora" para serem testáveis.
 */

export interface DesafioOtp {
  attempts: number
  max_attempts: number
  expires_at: string
  consumed_at: string | null
}

export type EstadoDesafio = 'valido' | 'expirado' | 'consumido' | 'bloqueado'

export function estadoDoDesafio(d: DesafioOtp, agoraMs: number): EstadoDesafio {
  if (d.consumed_at) return 'consumido'
  if (new Date(d.expires_at).getTime() <= agoraMs) return 'expirado'
  if (d.attempts >= d.max_attempts) return 'bloqueado'
  return 'valido'
}

/** Limite de envio: no máximo N desafios por telefone na janela. */
export function podeEnviar(envios: { created_at: string }[], max: number, janelaMs: number, agoraMs: number): boolean {
  return envios.filter((e) => agoraMs - new Date(e.created_at).getTime() < janelaMs).length < max
}

export interface Convite {
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export type EstadoConvite = 'valido' | 'expirado' | 'aceito' | 'revogado'

export function estadoDoConvite(c: Convite, agoraMs: number): EstadoConvite {
  if (c.revoked_at) return 'revogado'
  if (c.accepted_at) return 'aceito'
  if (new Date(c.expires_at).getTime() <= agoraMs) return 'expirado'
  return 'valido'
}

/** E-mail interno do Auth: identificador técnico, nunca exibido nem usado para contato. */
export const emailInterno = (memberId: string) => `m-${memberId}@membros.continental.invalid`

export type StatusConta = 'pending' | 'invited' | 'active' | 'suspended' | 'revoked'

/**
 * Que transições de status a casa pode fazer à mão. "pending → invited" não
 * está aqui: só a emissão de convite leva a "invited" (com link novo). Sair
 * de "invited" revoga os convites vivos (gatilho no banco).
 */
export const TRANSICOES: Record<StatusConta, StatusConta[]> = {
  pending: ['revoked'],
  invited: ['pending', 'revoked'],
  active: ['suspended', 'revoked'],
  suspended: ['active', 'revoked'],
  revoked: [],
}
