/** Rótulos e tons de status usados no Command. */
export type TomEtiqueta = 'ok' | 'atencao' | 'perigo' | 'neutro' | 'ouro' | 'info'

export const STATUS_MEMBRO: Record<string, [string, TomEtiqueta]> = {
  pending: ['Aguardando convite', 'neutro'],
  invited: ['Convidado', 'info'],
  active: ['Ativo', 'ok'],
  suspended: ['Suspenso', 'atencao'],
  revoked: ['Revogado', 'perigo'],
}

export const CATEGORIA_MEMBRO: Record<string, string> = { founder: 'Fundador', member: 'Membro', honorary: 'Honorário' }
