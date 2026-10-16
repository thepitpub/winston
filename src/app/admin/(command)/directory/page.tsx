import type { Metadata } from 'next'
import Link from 'next/link'
import { Bloco, Cabecalho, Indicador, SemPermissao, Tabela, Td, Th } from '@/components/command/kit'
import { Etiqueta } from '@/components/ui/ui'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { clienteSecreto } from '@/lib/db/clientes'
import { dataHora } from '@/lib/datas'
import { Moderar } from './Moderar'

export const metadata: Metadata = { title: 'Directory Governance' }

/**
 * Governança do diretório: quem consentiu e quando, moderação (ocultar com
 * nota) e o estado das conexões. A equipe vê o que o membro publicou; os
 * contatos privados não aparecem aqui.
 */
export default async function Governanca() {
  const eq = await exigirEquipe()
  if (!pode(eq, 'directory.moderate')) return <SemPermissao />
  const adm = clienteSecreto()
  const [perfis, conexoes] = await Promise.all([
    adm.from('directory_preferences').select('member_id, visible, display_name, profession, company, city, description, consented_at, moderation_status, moderation_note, updated_at, member:members(full_name, status, is_synthetic)').order('updated_at', { ascending: false }),
    adm.from('member_connections').select('status'),
  ])
  const lista = (perfis.data ?? []).map((p) => ({ ...p, member: Array.isArray(p.member) ? p.member[0] : p.member }))
  const visiveis = lista.filter((p) => p.visible)
  const porStatus = (s: string) => (conexoes.data ?? []).filter((c) => c.status === s).length

  return (
    <div className="grid gap-10">
      <Cabecalho codigo="DG · DIRECTORY GOVERNANCE" titulo="Diretório" descricao="Consentimento, moderação e conexões. Ocultar um perfil não muda a escolha do membro: só o retira da busca até nova revisão." />
      <div className="grid gap-3 sm:grid-cols-4">
        <Indicador rotulo="Perfis visíveis" valor={visiveis.length} detalhe={`${lista.length} com preferências`} />
        <Indicador rotulo="Ocultos pela moderação" valor={lista.filter((p) => p.moderation_status === 'hidden').length} tom="atencao" />
        <Indicador rotulo="Conexões aceitas" valor={porStatus('accepted')} />
        <Indicador rotulo="Pendentes / bloqueios" valor={`${porStatus('pending')} / ${porStatus('blocked')}`} />
      </div>
      <Bloco titulo="Perfis">
        <Tabela legenda="Perfis do diretório">
          <thead>
            <tr>
              <Th>Membro</Th>
              <Th>Nome de exibição</Th>
              <Th>Profissão / empresa</Th>
              <Th>Consentimento</Th>
              <Th>Moderação</Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.member_id}>
                <Td>
                  <Link href={`/admin/members/${p.member_id}`} className="hover:text-destaque">
                    {p.member?.full_name}
                  </Link>
                  {p.member?.is_synthetic ? <span className="ml-2 text-[0.65rem] text-attention uppercase">sintético</span> : null}
                </Td>
                <Td>{p.display_name ?? '—'}</Td>
                <Td className="text-xs text-apagado">{[p.profession, p.company].filter(Boolean).join(' · ') || '—'}</Td>
                <Td>{p.visible ? <span className="numerico font-mono text-xs">{p.consented_at ? dataHora(p.consented_at) : 'sim'}</span> : <Etiqueta>Privado</Etiqueta>}</Td>
                <Td>
                  <Moderar membroId={p.member_id} oculto={p.moderation_status === 'hidden'} nota={p.moderation_note} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Bloco>
    </div>
  )
}
