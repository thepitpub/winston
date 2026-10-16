'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { executar, ErroDeRegra, formulario, type Resultado } from '@/lib/acao'
import { lancarCoins } from '@/lib/aplicacao/coins'
import { auditar } from '@/lib/auditoria'
import { exigirPermissao } from '@/lib/autorizacao/equipe'
import { clienteSecreto, feito, ou, talvez } from '@/lib/db/clientes'

const Regra = z.object({
  id: z.union([z.literal(''), z.uuid()]),
  code: z.string().regex(/^[a-z0-9_]{3,40}$/, 'Código: minúsculas, números e _ (3 a 40).'),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240),
  amount: z.coerce.number().int().refine((n) => n !== 0 && Math.abs(n) <= 100000, 'Valor inteiro, diferente de zero.'),
  active: z.enum(['on']).optional(),
})

export async function salvarRegra(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('coins.rules')
    const d = Regra.parse(formulario(fd))
    const linha = { code: d.code, name: d.name, description: d.description || null, amount: d.amount, active: d.active === 'on' }
    const adm = clienteSecreto()
    const r = d.id ? await adm.from('gold_coin_rules').update(linha).eq('id', d.id) : await adm.from('gold_coin_rules').insert({ ...linha, created_by: eq.id.userId })
    if (r.error) throw new ErroDeRegra(r.error.code === '23505' ? 'Já existe uma regra com esse código.' : 'Não consegui salvar.')
    await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'coins.regra_salva', detalhes: { code: d.code, amount: d.amount, ativa: d.active === 'on' } })
    revalidatePath('/admin/gold-coins')
    return undefined
  }, 'Regra salva.')
}

/** Concede uma regra a um membro (crédito/débito pelo valor da regra). */
export async function aplicarRegra(_: Resultado | null, fd: FormData): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('coins.adjust')
    const d = z.object({ membro: z.uuid('Escolha o membro.'), regra: z.uuid('Escolha a regra.'), referencia: z.string().trim().max(120), chave: z.uuid() }).parse(formulario(fd))
    const regra = talvez(await clienteSecreto().from('gold_coin_rules').select('id, name, amount, active').eq('id', d.regra).maybeSingle())
    if (!regra?.active) throw new ErroDeRegra('Regra inativa ou inexistente.')
    await lancarCoins({ membroId: d.membro, valor: regra.amount, tipo: regra.amount > 0 ? 'credit' : 'debit', motivo: regra.name, regraId: regra.id, referencia: d.referencia || null, chave: `regra:${d.chave}`, operador: eq.id.userId })
    revalidatePath('/admin/gold-coins')
    return undefined
  }, 'Lançado.')
}

/** Estorno: lança o oposto, ligado à original. Uma transação só pode ser estornada uma vez. */
export async function estornar(transacaoId: string, motivo: string): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('coins.adjust')
    const id = z.uuid().parse(transacaoId)
    const m = z.string().trim().min(5, 'Motivo do estorno obrigatório.').max(300).parse(motivo)
    const adm = clienteSecreto()
    const t = ou(await adm.from('gold_coin_transactions').select('id, amount, kind, reverses_id, gold_coin_accounts(member_id)').eq('id', id).single())
    if (t.kind === 'reversal') throw new ErroDeRegra('Não se estorna um estorno.')
    const ja = talvez(await adm.from('gold_coin_transactions').select('id').eq('reverses_id', id).maybeSingle())
    if (ja) throw new ErroDeRegra('Esta transação já foi estornada.')
    const conta = Array.isArray(t.gold_coin_accounts) ? t.gold_coin_accounts[0] : t.gold_coin_accounts
    await lancarCoins({ membroId: conta!.member_id, valor: -t.amount, tipo: 'reversal', motivo: `Estorno: ${m}`, estorna: id, chave: `estorno:${id}`, operador: eq.id.userId })
    revalidatePath('/admin/gold-coins')
    return undefined
  }, 'Estornado.')
}

export async function congelarConta(membroId: string, congelar: boolean): Promise<Resultado> {
  return executar(async () => {
    const eq = await exigirPermissao('coins.adjust')
    feito(await clienteSecreto().from('gold_coin_accounts').update({ status: congelar ? 'frozen' : 'open' }).eq('member_id', z.uuid().parse(membroId)))
    await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: congelar ? 'coins.conta_congelada' : 'coins.conta_reaberta', membroId })
    revalidatePath('/admin/gold-coins')
    return undefined
  })
}
