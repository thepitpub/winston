import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Bloco, Cabecalho, SemPermissao, Tabela, Td, Th } from '@/components/command/kit'
import { Monograma } from '@/components/marca/Monograma'
import { Etiqueta } from '@/components/ui/ui'
import { fichaDoMembro, inteligencia } from '@/lib/aplicacao/equipe/membros'
import { exigirEquipe, pode } from '@/lib/autorizacao/equipe'
import { dataHora, dataHoraCompleta, romano } from '@/lib/datas'
import { STATUS_ROTULO_EQUIPE, type StatusSolicitacao } from '@/lib/dominio/concierge'
import { CATEGORIA_MEMBRO, STATUS_MEMBRO } from '@/lib/dominio/rotulos'
import { formatarTelefone } from '@/lib/dominio/telefone'
import { AcoesAcesso, AcoesCredencial, FormAjuste, FormCadastro, FormNota, FormStatus } from './Formularios'

export const metadata: Metadata = { title: 'Membro' }

const ABAS = [
  ['ficha', 'Ficha'],
  ['acesso', 'Credencial e acesso'],
  ['coins', 'Gold Coins'],
  ['historico', 'Histórico'],
  ['inteligencia', 'Member Intelligence'],
] as const

const ROTULOS_PERFIL: Record<string, string> = {
  birth_date: 'Nascimento', birthday_text: 'Aniversário', marital_status: 'Estado civil', hometown: 'Naturalidade', base_city: 'Cidade-base',
  other_cities: 'Outras praças', international_cities: 'Praças internacionais', cities_context: 'Contexto das praças', sports_team: 'Time',
  spirituality: 'Espiritualidade', open_to_debate: 'Debate time/religião', business: 'Atuação / empresas', sectors: 'Setores', curiosity: 'Maior curiosidade',
  best_times: 'Melhores horários', best_days: 'Melhores dias', event_frequency: 'Frequência de eventos', interests: 'Temas de interesse', formats: 'Formatos',
  format_notes: 'Obs. de formato', experiences: 'Experiências', drinks: 'Bebidas', drink_notes: 'Obs. de bebidas', dietary_restrictions: 'Restrições',
  food_preferences: 'Gastronomia', family_events_interest: 'Eventos c/ família (1-5)', family_frequency: 'Frequência família', public_exposure: 'Exposição pública (1-5)',
  contribution_profile: 'Perfil de contribuição', concierge_channels: 'Canal do concierge', proactivity: 'Proatividade (1-5)', how_to_contribute: 'Como contribui',
  brand_referrals: 'Marcas indicadas', declared_at: 'Respondido em',
}

function valor(v: unknown): string {
  if (v === null || v === undefined || v === '') return ''
  if (Array.isArray(v)) return v.join(' · ')
  if (typeof v === 'object') return ''
  return String(v)
}

export default async function FichaMembro({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const eq = await exigirEquipe()
  if (!pode(eq, 'members.read')) return <SemPermissao />
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const sp = await searchParams
  const aba = (typeof sp.aba === 'string' ? sp.aba : 'ficha') as (typeof ABAS)[number][0]
  const f = await fichaDoMembro(id)
  if (!f) notFound()
  const m = f.membro
  const [rot, tom] = STATUS_MEMBRO[m.status] ?? ['—', 'neutro']
  const familia = (f.perfil?.family ?? {}) as Record<string, unknown>
  const podeCs = pode(eq, 'cs.read')
  const cs = aba === 'inteligencia' && podeCs ? await inteligencia(eq, id) : null

  return (
    <div className="grid gap-10">
      <Link href="/admin/members" className="text-xs text-apagado hover:text-destaque">
        ← Members
      </Link>
      <Cabecalho
        codigo={`MB · ${m.founder_number ? `FUNDADOR ${romano(m.founder_number)}` : 'MEMBRO'}`}
        titulo={m.full_name}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <Etiqueta tom={tom}>{rot}</Etiqueta>
            <Etiqueta>{CATEGORIA_MEMBRO[m.category]}</Etiqueta>
            {m.is_synthetic ? <Etiqueta tom="atencao">Sintético</Etiqueta> : null}
            <span className="numerico font-mono text-xs text-apagado">{formatarTelefone(m.phone_e164)}</span>
          </span>
        }
        acoes={<Monograma nome={m.full_name} tamanho={48} destaque />}
      />
      <nav aria-label="Seções da ficha" className="flex gap-1 overflow-x-auto border-b border-[var(--fio)]">
        {ABAS.filter(([k]) => (k !== 'inteligencia' || podeCs) && (k !== 'coins' || pode(eq, 'coins.read'))).map(([k, n]) => (
          <Link key={k} href={`?aba=${k}`} aria-current={aba === k ? 'page' : undefined} className="border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-apagado hover:text-tinta aria-[current=page]:border-destaque aria-[current=page]:text-tinta">
            {n}
          </Link>
        ))}
      </nav>

      {aba === 'ficha' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Bloco titulo="Dados declarados (planilha de fundadores)">
            {f.perfil ? (
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
                {Object.entries(ROTULOS_PERFIL).map(([k, r]) => {
                  const v = k === 'declared_at' && f.perfil?.declared_at ? dataHora(f.perfil.declared_at) : valor((f.perfil as Record<string, unknown>)[k])
                  return v ? (
                    <div key={k} className="contents">
                      <dt className="text-apagado">{r}</dt>
                      <dd className="text-tinta-2">{v}</dd>
                    </div>
                  ) : null
                })}
                {Object.keys(familia).length ? (
                  <div className="contents">
                    <dt className="text-apagado">Família</dt>
                    <dd className="text-tinta-2">
                      {[
                        familia.conjuge && `Cônjuge: ${familia.conjuge}`,
                        familia.aniversario_conjuge && `aniversário ${familia.aniversario_conjuge}`,
                        familia.data_casamento && `casamento ${familia.data_casamento}`,
                        Array.isArray(familia.filhos) && `Filhos: ${(familia.filhos as { nome?: string; nascimento?: string }[]).map((x) => `${x.nome ?? '?'}${x.nascimento ? ` (${x.nascimento})` : ''}`).join(', ')}`,
                        familia.obs_filhos,
                        familia.notas,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-apagado">Sem dados declarados.</p>
            )}
            <p className="text-xs text-discreto">
              Origem: {m.source_file ?? '—'}
              {m.source_row ? `, linha ${m.source_row}` : ''}
              {m.imported_at ? ` · importado em ${dataHoraCompleta(m.imported_at)}` : ''}
            </p>
          </Bloco>
          <div className="grid content-start gap-4">
            {pode(eq, 'members.write') ? (
              <>
                <Bloco titulo="Cadastro">
                  <FormCadastro id={id} atual={{ display_name: m.display_name ?? '', category: m.category, joined_at: m.joined_at ?? '', telefone: m.phone_e164 ?? '' }} />
                </Bloco>
                <Bloco titulo="Status da conta">
                  <FormStatus id={id} atual={m.status} />
                </Bloco>
              </>
            ) : null}
            <Bloco titulo="Diretório">
              {f.diretorio ? (
                <p className="text-sm text-tinta-2">
                  {f.diretorio.visible ? `Visível desde ${f.diretorio.consented_at ? dataHora(f.diretorio.consented_at) : '—'}` : 'Privado'}
                  {f.diretorio.moderation_status === 'hidden' ? ' · ocultado pela moderação' : ''}
                </p>
              ) : (
                <p className="text-sm text-apagado">Sem preferências (ainda não ativou).</p>
              )}
            </Bloco>
          </div>
        </div>
      ) : null}

      {aba === 'acesso' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Bloco titulo="Credenciais">
            <Tabela legenda="Credenciais">
              <thead>
                <tr>
                  <Th>Código</Th>
                  <Th>Status</Th>
                  <Th>Emitida</Th>
                </tr>
              </thead>
              <tbody>
                {f.credenciais.map((c) => (
                  <tr key={c.id}>
                    <Td mono>{c.public_code}</Td>
                    <Td>{c.status}</Td>
                    <Td mono>{dataHora(c.issued_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
            {pode(eq, 'members.write') ? <AcoesCredencial id={id} temAtiva={f.credenciais.some((c) => c.status === 'active')} temSuspensa={f.credenciais.some((c) => c.status === 'suspended')} /> : null}
          </Bloco>
          <Bloco titulo="Convites, autenticador e sessões">
            <p className="text-sm text-tinta-2">
              Conta Auth: {m.user_id ? 'criada' : 'ainda não'} · Autenticador: {f.fatores ? 'cadastrado' : 'não cadastrado'}
            </p>
            <ul className="grid gap-1 text-xs">
              {f.convites.map((c) => (
                <li key={c.id} className="numerico flex justify-between gap-3 font-mono text-apagado">
                  <span>{dataHora(c.created_at)}</span>
                  <span>{c.accepted_at ? `aceito ${dataHora(c.accepted_at)}` : c.revoked_at ? 'revogado' : new Date(c.expires_at) < new Date() ? 'expirado' : `válido até ${dataHora(c.expires_at)}`}</span>
                </li>
              ))}
            </ul>
            <AcoesAcesso id={id} status={m.status} convitesVivos={f.convites.filter((c) => !c.accepted_at && !c.revoked_at && new Date(c.expires_at) > new Date()).map((c) => c.id)} podeConvidar={pode(eq, 'invitations.manage')} podeSessoes={pode(eq, 'sessions.revoke')} />
            <ul className="grid gap-1 text-xs">
              {f.sessoes.map((s) => (
                <li key={s.id} className="numerico flex justify-between gap-3 font-mono text-apagado">
                  <span>{dataHora(s.created_at)}</span>
                  <span>{s.revoked_at ? `revogada (${s.revoke_reason ?? '—'})` : `ativa · visto ${dataHora(s.last_seen_at)}`}</span>
                </li>
              ))}
            </ul>
          </Bloco>
        </div>
      ) : null}

      {aba === 'coins' && !pode(eq, 'coins.read') ? <SemPermissao /> : null}
      {aba === 'coins' && pode(eq, 'coins.read') ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Bloco titulo="Ledger" acao={<span className="numerico font-mono text-xl text-destaque">{f.saldo.toLocaleString('pt-BR')}</span>}>
            <Tabela legenda="Transações">
              <thead>
                <tr>
                  <Th>Quando</Th>
                  <Th>Tipo</Th>
                  <Th>Motivo</Th>
                  <Th alinhar="direita">Valor</Th>
                </tr>
              </thead>
              <tbody>
                {f.transacoes.map((t) => (
                  <tr key={t.id}>
                    <Td mono>{dataHora(t.created_at)}</Td>
                    <Td>{t.kind}</Td>
                    <Td>{t.reason}</Td>
                    <Td mono className={`text-right ${t.amount > 0 ? 'text-ok' : 'text-danger'}`}>
                      {t.amount > 0 ? '+' : ''}
                      {t.amount}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          </Bloco>
          {pode(eq, 'coins.adjust') ? (
            <Bloco titulo="Ajuste auditado">
              <FormAjuste id={id} />
            </Bloco>
          ) : null}
        </div>
      ) : null}

      {aba === 'historico' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Bloco titulo="Check-ins">
            {f.checkins.length ? (
              <ul className="grid gap-1 text-sm">
                {f.checkins.map((c) => {
                  const ev = Array.isArray(c.event) ? c.event[0] : c.event
                  return (
                    <li key={c.id} className="flex justify-between gap-3">
                      <span>{ev?.name}</span>
                      <span className="numerico font-mono text-xs text-apagado">{dataHora(c.validated_at)}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-apagado">Nenhum check-in.</p>
            )}
          </Bloco>
          <Bloco titulo="Solicitações">
            {!pode(eq, 'concierge.read') ? (
              <p className="text-sm text-apagado">Sem permissão para ver as solicitações.</p>
            ) : f.pedidos.length ? (
              <ul className="grid gap-1 text-sm">
                {f.pedidos.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <Link href={`/admin/concierge?s=${p.id}`} className="hover:text-destaque">
                      {p.subject}
                    </Link>
                    <span className="text-xs text-apagado">{STATUS_ROTULO_EQUIPE[p.status as StatusSolicitacao]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-apagado">Nenhuma solicitação.</p>
            )}
          </Bloco>
        </div>
      ) : null}

      {aba === 'inteligencia' ? (
        !podeCs ? (
          <SemPermissao />
        ) : !cs ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Bloco>
              <p className="text-sm text-apagado">Não há inteligência privada importada para este membro.</p>
            </Bloco>
            {pode(eq, 'cs.write') ? (
              <Bloco titulo="Observações internas">
                <FormNota id={id} atual="" />
              </Bloco>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="rounded-xs bg-burgundy/40 px-4 py-2 text-xs text-tinta-2">
              Seção privada. Leitura registrada na auditoria em {dataHoraCompleta(new Date().toISOString())}. Nunca é exibida ao membro nem usada pelo Winston.
            </p>
            <div className="grid gap-4 xl:grid-cols-2">
              <Bloco titulo="Enriquecimento público (CS)" acao={cs.confidence ? <Etiqueta tom="ouro">Confiança registrada</Etiqueta> : undefined}>
                <dl className="grid gap-3 text-sm">
                  {Object.entries((cs.cs_columns ?? {}) as Record<string, string>)
                    .filter(([k, v]) => v && k !== 'ID')
                    .map(([k, v]) => (
                      <div key={k} className="grid gap-0.5">
                        <dt className="text-[0.66rem] tracking-[0.14em] text-apagado uppercase">{k}</dt>
                        <dd className="leading-relaxed whitespace-pre-line text-tinta-2">{v}</dd>
                      </div>
                    ))}
                </dl>
                <Fonte f={cs.cs_source as Record<string, unknown> | null} />
              </Bloco>
              <div className="grid content-start gap-4">
                <Bloco titulo="Análise comportamental">
                  <p className="rounded-xs bg-fundo-2 px-3 py-2 text-xs text-attention">Inferências registradas na planilha de origem. Não são fatos declarados pelo membro e não devem ser tratadas como tal.</p>
                  <dl className="grid gap-3 text-sm">
                    {Object.entries((cs.behavioral ?? {}) as Record<string, string>).map(([k, v]) => (
                      <div key={k} className="grid gap-0.5">
                        <dt className="text-[0.66rem] tracking-[0.14em] text-apagado uppercase">{k}</dt>
                        <dd className="leading-relaxed text-tinta-2">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {cs.relationship_history ? (
                    <div className="grid gap-0.5 text-sm">
                      <p className="text-[0.66rem] tracking-[0.14em] text-apagado uppercase">Histórico / Bio (original)</p>
                      <p className="leading-relaxed text-tinta-2">{cs.relationship_history}</p>
                    </div>
                  ) : null}
                  <Fonte f={cs.behavioral_source as Record<string, unknown> | null} />
                </Bloco>
                <Bloco titulo="Observações internas">{pode(eq, 'cs.write') ? <FormNota id={id} atual={cs.internal_notes ?? ''} /> : <p className="text-sm whitespace-pre-line text-tinta-2">{cs.internal_notes || '—'}</p>}</Bloco>
              </div>
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}

function Fonte({ f }: { f: Record<string, unknown> | null }) {
  if (!f) return null
  return (
    <p className="numerico font-mono text-[0.68rem] text-discreto">
      Fonte: {String(f.file ?? '—')}
      {f.row ? `, linha ${String(f.row)}` : ''}
      {f.imported_at ? ` · ${dataHoraCompleta(String(f.imported_at))}` : ''}
      {f.sha256 ? ` · sha256 ${String(f.sha256).slice(0, 12)}…` : ''}
    </p>
  )
}
