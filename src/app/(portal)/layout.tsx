import { Abertura } from '@/components/movimento/Abertura'
import { BarraMovel, Cabecalho } from '@/components/portal/Cabecalho'
import { Comunicados } from '@/components/portal/Comunicados'
import { ServiceBell } from '@/components/portal/ServiceBell'
import { modoApresentacao } from '@/lib/ambiente'
import { exigirMembro } from '@/lib/autorizacao/membro'

/**
 * O interior da casa. Só entra membro ativo com MFA (ou o membro sintético
 * do atalho de desenvolvimento). Cada página relê o membro pela RLS.
 *
 * Sem trilho lateral: cada página é feita de seções de largura total que
 * declaram a sua atmosfera (Lobby, Registro, Veludo, Bronze).
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { membro } = await exigirMembro()
  const nome = membro.display_name || membro.full_name

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="rotulo sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-1/2 focus:z-50 focus:-translate-x-1/2 focus:rounded-full focus:bg-destaque focus:px-5 focus:py-3 focus:text-sobre-destaque">
        Pular para o conteúdo
      </a>
      <Abertura />
      <Cabecalho nome={nome} />
      <div className="pt-[calc(var(--cabecalho-h)+var(--safe-top))]">
        {membro.is_synthetic ? <p className="rotulo bg-bronze px-5 py-1.5 text-center !text-[0.62rem] text-marfim">{modoApresentacao() ? 'Modo apresentação · membro de demonstração · nada aqui é dado real' : 'Sessão de demonstração · membro sintético · ambiente de desenvolvimento'}</p> : null}
        <Comunicados />
      </div>
      <main id="conteudo" className="flex-1 pb-[calc(4.5rem+var(--safe-bottom))] sm:pb-0">
        {children}
      </main>
      <footer data-atmosfera="lobby" className="border-t border-[var(--fio)] pb-[calc(5rem+var(--safe-bottom))] sm:pb-0">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4 px-[clamp(1.125rem,4.2vw,4.5rem)] py-8">
          <p className="rotulo text-discreto">Continental Heritage · Private members</p>
          <p className="rotulo text-discreto">Uma casa privada. Discrição antes de tudo.</p>
        </div>
      </footer>
      <ServiceBell />
      <BarraMovel />
    </div>
  )
}
