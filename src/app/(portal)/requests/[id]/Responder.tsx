'use client'

import { useAcao } from '@/components/ui/useAcao'
import { useEffect, useRef } from 'react'
import { AreaTexto, Aviso, Botao, Campo } from '@/components/ui/ui'
import { responderSolicitacao } from '../../acoes'

export function Responder({ id }: { id: string }) {
  const [estado, enviar, pendente] = useAcao(responderSolicitacao.bind(null, id))
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (estado?.ok) form.current?.reset()
  }, [estado])
  return (
    <form ref={form} onSubmit={enviar} className="grid gap-3">
      <Campo rotulo="Responder" id="mensagem" erro={estado && !estado.ok ? (estado.campos?.mensagem ?? estado.erro) : undefined}>
        <AreaTexto id="mensagem" name="mensagem" maxLength={4000} required />
      </Campo>
      {estado?.ok ? <Aviso tom="ok">Enviado.</Aviso> : null}
      <Botao type="submit" disabled={pendente} className="justify-self-start">
        {pendente ? 'Enviando…' : 'Enviar'}
      </Botao>
    </form>
  )
}
