'use client'

import { useState, useTransition } from 'react'
import { moderar } from './acoes'

export function Moderar({ membroId, oculto, nota }: { membroId: string; oculto: boolean; nota: string | null }) {
  const [p, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  return (
    <span className="flex flex-wrap items-center gap-2">
      {oculto ? <span className="text-xs text-attention" title={nota ?? ''}>Oculto{nota ? `: ${nota}` : ''}</span> : <span className="text-xs text-ok">Publicado</span>}
      <button
        type="button"
        disabled={p}
        className="text-xs text-apagado underline-offset-4 hover:text-tinta hover:underline"
        onClick={() => {
          const n = oculto ? '' : window.prompt('Motivo para ocultar (fica registrado):')
          if (!oculto && !n) return
          iniciar(async () => {
            const r = await moderar(membroId, !oculto, n ?? '')
            setErro(r.ok ? null : r.erro)
          })
        }}
      >
        {oculto ? 'Republicar' : 'Ocultar'}
      </button>
      {erro ? <span className="text-xs text-danger">{erro}</span> : null}
    </span>
  )
}
