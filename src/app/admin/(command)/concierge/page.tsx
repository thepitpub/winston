import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, entradaCompacta, Filtros, SemPermissao } from '@/components/command/kit'
import { Etiqueta } from '@/components/ui/ui'
import { detalhe, equipe, fila } from '@/lib/aplicacao/equipe/concierge'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { dataHora } from '@/lib/datas'
import { CATEGORIA_ROTULO, CATEGORIAS, PRIORIDADES, STATUS, STATUS_ROTULO_EQUIPE, TOM_STATUS, type Categoria, type StatusSolicitacao } from '@/lib/dominio/concierge'
import { Inspector } from './Inspector'

export const metadata: Metadata = { title: 'Concierge Desk' }

const um = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')
const TOM_PRIORIDADE = { baixa: 'neutro', normal: 'neutro', alta: 'atencao', urgente: 'perigo' } as const

function idade(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`
}

/** Fila compartilhada: a equipe inteira vê; o inspector abre ao lado sem sair da lista. */
export default async function Concierge({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const eq = await exigirEquipe()
  if (!pode(eq, 'concierge.read')) return <SemPermissao />
  const sp = await searchParams
  const f = { status: um(sp.status) || 'abertas', categoria: um(sp.categoria), prioridade: um(sp.prioridade), responsavel: um(sp.responsavel) }
  const [lista, pessoas] = await Promise.all([fila(f), equipe()])
  const sel = um(sp.s)
  const atual = sel && /^[0-9a-f-]{36}$/i.test(sel) ? await detalhe(sel) : null
  const nomes = new Map(pessoas.map((p) => [p.user_id, p.full_name]))
  const manter = (id: string) => {
    const u = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][])
    u.set('s', id)
    // A âncora leva ao inspector no celular, onde ele fica abaixo da lista.
    return `?${u}#inspector`
  }

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="CD · CONCIERGE DESK" titulo="Concierge Desk" descricao="Service Bell e pedidos confirmados no Winston caem aqui. Notas internas nunca chegam ao membro." />
      <Bloco>
        <Filtros>
          <label className="grid gap-1 text-xs text-apagado">
            Status
            <select name="status" defaultValue={f.status} className={entradaCompacta}>
              <option value="abertas">Em aberto</option>
              <option value="todas">Todas</option>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_ROTULO_EQUIPE[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-apagado">
            Categoria
            <select name="categoria" defaultValue={f.categoria} className={entradaCompacta}>
              <option value="">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_ROTULO[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-apagado">
            Prioridade
            <select name="prioridade" defaultValue={f.prioridade} className={entradaCompacta}>
              <option value="">Todas</option>
              {PRIORIDADES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-apagado">
            Responsável
            <select name="responsavel" defaultValue={f.responsavel} className={entradaCompacta}>
              <option value="">Qualquer</option>
              <option value="sem">Sem responsável</option>
              <option value={eq.id.userId}>Comigo</option>
              {pessoas.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </label>
        </Filtros>
      </Bloco>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Bloco titulo={`Fila · ${lista.length}`}>
          {lista.length === 0 ? <p className="py-6 text-center text-sm text-apagado">Fila vazia com estes filtros.</p> : null}
          <ul className="grid gap-px bg-[var(--fio)]">
            {lista.map((s) => (
              <li key={s.id}>
                <Link href={manter(s.id)} aria-current={sel === s.id ? 'true' : undefined} className="grid gap-1 bg-elevado px-3 py-2.5 hover:bg-elevado-2 aria-[current=true]:bg-elevado-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <span className="min-w-0">
                    <span className="block truncate text-tinta">{s.subject}</span>
                    <span className="text-xs text-apagado">
                      {s.member?.display_name || s.member?.full_name} · {CATEGORIA_ROTULO[s.category as Categoria]} · {s.origin === 'winston' ? 'via Winston' : 'Service Bell'} · {s.responsavel ? nomes.get(s.responsavel) : 'sem responsável'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Etiqueta tom={TOM_PRIORIDADE[s.priority as keyof typeof TOM_PRIORIDADE]}>{s.priority}</Etiqueta>
                    <Etiqueta tom={TOM_STATUS[s.status as StatusSolicitacao]}>{STATUS_ROTULO_EQUIPE[s.status as StatusSolicitacao]}</Etiqueta>
                    <span className="numerico w-12 text-right font-mono text-xs text-apagado" title={dataHora(s.updated_at)}>
                      {idade(s.updated_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Bloco>
        <aside id="inspector" aria-label="Inspector" className="scroll-mt-16 xl:sticky xl:top-16 xl:self-start">
          {atual ? (
            <Inspector key={atual.id} s={atual} pessoas={pessoas} podeResponder={pode(eq, 'concierge.respond')} podeAtribuir={pode(eq, 'concierge.assign')} />
          ) : (
            <Bloco>
              <p className="py-8 text-center text-sm text-apagado">Selecione uma solicitação.</p>
            </Bloco>
          )}
        </aside>
      </div>
    </div>
  )
}
