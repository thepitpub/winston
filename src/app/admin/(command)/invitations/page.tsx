import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, Indicador, SemPermissao, Tabela, Td, Th } from '@/components/command/kit'
import { Etiqueta } from '@/components/ui/ui'
import { ambiente } from '@/lib/ambiente'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { clienteSecreto } from '@/lib/db/clientes'
import { agoraMs, dataHora } from '@/lib/datas'
import { estadoDoConvite } from '@/lib/dominio/regras-acesso'
import { mascararTelefone } from '@/lib/dominio/telefone'
import { Revelar } from './Revelar'

export const metadata: Metadata = { title: 'Invitations & Access' }

const FINALIDADE = { login: 'Entrada', invite: 'Convite', phone_change: 'Troca de telefone' } as const
const ESTADO = { valido: ['Válido', 'ok'], expirado: ['Expirado', 'neutro'], aceito: ['Aceito', 'info'], revogado: ['Revogado', 'perigo'] } as const

export default async function Convites() {
  const eq = await exigirEquipe()
  const podeConvites = pode(eq, 'invitations.manage')
  const podeEntregar = pode(eq, 'otp.deliver')
  if (!podeConvites && !podeEntregar) return <SemPermissao />
  const adm = clienteSecreto()
  const agora = new Date().toISOString()
  const [convites, pendentes, sessoes, provedor] = await Promise.all([
    podeConvites ? adm.from('member_invitations').select('id, created_at, expires_at, accepted_at, revoked_at, member:members(id, full_name)').order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
    podeEntregar ? adm.from('auth_otp_challenges').select('id, purpose, phone_e164, created_at, expires_at, member:members(full_name)').eq('delivery_status', 'manual_pending').is('consumed_at', null).gt('expires_at', agora).order('created_at') : Promise.resolve({ data: [] }),
    podeConvites ? adm.from('member_sessions').select('id', { count: 'exact', head: true }).is('revoked_at', null).eq('is_staff', false) : Promise.resolve({ count: 0 }),
    Promise.resolve(ambiente().CH_OTP_PROVEDOR),
  ])
  const momento = agoraMs()
  const vivos = (convites.data ?? []).filter((c) => estadoDoConvite(c, momento) === 'valido').length

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="IA · INVITATIONS & ACCESS" titulo="Convites e acesso" descricao="Convites de uso único com validade, códigos temporários e sessões. Para emitir ou revogar um convite, abra a ficha do membro." />
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
        <Indicador rotulo="Convites válidos" valor={vivos} />
        <Indicador rotulo="Códigos aguardando entrega" valor={(pendentes.data ?? []).length} tom={(pendentes.data ?? []).length ? 'atencao' : undefined} />
        <Indicador rotulo="Sessões de membros abertas" valor={sessoes.count ?? 0} detalhe={`Provedor de código: ${provedor}`} />
      </div>
      {podeEntregar ? (
        <Bloco titulo="Entrega de códigos (provedor manual)">
          {provedor !== 'manual' ? <p className="text-sm text-apagado">O provedor atual é {provedor}: os códigos saem automaticamente.</p> : null}
          {(pendentes.data ?? []).length === 0 ? (
            <p className="text-sm text-apagado">Nenhum código aguardando. Quando um membro pede, ele aparece aqui por até 10 minutos.</p>
          ) : (
            <ul className="grid gap-px bg-[var(--fio)]">
              {(pendentes.data ?? []).map((d) => {
                const m = Array.isArray(d.member) ? d.member[0] : d.member
                return (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 bg-elevado py-2.5">
                    <span>
                      <span className="block">{m?.full_name ?? 'Membro'}</span>
                      <span className="numerico font-mono text-xs text-discreto">
                        {FINALIDADE[d.purpose as keyof typeof FINALIDADE]} · {mascararTelefone(d.phone_e164)} · expira {dataHora(d.expires_at)}
                      </span>
                    </span>
                    <Revelar id={d.id} />
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs text-discreto">Envie só pelo WhatsApp oficial da casa, ao número cadastrado. Revelar marca como entregue e fica na auditoria.</p>
        </Bloco>
      ) : null}
      {podeConvites ? (
        <Bloco titulo="Convites recentes">
          <Tabela legenda="Convites">
            <thead>
              <tr>
                <Th>Membro</Th>
                <Th>Emitido</Th>
                <Th>Validade</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {(convites.data ?? []).map((c) => {
                const m = Array.isArray(c.member) ? c.member[0] : c.member
                const [r, t] = ESTADO[estadoDoConvite(c, momento)]
                return (
                  <tr key={c.id}>
                    <Td>{m ? <Link href={`/admin/members/${m.id}?aba=acesso`} className="hover:text-destaque">{m.full_name}</Link> : '—'}</Td>
                    <Td mono>{dataHora(c.created_at)}</Td>
                    <Td mono>{dataHora(c.expires_at)}</Td>
                    <Td>
                      <Etiqueta tom={t}>{r}</Etiqueta>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabela>
          <p className="text-xs text-discreto">MFA: membros cadastram o autenticador no primeiro acesso; a equipe é obrigada a usá-lo sempre. Recuperação de acesso fica na ficha do membro.</p>
        </Bloco>
      ) : null}
    </div>
  )
}
