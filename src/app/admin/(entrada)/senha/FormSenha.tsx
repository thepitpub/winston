'use client'

import { Aviso, Botao, Campo, Entrada } from '@/components/ui/ui'
import { useAcao } from '@/components/ui/useAcao'
import { trocarSenhaEquipe } from '../acoes'

export function FormSenha() {
  const [estado, enviar, pendente] = useAcao(trocarSenhaEquipe)
  const c = estado && !estado.ok ? (estado.campos ?? {}) : {}
  return (
    <form onSubmit={enviar} className="grid gap-5" noValidate>
      <Campo rotulo="Nova senha" id="senha" erro={c.senha}>
        <Entrada id="senha" name="senha" type="password" autoComplete="new-password" minLength={12} required aria-describedby="senha-msg" />
      </Campo>
      <Campo rotulo="Repita a nova senha" id="confirmacao" erro={c.confirmacao}>
        <Entrada id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required aria-describedby="confirmacao-msg" />
      </Campo>
      {estado && !estado.ok && !Object.keys(c).length ? <Aviso tom="perigo">{estado.erro}</Aviso> : null}
      <Botao type="submit" disabled={pendente} bloco>
        {pendente ? 'Salvando…' : 'Salvar e entrar'}
      </Botao>
    </form>
  )
}
