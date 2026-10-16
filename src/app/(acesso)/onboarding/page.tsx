import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Porta } from '@/components/portal/Porta'
import { atalhoDevLigado } from '@/lib/ambiente'
import { exigirMembro, temFatorVerificado } from '@/lib/autorizacao/membro'
import { Autenticador } from './Autenticador'
import { FormPreferencias } from './FormPreferencias'

export const metadata: Metadata = { title: 'Primeiros passos' }

export default async function Onboarding() {
  const { membro, id } = await exigirMembro({ onboarding: true })
  const fator = await temFatorVerificado()
  const sintetico = membro.is_synthetic && atalhoDevLigado()
  if (membro.status === 'active' && (id.aal === 'aal2' || sintetico)) redirect('/lobby')
  if (fator && id.aal !== 'aal2') redirect('/login/mfa')

  if (!fator && !sintetico) {
    return (
      <Porta
        sobretitulo="Primeiros passos · 1 de 2"
        titulo="A sua segunda chave."
        texto="Cada entrada no Continental pede o código do telefone e o do seu autenticador. Instale o Google Authenticator (ou outro compatível com TOTP) e leia o código abaixo."
      >
        <Autenticador />
      </Porta>
    )
  }

  return (
    <Porta
      sobretitulo="Primeiros passos · 2 de 2"
      titulo="Como deseja ser visto."
      texto="O diretório privado só mostra quem escolhe aparecer. Você começa privado e pode mudar quando quiser, em Configurações. Telefone, e-mail e dados internos nunca aparecem sem a sua autorização."
    >
      <FormPreferencias nome={membro.display_name || membro.full_name} />
    </Porta>
  )
}
