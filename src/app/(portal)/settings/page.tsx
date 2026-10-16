import type { Metadata } from 'next'
import { Livro, Secao, TituloPagina } from '@/components/editorial/Editorial'
import { Etiqueta, Painel } from '@/components/ui/ui'
import { exigirMembro } from '@/lib/autorizacao/membro'
import { clienteDoUsuario, clienteSecreto } from '@/lib/db/clientes'
import { dataHora } from '@/lib/datas'
import { mascararTelefone } from '@/lib/dominio/telefone'
import { sairDaCasa } from '../../(acesso)/acoes'
import { EncerrarSessao, FormDiretorio, FormNome, FormTelefone } from './Formularios'

export const metadata: Metadata = { title: 'Configurações' }

export default async function Configuracoes() {
  const { membro, id } = await exigirMembro()
  const sb = await clienteDoUsuario()
  const [eu, sessoes, fatores, contatos] = await Promise.all([
    sb.from('members').select('phone_e164').eq('id', membro.id).single(),
    sb.from('member_sessions').select('id, user_agent, created_at, last_seen_at, revoked_at').is('revoked_at', null).order('last_seen_at', { ascending: false }).limit(10),
    sb.auth.mfa.listFactors(),
    // As colunas de contato não são legíveis pela API; o servidor lê as do próprio membro.
    clienteSecreto().from('directory_preferences').select('visible, display_name, profession, company, city, interests, skills, description, contact_whatsapp, contact_email, contact_instagram, contact_linkedin').eq('member_id', membro.id).maybeSingle(),
  ])
  const totp = (fatores.data?.totp ?? []).filter((f) => f.status === 'verified')

  return (
<Secao atmosfera="registro" className="min-h-[calc(100dvh-var(--cabecalho-h))]">
      <div className="grid max-w-4xl gap-14">
      <TituloPagina chamada="Configurações" numero="06" linha1="Sua conta," linha2="suas regras." tamanho="lg" curva="descida" />

      <Painel titulo="Identificação" id="identificacao">
        <FormNome atual={membro.display_name || membro.full_name} />
        <p className="text-[0.82rem] text-apagado">Nome completo no cadastro: {membro.full_name}. Para corrigi-lo, fale com a casa.</p>
      </Painel>

      <Painel titulo="Diretório privado" id="diretorio">
        <FormDiretorio atual={contatos.data ?? null} />
      </Painel>

      <Painel titulo="Acesso e segurança" id="seguranca">
        <Livro
          className="max-w-xl"
          itens={[
            { rotulo: 'Telefone de acesso', valor: mascararTelefone(eu.data?.phone_e164) || '—' },
            { rotulo: 'Autenticador', valor: totp.length ? <Etiqueta tom="ok">Ativo</Etiqueta> : <Etiqueta tom="atencao">Não cadastrado</Etiqueta> },
            { rotulo: 'Esta sessão', valor: id.aal === 'aal2' ? 'Confirmada com o autenticador' : 'Sem segundo fator' },
          ]}
        />
        <p className="text-[0.82rem] text-apagado">Perdeu o celular do autenticador? Toque o Service Bell (categoria Acesso): a casa confirma sua identidade e emite um novo convite.</p>
        <FormTelefone />
      </Painel>

      <Painel titulo="Sessões abertas">
        <ul className="grid">
          {(sessoes.data ?? []).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--fio)] py-3.5 first:pt-0">
              <span className="min-w-0">
                <span className="block truncate text-sm text-tinta">{resumoAparelho(s.user_agent)}</span>
                <span className="numerico text-xs text-apagado">
                  Desde {dataHora(s.created_at)} · visto {dataHora(s.last_seen_at)}
                </span>
              </span>
              {s.id === id.sessionId ? <Etiqueta tom="ouro">Esta</Etiqueta> : <EncerrarSessao id={s.id} />}
            </li>
          ))}
        </ul>
        <form action={sairDaCasa}>
          <button type="submit" className="rotulo text-danger hover:underline">
            Sair desta sessão
          </button>
        </form>
      </Painel>
      </div>
    </Secao>
  )
}

function resumoAparelho(ua: string | null): string {
  if (!ua) return 'Aparelho desconhecido'
  const so = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Outro'
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Navegador'
  return `${nav} · ${so}`
}
