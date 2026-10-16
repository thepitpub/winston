'use client'

import { Aviso, Botao, Campo, Entrada } from '@/components/ui/ui'
import { useAcao } from '@/components/ui/useAcao'
import { entrarEquipe } from '../acoes'

export function FormEntradaEquipe() {
  const [estado, enviar, pendente] = useAcao(entrarEquipe)
  const c = estado && !estado.ok ? (estado.campos ?? {}) : {}
  return (
    <form onSubmit={enviar} className="grid gap-5" noValidate>
      <Campo rotulo="E-mail" id="email" erro={c.email}>
        <Entrada id="email" name="email" type="email" autoComplete="username" required aria-describedby="email-msg" />
      </Campo>
      <Campo rotulo="Senha" id="senha" erro={c.senha}>
        <Entrada id="senha" name="senha" type="password" autoComplete="current-password" required aria-describedby="senha-msg" />
      </Campo>
      {estado && !estado.ok && !Object.keys(c).length ? <Aviso tom="perigo">{estado.erro}</Aviso> : null}
      <Botao type="submit" disabled={pendente} bloco>
        {pendente ? 'Conferindo…' : 'Continuar'}
      </Botao>
    </form>
  )
}
