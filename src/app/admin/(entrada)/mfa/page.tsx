import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { FormCodigo } from '@/components/acesso/FormCodigo'
import { Porta } from '@/components/portal/Porta'
import { identidade } from '@/lib/autorizacao/sessao'
import { clienteDoUsuario, clienteSecreto } from '@/lib/db/clientes'
import { verificarMfaEquipe } from '../acoes'
import { CadastroMfaEquipe } from './CadastroMfaEquipe'

export const metadata: Metadata = { title: 'Segundo fator' }

export default async function MfaEquipe() {
  const id = await identidade()
  if (!id) redirect('/admin/login')
  const pessoa = await clienteSecreto().from('staff_members').select('status').eq('user_id', id.userId).maybeSingle()
  if (pessoa.data?.status !== 'active') redirect('/admin/login?e=sem_acesso')
  if (id.aal === 'aal2') redirect('/admin')
  const sb = await clienteDoUsuario()
  const f = await sb.auth.mfa.listFactors()
  const tem = (f.data?.totp ?? []).some((x) => x.status === 'verified')
  return tem ? (
    <Porta sobretitulo="Continental Command" titulo="Segundo fator." texto="Digite o código atual do autenticador.">
      <FormCodigo acao={verificarMfaEquipe} botao="Entrar no Command" />
    </Porta>
  ) : (
    <Porta sobretitulo="Continental Command · primeiro acesso" titulo="Cadastre o autenticador." texto="A equipe só entra com segundo fator. Leia o código no Google Authenticator e confirme.">
      <CadastroMfaEquipe />
    </Porta>
  )
}
