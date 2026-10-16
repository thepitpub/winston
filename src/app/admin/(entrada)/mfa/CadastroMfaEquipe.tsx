'use client'

import { useState, useTransition } from 'react'
import { FormCodigo } from '@/components/acesso/FormCodigo'
import { Aviso, Botao } from '@/components/ui/ui'
import { confirmarMfaEquipe, iniciarMfaEquipe } from '../acoes'

export function CadastroMfaEquipe() {
  const [c, setC] = useState<{ fatorId: string; svg: string; segredo: string; uri: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()
  if (!c)
    return (
      <div className="grid gap-4">
        {erro ? <Aviso tom="perigo">{erro}</Aviso> : null}
        <Botao
          bloco
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await iniciarMfaEquipe()
              if (r.ok) setC(r.dados)
              else setErro(r.erro)
            })
          }
        >
          Gerar código
        </Botao>
      </div>
    )
  return (
    <div className="grid gap-6">
      <div className="mx-auto w-56 rounded-xs bg-marfim p-3 [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="QR do autenticador" dangerouslySetInnerHTML={{ __html: c.svg }} />
      <details className="text-sm text-apagado">
        <summary className="cursor-pointer">Digitar a chave</summary>
        <p className="mt-2 font-mono break-all text-tinta-2 select-all">{c.segredo}</p>
      </details>
      <FormCodigo acao={confirmarMfaEquipe.bind(null, c.fatorId)} botao="Confirmar e entrar" />
    </div>
  )
}
