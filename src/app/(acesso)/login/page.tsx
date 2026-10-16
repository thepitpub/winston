import type { Metadata } from 'next'
import { Porta } from '@/components/portal/Porta'
import { FormLogin } from './FormLogin'

export const metadata: Metadata = { title: 'Entrada' }

const ERROS: Record<string, string> = {
  acesso_suspenso: 'Seu acesso está suspenso. Fale com a casa.',
}

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { e } = await searchParams
  return (
    <Porta sobretitulo="Continental Heritage" titulo="A recepção." texto="Informe o telefone cadastrado. Enviamos um código de uso único; depois, o seu autenticador confirma que é você.">
      {typeof e === 'string' && ERROS[e] ? (
        <p role="alert" className="mb-5 text-sm text-danger">
          {ERROS[e]}
        </p>
      ) : null}
      <FormLogin />
    </Porta>
  )
}
