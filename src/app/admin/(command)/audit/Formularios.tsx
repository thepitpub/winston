'use client'

import { useState, useTransition } from 'react'
import { entradaCompacta } from '@/components/command/kit'
import { useAcao } from '@/components/ui/useAcao'
import { Aviso, Botao, Etiqueta } from '@/components/ui/ui'
import type { Resultado } from '@/lib/acao'
import type { Papel, Permissao } from '@/lib/autorizacao/permissoes'
import { concederCs, definirPapel, salvarAjustes, statusEquipe } from './acoes'

export function PessoaEquipe(p: { userId: string; nome: string; email: string; status: string; sintetico: boolean; papel: Exclude<Papel, 'member'>; explicitas: Permissao[]; podeEditar: boolean; rotulosPapel: Record<Papel, string> }) {
  const [pend, iniciar] = useTransition()
  const [r, setR] = useState<Resultado | null>(null)
  const temCs = p.explicitas.includes('cs.read')
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="block text-sm">
            {p.nome}
            {p.sintetico ? <span className="ml-2 text-[0.65rem] text-attention uppercase">sintético</span> : null}
          </span>
          <span className="font-mono text-xs text-discreto">{p.email}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {p.status !== 'active' ? <Etiqueta tom="atencao">{p.status}</Etiqueta> : null}
          {temCs ? <Etiqueta tom="ouro">CS privado</Etiqueta> : null}
          {p.podeEditar ? (
            <select defaultValue={p.papel} disabled={pend} onChange={(e) => iniciar(async () => setR(await definirPapel(p.userId, e.target.value)))} className={entradaCompacta} aria-label={`Papel de ${p.nome}`}>
              {(['super_admin', 'admin', 'staff'] as const).map((x) => (
                <option key={x} value={x}>
                  {p.rotulosPapel[x]}
                </option>
              ))}
            </select>
          ) : (
            <Etiqueta>{p.rotulosPapel[p.papel]}</Etiqueta>
          )}
        </span>
      </div>
      {p.podeEditar ? (
        <div className="flex flex-wrap gap-3 text-xs">
          <button type="button" disabled={pend} className="text-apagado hover:text-tinta" onClick={() => window.confirm(temCs ? 'Revogar o acesso à inteligência privada?' : 'Conceder leitura e edição da inteligência privada (CS)?') && iniciar(async () => setR(await concederCs(p.userId, !temCs)))}>
            {temCs ? 'Revogar CS privado' : 'Conceder CS privado'}
          </button>
          <button type="button" disabled={pend} className="text-apagado hover:text-danger" onClick={() => window.confirm(p.status === 'active' ? 'Suspender e derrubar as sessões?' : 'Reativar?') && iniciar(async () => setR(await statusEquipe(p.userId, p.status !== 'active')))}>
            {p.status === 'active' ? 'Suspender' : 'Reativar'}
          </button>
        </div>
      ) : null}
      {r && !r.ok ? <Aviso tom="perigo">{r.erro}</Aviso> : null}
    </div>
  )
}

const r = 'grid gap-1 text-xs text-apagado'

export function FormAjustes({ valores }: { valores: Record<string, unknown> }) {
  const [x, enviar, p] = useAcao(salvarAjustes)
  const v = (k: string, padrao: string) => String(valores[k] ?? padrao)
  return (
    <form onSubmit={enviar} className="grid gap-3">
      <label className={r}>
        MFA obrigatório para membros
        <select name="mfa_obrigatorio_membro" defaultValue={v('mfa_obrigatorio_membro', 'true')} className={entradaCompacta}>
          <option value="true">Sim (recomendado)</option>
          <option value="false">Não</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={r}>
          Validade do código (s)
          <input name="otp_validade_segundos" type="number" defaultValue={v('otp_validade_segundos', '600')} className={entradaCompacta} />
        </label>
        <label className={r}>
          Tentativas por código
          <input name="otp_max_tentativas" type="number" defaultValue={v('otp_max_tentativas', '5')} className={entradaCompacta} />
        </label>
        <label className={r}>
          Códigos por número / 10 min
          <input name="otp_max_envios_10min" type="number" defaultValue={v('otp_max_envios_10min', '3')} className={entradaCompacta} />
        </label>
        <label className={r}>
          Validade do convite (dias)
          <input name="convite_validade_dias" type="number" defaultValue={v('convite_validade_dias', '7')} className={entradaCompacta} />
        </label>
        <label className={r}>
          Mensagens ao Winston / hora
          <input name="winston_limite_hora" type="number" defaultValue={v('winston_limite_hora', '30')} className={entradaCompacta} />
        </label>
      </div>
      <p className="text-xs text-discreto">A equipe sempre usa MFA: não há ajuste para desligar.</p>
      {x ? <Aviso tom={x.ok ? 'ok' : 'perigo'}>{x.ok ? x.mensagem : x.erro}</Aviso> : null}
      <Botao type="submit" variante="linha" disabled={p} className="justify-self-start !min-h-9">
        Salvar ajustes
      </Botao>
    </form>
  )
}
