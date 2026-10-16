import type { Metadata } from 'next'
import { Monograma } from '@/components/marca/Monograma'
import { Relogio } from '@/components/marca/Relogio'
import { Paleta } from '@/components/command/Paleta'
import { Trilho, TrilhoMovel } from '@/components/command/Trilho'
import { exigirEquipe } from '@/lib/autorizacao/equipe'
import { PAPEL_ROTULO } from '@/lib/autorizacao/permissoes'
import { sairEquipe } from '../(entrada)/acoes'

export const metadata: Metadata = { title: { default: 'Continental Command', template: '%s · Command' } }

/** A sala de operação. Equipe ativa com AAL2, conferida no banco a cada requisição. */
export default async function CommandLayout({ children }: { children: React.ReactNode }) {
  const eq = await exigirEquipe()
  const permissoes = [...eq.permissoes]
  return (
    <div className="flex min-h-dvh bg-fundo text-[0.86rem]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-destaque focus:px-3 focus:py-2 focus:text-sobre-destaque">
        Pular para o conteúdo
      </a>
      <Trilho permissoes={permissoes} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--fio)] bg-fundo/90 px-3 backdrop-blur-xl md:px-8">
          <Paleta permissoes={permissoes} />
          <div className="ml-auto flex items-center gap-3">
            <Relogio className="hidden text-apagado lg:inline-flex" />
            {eq.sintetico ? <span className="rotulo hidden rounded-full bg-bronze px-3 py-1 !text-[0.6rem] text-marfim sm:inline">Demonstração</span> : null}
            <span className="hidden text-right leading-tight sm:block">
              <span className="block font-display text-[1.05rem] text-tinta">{eq.nome}</span>
              <span className="rotulo block !text-[0.58rem] text-discreto">{eq.papeis.map((p) => PAPEL_ROTULO[p]).join(' · ')}</span>
            </span>
            <Monograma nome={eq.nome} tamanho={30} />
            <form action={sairEquipe}>
              <button type="submit" className="rotulo text-apagado hover:text-tinta">
                Sair
              </button>
            </form>
          </div>
        </header>
        <TrilhoMovel permissoes={permissoes} />
        <main id="conteudo" className="textura flex-1 px-4 pt-8 pb-16 md:px-8 lg:px-12 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  )
}
