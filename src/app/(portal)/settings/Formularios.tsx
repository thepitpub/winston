'use client'

import { useAcao } from '@/components/ui/useAcao'
import { useState, useTransition } from 'react'
import { AreaTexto, Aviso, Botao, Campo, Entrada } from '@/components/ui/ui'
import { confirmarTrocaTelefone, encerrarSessao, pedirTrocaTelefone, salvarDiretorio, salvarNome } from './acoes'

export function FormNome({ atual }: { atual: string }) {
  const [estado, enviar, pendente] = useAcao(salvarNome)
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <Campo rotulo="Como prefere ser chamado" id="nome" erro={estado && !estado.ok ? (estado.campos?.nome ?? estado.erro) : undefined}>
          <Entrada id="nome" name="nome" defaultValue={atual} maxLength={80} />
        </Campo>
      </div>
      <Botao type="submit" variante="linha" disabled={pendente}>
        Salvar
      </Botao>
      {estado?.ok ? <Aviso tom="ok">{estado.mensagem}</Aviso> : null}
    </form>
  )
}

type Atual = {
  visible: boolean
  display_name: string | null
  profession: string | null
  company: string | null
  city: string | null
  interests: string[]
  skills: string[]
  description: string | null
  contact_whatsapp: boolean
  contact_email: string | null
  contact_instagram: string | null
  contact_linkedin: string | null
} | null

export function FormDiretorio({ atual }: { atual: Atual }) {
  const [estado, enviar, pendente] = useAcao(salvarDiretorio)
  const [visivel, setVisivel] = useState(Boolean(atual?.visible))
  const c = estado && !estado.ok ? (estado.campos ?? {}) : {}
  return (
    <form onSubmit={enviar} className="grid gap-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} className="mt-1 size-4 accent-[var(--color-destaque)]" />
        <input type="hidden" name="visible" value={visivel ? 'sim' : 'nao'} />
        <span>
          <span className="block text-tinta">Aparecer no diretório para outros membros</span>
          <span className="block text-sm text-apagado">Desligado, ninguém encontra você. Ligar é o seu consentimento, registrado com data.</span>
        </span>
      </label>
      <fieldset disabled={!visivel} className="grid gap-4 disabled:opacity-50 sm:grid-cols-2">
        <legend className="sr-only">Campos públicos</legend>
        <Campo rotulo="Nome de exibição" id="display_name">
          <Entrada id="display_name" name="display_name" defaultValue={atual?.display_name ?? ''} maxLength={80} />
        </Campo>
        <Campo rotulo="Área profissional" id="profession">
          <Entrada id="profession" name="profession" defaultValue={atual?.profession ?? ''} maxLength={120} />
        </Campo>
        <Campo rotulo="Empresa" id="company">
          <Entrada id="company" name="company" defaultValue={atual?.company ?? ''} maxLength={120} />
        </Campo>
        <Campo rotulo="Cidade" id="city">
          <Entrada id="city" name="city" defaultValue={atual?.city ?? ''} maxLength={80} />
        </Campo>
        <Campo rotulo="Interesses (separe por ;)" id="interests">
          <Entrada id="interests" name="interests" defaultValue={atual?.interests.join('; ') ?? ''} />
        </Campo>
        <Campo rotulo="Habilidades (separe por ;)" id="skills">
          <Entrada id="skills" name="skills" defaultValue={atual?.skills.join('; ') ?? ''} />
        </Campo>
        <div className="sm:col-span-2">
          <Campo rotulo="Descrição" id="description">
            <AreaTexto id="description" name="description" defaultValue={atual?.description ?? ''} maxLength={600} />
          </Campo>
        </div>
      </fieldset>
      <fieldset disabled={!visivel} className="grid gap-4 disabled:opacity-50">
        <legend className="rotulo mb-1 text-apagado">Formas de contato, só para conexões aceitas</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="contact_whatsapp" defaultChecked={atual?.contact_whatsapp} className="size-4 accent-[var(--color-destaque)]" /> Mostrar meu WhatsApp
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="E-mail" id="contact_email" erro={c.contact_email}>
            <Entrada id="contact_email" name="contact_email" type="email" defaultValue={atual?.contact_email ?? ''} aria-describedby="contact_email-msg" />
          </Campo>
          <Campo rotulo="Instagram" id="contact_instagram">
            <Entrada id="contact_instagram" name="contact_instagram" defaultValue={atual?.contact_instagram ?? ''} maxLength={60} placeholder="@usuario" />
          </Campo>
          <Campo rotulo="LinkedIn" id="contact_linkedin" erro={c.contact_linkedin}>
            <Entrada id="contact_linkedin" name="contact_linkedin" type="url" defaultValue={atual?.contact_linkedin ?? ''} placeholder="https://linkedin.com/in/…" aria-describedby="contact_linkedin-msg" />
          </Campo>
        </div>
      </fieldset>
      {estado?.ok ? <Aviso tom="ok">{estado.mensagem}</Aviso> : estado && !estado.ok ? <Aviso tom="perigo">{estado.erro}</Aviso> : null}
      <Botao type="submit" disabled={pendente} className="justify-self-start">
        {pendente ? 'Salvando…' : 'Salvar preferências'}
      </Botao>
    </form>
  )
}

export function FormTelefone() {
  const [pedido, pedir, pedindo] = useAcao(pedirTrocaTelefone)
  const [conf, confirmar, confirmando] = useAcao(confirmarTrocaTelefone)
  if (conf?.ok) return <Aviso tom="ok">Telefone alterado.</Aviso>
  if (pedido?.ok && pedido.dados.etapa === 'codigo') {
    return (
      <form onSubmit={confirmar} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="telefone" value={pedido.dados.telefone} />
        <div className="w-48">
          <Campo rotulo="Código enviado ao novo número" id="codigo-tel" erro={conf && !conf.ok ? (conf.campos?.codigo ?? conf.erro) : undefined}>
            <Entrada id="codigo-tel" name="codigo" inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
          </Campo>
        </div>
        <Botao type="submit" variante="linha" disabled={confirmando}>
          Confirmar
        </Botao>
        {pedido.dados.manual ? <p className="w-full text-sm text-apagado">A casa entrega o código pelo WhatsApp oficial.</p> : null}
      </form>
    )
  }
  return (
    <form onSubmit={pedir} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <Campo rotulo="Trocar o telefone de acesso" id="novo-tel" erro={pedido && !pedido.ok ? (pedido.campos?.telefone ?? pedido.erro) : undefined}>
          <Entrada id="novo-tel" name="telefone" type="tel" inputMode="tel" placeholder="Novo número com DDD" />
        </Campo>
      </div>
      <Botao type="submit" variante="linha" disabled={pedindo}>
        Enviar código
      </Botao>
    </form>
  )
}

export function EncerrarSessao({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  return (
    <span className="grid justify-items-end">
      <button
        type="button"
        disabled={pendente}
        className="rotulo text-apagado hover:text-danger"
        onClick={() =>
          iniciar(async () => {
            const r = await encerrarSessao(id)
            if (!r.ok) setErro(r.erro)
          })
        }
      >
        Encerrar
      </button>
      {erro ? <span className="text-xs text-danger">{erro}</span> : null}
    </span>
  )
}
