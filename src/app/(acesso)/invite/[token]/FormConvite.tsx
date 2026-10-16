'use client'

import { useActionState, useState } from 'react'
import { Aviso, Botao, Campo, Entrada } from '@/components/ui/ui'
import { aceitarConvite, pedirCodigoConvite, type EstadoConvite } from '../../acoes'

export function FormConvite({ token }: { token: string }) {
  const [telefone, setTelefone] = useState('')
  const [pedido, pedir, pedindo] = useActionState<EstadoConvite, FormData>(pedirCodigoConvite.bind(null, token), null)
  const [aceite, aceitar, aceitando] = useActionState<EstadoConvite, FormData>(aceitarConvite.bind(null, token), null)

  if (!pedido?.ok) {
    const erro = pedido && !pedido.ok ? (pedido.campos?.telefone ?? pedido.erro) : undefined
    return (
      <form action={pedir} className="grid gap-5" noValidate>
        <Campo rotulo="Telefone do convite" id="telefone" erro={erro}>
          <Entrada id="telefone" name="telefone" type="tel" inputMode="tel" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} required aria-invalid={erro ? true : undefined} aria-describedby="telefone-msg" />
        </Campo>
        <Botao type="submit" disabled={pedindo} bloco>
          {pedindo ? 'Solicitando…' : 'Receber código'}
        </Botao>
      </form>
    )
  }

  const erro = aceite && !aceite.ok ? (aceite.campos?.codigo ?? aceite.erro) : undefined
  return (
    <form action={aceitar} className="grid gap-5" noValidate>
      <input type="hidden" name="telefone" value={telefone} />
      <Aviso>{pedido.dados.manual ? 'A casa lhe entrega o código em instantes pelo WhatsApp oficial. Ele vale por 10 minutos.' : 'O código chegou por mensagem. Ele vale por 10 minutos.'}</Aviso>
      <Campo rotulo="Código de 6 dígitos" id="codigo" erro={erro}>
        <Entrada id="codigo" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus className="text-center font-display text-3xl tracking-[0.5em]" aria-invalid={erro ? true : undefined} aria-describedby="codigo-msg" />
      </Campo>
      <Botao type="submit" disabled={aceitando} bloco>
        {aceitando ? 'Abrindo…' : 'Aceitar o convite'}
      </Botao>
    </form>
  )
}
