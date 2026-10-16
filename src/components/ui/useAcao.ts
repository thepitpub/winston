'use client'

import { startTransition, useActionState, useRef, type FormEvent } from 'react'

/**
 * `useActionState` sem o reset automático do React 19. Com
 * `<form action={fn}>` o React limpa o formulário sempre que a ação
 * volta, inclusive com erro, e o que foi digitado se perde. Aqui o envio
 * passa por `onSubmit`, e só limpamos quando `limparSe` pede (em geral, no
 * sucesso de um formulário de criação).
 *
 * Uso: `const [estado, enviar, pendente, ref] = useAcao(acao)` e
 * `<form ref={ref} onSubmit={enviar}>`.
 */
export function useAcao<E>(acao: (anterior: E | null, fd: FormData) => Promise<E | null>, opcoes: { limparSe?: (e: E) => boolean } = {}) {
  const ref = useRef<HTMLFormElement>(null)
  const { limparSe } = opcoes
  const [estado, despachar, pendente] = useActionState<E | null, FormData>(async (anterior, fd) => {
    const r = await acao(anterior, fd)
    if (r !== null && limparSe?.(r)) ref.current?.reset()
    return r
  }, null)
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const submissor = (e.nativeEvent as SubmitEvent).submitter
    const fd = new FormData(e.currentTarget, submissor)
    startTransition(() => despachar(fd))
  }
  return [estado, enviar, pendente, ref] as const
}
