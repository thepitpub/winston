import type { Metadata } from 'next'
import { Porta } from '@/components/portal/Porta'
import { BotaoLink } from '@/components/ui/ui'
import { lerConvite } from '@/lib/aplicacao/acesso'
import { mascararTelefone } from '@/lib/dominio/telefone'
import { FormConvite } from './FormConvite'

export const metadata: Metadata = { title: 'Convite' }

const MOTIVO = {
  expirado: 'Este convite expirou.',
  aceito: 'Este convite já foi aceito.',
  revogado: 'Este convite foi revogado.',
} as const

export default async function Convite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const c = await lerConvite(token)

  if (!c || c.estado !== 'valido') {
    return (
      <Porta sobretitulo="Convite" titulo="Esta porta está fechada." texto={c ? `${MOTIVO[c.estado as keyof typeof MOTIVO]} Peça um novo convite à casa.` : 'Este link não corresponde a nenhum convite.'}>
        <BotaoLink href="/login" variante="linha">
          Ir para a entrada
        </BotaoLink>
      </Porta>
    )
  }

  const nome = c.membro?.display_name || c.membro?.full_name?.split(' ')[0] || 'membro'
  return (
    <Porta
      sobretitulo="Convite pessoal"
      titulo={`Bem-vindo, ${nome}.`}
      texto={
        <>
          A casa reservou o seu lugar. Para aceitar, confirme o telefone deste convite (<span className="numerico text-tinta">{mascararTelefone(c.membro?.phone_e164)}</span>) e o código de uso único que enviaremos.
        </>
      }
    >
      <FormConvite token={token} />
    </Porta>
  )
}
