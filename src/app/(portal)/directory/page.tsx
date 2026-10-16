import type { Metadata } from 'next'
import Link from 'next/link'
import { Monograma } from '@/components/marca/Monograma'
import { Bloco, Secao, TituloPagina } from '@/components/editorial/Editorial'
import { Botao, BotaoLink, Entrada, Selecao, Vazio } from '@/components/ui/ui'
import { buscar, facetas, minhasConexoes } from '@/lib/aplicacao/diretorio'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { clienteDoUsuario } from '@/lib/db/clientes'
import { AcoesConexao } from './AcoesConexao'

export const metadata: Metadata = { title: 'The Directory' }

const um = (v: string | string[] | undefined) => (typeof v === 'string' ? v.trim() : '')

/**
 * THE DIRECTORY. Só quem consentiu. Busca e filtros são parâmetros de URL
 * (compartilháveis, com voltar do navegador), resolvidos no servidor.
 */
export default async function Diretorio({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { membro } = await exigirMembro()
  const sp = await searchParams
  const f = { q: um(sp.q), setor: um(sp.setor), interesse: um(sp.interesse), cidade: um(sp.cidade), pagina: Math.min(500, Math.max(1, Math.floor(Number(um(sp.p))) || 1)) }
  const sb = await clienteDoUsuario()
  const [r, fac, conexoes, eu] = await Promise.all([buscar(membro.id, f), facetas(), minhasConexoes(membro.id), sb.from('directory_preferences').select('visible').eq('member_id', membro.id).maybeSingle()])
  const paginas = Math.max(1, Math.ceil(r.total / 12))
  const params = (p: number) => new URLSearchParams({ ...(f.q && { q: f.q }), ...(f.setor && { setor: f.setor }), ...(f.interesse && { interesse: f.interesse }), ...(f.cidade && { cidade: f.cidade }), p: String(p) }).toString()
  const pendentes = conexoes.filter((c) => c.status === 'pending' && c.recebida)

  const filtrando = Boolean(f.q || f.setor || f.interesse || f.cidade)

  return (
    <Secao atmosfera="registro" className="min-h-[calc(100dvh-var(--cabecalho-h))]">
      <div className="grid gap-14">
        <TituloPagina
          chamada="The Directory"
          numero="02"
          linha1="Quem está"
          linha2="na casa."
          curva="onda"
          texto={
            <>
              Só aparece aqui quem escolheu aparecer. Contatos são liberados apenas entre conexões aceitas, e apenas os que cada membro autorizou.
              {!eu.data?.visible ? (
                <>
                  {' '}
                  Você está privado.{' '}
                  <Link href="/settings#diretorio" className="sublinha-traco text-destaque">
                    Mudar
                  </Link>
                </>
              ) : null}
            </>
          }
        />

        {pendentes.length ? (
          <Bloco titulo="Pedidos de conexão" numero="◆">
            <ul className="grid">
              {pendentes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--fio)] py-4 first:pt-0">
                  <Link href={`/directory/${c.outro}`} className="flex items-center gap-4">
                    <Monograma nome={c.nome} tamanho={44} />
                    <span>
                      <span className="block font-display text-[1.5rem] leading-tight">{c.nome}</span>
                      {c.message ? <span className="block text-[0.82rem] text-apagado italic">“{c.message}”</span> : null}
                    </span>
                  </Link>
                  <AcoesConexao conexaoId={c.id} acoes={['aceitar', 'recusar', 'bloquear']} />
                </li>
              ))}
            </ul>
          </Bloco>
        ) : null}

        <form className="grid gap-x-8 gap-y-4 border-y border-[var(--fio-forte)] py-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end" role="search" aria-label="Buscar no diretório">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-apagado" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" />
            </svg>
            <label className="sr-only" htmlFor="q">
              Nome, empresa ou assunto
            </label>
            <input id="q" name="q" defaultValue={f.q} placeholder="Nome, empresa ou assunto…" maxLength={60} className="min-h-12 w-full bg-transparent font-display text-[1.5rem] text-tinta placeholder:text-discreto placeholder:italic focus:outline-none" />
          </div>
          <label className="sr-only" htmlFor="setor">
            Área profissional
          </label>
          <Entrada id="setor" name="setor" defaultValue={f.setor} placeholder="Área" maxLength={60} />
          <label className="sr-only" htmlFor="interesse">
            Interesse
          </label>
          <Selecao id="interesse" name="interesse" defaultValue={f.interesse}>
            <option value="">Interesse</option>
            {fac.interesses.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Selecao>
          <label className="sr-only" htmlFor="cidade">
            Cidade
          </label>
          <Selecao id="cidade" name="cidade" defaultValue={f.cidade}>
            <option value="">Cidade</option>
            {fac.cidades.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Selecao>
          <Botao type="submit" variante="ouro">
            Buscar
          </Botao>
        </form>

        <section aria-live="polite" className="grid gap-6">
          <p className="rotulo flex items-center justify-between text-discreto">
            <span>{r.total === 1 ? '1 membro' : `${r.total} membros`}</span>
            {filtrando ? (
              <Link href="/directory" className="sublinha-traco hover:text-destaque">
                Limpar filtros
              </Link>
            ) : null}
          </p>
          {r.perfis.length === 0 ? (
            <Vazio titulo={filtrando ? 'Ninguém com esses critérios.' : 'O diretório ainda está vazio.'} texto="Perfis aparecem conforme os membros escolhem ser encontrados." />
          ) : (
            <ol className="border-b border-[var(--fio)]">
              {r.perfis.map((p, i) => (
                <li key={p.member_id}>
                  <Link href={`/directory/${p.member_id}`} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 border-t border-[var(--fio)] py-5 md:grid-cols-[2.5rem_auto_minmax(0,1.3fr)_minmax(0,1fr)_auto]">
                    <span className="numerico hidden font-mono text-[0.72rem] text-discreto md:block">{String((f.pagina - 1) * 12 + i + 1).padStart(2, '0')}</span>
                    <Monograma nome={p.display_name ?? 'Membro'} tamanho={46} />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[1.75rem] leading-tight text-tinta group-hover:text-destaque group-hover:italic">{p.display_name ?? 'Membro'}</span>
                      <span className="block truncate text-[0.8rem] text-apagado">{[p.profession, p.company].filter(Boolean).join(' · ') || '—'}</span>
                    </span>
                    <span className="col-span-3 min-w-0 text-[0.78rem] text-tinta-2 md:col-span-1">
                      {p.city ? <span className="rotulo mr-3 text-discreto">{p.city}</span> : null}
                      <span className="line-clamp-1">{p.interests.join(' · ')}</span>
                    </span>
                    <span aria-hidden="true" className="row-start-1 font-mono text-tinta-2 transition-transform group-hover:translate-x-1.5 group-hover:text-destaque md:row-auto">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {paginas > 1 ? (
            <nav aria-label="Páginas" className="flex items-center gap-4">
              {f.pagina > 1 ? <BotaoLink href={`?${params(f.pagina - 1)}`}>Anterior</BotaoLink> : null}
              <span className="rotulo numerico text-discreto">
                {f.pagina} / {paginas}
              </span>
              {f.pagina < paginas ? <BotaoLink href={`?${params(f.pagina + 1)}`}>Próxima</BotaoLink> : null}
            </nav>
          ) : null}
        </section>
      </div>
    </Secao>
  )
}
