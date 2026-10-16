'use client'

import { useState, useTransition } from 'react'
import { Botao } from '@/components/ui/ui'
import { formatarTelefone } from '@/lib/dominio/telefone'
import { revelarCodigo } from './acoes'

export function Revelar({ id }: { id: string }) {
  const [p, iniciar] = useTransition()
  const [r, setR] = useState<{ codigo: string; telefone: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  if (r)
    return (
      <span className="grid justify-items-end gap-1">
        <span className="numerico font-mono text-2xl tracking-[0.3em] text-destaque select-all">{r.codigo}</span>
        <a href={`https://wa.me/${r.telefone.replace('+', '')}?text=${encodeURIComponent(`Seu código do Continental: ${r.codigo}. Vale por 10 minutos. Não compartilhe.`)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-tinta underline underline-offset-4">
          Abrir WhatsApp para {formatarTelefone(r.telefone)}
        </a>
      </span>
    )
  return (
    <span className="grid justify-items-end gap-1">
      <Botao
        variante="linha"
        disabled={p}
        className="!min-h-9"
        onClick={() =>
          iniciar(async () => {
            const x = await revelarCodigo(id)
            if (x.ok) setR(x.dados)
            else setErro(x.erro)
          })
        }
      >
        Revelar e entregar
      </Botao>
      {erro ? <span className="text-xs text-danger">{erro}</span> : null}
    </span>
  )
}
