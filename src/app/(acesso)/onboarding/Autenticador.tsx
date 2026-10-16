'use client'

import { useState, useTransition } from 'react'
import { FormCodigo } from '@/components/acesso/FormCodigo'
import { Aviso, Botao } from '@/components/ui/ui'
import { confirmarAutenticador, iniciarAutenticador, type Cadastro } from './acoes'

export function Autenticador() {
  const [cadastro, setCadastro] = useState<Cadastro | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()

  if (!cadastro) {
    return (
      <div className="grid gap-4">
        {erro ? <Aviso tom="perigo">{erro}</Aviso> : null}
        <Botao
          bloco
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await iniciarAutenticador()
              if (r.ok) setCadastro(r.dados)
              else setErro(r.erro)
            })
          }
        >
          {pendente ? 'Preparando…' : 'Gerar o código do autenticador'}
        </Botao>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <figure className="grid justify-items-center gap-3">
        <div className="w-56 rounded-xs bg-marfim p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: cadastro.svg }} role="img" aria-label="QR code para o autenticador" />
        <figcaption className="text-center text-sm text-apagado">No celular, pode tocar no link abaixo em vez de ler o QR.</figcaption>
        <a href={cadastro.uri} className="text-sm text-destaque underline underline-offset-4">
          Abrir no autenticador
        </a>
      </figure>
      <details className="text-sm text-apagado">
        <summary className="cursor-pointer">Digitar a chave manualmente</summary>
        <p className="numerico mt-2 break-all font-mono text-tinta-2 select-all">{cadastro.segredo}</p>
      </details>
      <FormCodigo acao={confirmarAutenticador.bind(null, cadastro.fatorId)} rotulo="Primeiro código do autenticador" botao="Confirmar autenticador" />
    </div>
  )
}
