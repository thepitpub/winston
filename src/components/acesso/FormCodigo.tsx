'use client'

import { useActionState } from 'react'
import { Botao, Campo, Entrada } from '@/components/ui/ui'
import type { Resultado } from '@/lib/acao'

/** Formulário de um campo: código de 6 dígitos (autenticador ou SMS). */
export function FormCodigo({
  acao,
  rotulo = 'Código do autenticador',
  botao = 'Confirmar',
  extras,
}: {
  acao: (s: Resultado | null, fd: FormData) => Promise<Resultado | null>
  rotulo?: string
  botao?: string
  extras?: Record<string, string>
}) {
  const [estado, enviar, pendente] = useActionState(acao, null)
  const erro = estado && !estado.ok ? (estado.campos?.codigo ?? estado.erro) : undefined
  return (
    <form action={enviar} className="grid gap-5" noValidate>
      {Object.entries(extras ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Campo rotulo={rotulo} id="codigo" erro={erro}>
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
          aria-invalid={erro ? true : undefined}
          aria-describedby="codigo-msg"
        />
      </Campo>
      <Botao type="submit" disabled={pendente} bloco>
        {pendente ? 'Conferindo…' : botao}
      </Botao>
    </form>
  )
}
