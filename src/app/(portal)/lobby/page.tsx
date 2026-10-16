import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Bloco, ItemNumerado, ListaNumerada, Numeros, Secao, TituloPagina } from '@/components/editorial/Editorial'
import { Relogio } from '@/components/marca/Relogio'
import { Revela, TituloDuplo } from '@/components/movimento/Movimento'
import { Esqueleto, Etiqueta, Vazio } from '@/components/ui/ui'
import { atividadeRecente, avisosDoLobby, credencialAtiva, membrosNoDiretorio, notificacoes, saldoECarteira, solicitacoesDoMembro } from '@/lib/aplicacao/portal'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { dataCurta, dataHora, romano, saudacao } from '@/lib/datas'
import { STATUS_ROTULO, type StatusSolicitacao } from '@/lib/dominio/concierge'
import { CampoWinston } from './CampoWinston'

export const metadata: Metadata = { title: 'Grand Lobby' }

const CATEGORIA = { founder: 'Membro fundador', member: 'Membro', honorary: 'Membro honorário' } as const

/**
 * GRAND LOBBY. Três salões em sequência, cada um com a sua atmosfera:
 *  1. Lobby (obsidiana): a saudação enorme, o relógio da casa, os números
 *     do membro e o balcão do Winston.
 *  2. Registro (marfim): as salas da casa, numeradas como uma carta.
 *  3. Lobby: avisos e a sua linha do tempo, lado a lado.
 * Nada aqui é inventado: cada número vem do banco, pela RLS do membro.
 */
export default async function Lobby() {
  const { membro } = await exigirMembro()
  const primeiro = membro.display_name || membro.full_name.split(' ')[0]!
  const [saud, nomeSaud] = saudacao(primeiro).split(', ') as [string, string]
  const [c, coins, pedidos] = await Promise.all([credencialAtiva(membro.id), saldoECarteira(membro.id, 0), solicitacoesDoMembro(membro.id)])
  const abertos = pedidos.filter((p) => !['resolvida', 'encerrada'].includes(p.status)).length

  return (
    <>
      <Secao atmosfera="lobby" interno="pt-[clamp(2.5rem,7vh,5rem)]" rotulo="Recepção">
        <div className="grid gap-[clamp(2.5rem,6vh,4.5rem)]">
          <header className="grid gap-6">
            <Revela>
              <div data-revela className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <p className="rotulo flex items-center gap-4 text-apagado">
                  <span>Welcome desk</span>
                  <span aria-hidden="true" className="h-px w-10 bg-[var(--fio-forte)] sm:w-24" />
                  <span>
                    {CATEGORIA[membro.category]}
                    {membro.founder_number ? <span className="text-destaque"> · Nº {romano(membro.founder_number)}</span> : null}
                  </span>
                </p>
                <Relogio className="text-apagado" />
              </div>
            </Revela>
            <TituloDuplo linha1={`${saud},`} linha2={nomeSaud} className="font-display text-display-mega text-tinta" />
          </header>

          <Revela atraso={0.45} className="grid gap-10">
            <div data-revela>
              <Numeros
                itens={[
                  { rotulo: 'Credencial', valor: c ? c.public_code : 'Ainda não emitida', href: '/credential' },
                  { rotulo: 'Gold Coins', valor: coins.saldo.toLocaleString('pt-BR'), href: '/gold-coins' },
                  { rotulo: 'Solicitações em aberto', valor: abertos, href: '/requests' },
                  ...(membro.joined_at ? [{ rotulo: 'Na casa desde', valor: dataCurta(`${membro.joined_at}T12:00:00Z`) }] : []),
                ]}
              />
            </div>
            <div data-revela>
              <CampoWinston />
            </div>
          </Revela>
        </div>
      </Secao>

      <Secao atmosfera="registro" rotulo="Salas da casa">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] lg:gap-20">
          <TituloPagina nivel="h2" chamada="Registro da casa" numero="§" linha1="O que a casa" linha2="oferece hoje." tamanho="lg" curva="descida" texto="Seis salas, uma porta para cada assunto. O que precisar da equipe, toque o Service Bell em qualquer uma delas." />
          <ListaNumerada rotulo="Salas" className="self-end">
            <ItemNumerado numero="01" href="/credential" titulo="The Credential" texto="O cartão da casa e o código que muda a cada minuto, para a recepção." />
            <ItemNumerado numero="02" href="/directory" titulo="The Directory" texto="Quem escolheu ser encontrado, e as conexões que você aceitou." />
            <ItemNumerado numero="03" href="/winston" titulo="Winston Concierge" texto="Pergunte sobre o que é seu. O que pedir ação vira solicitação, com a sua confirmação." />
            <ItemNumerado numero="04" href="/gold-coins" titulo="Gold Coins" texto="O saldo e cada lançamento, linha a linha, como num livro-caixa." />
            <ItemNumerado numero="05" href="/requests" titulo="Solicitações" texto="O que você pediu à casa e em que pé está." meta={abertos ? <Etiqueta tom="ouro">{abertos} em aberto</Etiqueta> : undefined} />
            <ItemNumerado numero="06" href="/settings" titulo="Configurações" texto="Nome de exibição, presença no diretório, telefone e sessões." />
          </ListaNumerada>
        </div>
      </Secao>

      <Secao atmosfera="lobby" rotulo="Avisos e atividade">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <Suspense fallback={<Bloco titulo="Avisos da casa" numero="I"><Esqueleto /></Bloco>}>
            <Avisos membroId={membro.id} />
          </Suspense>
          <Suspense fallback={<Bloco titulo="A sua passagem" numero="II"><Esqueleto linhas={4} /></Bloco>}>
            <Atividade membroId={membro.id} />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <Diretorio />
        </Suspense>
      </Secao>
    </>
  )
}

async function Avisos({ membroId }: { membroId: string }) {
  const [avisos, n] = await Promise.all([avisosDoLobby(membroId), notificacoes(membroId, 4)])
  const vazio = avisos.length === 0 && n.lista.length === 0
  return (
    <Bloco titulo="Avisos da casa" numero="I" acao={n.naoLidas ? <Etiqueta tom="ouro">{n.naoLidas} nova(s)</Etiqueta> : undefined}>
      {vazio ? <Vazio titulo="Nenhum comunicado no momento." /> : null}
      <ul className="grid">
        {avisos.map((a) => (
          <li key={a.id} className="grid gap-2 border-b border-[var(--fio)] py-5 first:pt-0">
            <p className="font-display text-[2rem] leading-[1.05] text-tinta">{a.title}</p>
            <p className="text-[0.86rem] leading-relaxed whitespace-pre-line text-tinta-2">{a.body}</p>
            {a.cta_label && a.cta_target ? (
              <a href={a.cta_target} className="rotulo sublinha-traco mt-1 justify-self-start text-destaque" {...(a.cta_target.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {a.cta_label} →
              </a>
            ) : null}
          </li>
        ))}
        {n.lista.map((x) => (
          <li key={x.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-b border-[var(--fio)] py-4 first:pt-0">
            <p className={x.read_at ? 'text-tinta-2' : 'text-tinta'}>{x.title}</p>
            <p className="rotulo numerico text-discreto">{dataHora(x.created_at)}</p>
            {x.body ? <p className="col-span-2 text-[0.82rem] text-apagado">{x.body}</p> : null}
          </li>
        ))}
      </ul>
    </Bloco>
  )
}

async function Atividade({ membroId }: { membroId: string }) {
  const itens = await atividadeRecente(membroId)
  return (
    <Bloco titulo="A sua passagem" numero="II">
      {itens.length === 0 ? (
        <Vazio titulo="Sua história na casa começa aqui." texto="Check-ins e solicitações aparecem nesta linha do tempo." />
      ) : (
        <ol className="grid">
          {itens.map((i) => (
            <li key={`${i.tipo}-${i.id}`} className="grid grid-cols-[4.75rem_1fr] items-baseline gap-5 border-b border-[var(--fio)] py-4 first:pt-0">
              <span className="rotulo numerico text-destaque">{dataCurta(i.quando)}</span>
              <span className="min-w-0">
                {i.link ? (
                  <Link href={i.link} className="font-display text-[1.45rem] leading-tight text-tinta hover:text-destaque hover:italic">
                    {i.titulo}
                  </Link>
                ) : (
                  <span className="font-display text-[1.45rem] leading-tight text-tinta">{i.titulo}</span>
                )}
                <span className="mt-0.5 block text-[0.8rem] text-apagado">{i.tipo === 'solicitacao' ? `Solicitação · ${STATUS_ROTULO[i.detalhe as StatusSolicitacao] ?? i.detalhe}` : i.detalhe}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Bloco>
  )
}

async function Diretorio() {
  const n = await membrosNoDiretorio()
  return (
    <Link href="/directory" className="group mt-16 grid gap-3 border-t border-[var(--fio)] pt-8 sm:grid-cols-[1fr_auto] sm:items-end">
      <span className="font-display text-display-sm text-tinta-2">
        {n === 0 ? 'Ninguém escolheu aparecer no diretório ainda.' : n === 1 ? 'Um membro escolheu ser encontrado.' : `${n} membros escolheram ser encontrados.`} <span className="inflexao">Só quem consente aparece.</span>
      </span>
      <span className="rotulo flex items-center gap-3 text-apagado group-hover:text-destaque">
        Abrir The Directory <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  )
}
