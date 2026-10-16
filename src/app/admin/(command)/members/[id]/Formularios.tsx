'use client'

import { useRef, useState, useTransition } from 'react'
import { entradaCompacta } from '@/components/command/kit'
import { useAcao } from '@/components/ui/useAcao'
import { Aviso, Botao } from '@/components/ui/ui'
import type { Resultado } from '@/lib/acao'
import { TRANSICOES, type StatusConta } from '@/lib/dominio/regras-acesso'
import { STATUS_MEMBRO } from '@/lib/dominio/rotulos'
import { ajustarCoins, alterarStatus, cancelarConvite, credencial, derrubarSessoes, emitirConvite, recuperar, salvarCadastro, salvarNota } from '../acoes'

function Retorno({ r }: { r: Resultado<unknown> | null }) {
  if (!r) return null
  return r.ok ? <Aviso tom="ok">{r.mensagem ?? 'Feito.'}</Aviso> : <Aviso tom="perigo">{r.erro}</Aviso>
}

const rotulo = 'grid gap-1 text-xs text-apagado'

export function FormCadastro({ id, atual }: { id: string; atual: { display_name: string; category: string; joined_at: string; telefone: string } }) {
  const [r, enviar, p] = useAcao(salvarCadastro.bind(null, id))
  return (
    <form onSubmit={enviar} className="grid gap-3">
      <label className={rotulo}>
        Nome de exibição
        <input name="display_name" defaultValue={atual.display_name} maxLength={80} className={entradaCompacta} />
      </label>
      <label className={rotulo}>
        Telefone
        <input name="telefone" defaultValue={atual.telefone} className={entradaCompacta} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={rotulo}>
          Categoria
          <select name="category" defaultValue={atual.category} className={entradaCompacta}>
            <option value="founder">Fundador</option>
            <option value="member">Membro</option>
            <option value="honorary">Honorário</option>
          </select>
        </label>
        <label className={rotulo}>
          Data de adesão
          <input name="joined_at" type="date" defaultValue={atual.joined_at} className={entradaCompacta} />
        </label>
      </div>
      <Retorno r={r} />
      <Botao type="submit" variante="linha" disabled={p} className="justify-self-start">
        Salvar
      </Botao>
    </form>
  )
}

export function FormStatus({ id, atual }: { id: string; atual: string }) {
  const [r, enviar, p] = useAcao(alterarStatus.bind(null, id))
  const opcoes = TRANSICOES[atual as StatusConta] ?? []
  if (!opcoes.length) return <p className="text-sm text-apagado">Status final: sem transições.</p>
  return (
    <form onSubmit={enviar} className="grid gap-3">
      <label className={rotulo}>
        Mudar para
        <select name="para" className={entradaCompacta}>
          {opcoes.map((o) => (
            <option key={o} value={o}>
              {STATUS_MEMBRO[o]?.[0]}
            </option>
          ))}
        </select>
      </label>
      <label className={rotulo}>
        Justificativa
        <input name="motivo" required minLength={5} maxLength={300} className={entradaCompacta} />
      </label>
      <Retorno r={r} />
      <Botao type="submit" variante="linha" disabled={p} className="justify-self-start">
        Aplicar
      </Botao>
    </form>
  )
}

export function AcoesCredencial({ id, temAtiva, temSuspensa }: { id: string; temAtiva: boolean; temSuspensa: boolean }) {
  const [p, iniciar] = useTransition()
  const [r, setR] = useState<Resultado | null>(null)
  const agir = (a: 'emitir' | 'suspender' | 'reativar' | 'revogar') => {
    if ((a === 'revogar' || a === 'suspender') && !window.confirm(a === 'revogar' ? 'Revogar a credencial? É definitivo.' : 'Suspender a credencial?')) return
    iniciar(async () => setR(await credencial(id, a)))
  }
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {!temAtiva && !temSuspensa ? <Botao variante="linha" disabled={p} onClick={() => agir('emitir')}>Emitir</Botao> : null}
        {temAtiva ? <Botao variante="linha" disabled={p} onClick={() => agir('suspender')}>Suspender</Botao> : null}
        {temSuspensa ? <Botao variante="linha" disabled={p} onClick={() => agir('reativar')}>Reativar</Botao> : null}
        {temAtiva || temSuspensa ? <Botao variante="perigo" disabled={p} onClick={() => agir('revogar')}>Revogar</Botao> : null}
      </div>
      <Retorno r={r} />
    </div>
  )
}

export function AcoesAcesso({ id, status, convitesVivos, podeConvidar, podeSessoes }: { id: string; status: string; convitesVivos: string[]; podeConvidar: boolean; podeSessoes: boolean }) {
  const [p, iniciar] = useTransition()
  const [r, setR] = useState<Resultado<unknown> | null>(null)
  const [link, setLink] = useState<{ link: string; expira: string } | null>(null)
  const [rec, enviarRec, pRec] = useAcao(recuperar.bind(null, id))
  const linkAtual = link ?? (rec?.ok ? rec.dados : null)
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {podeConvidar && (status === 'pending' || status === 'invited') ? (
          <Botao
            variante="ouro"
            disabled={p}
            onClick={() =>
              iniciar(async () => {
                const x = await emitirConvite(id)
                setR(x)
                if (x.ok) setLink(x.dados)
              })
            }
          >
            {convitesVivos.length ? 'Emitir novo convite' : 'Emitir convite'}
          </Botao>
        ) : null}
        {podeConvidar
          ? convitesVivos.map((c) => (
              <Botao key={c} variante="linha" disabled={p} onClick={() => iniciar(async () => setR(await cancelarConvite(id, c)))}>
                Revogar convite vigente
              </Botao>
            ))
          : null}
        {podeSessoes && status === 'active' ? (
          <Botao variante="perigo" disabled={p} onClick={() => window.confirm('Encerrar todas as sessões deste membro?') && iniciar(async () => setR(await derrubarSessoes(id)))}>
            Encerrar sessões
          </Botao>
        ) : null}
      </div>
      {linkAtual ? (
        <div className="grid gap-1 rounded-xs bg-fundo-2 p-3 shadow-[inset_0_0_0_1px_var(--fio-forte)]">
          <p className="text-xs text-apagado">Link do convite (aparece só agora; uso único, vale até {new Date(linkAtual.expira).toLocaleString('pt-BR')}):</p>
          <p className="font-mono text-xs break-all text-destaque select-all">{linkAtual.link}</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(linkAtual.link)} className="justify-self-start text-xs text-tinta underline underline-offset-4">
            Copiar
          </button>
        </div>
      ) : null}
      <Retorno r={r && !r.ok ? r : null} />
      {podeConvidar && status === 'active' ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-apagado hover:text-tinta">Recuperar acesso (celular perdido)</summary>
          <form onSubmit={enviarRec} className="mt-3 grid gap-2">
            <p className="text-xs text-apagado">Remove o autenticador, encerra as sessões e emite um novo convite. Só depois de confirmar a identidade pessoalmente.</p>
            <input name="justificativa" placeholder="Como a identidade foi confirmada" required minLength={10} className={entradaCompacta} />
            {rec && !rec.ok ? <Aviso tom="perigo">{rec.erro}</Aviso> : null}
            <Botao type="submit" variante="perigo" disabled={pRec} className="justify-self-start">
              Recuperar acesso
            </Botao>
          </form>
        </details>
      ) : null}
    </div>
  )
}

export function FormAjuste({ id }: { id: string }) {
  // Chave de idempotência gerada no envio e mantida até o sucesso: um
  // clique duplo ou uma nova tentativa após erro não lança duas vezes.
  const chave = useRef('')
  const [r, enviar, p, ref] = useAcao(
    async (s: Resultado | null, fd: FormData) => {
      chave.current ||= crypto.randomUUID()
      fd.set('chave', chave.current)
      const x = await ajustarCoins(id, s, fd)
      if (x.ok) chave.current = ''
      return x
    },
    { limparSe: (x) => x.ok },
  )
  return (
    <form ref={ref} onSubmit={enviar} className="grid gap-3">
      <label className={rotulo}>
        Valor (negativo para débito)
        <input name="valor" type="number" step={1} required className={entradaCompacta} />
      </label>
      <label className={rotulo}>
        Motivo
        <input name="motivo" required minLength={5} maxLength={300} className={entradaCompacta} />
      </label>
      <p className="text-xs text-discreto">Cada lançamento é imutável. Para corrigir, lance o valor oposto com o motivo.</p>
      <Retorno r={r} />
      <Botao type="submit" variante="linha" disabled={p} className="justify-self-start">
        Lançar
      </Botao>
    </form>
  )
}

export function FormNota({ id, atual }: { id: string; atual: string }) {
  const [r, enviar, p] = useAcao(salvarNota.bind(null, id))
  return (
    <form onSubmit={enviar} className="grid gap-3">
      <textarea name="nota" defaultValue={atual} maxLength={4000} rows={6} className={`${entradaCompacta} h-auto py-2 leading-relaxed`} aria-label="Observações internas" />
      <Retorno r={r} />
      <Botao type="submit" variante="linha" disabled={p} className="justify-self-start">
        Salvar nota
      </Botao>
    </form>
  )
}
