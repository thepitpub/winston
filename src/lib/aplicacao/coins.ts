import 'server-only'
import { ErroDeRegra } from '../acao'
import { auditar } from '../auditoria'
import { clienteSecreto } from '../db/clientes'

export interface Lancamento {
  membroId: string
  valor: number
  tipo: 'credit' | 'debit' | 'reversal' | 'adjustment'
  motivo: string
  chave: string
  operador: string | null
  regraId?: string | null
  referencia?: string | null
  estorna?: string | null
}

/**
 * Toda movimentação de Gold Coins passa aqui e vira UMA linha imutável no
 * ledger, por meio da função transacional do banco (trava a conta,
 * confere saldo, respeita a chave de idempotência).
 */
export async function lancarCoins(l: Lancamento): Promise<{ transacaoId: string; duplicado: boolean; saldo?: number }> {
  const r = await clienteSecreto().rpc('ch_coin_lancar', {
    p_member: l.membroId,
    p_amount: l.valor,
    p_kind: l.tipo,
    p_reason: l.motivo,
    p_idempotency_key: l.chave,
    p_operator: l.operador ?? undefined,
    p_rule: l.regraId ?? undefined,
    p_reference: l.referencia ?? undefined,
    p_reverses: l.estorna ?? undefined,
  })
  if (r.error) throw new Error(r.error.message)
  const d = r.data as { ok: boolean; error?: string; duplicate?: boolean; transaction_id?: string; balance?: number }
  if (!d.ok) {
    if (d.error === 'insufficient_balance') throw new ErroDeRegra('Saldo insuficiente para este débito.')
    if (d.error === 'account_frozen') throw new ErroDeRegra('A carteira deste membro está congelada.')
    if (d.error === 'member_not_eligible') throw new ErroDeRegra('Só membro convidado, ativo ou suspenso recebe lançamentos.')
    if (d.error === 'idempotency_conflict') throw new ErroDeRegra('Esta chave já foi usada para outro lançamento. Recarregue e tente de novo.')
    if (d.error === 'invalid_reversal' || d.error === 'already_reversed') throw new ErroDeRegra('Estorno inválido ou já feito.')
    throw new ErroDeRegra('Lançamento recusado.')
  }
  if (!d.duplicate) {
    await auditar({
      ator: { userId: l.operador, tipo: l.operador ? 'staff' : 'system' },
      acao: `coins.${l.tipo}`,
      membroId: l.membroId,
      recurso: { tipo: 'gold_coin_transaction', id: d.transaction_id },
      detalhes: { valor: l.valor, motivo: l.motivo },
    })
  }
  return { transacaoId: d.transaction_id!, duplicado: Boolean(d.duplicate), saldo: d.balance }
}
