import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, entradaCompacta, Filtros, Paginacao, SemPermissao, Tabela, Td, Th } from '@/components/command/kit'
import { Etiqueta } from '@/components/ui/ui'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { PAPEL_ROTULO, PERMISSAO_ROTULO, SO_EXPLICITAS, type Papel, type Permissao } from '@/lib/autorizacao/permissoes'
import { clienteSecreto } from '@/lib/db/clientes'
import { dataHoraCompleta } from '@/lib/datas'
import { FormAjustes, PessoaEquipe } from './Formularios'

export const metadata: Metadata = { title: 'Audit & Settings' }
const um = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')
const POR = 50

/**
 * Trilha de auditoria (somente inserção no banco), papéis, concessões
 * explícitas e ajustes do sistema. Cada seção pede a sua permissão.
 */
export default async function Auditoria({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const eq = await exigirEquipe()
  const podeAudit = pode(eq, 'audit.read')
  const podeAjustes = pode(eq, 'settings.manage')
  const podePapeis = pode(eq, 'roles.manage')
  if (!podeAudit && !podeAjustes && !podePapeis) return <SemPermissao />
  const sp = await searchParams
  const f = { acao: um(sp.acao).replace(/[%,()*\\]/g, '').slice(0, 60), resultado: um(sp.resultado), membro: um(sp.membro), de: um(sp.de), ate: um(sp.ate), pagina: Math.min(1000, Math.max(1, Math.floor(Number(um(sp.p))) || 1)) }
  const adm = clienteSecreto()

  let logs: { data: Array<{ id: number; at: string; actor_kind: string; actor_user_id: string | null; action: string; resource_type: string | null; result: string; member_id: string | null; details: unknown }> | null; count: number | null } = { data: [], count: 0 }
  if (podeAudit) {
    let q = adm.from('audit_logs').select('id, at, actor_kind, actor_user_id, action, resource_type, result, member_id, details', { count: 'exact' }).order('at', { ascending: false })
    if (f.acao) q = q.ilike('action', `${f.acao}%`)
    if (f.resultado) q = q.eq('result', f.resultado as 'success')
    if (/^[0-9a-f-]{36}$/i.test(f.membro)) q = q.eq('member_id', f.membro)
    if (/^\d{4}-\d{2}-\d{2}$/.test(f.de)) q = q.gte('at', `${f.de}T00:00:00-03:00`)
    if (/^\d{4}-\d{2}-\d{2}$/.test(f.ate)) q = q.lte('at', `${f.ate}T23:59:59-03:00`)
    logs = await q.range((f.pagina - 1) * POR, f.pagina * POR - 1)
  }
  const [staff, papeis, explicitas, ajustes] = await Promise.all([
    adm.from('staff_members').select('user_id, full_name, email, status, is_synthetic').order('full_name'),
    adm.from('member_roles').select('user_id, role'),
    adm.from('user_permissions').select('user_id, permission'),
    podeAjustes ? adm.from('app_settings').select('key, value') : Promise.resolve({ data: [] }),
  ])
  const nomes = new Map((staff.data ?? []).map((s) => [s.user_id, s.full_name]))
  const base = new URLSearchParams(Object.entries({ acao: f.acao, resultado: f.resultado, membro: f.membro, de: f.de, ate: f.ate }).filter(([, v]) => v) as [string, string][])

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="AU · AUDIT & SETTINGS" titulo="Auditoria e configurações" descricao="Quem fez o quê, quando e com que resultado. A trilha não pode ser editada nem apagada, nem por super admin." />
      {podeAudit ? (
        <Bloco titulo={`Trilha · ${logs.count ?? 0} evento(s)`}>
          <Filtros>
            <label className="grid gap-1 text-xs text-apagado">
              Ação (prefixo)
              <input name="acao" defaultValue={f.acao} placeholder="cs., convite., checkin." className={`${entradaCompacta} w-48`} />
            </label>
            <label className="grid gap-1 text-xs text-apagado">
              Resultado
              <select name="resultado" defaultValue={f.resultado} className={entradaCompacta}>
                <option value="">Todos</option>
                <option value="success">Sucesso</option>
                <option value="denied">Negado</option>
                <option value="error">Erro</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs text-apagado">
              De
              <input type="date" name="de" defaultValue={f.de} className={entradaCompacta} />
            </label>
            <label className="grid gap-1 text-xs text-apagado">
              Até
              <input type="date" name="ate" defaultValue={f.ate} className={entradaCompacta} />
            </label>
          </Filtros>
          <Tabela legenda="Trilha de auditoria">
            <thead>
              <tr>
                <Th>Quando</Th>
                <Th>Ator</Th>
                <Th>Ação</Th>
                <Th>Recurso</Th>
                <Th>Resultado</Th>
                <Th>Detalhes</Th>
              </tr>
            </thead>
            <tbody>
              {(logs.data ?? []).map((l) => (
                <tr key={l.id}>
                  <Td mono className="text-xs whitespace-nowrap">
                    {dataHoraCompleta(l.at)}
                  </Td>
                  <Td className="text-xs">
                    {l.actor_kind === 'staff' ? (nomes.get(l.actor_user_id ?? '') ?? 'Equipe') : l.actor_kind === 'member' ? 'Membro' : l.actor_kind === 'system' ? 'Sistema' : 'Anônimo'}
                  </Td>
                  <Td mono className="text-xs">
                    {l.action}
                  </Td>
                  <Td className="text-xs">
                    {l.member_id ? (
                      <Link href={`/admin/members/${l.member_id}`} className="text-destaque hover:underline">
                        membro
                      </Link>
                    ) : (
                      (l.resource_type ?? '—')
                    )}
                  </Td>
                  <Td>
                    <Etiqueta tom={l.result === 'success' ? 'ok' : l.result === 'denied' ? 'atencao' : 'perigo'}>{l.result}</Etiqueta>
                  </Td>
                  <Td mono className="max-w-[22rem] truncate text-[0.7rem] text-discreto">
                    {JSON.stringify(l.details) === '{}' ? '' : JSON.stringify(l.details)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
          <Paginacao pagina={f.pagina} total={logs.count ?? 0} porPagina={POR} base={base} />
        </Bloco>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Bloco titulo="Equipe, papéis e concessões explícitas">
          <p className="text-xs text-discreto">Pessoas novas entram pelo terminal (npm run staff:criar), que gera a senha provisória; o autenticador é obrigatório no primeiro acesso. {SO_EXPLICITAS.map((p) => PERMISSAO_ROTULO[p]).join(' e ')} nunca vêm de papel.</p>
          <ul className="grid gap-px bg-[var(--fio)]">
            {(staff.data ?? []).map((s) => (
              <li key={s.user_id} className="bg-elevado py-3">
                <PessoaEquipe
                  userId={s.user_id}
                  nome={s.full_name}
                  email={s.email}
                  status={s.status}
                  sintetico={s.is_synthetic}
                  papel={((papeis.data ?? []).find((p) => p.user_id === s.user_id && p.role !== 'member')?.role ?? 'staff') as Exclude<Papel, 'member'>}
                  explicitas={(explicitas.data ?? []).filter((p) => p.user_id === s.user_id).map((p) => p.permission as Permissao)}
                  podeEditar={podePapeis && s.user_id !== eq.id.userId}
                  rotulosPapel={PAPEL_ROTULO}
                />
              </li>
            ))}
          </ul>
        </Bloco>
        {podeAjustes ? (
          <Bloco titulo="Ajustes do sistema">
            <FormAjustes valores={Object.fromEntries((ajustes.data ?? []).map((a) => [a.key, a.value]))} />
          </Bloco>
        ) : null}
      </div>
    </div>
  )
}
