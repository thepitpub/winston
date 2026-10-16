import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Livro, Secao, TituloPagina } from '@/components/editorial/Editorial'
import { Guilhoche, Hachura } from '@/components/marca/Guilhoche'
import { Selo } from '@/components/marca/Selo'
import { Revela } from '@/components/movimento/Movimento'
import { Etiqueta, Vazio } from '@/components/ui/ui'
import { credencialAtiva, saldoECarteira } from '@/lib/aplicacao/portal'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { dataLonga, romano } from '@/lib/datas'
import { QrDinamico } from './QrDinamico'

export const metadata: Metadata = { title: 'The Credential' }

const CATEGORIA = { founder: 'Membro fundador', member: 'Membro', honorary: 'Membro honorário' } as const
const STATUS = { active: ['Ativa', 'ok'], suspended: ['Suspensa', 'atencao'], revoked: ['Revogada', 'perigo'] } as const

/**
 * THE CREDENTIAL. O cartão de obsidiana pousado sobre o papel do registro.
 * Feito só de HTML, CSS e SVG. Nenhum número é inventado: o código público
 * é o emitido no banco; o número de fundador vem da planilha de origem; a
 * data de adesão só aparece quando existe.
 */
export default async function Credencial() {
  const { membro } = await exigirMembro()
  const [c, coins] = await Promise.all([credencialAtiva(membro.id), saldoECarteira(membro.id, 0)])
  const nome = membro.display_name || membro.full_name

  return (
    <Secao atmosfera="registro" className="min-h-[calc(100dvh-var(--cabecalho-h))]">
      <div className="grid gap-[clamp(2.5rem,6vh,4.5rem)]">
        <TituloPagina chamada="The Credential" numero="01" linha1="A sua" linha2="credencial." curva="subida" />

        {!c ? (
          <Vazio titulo="Nenhuma credencial ativa." texto="Se você acabou de entrar, ela é emitida ao concluir os primeiros passos. Se foi suspensa, fale com a casa pelo Service Bell." />
        ) : (
          <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-20">
            <Revela>
              <article
                data-revela
                data-atmosfera="lobby"
                aria-label="Credencial de membro"
                className="relative isolate aspect-[1.586] w-full max-w-2xl overflow-hidden rounded-[6px] !bg-[linear-gradient(135deg,#1e2227_0%,#0f1215_55%,#171a1e_100%)] p-[clamp(1.1rem,4vw,2rem)] shadow-[0_50px_90px_-40px_rgba(11,13,15,.75),0_18px_30px_-18px_rgba(11,13,15,.5),inset_0_0_0_1px_rgba(185,154,98,.45),inset_0_0_0_7px_#0f1215,inset_0_0_0_8px_rgba(185,154,98,.2)]"
              >
                <Hachura className="absolute inset-0 -z-10" />
                <Guilhoche className="absolute -right-[18%] -bottom-[40%] -z-10 aspect-square w-[85%]" opacidade={0.35} />
                <div className="grid h-full grid-rows-[auto_1fr_auto]">
                  <div className="flex items-start justify-between">
                    <div className="leading-none">
                      <p className="font-display text-[clamp(1.15rem,3.4vw,1.7rem)] tracking-[0.18em]">CONTINENTAL</p>
                      <p className="mt-1 font-display text-[clamp(.95rem,2.6vw,1.3rem)] text-destaque italic">Heritage</p>
                    </div>
                    <Selo tamanho={58} />
                  </div>
                  <div className="self-end">
                    <p className="font-display text-[clamp(1.6rem,5vw,2.8rem)] leading-[1]">{nome}</p>
                    <p className="rotulo mt-2.5 !text-[0.58rem] text-tinta-2">
                      {CATEGORIA[membro.category]}
                      {membro.founder_number ? ` · Nº ${romano(membro.founder_number)}` : ''}
                    </p>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-4 border-t border-dashed border-destaque/40 pt-3">
                    <p className="numerico font-mono text-[clamp(.8rem,2.4vw,1.05rem)] tracking-[0.22em] text-destaque">{c.public_code}</p>
                    <p className="rotulo !text-[0.55rem] text-tinta-2">{STATUS[c.status][0]}</p>
                  </div>
                </div>
              </article>
            </Revela>

            <div className="grid gap-12">
              <Bloco titulo="Ficha" numero="I">
                <Livro
                  itens={[
                    { rotulo: 'Identificador', valor: <span className="font-mono tracking-[0.12em]">{c.public_code}</span> },
                    { rotulo: 'Categoria', valor: CATEGORIA[membro.category] },
                    { rotulo: 'Situação', valor: <Etiqueta tom={STATUS[c.status][1]}>{STATUS[c.status][0]}</Etiqueta> },
                    { rotulo: 'Emitida em', valor: dataLonga(c.issued_at) },
                    ...(membro.joined_at ? [{ rotulo: 'Na casa desde', valor: dataLonga(`${membro.joined_at}T12:00:00Z`) }] : []),
                    {
                      rotulo: 'Gold Coins',
                      valor: (
                        <Link href="/gold-coins" className="sublinha-traco text-destaque">
                          {coins.saldo.toLocaleString('pt-BR')}
                        </Link>
                      ),
                    },
                  ]}
                />
              </Bloco>
              <Bloco titulo="Na recepção" numero="II">
                <p className="text-[0.86rem] leading-relaxed text-tinta-2">
                  Mostre este código à equipe na entrada. Ele muda a cada minuto, não carrega nenhum dado pessoal e só vale lido pelo Continental Command. A credencial identifica você na casa; não substitui o seu acesso ao Portal.
                </p>
                {c.status === 'active' ? <QrDinamico /> : null}
              </Bloco>
            </div>
          </div>
        )}
      </div>
    </Secao>
  )
}
