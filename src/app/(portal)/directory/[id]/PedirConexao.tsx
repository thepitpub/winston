'use client'

import { useAcao } from '@/components/ui/useAcao'

import { AreaTexto, Aviso, Botao, Campo } from '@/components/ui/ui'
import { conectar } from '../acoes'

export function PedirConexao({ alvo }: { alvo: string }) {
  const [estado, enviar, pendente] = useAcao(conectar.bind(null, alvo))
  if (estado?.ok) return <Aviso tom="ok">{estado.mensagem}</Aviso>
  return (
    <form onSubmit={enviar} className="grid gap-3">
      <Campo rotulo="Mensagem (opcional)" id="mensagem" dica="Uma frase sobre o porquê da conexão.">
        <AreaTexto id="mensagem" name="mensagem" maxLength={400} className="min-h-20" aria-describedby="mensagem-msg" />
      </Campo>
      {estado && !estado.ok ? <Aviso tom="perigo">{estado.erro}</Aviso> : null}
      <Botao type="submit" disabled={pendente} className="justify-self-start">
        {pendente ? 'Enviando…' : 'Pedir conexão'}
      </Botao>
    </form>
  )
}
