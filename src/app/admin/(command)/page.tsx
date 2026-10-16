import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, Indicador } from '@/components/command/kit'
import { Etiqueta } from '@/components/ui/ui'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { clienteSecreto } from '@/lib/db/clientes'
import { dataHora } from '@/lib/datas'
import { STATUS_ROTULO_EQUIPE, TOM_STATUS, type StatusSolicitacao } from '@/lib/dominio/concierge'

export const metadata: Metadata = { title: 'Overview' }

/** A sala em um relance. Só números reais, e só os que o papel pode ver. */
export default async function Overview() {
  const eq = await exigirEquipe()
  const adm = clienteSecreto()
  const inicioDoDia = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())}T00:00:00-03:00`).toISOString()
  const agora = new Date().toISOString()
  const conta = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0)
  const base = () => adm.from('members').select('id', { count: 'exact', head: true }).eq('is_synthetic', false)

  const [ativos, convidados, pendentes, suspensos, convites, checkinsHoje, filaAberta, codigosPendentes, saldos, ultimas, ultimosCheckins] = await Promise.all([
    conta(base().eq('status', 'active')),
    conta(base().eq('status', 'invited')),
    conta(base().eq('status', 'pending')),
    conta(base().in('status', ['suspended', 'revoked'])),
    pode(eq, 'invitations.manage') ? conta(adm.from('member_invitations').select('id', { count: 'exact', head: true }).is('accepted_at', null).is('revoked_at', null).gt('expires_at', agora)) : Promise.resolve(null),
    pode(eq, 'checkins.validate') ? conta(adm.from('member_checkins').select('id', { count: 'exact', head: true }).gte('validated_at', inicioDoDia)) : Promise.resolve(null),
    pode(eq, 'concierge.read') ? conta(adm.from('concierge_requests').select('id', { count: 'exact', head: true }).in('status', ['aberta', 'em_atendimento', 'aguardando_membro'])) : Promise.resolve(null),
    pode(eq, 'otp.deliver') ? conta(adm.from('auth_otp_challenges').select('id', { count: 'exact', head: true }).eq('delivery_status', 'manual_pending').is('consumed_at', null).gt('expires_at', agora)) : Promise.resolve(null),
    pode(eq, 'coins.read') ? adm.rpc('ch_coins_em_circulacao') : Promise.resolve({ data: null }),
    pode(eq, 'concierge.read') ? adm.from('concierge_requests').select('id, subject, status, priority, updated_at, member:members(full_name)').in('status', ['aberta', 'em_atendimento']).order('updated_at', { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
    pode(eq, 'checkins.validate') ? adm.from('member_checkins').select('id, validated_at, member:members(full_name), event:checkin_events(name)').order('validated_at', { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
  ])
  const circulante = saldos.data === null ? null : Number(saldos.data)

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="OV · OVERVIEW" titulo={`Boa operação, ${eq.nome.split(' ')[0]}.`} descricao="Membros sintéticos de desenvolvimento não entram nas contagens." />
      <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
        <Indicador rotulo="Membros ativos" valor={ativos} href={pode(eq, 'members.read') ? '/admin/members?status=active' : undefined} />
        <Indicador rotulo="Convidados" valor={convidados} detalhe={convites !== null ? `${convites} convite(s) válido(s)` : undefined} href={pode(eq, 'members.read') ? '/admin/members?status=invited' : undefined} />
        <Indicador rotulo="Aguardando convite" valor={pendentes} href={pode(eq, 'members.read') ? '/admin/members?status=pending' : undefined} tom={pendentes ? 'atencao' : undefined} />
        <Indicador rotulo="Suspensos / revogados" valor={suspensos} />
        {checkinsHoje !== null ? <Indicador rotulo="Check-ins hoje" valor={checkinsHoje} href="/admin/checkins" /> : null}
        {filaAberta !== null ? <Indicador rotulo="Solicitações em aberto" valor={filaAberta} href="/admin/concierge" tom={filaAberta ? 'atencao' : undefined} /> : null}
        {codigosPendentes !== null ? <Indicador rotulo="Códigos a entregar" valor={codigosPendentes} href="/admin/invitations" tom={codigosPendentes ? 'perigo' : undefined} /> : null}
        {circulante !== null ? <Indicador rotulo="Gold Coins em circulação" valor={circulante.toLocaleString('pt-BR')} href="/admin/gold-coins" tom="ouro" /> : null}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {pode(eq, 'concierge.read') ? (
          <Bloco titulo="Fila do Concierge" acao={<Link href="/admin/concierge" className="text-xs text-destaque hover:underline">Abrir</Link>}>
            {(ultimas.data ?? []).length === 0 ? <p className="text-sm text-apagado">Nada em aberto.</p> : null}
            <ul className="grid gap-px bg-[var(--fio)]">
              {(ultimas.data ?? []).map((s) => {
                const m = Array.isArray(s.member) ? s.member[0] : s.member
                return (
                  <li key={s.id} className="bg-elevado">
                    <Link href={`/admin/concierge?s=${s.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-destaque">
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{s.subject}</span>
                        <span className="text-xs text-discreto">{m?.full_name}</span>
                      </span>
                      <Etiqueta tom={TOM_STATUS[s.status as StatusSolicitacao]}>{STATUS_ROTULO_EQUIPE[s.status as StatusSolicitacao]}</Etiqueta>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Bloco>
        ) : null}
        {pode(eq, 'checkins.validate') ? (
          <Bloco titulo="Últimos check-ins" acao={<Link href="/admin/checkins" className="text-xs text-destaque hover:underline">Abrir</Link>}>
            {(ultimosCheckins.data ?? []).length === 0 ? <p className="text-sm text-apagado">Nenhum check-in registrado.</p> : null}
            <ul className="grid gap-1 text-sm">
              {(ultimosCheckins.data ?? []).map((c) => {
                const m = Array.isArray(c.member) ? c.member[0] : c.member
                const ev = Array.isArray(c.event) ? c.event[0] : c.event
                return (
                  <li key={c.id} className="flex justify-between gap-3">
                    <span>
                      {m?.full_name} <span className="text-xs text-discreto">· {ev?.name}</span>
                    </span>
                    <span className="numerico font-mono text-xs text-apagado">{dataHora(c.validated_at)}</span>
                  </li>
                )
              })}
            </ul>
          </Bloco>
        ) : null}
      </div>
    </div>
  )
}
