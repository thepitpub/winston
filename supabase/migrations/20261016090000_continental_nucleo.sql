-- =====================================================================
-- CONTINENTAL HERITAGE — núcleo (identidade, papéis, membros, CS privado,
-- convites, OTP, sessões, auditoria, importação).
--
-- Aditiva: não altera nenhuma tabela existente do projeto (LABPUB e o
-- portal anterior, `membros` e afins, ficam intactos até o corte).
--
-- Regras de acesso:
--  * RLS ligada em todas as tabelas.
--  * Membro lê o que é dele via JWT (auth.uid()); escreve só por ação de
--    servidor, que valida com Zod e decide a partir da sessão.
--  * Equipe lê/escreve por ação de servidor com a chave secreta, DEPOIS de
--    checar permissão + AAL2 no servidor. As políticas para equipe abaixo
--    são defesa em profundidade e também exigem aal2.
--  * Tabelas sigilosas (CS privado, linhas brutas de importação, OTP,
--    convites, auditoria) têm privilégios revogados de anon/authenticated:
--    nem uma política mal escrita as expõe pela API.
-- =====================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------- utilidades

create or replace function public.ch_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ------------------------------------------------------- papéis/permissões

create table if not exists public.member_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('super_admin', 'admin', 'staff', 'member')),
  granted_by  uuid references auth.users (id),
  granted_at  timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.role_permissions (
  role        text not null check (role in ('super_admin', 'admin', 'staff', 'member')),
  permission  text not null,
  primary key (role, permission)
);

-- Concessão explícita por pessoa (ex.: cs.read). Nunca vem de papel.
create table if not exists public.user_permissions (
  user_id     uuid not null references auth.users (id) on delete cascade,
  permission  text not null,
  granted_by  uuid references auth.users (id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, permission)
);

create table if not exists public.staff_members (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  status        text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  is_synthetic  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_staff_touch before update on public.staff_members for each row execute function public.ch_touch();

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references auth.users (id),
  updated_at  timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('mfa_obrigatorio_membro', 'true'),
  ('otp_validade_segundos', '600'),
  ('otp_max_tentativas', '5'),
  ('otp_max_envios_10min', '3'),
  ('convite_validade_dias', '7'),
  ('winston_limite_hora', '30')
on conflict (key) do nothing;

-- Permissões por papel. cs.read/cs.write NÃO entram em papel nenhum:
-- só por concessão explícita (user_permissions).
insert into public.role_permissions (role, permission) values
  ('super_admin', 'members.read'), ('super_admin', 'members.write'), ('super_admin', 'invitations.manage'),
  ('super_admin', 'sessions.revoke'), ('super_admin', 'checkins.validate'), ('super_admin', 'checkins.manage'),
  ('super_admin', 'announcements.manage'), ('super_admin', 'concierge.read'), ('super_admin', 'concierge.respond'),
  ('super_admin', 'concierge.assign'), ('super_admin', 'coins.read'), ('super_admin', 'coins.adjust'),
  ('super_admin', 'coins.rules'), ('super_admin', 'directory.moderate'), ('super_admin', 'audit.read'),
  ('super_admin', 'settings.manage'), ('super_admin', 'roles.manage'), ('super_admin', 'imports.run'),
  ('super_admin', 'otp.deliver'),
  ('admin', 'members.read'), ('admin', 'members.write'), ('admin', 'invitations.manage'),
  ('admin', 'sessions.revoke'), ('admin', 'checkins.validate'), ('admin', 'checkins.manage'),
  ('admin', 'announcements.manage'), ('admin', 'concierge.read'), ('admin', 'concierge.respond'),
  ('admin', 'concierge.assign'), ('admin', 'coins.read'), ('admin', 'coins.adjust'),
  ('admin', 'directory.moderate'), ('admin', 'audit.read'), ('admin', 'imports.run'), ('admin', 'otp.deliver'),
  ('staff', 'members.read'), ('staff', 'checkins.validate'), ('staff', 'concierge.read'),
  ('staff', 'concierge.respond'), ('staff', 'coins.read'), ('staff', 'otp.deliver')
on conflict do nothing;

-- O JWT está em AAL2 (MFA verificado nesta sessão)?
create or replace function public.ch_aal2() returns boolean
language sql stable as $$ select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;

-- Permissão efetiva do usuário do JWT. Equipe precisa de AAL2.
create or replace function public.has_permission(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.ch_aal2() and exists (
    select 1 from public.staff_members s where s.user_id = auth.uid() and s.status = 'active'
  ) and (
    exists (select 1 from public.member_roles r join public.role_permissions rp on rp.role = r.role
            where r.user_id = auth.uid() and rp.permission = p)
    or exists (select 1 from public.user_permissions u where u.user_id = auth.uid() and u.permission = p)
  )
$$;

-- ------------------------------------------------------------- importação

create table if not exists public.import_batches (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('members', 'private_cs')),
  mode            text not null check (mode in ('dry_run', 'apply')),
  status          text not null default 'running' check (status in ('running', 'completed', 'failed', 'compensated')),
  source_file     text not null,
  source_sha256   text not null,
  operator        text not null,
  counts          jsonb not null default '{}',
  report          jsonb not null default '{}',
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);

create table if not exists public.import_rows (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references public.import_batches (id) on delete cascade,
  source_row    integer not null,
  raw           jsonb not null,
  normalized    jsonb,
  action        text not null check (action in ('insert', 'update', 'unchanged', 'skip', 'review', 'error')),
  member_id     uuid,
  note          text,
  created_at    timestamptz not null default now(),
  unique (batch_id, source_row)
);

create table if not exists public.import_errors (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.import_batches (id) on delete cascade,
  source_row  integer,
  field       text,
  message     text not null,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- membros

create table if not exists public.members (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users (id) on delete set null,
  status           text not null default 'pending' check (status in ('pending', 'invited', 'active', 'suspended', 'revoked')),
  category         text not null default 'member' check (category in ('founder', 'member', 'honorary')),
  full_name        text not null check (char_length(full_name) between 1 and 160),
  display_name     text,
  phone_e164       text unique check (phone_e164 ~ '^\+[1-9][0-9]{9,14}$'),
  founder_number   integer unique check (founder_number > 0),
  joined_at        date,
  is_synthetic     boolean not null default false,
  -- proveniência
  source_system    text,
  source_file      text,
  source_row       integer,
  legacy_id        text,
  import_batch_id  uuid references public.import_batches (id),
  imported_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (source_system, legacy_id)
);
create index if not exists idx_members_status on public.members (status);
create trigger trg_members_touch before update on public.members for each row execute function public.ch_touch();

-- O membro da sessão (convidado em onboarding ou ativo).
create or replace function public.current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.members m
  where m.user_id = auth.uid() and m.status in ('invited', 'active')
  limit 1
$$;

-- Dados DECLARADOS pelo membro (planilha de fundadores, menos a análise).
create table if not exists public.member_profiles (
  member_id                uuid primary key references public.members (id) on delete cascade,
  birth_date               date,
  birthday_text            text,
  marital_status           text,
  hometown                 text,
  base_city                text,
  other_cities             text[] not null default '{}',
  international_cities     text[] not null default '{}',
  cities_context           text,
  family                   jsonb not null default '{}',
  sports_team              text,
  spirituality             text,
  open_to_debate           text,
  business                 text,
  sectors                  text[] not null default '{}',
  curiosity                text,
  best_times               text[] not null default '{}',
  best_days                text[] not null default '{}',
  event_frequency          text,
  interests                text[] not null default '{}',
  formats                  text[] not null default '{}',
  format_notes             text,
  experiences              text[] not null default '{}',
  drinks                   text[] not null default '{}',
  drink_notes              text,
  dietary_restrictions     text,
  food_preferences         text,
  family_events_interest   smallint check (family_events_interest between 1 and 5),
  family_frequency         text,
  public_exposure          smallint check (public_exposure between 1 and 5),
  contribution_profile     text[] not null default '{}',
  concierge_channels       text[] not null default '{}',
  proactivity              smallint check (proactivity between 1 and 5),
  how_to_contribute        text,
  brand_referrals          text,
  declared_at              timestamptz,
  source_file              text,
  source_row               integer,
  updated_at               timestamptz not null default now()
);
create trigger trg_profiles_touch before update on public.member_profiles for each row execute function public.ch_touch();

-- Inteligência PRIVADA de CS. Nunca chega ao membro nem ao Winston.
create table if not exists public.member_private_cs (
  member_id               uuid primary key references public.members (id) on delete cascade,
  -- Aba "Enriquecimento Publico (CS)": todas as colunas originais, intactas.
  cs_columns              jsonb not null default '{}',
  cs_source               jsonb,             -- {file, row, sha256, batch_id, imported_at}
  identification_status   text,
  confidence              text,
  recommended_use         text,
  -- Análise comportamental e histórico da planilha de fundadores: INFERÊNCIAS.
  behavioral              jsonb not null default '{}',
  behavioral_source       jsonb,
  relationship_history    text,
  internal_notes          text,
  search_text             text,
  updated_by              uuid references auth.users (id),
  updated_at              timestamptz not null default now()
);
create trigger trg_private_cs_touch before update on public.member_private_cs for each row execute function public.ch_touch();

-- ------------------------------------------------------------ credencial

create table if not exists public.member_credentials (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members (id) on delete cascade,
  public_code  text not null unique check (public_code ~ '^CH-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  status       text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  version      integer not null default 1,
  issued_at    timestamptz not null default now(),
  issued_by    uuid references auth.users (id),
  revoked_at   timestamptz,
  revoked_by   uuid references auth.users (id)
);
-- Uma credencial ativa por membro.
create unique index if not exists uq_credential_ativa on public.member_credentials (member_id) where status = 'active';

-- --------------------------------------------------------------- convites

create table if not exists public.member_invitations (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members (id) on delete cascade,
  token_hash    text not null unique,
  expires_at    timestamptz not null,
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  revoked_at    timestamptz,
  revoked_by    uuid references auth.users (id)
);
create index if not exists idx_invitations_member on public.member_invitations (member_id, created_at desc);

-- ---------------------------------------------------- código temporário

create table if not exists public.auth_otp_challenges (
  id               uuid primary key default gen_random_uuid(),
  purpose          text not null check (purpose in ('login', 'invite', 'phone_change')),
  phone_e164       text not null,
  member_id        uuid references public.members (id) on delete cascade,
  invitation_id    uuid references public.member_invitations (id) on delete cascade,
  code_hash        text not null,
  -- Só no provedor "manual": o código cifrado (AES-GCM) para a casa entregar.
  -- Apagado ao consumir ou expirar. Nunca em texto puro.
  code_cipher      text,
  provider         text not null,
  delivery_status  text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed', 'manual_pending', 'manual_delivered')),
  delivered_by     uuid references auth.users (id),
  attempts         smallint not null default 0,
  max_attempts     smallint not null default 5,
  expires_at       timestamptz not null,
  consumed_at      timestamptz,
  ip_hash          text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_otp_phone on public.auth_otp_challenges (phone_e164, created_at desc);

-- ---------------------------------------------------------------- sessões

-- O id é o `session_id` do JWT do Supabase Auth.
create table if not exists public.member_sessions (
  id              uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  member_id       uuid references public.members (id) on delete cascade,
  is_staff        boolean not null default false,
  user_agent      text,
  ip_hash         text,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  revoked_at      timestamptz,
  revoked_by      uuid references auth.users (id),
  revoke_reason   text
);
create index if not exists idx_sessions_user on public.member_sessions (user_id, created_at desc);

-- Revoga de verdade: apaga as sessões (e refresh tokens) no Auth.
create or replace function public.ch_revogar_sessoes_auth(p_user uuid) returns integer
language plpgsql security definer set search_path = public, auth as $$
declare n integer;
begin
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ch_revogar_sessoes_auth(uuid) from public, anon, authenticated;

-- --------------------------------------------------------------- auditoria

create table if not exists public.audit_logs (
  id              bigint generated always as identity primary key,
  at              timestamptz not null default now(),
  actor_user_id   uuid,
  actor_kind      text not null check (actor_kind in ('member', 'staff', 'system', 'anonymous')),
  action          text not null,
  resource_type   text,
  resource_id     text,
  member_id       uuid,
  result          text not null default 'success' check (result in ('success', 'denied', 'error')),
  ip_hash         text,
  user_agent      text,
  details         jsonb not null default '{}'
);
create index if not exists idx_audit_at on public.audit_logs (at desc);
create index if not exists idx_audit_member on public.audit_logs (member_id, at desc);
create index if not exists idx_audit_action on public.audit_logs (action, at desc);

-- A trilha não se reescreve.
create or replace function public.ch_audit_imutavel() returns trigger language plpgsql as $$
begin raise exception 'audit_logs é somente inserção'; end $$;
create trigger trg_audit_sem_update before update or delete on public.audit_logs for each row execute function public.ch_audit_imutavel();

-- ======================================================================
-- RLS
-- ======================================================================

alter table public.member_roles         enable row level security;
alter table public.role_permissions     enable row level security;
alter table public.user_permissions     enable row level security;
alter table public.staff_members        enable row level security;
alter table public.app_settings         enable row level security;
alter table public.import_batches       enable row level security;
alter table public.import_rows          enable row level security;
alter table public.import_errors        enable row level security;
alter table public.members              enable row level security;
alter table public.member_profiles      enable row level security;
alter table public.member_private_cs    enable row level security;
alter table public.member_credentials   enable row level security;
alter table public.member_invitations   enable row level security;
alter table public.auth_otp_challenges  enable row level security;
alter table public.member_sessions      enable row level security;
alter table public.audit_logs           enable row level security;

-- Sigilosas: nem anon nem authenticated têm privilégio.
revoke all on public.member_private_cs, public.import_batches, public.import_rows, public.import_errors,
  public.member_invitations, public.auth_otp_challenges, public.audit_logs, public.user_permissions,
  public.app_settings
  from anon, authenticated;

-- Membros
create policy members_self on public.members for select to authenticated using (user_id = auth.uid());
create policy members_staff on public.members for select to authenticated using (public.has_permission('members.read'));

create policy profiles_self on public.member_profiles for select to authenticated using (member_id = public.current_member_id());
create policy profiles_staff on public.member_profiles for select to authenticated using (public.has_permission('members.read'));

create policy credentials_self on public.member_credentials for select to authenticated using (member_id = public.current_member_id());
create policy credentials_staff on public.member_credentials for select to authenticated using (public.has_permission('members.read'));

create policy sessions_self on public.member_sessions for select to authenticated using (user_id = auth.uid());

create policy roles_self on public.member_roles for select to authenticated using (user_id = auth.uid());
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy staff_self on public.staff_members for select to authenticated using (user_id = auth.uid());
