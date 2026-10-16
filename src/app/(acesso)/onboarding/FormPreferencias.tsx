'use client'

import { useActionState, useState } from 'react'
import { Aviso, Botao, Campo, Entrada } from '@/components/ui/ui'
import { concluir } from './acoes'

export function FormPreferencias({ nome }: { nome: string }) {
  const [estado, enviar, pendente] = useActionState(concluir, null)
  const [visivel, setVisivel] = useState(false)
  return (
    <form action={enviar} className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="rotulo mb-2 text-apagado">No diretório privado</legend>
        {(
          [
            ['nao', 'Permanecer privado', 'Ninguém encontra você no diretório.'],
            ['sim', 'Aparecer para outros membros', 'Nome de exibição e o que você preencher abaixo.'],
          ] as const
        ).map(([v, t, d]) => (
          <label key={v} className="flex cursor-pointer items-start gap-3 rounded-xs p-3 shadow-[inset_0_0_0_1px_var(--fio)] has-[:checked]:shadow-[inset_0_0_0_1px_var(--color-destaque)]">
            <input type="radio" name="visible" value={v} defaultChecked={v === 'nao'} onChange={() => setVisivel(v === 'sim')} className="mt-1 accent-[var(--color-destaque)]" />
            <span>
              <span className="block text-tinta">{t}</span>
              <span className="block text-sm text-apagado">{d}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {visivel ? (
        <div className="grid gap-4">
          <Campo rotulo="Nome de exibição" id="display_name">
            <Entrada id="display_name" name="display_name" defaultValue={nome} maxLength={80} />
          </Campo>
          <Campo rotulo="Área profissional" id="profession">
            <Entrada id="profession" name="profession" maxLength={120} />
          </Campo>
          <Campo rotulo="Empresa" id="company">
            <Entrada id="company" name="company" maxLength={120} />
          </Campo>
          <Campo rotulo="Cidade" id="city">
            <Entrada id="city" name="city" maxLength={80} />
          </Campo>
        </div>
      ) : null}
      {estado && !estado.ok ? <Aviso tom="perigo">{estado.erro}</Aviso> : null}
      <Botao type="submit" disabled={pendente} bloco>
        {pendente ? 'Abrindo…' : 'Entrar no Continental'}
      </Botao>
    </form>
  )
}
