'use client'

import { useRef, useState, useTransition } from 'react'
import { entradaCompacta } from '@/components/command/kit'
import { useAcao } from '@/components/ui/useAcao'
import { Aviso, Botao } from '@/components/ui/ui'
import type { Resultado } from '@/lib/acao'
import { aplicarRegra, estornar, salvarRegra } from './acoes'

const r = 'grid gap-1 text-xs text-apagado'
const Retorno = ({ x }: { x: Resultado | null }) => (x ? <Aviso tom={x.ok ? 'ok' : 'perigo'}>{x.ok ? (x.mensagem ?? 'Feito.') : x.erro}</Aviso> : null)

export function FormRegra({ atual }: { atual?: { id: string; code: string; name: string; description: string | null; amount: number; active: boolean } }) {
  const [x, enviar, p] = useAcao(salvarRegra)
  return (
    <form onSubmit={enviar} className="grid gap-2 rounded-xs bg-fundo-2 p-3">
      <input type="hidden" name="id" value={atual?.id ?? ''} />
      <div className="grid grid-cols-2 gap-2">
        <label className={r}>
          Código
          <input name="code" defaultValue={atual?.code} required pattern="[a-z0-9_]{3,40}" className={entradaCompacta} />
        </label>
        <label className={r}>
          Valor
          <input name="amount" type="number" step={1} defaultValue={atual?.amount} required className={entradaCompacta} />
        </label>
      </div>
      <label className={r}>
        Nome (aparece no extrato)
        <input name="name" defaultValue={atual?.name} required maxLength={80} className={entradaCompacta} />
      </label>
      <label className={r}>
        Descrição
        <input name="description" defaultValue={atual?.description ?? ''} maxLength={240} className={entradaCompacta} />
      </label>
      <label className="flex items-center gap-2 text-xs text-tinta-2">
        <input type="checkbox" name="active" defaultChecked={atual?.active ?? true} className="accent-[var(--color-destaque)]" /> Ativa (visível aos membros)
      </label>
      <Retorno x={x} />
      <Botao type="submit" variante="linha" disabled={p} className="justify-self-start !min-h-9">
        Salvar regra
      </Botao>
    </form>
  )
}

export function AplicarRegra({ membros, regras }: { membros: { id: string; full_name: string }[]; regras: { id: string; nome: string }[] }) {
  const chave = useRef('')
  const [x, enviar, p] = useAcao(async (s: Resultado | null, fd: FormData) => {
    chave.current ||= crypto.randomUUID()
    fd.set('chave', chave.current)
    const res = await aplicarRegra(s, fd)
    if (res.ok) chave.current = ''
    return res
  })
  if (!regras.length) return <p className="text-sm text-apagado">Crie uma regra ativa primeiro.</p>
  return (
    <form onSubmit={enviar} className="grid gap-2">
      <label className={r}>
        Membro
        <select name="membro" required className={entradaCompacta}>
          <option value="">—</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className={r}>
        Regra
        <select name="regra" required className={entradaCompacta}>
          {regras.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome}
            </option>
          ))}
        </select>
      </label>
      <label className={r}>
        Referência (opcional)
        <input name="referencia" maxLength={120} placeholder="Ex.: evento, indicação" className={entradaCompacta} />
      </label>
      <Retorno x={x} />
      <Botao type="submit" variante="linha" disabled={p} className="justify-self-start !min-h-9">
        Conceder
      </Botao>
    </form>
  )
}

export function Estornar({ id }: { id: string }) {
  const [p, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  return (
    <span className="grid justify-items-end">
      <button
        type="button"
        disabled={p}
        className="text-xs text-apagado hover:text-danger"
        onClick={() => {
          const motivo = window.prompt('Motivo do estorno (fica no ledger):')
          if (!motivo) return
          iniciar(async () => {
            const x = await estornar(id, motivo)
            setErro(x.ok ? null : x.erro)
          })
        }}
      >
        Estornar
      </button>
      {erro ? <span className="text-xs text-danger">{erro}</span> : null}
    </span>
  )
}
