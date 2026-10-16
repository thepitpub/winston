import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, SemPermissao, Tabela, Td, Th } from '@/components/command/kit'
import { Etiqueta } from '@/components/ui/ui'
import { eventos, logs } from '@/lib/aplicacao/equipe/checkins'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { dataHora } from '@/lib/datas'
import { Console } from './Console'
import { FormEvento } from './FormEvento'

export const metadata: Metadata = { title: 'Check-in Control' }

const RESULTADO: Record<string, [string, 'ok' | 'atencao' | 'perigo' | 'neutro' | 'info']> = {
  validated: ['Validado', 'ok'],
  exception_granted: ['Exceção autorizada', 'info'],
  already_validated: ['Já validado', 'atencao'],
  not_found: ['Não encontrado', 'perigo'],
  suspended: ['Suspenso', 'perigo'],
  no_permission: ['Sem permissão', 'perigo'],
  event_closed: ['Evento fechado', 'neutro'],
}
const POLITICA = { once_per_event: 'Uma vez por evento', once_per_day: 'Uma vez por dia', unlimited: 'Sem limite' } as const

export default async function Checkins({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const eq = await exigirEquipe()
  if (!pode(eq, 'checkins.validate')) return <SemPermissao />
  const sp = await searchParams
  const lista = await eventos()
  const abertos = lista.filter((e) => e.status === 'open')
  const editar = typeof sp.editar === 'string' ? lista.find((e) => e.id === sp.editar) : undefined
  const filtro = typeof sp.evento === 'string' && /^[0-9a-f-]{36}$/i.test(sp.evento) ? sp.evento : null
  const registro = await logs(filtro)

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="CK · CHECK-IN CONTROL" titulo="Check-in" descricao="Validação no servidor, com a política de duplicidade de cada evento. Toda tentativa, válida ou não, fica no registro." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Bloco titulo="Validar">
          <Console eventos={abertos.map((e) => ({ id: e.id, nome: e.name, politica: POLITICA[e.duplicate_policy as keyof typeof POLITICA] }))} podeExcecao={pode(eq, 'checkins.manage')} />
        </Bloco>
        <Bloco titulo="Eventos" acao={pode(eq, 'checkins.manage') ? <Link href="?editar=novo" className="text-xs text-destaque hover:underline">+ Novo</Link> : undefined}>
          {pode(eq, 'checkins.manage') && (editar || sp.editar === 'novo') ? <FormEvento key={editar?.id ?? 'novo'} atual={editar} /> : null}
          <ul className="grid gap-px bg-[var(--fio)]">
            {lista.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 bg-elevado py-2">
                <span className="min-w-0">
                  <Link href={`?evento=${e.id}`} className="block truncate text-sm hover:text-destaque">
                    {e.name}
                  </Link>
                  <span className="numerico font-mono text-xs text-discreto">
                    {dataHora(e.starts_at)} · {POLITICA[e.duplicate_policy as keyof typeof POLITICA]}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Etiqueta tom={e.status === 'open' ? 'ok' : e.status === 'draft' ? 'neutro' : 'atencao'}>{e.status === 'open' ? 'Aberto' : e.status === 'draft' ? 'Rascunho' : 'Fechado'}</Etiqueta>
                  {pode(eq, 'checkins.manage') ? (
                    <Link href={`?editar=${e.id}`} className="text-xs text-apagado hover:text-tinta">
                      Editar
                    </Link>
                  ) : null}
                </span>
              </li>
            ))}
            {lista.length === 0 ? <li className="bg-elevado py-3 text-sm text-apagado">Nenhum evento. Crie um (por exemplo, “Casa · entrada diária”, uma vez por dia).</li> : null}
          </ul>
        </Bloco>
      </div>
      <Bloco titulo={filtro ? 'Registro do evento' : 'Registro de validações'} acao={filtro ? <Link href="/admin/checkins" className="text-xs text-apagado hover:text-tinta">Ver todos</Link> : undefined}>
        <Tabela legenda="Registro de validações">
          <thead>
            <tr>
              <Th>Quando</Th>
              <Th>Resultado</Th>
              <Th>Membro</Th>
              <Th>Evento</Th>
              <Th>Origem</Th>
              <Th>Operador</Th>
              <Th>Justificativa</Th>
            </tr>
          </thead>
          <tbody>
            {registro.map((l) => {
              const [r, t] = RESULTADO[l.result] ?? [l.result, 'neutro']
              const m = Array.isArray(l.member) ? l.member[0] : l.member
              const ev = Array.isArray(l.event) ? l.event[0] : l.event
              return (
                <tr key={l.id}>
                  <Td mono>{dataHora(l.at)}</Td>
                  <Td>
                    <Etiqueta tom={t}>{r}</Etiqueta>
                  </Td>
                  <Td>{m?.full_name ?? <span className="text-discreto">{l.query ? `“${l.query.slice(0, 24)}”` : '—'}</span>}</Td>
                  <Td>{ev?.name ?? '—'}</Td>
                  <Td className="text-xs text-apagado">{l.source}</Td>
                  <Td className="text-xs">{l.operador}</Td>
                  <Td className="text-xs text-apagado">{l.reason ?? ''}</Td>
                </tr>
              )
            })}
          </tbody>
        </Tabela>
      </Bloco>
    </div>
  )
}
