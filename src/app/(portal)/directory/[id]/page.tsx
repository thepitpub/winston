import type { Metadata } from 'next'
import { Secao } from '@/components/editorial/Editorial'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Monograma } from '@/components/marca/Monograma'
import { Revela } from '@/components/movimento/Movimento'
import { Etiqueta, Painel } from '@/components/ui/ui'
import { perfil } from '@/lib/aplicacao/diretorio'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { formatarTelefone } from '@/lib/dominio/telefone'
import { AcoesConexao } from '../AcoesConexao'
import { PedirConexao } from './PedirConexao'

export const metadata: Metadata = { title: 'Perfil' }

export default async function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const { membro } = await exigirMembro()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const r = await perfil(membro.id, id)
  if (!r) notFound()
  const p = r.perfil
  const nome = p.display_name ?? 'Membro'
  return (
    <Secao atmosfera="registro" className="min-h-[calc(100dvh-var(--cabecalho-h))]">
      <div className="grid max-w-4xl gap-10">
      <Link href="/directory" className="rotulo sublinha-traco justify-self-start text-apagado hover:text-destaque">
        ← The Directory
      </Link>
      <Revela className="grid gap-6">
        <header data-revela className="flex flex-wrap items-center gap-6">
          <Monograma nome={nome} tamanho={88} destaque />
          <div className="grid gap-2">
            <h1 className="font-display text-display-xl">{nome}</h1>
            <p className="rotulo text-apagado">{[p.profession, p.company].filter(Boolean).join(' · ')}</p>
            {p.city ? <p className="rotulo text-discreto">{p.city}</p> : null}
          </div>
        </header>
        {p.description ? (
          <p data-revela className="max-w-[40ch] font-display text-display-sm text-tinta-2 italic">
            {p.description}
          </p>
        ) : null}
        <div data-revela className="grid gap-5 sm:grid-cols-2">
          {p.interests.length ? (
            <Painel titulo="Interesses">
              <div className="flex flex-wrap gap-2">
                {p.interests.map((i) => (
                  <Link key={i} href={`/directory?interesse=${encodeURIComponent(i)}`}>
                    <Etiqueta>{i}</Etiqueta>
                  </Link>
                ))}
              </div>
            </Painel>
          ) : null}
          {p.skills.length ? (
            <Painel titulo="Habilidades">
              <p className="text-sm text-tinta-2">{p.skills.join(' · ')}</p>
            </Painel>
          ) : null}
        </div>
        <div data-revela>
          <Painel titulo="Conexão">
            {r.estado === 'conectados' ? (
              <div className="grid gap-4">
                <p className="text-tinta-2">Vocês estão conectados.</p>
                {r.contatos && Object.values(r.contatos).some(Boolean) ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                    {r.contatos.whatsapp ? (
                      <>
                        <dt className="text-apagado">WhatsApp</dt>
                        <dd>
                          <a className="text-destaque hover:underline" href={`https://wa.me/${r.contatos.whatsapp.replace('+', '')}`} target="_blank" rel="noopener noreferrer">
                            {formatarTelefone(r.contatos.whatsapp)}
                          </a>
                        </dd>
                      </>
                    ) : null}
                    {r.contatos.email ? (
                      <>
                        <dt className="text-apagado">E-mail</dt>
                        <dd>
                          <a className="text-destaque hover:underline" href={`mailto:${r.contatos.email}`}>
                            {r.contatos.email}
                          </a>
                        </dd>
                      </>
                    ) : null}
                    {r.contatos.instagram ? (
                      <>
                        <dt className="text-apagado">Instagram</dt>
                        <dd>{r.contatos.instagram}</dd>
                      </>
                    ) : null}
                    {r.contatos.linkedin ? (
                      <>
                        <dt className="text-apagado">LinkedIn</dt>
                        <dd className="break-all">{r.contatos.linkedin}</dd>
                      </>
                    ) : null}
                  </dl>
                ) : (
                  <p className="text-sm text-apagado">Este membro não autorizou formas de contato. Peça uma apresentação ao Winston.</p>
                )}
                <AcoesConexao conexaoId={r.conexaoId!} acoes={['bloquear']} />
              </div>
            ) : r.estado === 'enviada' ? (
              <div className="grid gap-3">
                <p className="text-tinta-2">Pedido enviado. Aguardando resposta.</p>
                <AcoesConexao conexaoId={r.conexaoId!} acoes={['cancelar']} />
              </div>
            ) : r.estado === 'recebida' ? (
              <div className="grid gap-3">
                <p className="text-tinta-2">{nome} quer se conectar com você.</p>
                <AcoesConexao conexaoId={r.conexaoId!} acoes={['aceitar', 'recusar', 'bloquear']} />
              </div>
            ) : (
              <PedirConexao alvo={id} />
            )}
          </Painel>
        </div>
      </Revela>
      </div>
    </Secao>
  )
}
