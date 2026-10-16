'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ambiente } from '@/lib/ambiente'
import { executar, ErroDeRegra, type Resultado } from '@/lib/acao'
import { auditar } from '@/lib/auditoria'
import { exigirPermissao } from '@/lib/autorizacao/equipe'
import { clienteSecreto, talvez } from '@/lib/db/clientes'
import { decifrar } from '@/lib/dominio/cripto'
import { estadoDoDesafio } from '@/lib/dominio/regras-acesso'

/**
 * Entrega manual do código (provedor "manual"): revela o código UMA vez
 * para a pessoa da equipe enviar pelo WhatsApp oficial, marca como
 * entregue e apaga a cifra. Cada revelação fica na auditoria.
 */
export async function revelarCodigo(desafioId: string): Promise<Resultado<{ codigo: string; telefone: string }>> {
  return executar(async () => {
    const eq = await exigirPermissao('otp.deliver')
    const id = z.uuid().parse(desafioId)
    const adm = clienteSecreto()
    const d = talvez(await adm.from('auth_otp_challenges').select('id, phone_e164, code_cipher, member_id, attempts, max_attempts, expires_at, consumed_at, delivery_status').eq('id', id).maybeSingle())
    if (!d || d.delivery_status !== 'manual_pending' || !d.code_cipher) throw new ErroDeRegra('Código já entregue ou indisponível.')
    if (estadoDoDesafio(d, Date.now()) !== 'valido') throw new ErroDeRegra('Este código expirou. O membro precisa pedir outro.')
    const r = await adm.from('auth_otp_challenges').update({ delivery_status: 'manual_delivered', delivered_by: eq.id.userId, code_cipher: null }).eq('id', id).eq('delivery_status', 'manual_pending').select('id')
    if (!r.data?.length) throw new ErroDeRegra('Outra pessoa da equipe acabou de entregar este código.')
    const codigo = decifrar(ambiente().CH_SEGREDO, d.code_cipher)
    await auditar({ ator: { userId: eq.id.userId, tipo: 'staff' }, acao: 'otp.entregue_manual', membroId: d.member_id, recurso: { tipo: 'otp', id } })
    revalidatePath('/admin/invitations')
    return { codigo, telefone: d.phone_e164 }
  })
}
