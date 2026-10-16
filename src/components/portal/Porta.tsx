import type { ReactNode } from 'react'
import { Fio } from '@/components/marca/Fio'
import { Guilhoche } from '@/components/marca/Guilhoche'
import { Marca } from '@/components/marca/Marca'
import { Relogio } from '@/components/marca/Relogio'
import { Revela, TituloMascara } from '@/components/movimento/Movimento'

/**
 * A porta da casa (entrada, convite, segundo fator). Como a capa do Wine
 * Garden, o letreiro enorme ocupa a metade escura; a outra metade é o
 * balcão, em papel de registro, com o título em máscara e o formulário.
 */
export function Porta({ sobretitulo, titulo, texto, children }: { sobretitulo: string; titulo: string; texto?: ReactNode; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section data-atmosfera="veludo" aria-label="Continental Heritage" className="textura relative flex flex-col justify-between gap-12 overflow-hidden px-[clamp(1.25rem,5vw,4.5rem)] pt-[calc(var(--safe-top)+2rem)] pb-10 lg:min-h-dvh lg:pb-14">
        <Guilhoche className="pointer-events-none absolute -right-48 -bottom-48 size-[42rem] opacity-70" opacidade={0.2} />
        <div className="relative flex items-center justify-between">
          <p className="rotulo text-apagado">Porta de entrada</p>
          <Relogio className="text-apagado" />
        </div>
        <Marca variante="pilha" className="relative text-[clamp(2.6rem,10.5vw,4.5rem)] lg:text-[clamp(3rem,5vw,6.5rem)]" />
        <div className="relative hidden gap-6 lg:grid">
          <Fio curva="subida" />
          <p className="max-w-[42ch] text-[0.82rem] leading-relaxed text-apagado">Uma casa privada. A entrada é por convite, confirmada no seu telefone e no seu autenticador. Nada aqui é público.</p>
        </div>
      </section>
      <section data-atmosfera="registro" className="textura grid place-items-center px-[clamp(1.25rem,5vw,4.5rem)] py-14 lg:py-20">
        <Revela className="grid w-full max-w-[27rem] gap-8">
          <p data-revela className="rotulo flex items-center gap-4 text-apagado">
            <span className="text-destaque">◆</span>
            {sobretitulo}
          </p>
          <TituloMascara texto={titulo} className="font-display text-display-lg text-tinta" />
          {texto ? (
            <div data-revela className="text-[0.88rem] leading-relaxed text-tinta-2">
              {texto}
            </div>
          ) : null}
          <div data-revela>{children}</div>
        </Revela>
      </section>
    </main>
  )
}
