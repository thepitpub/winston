import type { Metadata } from 'next'
import { Porta } from '@/components/portal/Porta'
import { FormEntradaEquipe } from './FormEntradaEquipe'

export const metadata: Metadata = { title: 'Continental Command' }

export default async function LoginEquipe({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { e } = await searchParams
  return (
    <Porta sobretitulo="Continental Command" titulo="Acesso da equipe." texto="E-mail, senha e o código do autenticador. Toda sessão da equipe exige o segundo fator.">
      {e === 'sem_acesso' ? (
        <p role="alert" className="mb-5 text-sm text-danger">
          Esta conta não tem acesso ao Command.
        </p>
      ) : null}
      <FormEntradaEquipe />
    </Porta>
  )
}
