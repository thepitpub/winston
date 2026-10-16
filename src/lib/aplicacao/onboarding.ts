import 'server-only'
import { auditar } from '../auditoria'
import { clienteSecreto, feito, ou, talvez } from '../db/clientes'
import { novoCodigoPublico } from '../dominio/cripto'
import { lancarCoins } from './coins'

/** Emite a credencial ativa do membro, se ainda não houver. Código público único. */
export async function emitirCredencial(membroId: string, porQuem: string | null): Promise<string> {
  const adm = clienteSecreto()
  const atual = talvez(await adm.from('member_credentials').select('public_code').eq('member_id', membroId).eq('status', 'active').maybeSingle())
  if (atual) return atual.public_code
  for (let i = 0; i < 5; i++) {
    const codigo = novoCodigoPublico()
    const r = await adm.from('member_credentials').insert({ member_id: membroId, public_code: codigo, issued_by: porQuem })
    if (!r.error) {
      await auditar({ ator: { userId: porQuem, tipo: porQuem ? 'staff' : 'system' }, acao: 'credencial.emitida', membroId, recurso: { tipo: 'credencial' } })
      return codigo
    }
    if (r.error.code !== '23505') throw new Error(r.error.message)
    // 23505 pode ser a colisão do código OU outra chamada que emitiu primeiro.
    const outra = talvez(await adm.from('member_credentials').select('public_code').eq('member_id', membroId).eq('status', 'active').maybeSingle())
    if (outra) return outra.public_code
  }
  throw new Error('não foi possível gerar um código de credencial único')
}

/**
 * Fecha o onboarding: o membro passa a ativo (a data de adesão NÃO é
 * a de ativação: só a casa a informa), recebe a credencial, a
 * carteira de Gold Coins e as preferências de diretório (privadas por
 * padrão). Idempotente: rodar duas vezes não duplica nada.
 */
export async function concluirOnboarding(membroId: string, userId: string): Promise<void> {
  const adm = clienteSecreto()
  const m = ou(await adm.from('members').select('status').eq('id', membroId).single())
  if (m.status !== 'invited' && m.status !== 'active') throw new Error('estado inválido para onboarding')
  await emitirCredencial(membroId, null)
  feito(await adm.from('gold_coin_accounts').upsert({ member_id: membroId }, { onConflict: 'member_id', ignoreDuplicates: true }))
  feito(await adm.from('directory_preferences').upsert({ member_id: membroId }, { onConflict: 'member_id', ignoreDuplicates: true }))
  if (m.status === 'invited') {
    // Boas-vindas ANTES de virar ativo (idempotente pela chave): se falhar,
    // o onboarding é refeito e o bônus sai na próxima vez.
    const regra = talvez(await adm.from('gold_coin_rules').select('id, amount, name').eq('code', 'boas_vindas').eq('active', true).maybeSingle())
    if (regra && regra.amount > 0) {
      await lancarCoins({ membroId, valor: regra.amount, tipo: 'credit', motivo: regra.name, regraId: regra.id, chave: `boas_vindas:${membroId}`, operador: null })
    }
    const virou = await adm.from('members').update({ status: 'active' }).eq('id', membroId).eq('status', 'invited').select('id')
    if (!virou.data?.length) return
    feito(
      await adm.from('member_notifications').insert({ member_id: membroId, kind: 'boas_vindas', title: 'Sua credencial está ativa.', body: 'O Grand Lobby é o seu ponto de partida.', link: '/credential' }),
    )
    await auditar({ ator: { userId, tipo: 'member' }, acao: 'onboarding.concluido', membroId })
  }
}
