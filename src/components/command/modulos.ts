import type { Permissao } from '@/lib/autorizacao/permissoes'

/** Os módulos do Command, na ordem do trilho. Cada um diz a(s) permissão(ões) que abrem a porta: basta uma. */
export const MODULOS = [
  { href: '/admin', nome: 'Overview', codigo: 'OV', permissao: null },
  { href: '/admin/members', nome: 'Members', codigo: 'MB', permissao: 'members.read' },
  { href: '/admin/checkins', nome: 'Check-in Control', codigo: 'CK', permissao: 'checkins.validate' },
  { href: '/admin/concierge', nome: 'Concierge Desk', codigo: 'CD', permissao: 'concierge.read' },
  { href: '/admin/announcements', nome: 'Announcements', codigo: 'AN', permissao: 'announcements.manage' },
  { href: '/admin/gold-coins', nome: 'Gold Coins Ledger', codigo: 'GC', permissao: 'coins.read' },
  { href: '/admin/invitations', nome: 'Invitations & Access', codigo: 'IA', permissao: ['invitations.manage', 'otp.deliver'] },
  { href: '/admin/directory', nome: 'Directory Governance', codigo: 'DG', permissao: 'directory.moderate' },
  { href: '/admin/audit', nome: 'Audit & Settings', codigo: 'AU', permissao: 'audit.read' },
] as const satisfies readonly { href: string; nome: string; codigo: string; permissao: Permissao | readonly Permissao[] | null }[]

/** O módulo aparece para quem tem ao menos uma das permissões dele. */
export function moduloVisivel(m: { permissao: Permissao | readonly Permissao[] | null }, permissoes: readonly string[]): boolean {
  if (m.permissao === null) return true
  const lista: readonly Permissao[] = typeof m.permissao === 'string' ? [m.permissao] : m.permissao
  return lista.some((p) => permissoes.includes(p))
}
