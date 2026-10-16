import 'server-only'
import { z } from 'zod'

/**
 * Variáveis de ambiente do servidor, validadas uma vez. Uma variável
 * faltando quebra na primeira leitura, com o nome dela, e não num erro
 * obscuro do Supabase três camadas abaixo.
 */
const Esquema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  CH_SEGREDO: z.string().min(32, 'CH_SEGREDO precisa de 32+ caracteres'),
  CH_URL: z.url().default('http://localhost:3300'),
  CH_OTP_PROVEDOR: z.enum(['manual', 'twilio', 'whatsapp_cloud']).default('manual'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_TEMPLATE: z.string().optional(),
  WHATSAPP_TEMPLATE_IDIOMA: z.string().default('pt_BR'),
  CH_IA_PROVEDOR: z.enum(['nenhum']).default('nenhum'),
  CH_DEV_ATALHO: z.string().optional(),
})

export type Ambiente = z.infer<typeof Esquema>

let cache: Ambiente | null = null
export function ambiente(): Ambiente {
  if (cache) return cache
  // Na Vercel, sem CH_URL definido, os links de convite usam o domínio de
  // produção que a própria Vercel informa (variável de sistema).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const r = Esquema.safeParse({ ...process.env, CH_URL: process.env.CH_URL || (vercel ? `https://${vercel}` : undefined) })
  if (!r.success) {
    const faltas = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Ambiente inválido: ${faltas}`)
  }
  cache = r.data
  return cache
}

/** Atalho de desenvolvimento: nunca em produção, por construção. */
export function atalhoDevLigado(): boolean {
  return process.env.NODE_ENV !== 'production' && ambiente().CH_DEV_ATALHO === '1'
}
