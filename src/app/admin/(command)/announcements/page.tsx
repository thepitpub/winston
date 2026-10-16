import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, SemPermissao, Tabela, Td, Th } from '@/components/command/kit'
import { Etiqueta } from '@/components/ui/ui'
import { listar } from '@/lib/aplicacao/equipe/comunicados'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { dataHora } from '@/lib/datas'
import { Alternar } from './Alternar'
import { Editor } from './Editor'

export const metadata: Metadata = { title: 'Announcements' }

const TIPO = { modal: 'Modal institucional', banner: 'Banner discreto', lobby: 'Aviso no Grand Lobby' } as const
const FREQ = { once: 'Uma vez', session: 'Por sessão', always: 'Sempre', until_ack: 'Até reconhecer' } as const

function situacao(a: { active: boolean; starts_at: string; ends_at: string | null }): [string, 'ok' | 'atencao' | 'neutro'] {
  if (!a.active) return ['Inativo', 'neutro']
  const agora = Date.now()
  if (new Date(a.starts_at).getTime() > agora) return ['Agendado', 'atencao']
  if (a.ends_at && new Date(a.ends_at).getTime() <= agora) return ['Encerrado', 'neutro']
  return ['No ar', 'ok']
}

/**
 * Comunicados do Portal: o conceito do módulo de pop-ups do Somma (período,
 * frequência, páginas, impressões, cliques, dispensas), sem imagem, com
 * audiência decidida no banco e público identificado.
 */
export default async function Announcements({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const eq = await exigirEquipe()
  if (!pode(eq, 'announcements.manage')) return <SemPermissao />
  const sp = await searchParams
  const lista = await listar()
  const editar = typeof sp.editar === 'string' ? sp.editar : null
  const atual = editar && editar !== 'novo' ? lista.find((a) => a.id === editar) : undefined

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="AN · ANNOUNCEMENTS" titulo="Comunicados" descricao="Modal, banner ou aviso no Lobby. Segmentação feita no servidor; impressões, cliques, fechamentos e reconhecimentos por membro." acoes={<Link href="?editar=novo" className="h-9 content-center rounded-xs bg-destaque px-4 text-xs font-semibold tracking-[0.14em] text-sobre-destaque uppercase">Novo comunicado</Link>} />
      {editar ? (
        <Editor
          key={editar}
          id={atual?.id ?? null}
          atual={
            atual
              ? {
                  title: atual.title,
                  body: atual.body,
                  cta_label: atual.cta_label ?? '',
                  cta_target: atual.cta_target ?? '',
                  kind: atual.kind as 'modal',
                  frequency: atual.frequency as 'once',
                  priority: atual.priority,
                  audience: atual.audience as { all?: boolean; statuses?: string[]; categories?: string[] },
                  pages: atual.pages,
                  starts_at: atual.starts_at,
                  ends_at: atual.ends_at,
                  active: atual.active,
                }
              : null
          }
        />
      ) : null}
      <Bloco titulo="Campanhas">
        <Tabela legenda="Comunicados">
          <thead>
            <tr>
              <Th>Título</Th>
              <Th>Tipo</Th>
              <Th>Frequência</Th>
              <Th>Período</Th>
              <Th alinhar="direita">Alcance</Th>
              <Th alinhar="direita">Cliques</Th>
              <Th alinhar="direita">CTR</Th>
              <Th alinhar="direita">Fech. / Rec.</Th>
              <Th>Situação</Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => {
              const [s, t] = situacao(a)
              return (
                <tr key={a.id}>
                  <Td>
                    <Link href={`?editar=${a.id}`} className="hover:text-destaque">
                      {a.title}
                    </Link>
                  </Td>
                  <Td className="text-xs">{TIPO[a.kind as keyof typeof TIPO]}</Td>
                  <Td className="text-xs">{FREQ[a.frequency as keyof typeof FREQ]}</Td>
                  <Td mono className="text-xs">
                    {dataHora(a.starts_at)} → {a.ends_at ? dataHora(a.ends_at) : '∞'}
                  </Td>
                  <Td mono className="text-right">
                    {a.metricas.alcance}
                  </Td>
                  <Td mono className="text-right">
                    {a.metricas.cliques}
                  </Td>
                  <Td mono className="text-right">
                    {a.metricas.ctr}%
                  </Td>
                  <Td mono className="text-right">
                    {a.metricas.fechamentos} / {a.metricas.reconhecimentos}
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <Etiqueta tom={t}>{s}</Etiqueta>
                      <Alternar id={a.id} ativo={a.active} />
                    </span>
                  </Td>
                </tr>
              )
            })}
            {lista.length === 0 ? (
              <tr>
                <Td colSpan={9} className="py-6 text-apagado">
                  Nenhum comunicado ainda.
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>
        <p className="text-xs text-discreto">Alcance: membros únicos com impressão. CTR: membros que clicaram ÷ alcance.</p>
      </Bloco>
    </div>
  )
}
