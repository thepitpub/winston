import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, entradaCompacta, Filtros, Indicador, Paginacao, SemPermissao, Tabela, Td, Th } from '@/components/command/kit'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { clienteSecreto } from '@/lib/db/clientes'
import { dataHora } from '@/lib/datas'
import { AplicarRegra, Estornar, FormRegra } from './Formularios'

export const metadata: Metadata = { title: 'Gold Coins Ledger' }
const um = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')
const POR = 30

/** O ledger inteiro, imutável. Saldo é soma; correção é estorno. Sem conversão em dinheiro. */
export default async function Ledger({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const eq = await exigirEquipe()
  if (!pode(eq, 'coins.read')) return <SemPermissao />
  const sp = await searchParams
  const pagina = Math.min(1000, Math.max(1, Math.floor(Number(um(sp.p))) || 1))
  const tipo = um(sp.tipo)
  const adm = clienteSecreto()
  let q = adm.from('gold_coin_transactions').select('id, amount, kind, reason, reference, created_at, reverses_id, operator_user_id, gold_coin_accounts(member_id, members(full_name))', { count: 'exact' }).order('created_at', { ascending: false })
  if (tipo) q = q.eq('kind', tipo as 'credit')
  const [tx, regras, saldo, membros] = await Promise.all([
    q.range((pagina - 1) * POR, pagina * POR - 1),
    adm.from('gold_coin_rules').select('*').order('code'),
    // Soma no banco, sem contas sintéticas (o PostgREST corta listas em 1000 linhas).
    adm.rpc('ch_coins_em_circulacao'),
    adm.from('members').select('id, full_name').eq('status', 'active').eq('is_synthetic', false).order('full_name'),
  ])
  const circulante = Number(saldo.data ?? 0)
  // Só as movimentações desta página importam para o botão de estorno.
  const idsDaPagina = (tx.data ?? []).map((t) => t.id)
  const estornadas = idsDaPagina.length ? await adm.from('gold_coin_transactions').select('reverses_id').in('reverses_id', idsDaPagina) : { data: [] }
  const jaEstornadas = new Set((estornadas.data ?? []).map((x) => x.reverses_id))
  const editar = um(sp.regra)
  const regraAtual = editar ? (regras.data ?? []).find((r) => r.id === editar) : undefined
  const base = new URLSearchParams(tipo ? { tipo } : {})

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="GC · GOLD COINS LEDGER" titulo="Gold Coins" descricao="Créditos, débitos, ajustes e estornos, cada um com motivo, operador e chave de idempotência. Não há conversão monetária, saque nem troca entre membros." />
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
        <Indicador rotulo="Em circulação" valor={circulante.toLocaleString('pt-BR')} tom="ouro" />
        <Indicador rotulo="Lançamentos" valor={(tx.count ?? 0).toLocaleString('pt-BR')} detalhe={tipo ? `filtro: ${tipo}` : undefined} />
        <Indicador rotulo="Regras ativas" valor={(regras.data ?? []).filter((r) => r.active).length} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Bloco titulo="Ledger">
          <Filtros>
            <label className="grid gap-1 text-xs text-apagado">
              Tipo
              <select name="tipo" defaultValue={tipo} className={entradaCompacta}>
                <option value="">Todos</option>
                <option value="credit">Crédito</option>
                <option value="debit">Débito</option>
                <option value="adjustment">Ajuste</option>
                <option value="reversal">Estorno</option>
              </select>
            </label>
          </Filtros>
          <Tabela legenda="Ledger de Gold Coins">
            <thead>
              <tr>
                <Th>Quando</Th>
                <Th>Membro</Th>
                <Th>Tipo</Th>
                <Th>Motivo</Th>
                <Th alinhar="direita">Valor</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {(tx.data ?? []).map((t) => {
                const conta = Array.isArray(t.gold_coin_accounts) ? t.gold_coin_accounts[0] : t.gold_coin_accounts
                const m = conta ? (Array.isArray(conta.members) ? conta.members[0] : conta.members) : null
                return (
                  <tr key={t.id}>
                    <Td mono>{dataHora(t.created_at)}</Td>
                    <Td>{conta ? <Link href={`/admin/members/${conta.member_id}?aba=coins`} className="hover:text-destaque">{m?.full_name}</Link> : '—'}</Td>
                    <Td className="text-xs">{t.kind}</Td>
                    <Td className="text-xs">{t.reason}</Td>
                    <Td mono className={`text-right ${t.amount > 0 ? 'text-ok' : 'text-danger'}`}>
                      {t.amount > 0 ? '+' : ''}
                      {t.amount}
                    </Td>
                    <Td className="text-right">{pode(eq, 'coins.adjust') && t.kind !== 'reversal' && !jaEstornadas.has(t.id) ? <Estornar id={t.id} /> : jaEstornadas.has(t.id) ? <span className="text-xs text-discreto">estornada</span> : null}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabela>
          <Paginacao pagina={pagina} total={tx.count ?? 0} porPagina={POR} base={base} />
        </Bloco>
        <div className="grid content-start gap-4">
          {pode(eq, 'coins.adjust') ? (
            <Bloco titulo="Conceder por regra">
              <AplicarRegra membros={membros.data ?? []} regras={(regras.data ?? []).filter((r) => r.active).map((r) => ({ id: r.id, nome: `${r.name} (${r.amount > 0 ? '+' : ''}${r.amount})` }))} />
            </Bloco>
          ) : null}
          <Bloco titulo="Regras de concessão" acao={pode(eq, 'coins.rules') ? <Link href="?regra=nova" className="text-xs text-destaque hover:underline">+ Nova</Link> : undefined}>
            {pode(eq, 'coins.rules') && (regraAtual || editar === 'nova') ? <FormRegra key={editar} atual={regraAtual} /> : null}
            <ul className="grid gap-px bg-[var(--fio)] text-sm">
              {(regras.data ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 bg-elevado py-2">
                  <span>
                    <span className="block">{r.name}</span>
                    <span className="font-mono text-xs text-discreto">
                      {r.code}
                      {r.active ? '' : ' · inativa'}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="numerico font-mono text-destaque">
                      {r.amount > 0 ? '+' : ''}
                      {r.amount}
                    </span>
                    {pode(eq, 'coins.rules') ? (
                      <Link href={`?regra=${r.id}`} className="text-xs text-apagado hover:text-tinta">
                        Editar
                      </Link>
                    ) : null}
                  </span>
                </li>
              ))}
              {(regras.data ?? []).length === 0 ? <li className="bg-elevado py-2 text-apagado">Nenhuma regra. Crie, por exemplo, a de código boas_vindas: ela é concedida automaticamente na ativação.</li> : null}
            </ul>
          </Bloco>
        </div>
      </div>
    </div>
  )
}
