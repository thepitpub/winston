import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Porta } from '@/components/portal/Porta'
import { membroDaSessao } from '@/lib/autorizacao/membro'
import { FormMfa } from './FormMfa'

export const metadata: Metadata = { title: 'Segundo fator' }

export default async function Mfa() {
  const s = await membroDaSessao()
  if (!s) redirect('/login')
  if (s.id.aal === 'aal2') redirect('/lobby')
  return (
    <Porta sobretitulo="Segundo fator" titulo="Confirme no autenticador." texto="Abra o Google Authenticator e digite o código de 6 dígitos do Continental.">
      <FormMfa />
    </Porta>
  )
}
