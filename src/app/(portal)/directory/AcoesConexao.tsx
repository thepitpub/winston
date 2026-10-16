'use client'

import { useState, useTransition } from 'react'
import { Botao } from '@/components/ui/ui'
import { agirConexao } from './acoes'

const ROTULO = { aceitar: 'Aceitar', recusar: 'Recusar', bloquear: 'Bloquear', cancelar: 'Cancelar pedido' } as const

export function AcoesConexao({ conexaoId, acoes }: { conexaoId: string; acoes: (keyof typeof ROTULO)[] }) {
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {acoes.map((a) => (
        <Botao
          key={a}
          variante={a === 'aceitar' ? 'ouro' : a === 'bloquear' ? 'perigo' : 'linha'}
          disabled={pendente}
          onClick={() => {
            if (a === 'bloquear' && !window.confirm('Bloquear este membro? Vocês deixam de se ver no diretório.')) return
            iniciar(async () => {
              const r = await agirConexao(conexaoId, a)
              setErro(r.ok ? null : r.erro)
            })
          }}
        >
          {ROTULO[a]}
        </Botao>
      ))}
      {erro ? (
        <p role="alert" className="w-full text-sm text-danger">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
