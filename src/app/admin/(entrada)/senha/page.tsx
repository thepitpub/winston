import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Porta } from '@/components/portal/Porta'
import { contextoDaEquipe, ErroDeAcesso } from '@/lib/autorizacao/equipe'
import { FormSenha } from './FormSenha'

export const metadata: Metadata = { title: 'Nova senha' }

export default async function TrocarSenha() {
  const c = await contextoDaEquipe()
  if (c instanceof ErroDeAcesso) redirect(c.motivo === 'sem_mfa' ? '/admin/mfa' : '/admin/login')
  if (!c.trocarSenha) redirect('/admin')
  return (
    <Porta sobretitulo="Continental Command · primeiro acesso" titulo="Troque a senha provisória." texto="A senha que veio do terminal vale só para este primeiro acesso. Escolha uma sua, com 12 caracteres ou mais.">
      <FormSenha />
    </Porta>
  )
}
