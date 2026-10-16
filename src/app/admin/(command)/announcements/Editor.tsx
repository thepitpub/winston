'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Bloco, entradaCompacta } from '@/components/command/kit'
import { Aviso, Botao } from '@/components/ui/ui'
import { contarPublico, salvarComunicado, type EntradaComunicado } from './acoes'

type Atual = {
  title: string
  body: string
  cta_label: string
  cta_target: string
  kind: 'modal' | 'banner' | 'lobby'
  frequency: 'once' | 'session' | 'always' | 'until_ack'
  priority: number
  audience: { all?: boolean; statuses?: string[]; categories?: string[] }
  pages: string[]
  starts_at: string
  ends_at: string | null
  active: boolean
} | null

const PAGINAS = [
  ['/lobby', 'Grand Lobby'],
  ['/credential', 'Credential'],
  ['/directory', 'Directory'],
  ['/winston', 'Winston'],
  ['/gold-coins', 'Gold Coins'],
  ['/requests', 'Solicitações'],
] as const

function local(iso: string | null | undefined): string {
  if (!iso) return ''
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

const r = 'grid gap-1 text-xs text-apagado'

/** Editor tipográfico com prévia ao vivo no celular e no desktop. */
export function Editor({ id, atual }: { id: string | null; atual: Atual }) {
  const router = useRouter()
  const [v, setV] = useState<EntradaComunicado>(() => ({
    title: atual?.title ?? '',
    body: atual?.body ?? '',
    cta_label: atual?.cta_label ?? '',
    cta_target: atual?.cta_target ?? '',
    kind: atual?.kind ?? 'modal',
    frequency: atual?.frequency ?? 'once',
    priority: atual?.priority ?? 50,
    publico: atual?.audience.all || !atual ? 'todos' : 'segmento',
    statuses: (atual?.audience.statuses ?? []) as EntradaComunicado['statuses'],
    categories: (atual?.audience.categories ?? []) as EntradaComunicado['categories'],
    pages: atual?.pages ?? [],
    starts_at: local(atual?.starts_at ?? new Date().toISOString()),
    ends_at: local(atual?.ends_at),
    active: atual?.active ?? false,
  }))
  const [publico, setPublico] = useState<number | null>(null)
  const [previa, setPrevia] = useState<'celular' | 'desktop'>('celular')
  const [res, setRes] = useState<{ ok: boolean; texto: string; campos?: Record<string, string> } | null>(null)
  const [p, iniciar] = useTransition()
  const set = <K extends keyof EntradaComunicado>(k: K, x: EntradaComunicado[K]) => setV((a) => ({ ...a, [k]: x }))
  const alternarItem = <K extends 'statuses' | 'categories' | 'pages'>(k: K, x: string) => setV((a) => ({ ...a, [k]: (a[k] as string[]).includes(x) ? (a[k] as string[]).filter((y) => y !== x) : [...(a[k] as string[]), x] }))

  useEffect(() => {
    let vivo = true
    contarPublico(id, { publico: v.publico, statuses: v.statuses, categories: v.categories })
      .then((r) => vivo && setPublico(r.ok ? r.dados : null))
      .catch(() => vivo && setPublico(null))
    return () => {
      vivo = false
    }
  }, [id, v.publico, v.statuses, v.categories])

  const salvar = () =>
    iniciar(async () => {
      const x = await salvarComunicado(id, v)
      if (x.ok) {
        setRes({ ok: true, texto: x.mensagem ?? 'Salvo.' })
        router.replace(`/admin/announcements?editar=${x.dados.id}`)
      } else setRes({ ok: false, texto: x.erro, campos: x.campos })
    })

  const erro = (k: string) => (res?.campos?.[k] ? <span className="text-danger">{res.campos[k]}</span> : null)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Bloco titulo={id ? 'Editar comunicado' : 'Novo comunicado'}>
        <div className="grid gap-3">
          <label className={r}>
            Título {erro('title')}
            <input value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={120} className={entradaCompacta} />
          </label>
          <label className={r}>
            Texto {erro('body')}
            <textarea value={v.body} onChange={(e) => set('body', e.target.value)} maxLength={1200} rows={4} className={`${entradaCompacta} h-auto py-2`} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className={r}>
              Texto do botão (opcional)
              <input value={v.cta_label} onChange={(e) => set('cta_label', e.target.value)} maxLength={40} className={entradaCompacta} />
            </label>
            <label className={r}>
              Destino {erro('cta_target')}
              <input value={v.cta_target} onChange={(e) => set('cta_target', e.target.value)} placeholder="/directory ou https://" className={entradaCompacta} />
            </label>
            <label className={r}>
              Tipo
              <select value={v.kind} onChange={(e) => set('kind', e.target.value as 'modal')} className={entradaCompacta}>
                <option value="modal">Modal institucional</option>
                <option value="banner">Banner discreto</option>
                <option value="lobby">Aviso no Grand Lobby</option>
              </select>
            </label>
            <label className={r}>
              Frequência
              <select value={v.frequency} onChange={(e) => set('frequency', e.target.value as 'once')} className={entradaCompacta}>
                <option value="once">Uma vez</option>
                <option value="session">Por sessão</option>
                <option value="always">Sempre</option>
                <option value="until_ack">Até reconhecer</option>
              </select>
            </label>
            <label className={r}>
              Início {erro('starts_at')}
              <input type="datetime-local" value={v.starts_at} onChange={(e) => set('starts_at', e.target.value)} className={entradaCompacta} />
            </label>
            <label className={r}>
              Fim {erro('ends_at')}
              <input type="datetime-local" value={v.ends_at} onChange={(e) => set('ends_at', e.target.value)} className={entradaCompacta} />
            </label>
            <label className={r}>
              Prioridade (0-100)
              <input type="number" min={0} max={100} value={v.priority as number} onChange={(e) => set('priority', Number(e.target.value))} className={entradaCompacta} />
            </label>
            <label className={r}>
              Público {erro('publico')}
              <select value={v.publico} onChange={(e) => set('publico', e.target.value as 'todos')} className={entradaCompacta}>
                <option value="todos">Todos os membros</option>
                <option value="segmento">Segmento</option>
              </select>
            </label>
          </div>
          {v.publico === 'segmento' ? (
            <fieldset className="grid gap-2 rounded-xs bg-fundo-2 p-3 text-xs">
              <legend className="sr-only">Segmento</legend>
              <div className="flex flex-wrap gap-3">
                <span className="text-apagado">Status:</span>
                {(['active', 'invited', 'pending', 'suspended'] as const).map((s) => (
                  <label key={s} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={v.statuses.includes(s)} onChange={() => alternarItem('statuses', s)} className="accent-[var(--color-destaque)]" /> {s}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="text-apagado">Categoria:</span>
                {(['founder', 'member', 'honorary'] as const).map((c) => (
                  <label key={c} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={v.categories.includes(c)} onChange={() => alternarItem('categories', c)} className="accent-[var(--color-destaque)]" /> {c}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {v.kind !== 'lobby' ? (
            <fieldset className="flex flex-wrap gap-3 text-xs">
              <legend className="mb-1 text-apagado">Páginas (nenhuma marcada = todas)</legend>
              {PAGINAS.map(([pg, nome]) => (
                <label key={pg} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={v.pages.includes(pg)} onChange={() => alternarItem('pages', pg)} className="accent-[var(--color-destaque)]" /> {nome}
                </label>
              ))}
            </fieldset>
          ) : null}
          <p className="numerico font-mono text-xs text-destaque">Público hoje: {publico ?? '…'} membro(s) reais</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.active} onChange={(e) => set('active', e.target.checked)} className="accent-[var(--color-destaque)]" /> Publicado (no ar dentro do período)
          </label>
          {res ? <Aviso tom={res.ok ? 'ok' : 'perigo'}>{res.texto}</Aviso> : null}
          <Botao onClick={salvar} disabled={p} className="justify-self-start !min-h-9">
            {p ? 'Salvando…' : 'Salvar'}
          </Botao>
        </div>
      </Bloco>
      <Bloco titulo="Prévia" acao={<span className="flex gap-1 text-xs">{(['celular', 'desktop'] as const).map((x) => <button key={x} type="button" onClick={() => setPrevia(x)} aria-pressed={previa === x} className="rounded-xs px-2 py-1 text-apagado aria-pressed:bg-elevado-3 aria-pressed:text-tinta">{x}</button>)}</span>}>
        <div className={`mx-auto w-full overflow-hidden rounded-sm bg-fundo shadow-[inset_0_0_0_1px_var(--fio)] ${previa === 'celular' ? 'max-w-[360px]' : ''}`}>
          {v.kind === 'banner' ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--fio-forte)] bg-burgundy/45 px-4 py-3 text-sm">
              <p className="min-w-0 flex-1">
                <strong>{v.title || 'Título'}</strong> <span className="text-tinta-2">{v.body || 'Texto do banner.'}</span>
              </p>
              {v.cta_label ? <span className="rotulo text-destaque">{v.cta_label}</span> : null}
            </div>
          ) : null}
          <div className="relative grid min-h-[22rem] place-items-center p-5">
            {v.kind === 'modal' ? (
              <div className="placa grid w-full gap-4 rounded-sm p-6">
                <p className="rotulo text-destaque">Comunicado da casa</p>
                <p className="font-display text-3xl leading-tight">{v.title || 'Título'}</p>
                <div className="filete" />
                <p className="text-sm leading-relaxed whitespace-pre-line text-tinta-2">{v.body || 'Texto do comunicado.'}</p>
                <div className="flex flex-wrap gap-2">
                  {v.cta_label ? <span className="rounded-xs bg-destaque px-4 py-2 text-xs font-semibold tracking-wider text-sobre-destaque uppercase">{v.cta_label}</span> : null}
                  <span className="rounded-xs px-4 py-2 text-xs font-semibold tracking-wider uppercase shadow-[inset_0_0_0_1px_var(--fio-forte)]">{v.frequency === 'until_ack' ? 'Estou ciente' : 'Fechar'}</span>
                </div>
              </div>
            ) : v.kind === 'lobby' ? (
              <div className="placa grid w-full gap-3 rounded-xs p-5">
                <p className="rotulo text-destaque">Notices</p>
                <div className="grid gap-1 border-l border-destaque/60 pl-4">
                  <p className="font-display text-xl">{v.title || 'Título'}</p>
                  <p className="text-sm whitespace-pre-line text-tinta-2">{v.body || 'Texto do aviso.'}</p>
                  {v.cta_label ? <p className="rotulo mt-1 text-destaque">{v.cta_label}</p> : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-discreto">Conteúdo da página</p>
            )}
          </div>
        </div>
      </Bloco>
    </div>
  )
}
