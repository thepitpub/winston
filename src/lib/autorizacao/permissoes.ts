/** Catálogo de permissões. O banco (role_permissions) é a fonte; isto tipa o código. */
export const PERMISSOES = [
  'members.read',
  'members.write',
  'invitations.manage',
  'sessions.revoke',
  'checkins.validate',
  'checkins.manage',
  'announcements.manage',
  'concierge.read',
  'concierge.respond',
  'concierge.assign',
  'coins.read',
  'coins.adjust',
  'coins.rules',
  'directory.moderate',
  'audit.read',
  'settings.manage',
  'roles.manage',
  'imports.run',
  'otp.deliver',
  // Só por concessão explícita, nunca por papel:
  'cs.read',
  'cs.write',
] as const

export type Permissao = (typeof PERMISSOES)[number]
export type Papel = 'super_admin' | 'admin' | 'staff' | 'member'

export const PAPEL_ROTULO: Record<Papel, string> = { super_admin: 'Super admin', admin: 'Administrador', staff: 'Equipe', member: 'Membro' }

export const PERMISSAO_ROTULO: Record<Permissao, string> = {
  'members.read': 'Ver membros',
  'members.write': 'Editar membros',
  'invitations.manage': 'Emitir e revogar convites',
  'sessions.revoke': 'Derrubar sessões',
  'checkins.validate': 'Validar check-in',
  'checkins.manage': 'Gerir eventos de check-in',
  'announcements.manage': 'Gerir comunicados',
  'concierge.read': 'Ver o Concierge Desk',
  'concierge.respond': 'Responder solicitações',
  'concierge.assign': 'Atribuir solicitações',
  'coins.read': 'Ver o ledger de Gold Coins',
  'coins.adjust': 'Lançar ajustes de Gold Coins',
  'coins.rules': 'Gerir regras de Gold Coins',
  'directory.moderate': 'Moderar o diretório',
  'audit.read': 'Ver a auditoria',
  'settings.manage': 'Mudar configurações',
  'roles.manage': 'Gerir papéis e permissões',
  'imports.run': 'Executar importações',
  'otp.deliver': 'Entregar códigos de acesso',
  'cs.read': 'Ler a inteligência privada (CS)',
  'cs.write': 'Editar a inteligência privada (CS)',
}

/** Permissões que só existem por concessão explícita a uma pessoa. */
export const SO_EXPLICITAS: readonly Permissao[] = ['cs.read', 'cs.write']
