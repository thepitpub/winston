'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Botao } from '@/components/ui/ui'
import { comunicadosDaPagina, registrarComunicado, type ComunicadoVisivel } from '@/app/(portal)/acoes'

const SESSAO = 'ch_comunicados_sessao'
function vistosNaSessao(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SESSAO) || '[]'))
  } catch {
    return new Set()
  }
}
function marcarSessao(id: string) {
  try {
    const s = vistosNaSessao()
    s.add(id)
    sessionStorage.setItem(SESSAO, JSON.stringify([...s]))
  } catch {
    /* sem storage: pode reaparecer, e tudo bem */
  }
}

const dispositivo = () => (window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop')

/**
 * Comunicados modais e banners. A audiência e as frequências "uma vez" e
 * "até reconhecer" são decididas no banco; aqui só "por sessão" (que o
 * servidor não conhece) e a exibição.
 */
export function Comunicados() {
  const pagina = usePathname()
  const router = useRouter()
  const [lista, setLista] = useState<ComunicadoVisivel[]>([])
  const [, iniciar] = useTransition()
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let vivo = true
    iniciar(async () => {
      const r = await comunicadosDaPagina(pagina)
      if (!vivo) return
      const sessao = vistosNaSessao()
      setLista(r.filter((c) => !(c.frequency === 'session' && sessao.has(c.id))))
    })
    return () => {
      vivo = false
    }
  }, [pagina])

  const modal = lista.find((c) => c.kind === 'modal') ?? null
  const banners = lista.filter((c) => c.kind === 'banner')
  const exibidos = [modal, ...banners].filter(Boolean) as ComunicadoVisivel[]
  const chaveExibidos = exibidos.map((c) => c.id).join(',')

  useEffect(() => {
    for (const c of exibidos) {
      marcarSessao(c.id)
      void registrarComunicado({ id: c.id, tipo: 'impressao', pagina, dispositivo: dispositivo() })
    }
    if (modal && !dialogo.current?.open) dialogo.current?.showModal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveExibidos])

  const tirar = (id: string) => setLista((l) => l.filter((x) => x.id !== id))
  const fechar = (c: ComunicadoVisivel, reconhecer = false) => {
    void registrarComunicado({ id: c.id, tipo: reconhecer ? 'reconhecer' : 'fechar', pagina, dispositivo: dispositivo() })
    if (c.kind === 'modal') dialogo.current?.close()
    tirar(c.id)
  }
  const agir = (c: ComunicadoVisivel) => {
    void registrarComunicado({ id: c.id, tipo: 'clique', pagina, dispositivo: dispositivo() })
    if (c.frequency === 'until_ack') void registrarComunicado({ id: c.id, tipo: 'reconhecer', pagina, dispositivo: dispositivo() })
    if (c.kind === 'modal') dialogo.current?.close()
    tirar(c.id)
    if (c.cta_target?.startsWith('/')) router.push(c.cta_target)
    else if (c.cta_target) window.open(c.cta_target, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {banners.length ? (
        <div className="grid gap-px">
          {banners.map((c) => (
            <aside key={c.id} aria-label="Comunicado" className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--fio-forte)] bg-burgundy/45 px-5 py-3 text-sm">
              <p className="min-w-0 flex-1">
                <strong className="font-semibold text-tinta">{c.title}</strong> <span className="text-tinta-2">{c.body}</span>
              </p>
              {c.cta_label && c.cta_target ? (
                <button type="button" onClick={() => agir(c)} className="rotulo text-destaque underline-offset-4 hover:underline">
                  {c.cta_label}
                </button>
              ) : null}
              <button type="button" onClick={() => fechar(c, c.frequency === 'until_ack')} className="rotulo text-apagado hover:text-tinta">
                {c.frequency === 'until_ack' ? 'Ciente' : 'Fechar'}
              </button>
            </aside>
          ))}
        </div>
      ) : null}

      <dialog ref={dialogo} aria-labelledby="comunicado-t" className="m-auto w-[min(92vw,34rem)] bg-transparent p-0 text-tinta backdrop:bg-fundo/80 backdrop:backdrop-blur-sm" onCancel={(e) => {
        e.preventDefault()
        if (modal) fechar(modal)
      }}>
        {modal ? (
          <div className="placa textura grid gap-5 rounded-sm p-7 sm:p-9">
            <p className="rotulo text-destaque">Comunicado da casa</p>
            <h2 id="comunicado-t" className="font-display text-display-md">
              {modal.title}
            </h2>
            <div className="filete" />
            <p className="leading-relaxed whitespace-pre-line text-tinta-2">{modal.body}</p>
            <div className="flex flex-wrap gap-3">
              {modal.cta_label && modal.cta_target ? <Botao onClick={() => agir(modal)}>{modal.cta_label}</Botao> : null}
              <Botao variante="linha" onClick={() => fechar(modal, modal.frequency === 'until_ack')}>
                {modal.frequency === 'until_ack' ? 'Estou ciente' : 'Fechar'}
              </Botao>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  )
}
