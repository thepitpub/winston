import type { Metadata } from 'next'
import { ItemNumerado, ListaNumerada, Secao, TituloPagina } from '@/components/editorial/Editorial'
import { Etiqueta, Vazio } from '@/components/ui/ui'
import { solicitacoesDoMembro } from '@/lib/aplicacao/portal'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { dataHora } from '@/lib/datas'
import { CATEGORIA_ROTULO, STATUS_ROTULO, TOM_STATUS, type Categoria, type StatusSolicitacao } from '@/lib/dominio/concierge'

export const metadata: Metadata = { title: 'Solicitações' }

export default async function Solicitacoes() {
  const { membro } = await exigirMembro()
  const lista = await solicitacoesDoMembro(membro.id)
  return (
    <Secao atmosfera="registro" className="min-h-[calc(100dvh-var(--cabecalho-h))]">
      <div className="grid gap-14">
        <TituloPagina chamada="Solicitações" numero="05" linha1="O que você" linha2="pediu à casa." tamanho="lg" curva="subida" />
        {lista.length === 0 ? (
          <Vazio titulo="Nenhuma solicitação." texto="Toque o Service Bell, no cabeçalho, ou peça ao Winston." />
        ) : (
          <ListaNumerada rotulo="Solicitações">
            {lista.map((s, i) => (
              <ItemNumerado
                key={s.id}
                numero={String(lista.length - i).padStart(2, '0')}
                href={`/requests/${s.id}`}
                titulo={s.subject}
                texto={`${CATEGORIA_ROTULO[s.category as Categoria]} · atualizada em ${dataHora(s.updated_at)}`}
                meta={<Etiqueta tom={TOM_STATUS[s.status as StatusSolicitacao]}>{STATUS_ROTULO[s.status as StatusSolicitacao]}</Etiqueta>}
              />
            ))}
          </ListaNumerada>
        )}
      </div>
    </Secao>
  )
}
