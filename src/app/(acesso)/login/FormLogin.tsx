'use client'

import { useActionState } from 'react'
import { Aviso, Botao, Campo, Entrada } from '@/components/ui/ui'
import { conferirCodigoLogin, pedirCodigoLogin, type EstadoLogin } from '../acoes'

export function FormLogin() {
  const [pedido, pedir, pedindo] = useActionState<EstadoLogin, FormData>(pedirCodigoLogin, null)
  const [conferido, conferir, conferindo] = useActionState<EstadoLogin, FormData>(conferirCodigoLogin, null)
  const etapa = pedido?.ok ? pedido.dados : null

  if (!etapa) {
    return (
      <form action={pedir} className="grid gap-5" noValidate>
        <Campo rotulo="Telefone" id="telefone" erro={pedido && !pedido.ok ? (pedido.campos?.telefone ?? pedido.erro) : undefined}>
          <Entrada id="telefone" name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(61) 99999-9999" required aria-invalid={pedido && !pedido.ok ? true : undefined} aria-describedby="telefone-msg" />
        </Campo>
        <Botao type="submit" disabled={pedindo} bloco>
          {pedindo ? 'Solicitando…' : 'Receber código'}
        </Botao>
        <p className="text-sm text-apagado">Primeiro acesso? Use o link de convite que a casa lhe enviou.</p>
      </form>
    )
  }

  return (
    <form action={conferir} className="grid gap-5" noValidate>
      <input type="hidden" name="telefone" value={etapa.telefone} />
      <Aviso>
        {etapa.manual
          ? 'Se o número for de um membro ativo, a casa lhe entrega o código em instantes pelo WhatsApp oficial.'
          : 'Se o número for de um membro ativo, o código chega em instantes.'}{' '}
        Ele vale por 10 minutos.
      </Aviso>
      <Campo rotulo="Código de 6 dígitos" id="codigo" erro={conferido && !conferido.ok ? (conferido.campos?.codigo ?? conferido.erro) : undefined}>
        <Entrada
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className="text-center font-display text-3xl tracking-[0.5em]"
          aria-invalid={conferido && !conferido.ok ? true : undefined}
          aria-describedby="codigo-msg"
        />
      </Campo>
      <Botao type="submit" disabled={conferindo} bloco>
        {conferindo ? 'Conferindo…' : 'Entrar'}
      </Botao>
    </form>
  )
}
