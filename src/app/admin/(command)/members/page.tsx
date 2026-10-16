import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, entradaCompacta, Filtros, Paginacao, SemPermissao, Tabela, Td, Th } from '@/components/command/kit'
import { Monograma } from '@/components/marca/Monograma'
import { Etiqueta } from '@/components/ui/ui'
import { listarMembros } from '@/lib/aplicacao/equipe/membros'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { romano } from '@/lib/datas'
import { CATEGORIA_MEMBRO as CATEGORIA, STATUS_MEMBRO } from '@/lib/dominio/rotulos'
import { formatarTelefone } from '@/lib/dominio/telefone'

export const metadata: Metadata = { title: 'Members' }

const um = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

export default async function Members({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const eq = await exigirEquipe()
  if (!pode(eq, 'members.read')) return <SemPermissao />
  const sp = await searchParams
  const f = { q: um(sp.q), status: um(sp.status), categoria: um(sp.categoria), ordem: um(sp.ordem) || 'numero', dir: um(sp.dir) || 'asc', pagina: Math.min(1000, Math.max(1, Math.floor(Number(um(sp.p))) || 1)) }
  const r = await listarMembros(f)
  const base = new URLSearchParams(Object.entries({ q: f.q, status: f.status, categoria: f.categoria, ordem: f.ordem, dir: f.dir }).filter(([, v]) => v) as [string, string][])

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="MB · MEMBERS" titulo="Membros" descricao="Cadastro, status, credencial e acesso. Membros importados começam aguardando convite; a conta só é criada quando o convite é aceito." />
      <Bloco>
        <Filtros>
          <label className="grid gap-1 text-xs text-apagado">
            Busca
            <input name="q" defaultValue={f.q} placeholder="Nome, telefone ou CH-XXXX-XXXX" className={`${entradaCompacta} w-72`} />
          </label>
          <label className="grid gap-1 text-xs text-apagado">
            Status
            <select name="status" defaultValue={f.status} className={entradaCompacta}>
              <option value="">Todos</option>
              {Object.entries(STATUS_MEMBRO).map(([k, [v]]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-apagado">
            Categoria
            <select name="categoria" defaultValue={f.categoria} className={entradaCompacta}>
              <option value="">Todas</option>
              {Object.entries(CATEGORIA).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </Filtros>
        <Tabela legenda="Membros">
          <thead>
            <tr>
              <Th campo="numero" ordem={f.ordem} dir={f.dir} base={base}>
                Nº
              </Th>
              <Th campo="nome" ordem={f.ordem} dir={f.dir} base={base}>
                Membro
              </Th>
              <Th>Telefone</Th>
              <Th>Credencial</Th>
              <Th campo="status" ordem={f.ordem} dir={f.dir} base={base}>
                Status
              </Th>
              <Th>Conta</Th>
            </tr>
          </thead>
          <tbody>
            {r.linhas.map((m) => {
              const cred = (m.member_credentials ?? []).find((c) => c.status === 'active') ?? m.member_credentials?.[0]
              const [rot, tom] = STATUS_MEMBRO[m.status] ?? ['—', 'neutro']
              return (
                <tr key={m.id} className="hover:bg-elevado-2">
                  <Td mono className="text-destaque">
                    {m.founder_number ? romano(m.founder_number) : '—'}
                  </Td>
                  <Td>
                    <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3 hover:text-destaque">
                      <Monograma nome={m.full_name} tamanho={28} />
                      <span>
                        {m.full_name}
                        {m.is_synthetic ? <span className="ml-2 text-[0.65rem] tracking-wider text-attention uppercase">sintético</span> : null}
                        <span className="block text-xs text-discreto">{CATEGORIA[m.category]}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td mono>{formatarTelefone(m.phone_e164) || '—'}</Td>
                  <Td mono>{cred ? cred.public_code : '—'}</Td>
                  <Td>
                    <Etiqueta tom={tom}>{rot}</Etiqueta>
                  </Td>
                  <Td className="text-xs text-apagado">{m.user_id ? 'Criada' : 'Sem conta'}</Td>
                </tr>
              )
            })}
            {r.linhas.length === 0 ? (
              <tr>
                <Td colSpan={6} className="py-8 text-center text-apagado">
                  <span>Nenhum membro com esses filtros.</span>
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>
        <Paginacao pagina={f.pagina} total={r.total} porPagina={25} base={base} />
      </Bloco>
    </div>
  )
}
