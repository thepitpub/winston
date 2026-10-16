import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Chamada, Numeros, Secao } from '@/components/editorial/Editorial'
import { Fio } from '@/components/marca/Fio'
import { Contador, Revela, TituloDuplo } from '@/components/movimento/Movimento'
import { Etiqueta, Vazio } from '@/components/ui/ui'
import { extrato, saldoECarteira } from '@/lib/aplicacao/portal'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { clienteDoUsuario } from '@/lib/db/clientes'
import { dataCurta, dataHora, hora } from '@/lib/datas'

export const metadata: Metadata = { title: 'Gold Coins' }

const TIPO = { credit: ['Crédito', 'ok'], debit: ['Débito', 'perigo'], reversal: ['Estorno', 'atencao'], adjustment: ['Ajuste', 'info'] } as const
const POR_PAGINA = 20

/**
 * GOLD COINS. O cofre (bronze) e o livro-caixa (registro). O saldo é a soma
 * de lançamentos imutáveis; esta tela só lê. Não há conversão em dinheiro,
 * saque nem troca entre membros.
 */
export default async function GoldCoins({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { membro } = await exigirMembro()
  const sp = await searchParams
  const pagina = Math.min(500, Math.max(1, Math.floor(Number(typeof sp.p === 'string' ? sp.p : 1)) || 1))
  const sb = await clienteDoUsuario()
  const [c, e, regras] = await Promise.all([saldoECarteira(membro.id, 0), extrato(membro.id, pagina, POR_PAGINA), sb.from('gold_coin_rules').select('code, name, description, amount').eq('active', true).order('amount', { ascending: false })])
  const paginas = Math.max(1, Math.ceil(e.total / POR_PAGINA))

  return (
    <>
      <Secao atmosfera="bronze" rotulo="Saldo">
        <div className="grid gap-8">
          <Revela>
            <div data-revela>
              <Chamada numero="04">Gold Coins</Chamada>
            </div>
          </Revela>
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="grid gap-2">
              <p className="rotulo text-apagado">Saldo na casa</p>
              <p className="font-display text-[clamp(6rem,24vw,17rem)] leading-[0.8] text-destaque">
                <Contador valor={c.saldo} />
              </p>
            </div>
            <div className="grid gap-6 lg:pb-6">
              <TituloDuplo as="h1" linha1="Moedas da casa," linha2="não do mercado." className="font-display text-display-md text-tinta" />
              <p className="max-w-[46ch] text-[0.84rem] leading-relaxed text-tinta-2">Reconhecimento por presença e participação. Não se convertem em dinheiro, não se sacam e não se trocam entre membros.</p>
            </div>
          </div>
          <Fio curva="onda" />
          <Numeros
            itens={[
              { rotulo: 'Lançamentos', valor: e.total },
              { rotulo: 'Última movimentação', valor: c.ultimo ? dataHora(c.ultimo) : '—' },
              { rotulo: 'Regras ativas', valor: regras.data?.length ?? 0 },
            ]}
          />
        </div>
      </Secao>

      <Secao atmosfera="registro" rotulo="Livro-caixa">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-20">
          <Bloco titulo="Livro-caixa" numero="I" acao={<span className="rotulo numerico text-discreto">{e.total} lançamento(s)</span>}>
            {e.linhas.length === 0 ? (
              <Vazio titulo="Nada por aqui ainda." texto="Créditos, débitos e estornos aparecem aqui, um por linha, para sempre." />
            ) : (
              <ol className="grid">
                {e.linhas.map((l) => {
                  const [rotulo, tom] = TIPO[l.kind as keyof typeof TIPO] ?? ['—', 'neutro']
                  return (
                    <li key={l.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-x-5 gap-y-1 border-b border-[var(--fio)] py-4">
                      <span className="rotulo numerico text-discreto">
                        {dataCurta(l.created_at)}
                        <span className="block !text-[0.6rem] opacity-80">{hora(l.created_at)}</span>
                      </span>
                      <span className="flex min-w-0 items-baseline gap-3">
                        <span className="truncate font-display text-[1.4rem] leading-tight text-tinta">{l.reason}</span>
                        <span aria-hidden="true" className="pontilhado hidden sm:block" />
                      </span>
                      <span className={`numerico font-mono text-[1.05rem] ${l.amount > 0 ? 'text-ok' : 'text-danger'}`}>
                        {l.amount > 0 ? '+' : '−'}
                        {Math.abs(l.amount).toLocaleString('pt-BR')}
                      </span>
                      <span className="col-start-2">
                        <Etiqueta tom={tom}>{rotulo}</Etiqueta>
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
            {paginas > 1 ? (
              <nav aria-label="Páginas do livro-caixa" className="rotulo flex items-center justify-between">
                {pagina > 1 ? <Link href={`?p=${pagina - 1}`} className="sublinha-traco text-destaque">← Anteriores</Link> : <span />}
                <span className="numerico text-discreto">
                  {pagina} / {paginas}
                </span>
                {pagina < paginas ? <Link href={`?p=${pagina + 1}`} className="sublinha-traco text-destaque">Seguintes →</Link> : <span />}
              </nav>
            ) : null}
          </Bloco>

          <Bloco titulo="Como se ganham" numero="II">
            {regras.data?.length ? (
              <ul className="grid">
                {regras.data.map((r) => (
                  <li key={r.code} className="grid gap-1 border-b border-[var(--fio)] py-4 first:pt-0">
                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-[1.35rem] leading-tight text-tinta">{r.name}</span>
                      <span aria-hidden="true" className="pontilhado" />
                      <span className="numerico font-mono text-destaque">
                        {r.amount > 0 ? '+' : ''}
                        {r.amount}
                      </span>
                    </span>
                    {r.description ? <span className="text-[0.8rem] text-apagado">{r.description}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio titulo="Regras ainda não publicadas." texto="A casa publica aqui como as moedas são concedidas." />
            )}
          </Bloco>
        </div>
      </Secao>
    </>
  )
}
