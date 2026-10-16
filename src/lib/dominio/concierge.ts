/** Regras puras do Concierge e do Service Bell. */

export const CATEGORIAS = ['concierge', 'acesso', 'beneficios', 'credencial', 'suporte', 'outros'] as const
export type Categoria = (typeof CATEGORIAS)[number]
export const CATEGORIA_ROTULO: Record<Categoria, string> = {
  concierge: 'Concierge',
  acesso: 'Acesso',
  beneficios: 'Benefícios',
  credencial: 'Credencial',
  suporte: 'Suporte',
  outros: 'Outros',
}

export const STATUS = ['aberta', 'em_atendimento', 'aguardando_membro', 'resolvida', 'encerrada'] as const
export type StatusSolicitacao = (typeof STATUS)[number]
export const STATUS_ROTULO: Record<StatusSolicitacao, string> = {
  aberta: 'Aberta',
  em_atendimento: 'Em atendimento',
  aguardando_membro: 'Aguardando você',
  resolvida: 'Resolvida',
  encerrada: 'Encerrada',
}
export const STATUS_ROTULO_EQUIPE: Record<StatusSolicitacao, string> = { ...STATUS_ROTULO, aguardando_membro: 'Aguardando membro' }

export const PRIORIDADES = ['baixa', 'normal', 'alta', 'urgente'] as const
export type Prioridade = (typeof PRIORIDADES)[number]

/** Transições permitidas para a equipe. Encerrada é final. */
export const TRANSICOES: Record<StatusSolicitacao, StatusSolicitacao[]> = {
  aberta: ['em_atendimento', 'aguardando_membro', 'resolvida', 'encerrada'],
  em_atendimento: ['aguardando_membro', 'resolvida', 'encerrada', 'aberta'],
  aguardando_membro: ['em_atendimento', 'resolvida', 'encerrada'],
  resolvida: ['em_atendimento', 'encerrada'],
  encerrada: [],
}

export const podeTransitar = (de: StatusSolicitacao, para: StatusSolicitacao) => TRANSICOES[de].includes(para)

/** Membro respondeu: se a casa esperava por ele, a solicitação volta à fila. */
export function statusAposMensagemDoMembro(s: StatusSolicitacao): StatusSolicitacao {
  if (s === 'aguardando_membro' || s === 'resolvida') return 'em_atendimento'
  return s
}

export const membroPodeEscrever = (s: StatusSolicitacao) => s !== 'encerrada'

export const TOM_STATUS: Record<StatusSolicitacao, 'ok' | 'atencao' | 'neutro' | 'ouro' | 'info'> = {
  aberta: 'ouro',
  em_atendimento: 'info',
  aguardando_membro: 'atencao',
  resolvida: 'ok',
  encerrada: 'neutro',
}
