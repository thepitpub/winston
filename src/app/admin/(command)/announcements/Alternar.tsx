'use client'

import { useTransition } from 'react'
import { ativar } from './acoes'

export function Alternar({ id, ativo }: { id: string; ativo: boolean }) {
  const [p, iniciar] = useTransition()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      aria-label={ativo ? 'Desativar comunicado' : 'Ativar comunicado'}
      disabled={p}
      onClick={() => iniciar(async () => void (await ativar(id, !ativo)))}
      className={`relative h-5 w-9 rounded-full transition-colors ${ativo ? 'bg-destaque' : 'bg-elevado-3'} disabled:opacity-50`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-marfim transition-transform ${ativo ? 'translate-x-[1.15rem]' : 'translate-x-0.5'}`} />
    </button>
  )
}
