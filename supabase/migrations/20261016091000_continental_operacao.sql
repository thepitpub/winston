-- =====================================================================
-- CONTINENTAL HERITAGE — operação: check-in, Gold Coins, diretório,
-- concierge (Winston + Service Bell), notificações e comunicados.
-- Operações que precisam de transação viram funções SQL executáveis só
-- pela chave secreta (o servidor chama depois de autorizar).
-- =====================================================================

-- -------------------------------------------------------------- check-in

create table if not exists public.checkin_events (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 1 and 140),
  kind               text not null default 'event' check (kind in ('house', 'event')),
  location           text,
  starts_at          timestamptz not null,
  ends_at            timestamptz,
  duplicate_policy   text not null default 'once_per_event' check (duplicate_policy in ('once_per_event', 'once_per_day', 'unlimited')),
  status             text not null default 'open' check (status in ('draft', 'open', 'closed')),
  visible_to_members boolean not null default false,
  created_by         uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_checkin_events_touch before update on public.checkin_events for each row execute function public.ch_touch();

create table if not exists public.member_checkins (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.members (id) on delete cascade,
  event_id          uuid not null references public.checkin_events (id) on delete restrict,
  validated_at      timestamptz not null default now(),
  local_day         date not null,
  operator_user_id  uuid references auth.users (id),
  source            text not null check (source in ('manual', 'credential_code', 'qr')),
  exception_reason  text
);
create index if not exists idx_member_checkins_member on public.member_checkins (member_id, validated_at desc);
create index if not exists idx_member_checkins_event on public.member_checkins (event_id, validated_at desc);

create table if not exists public.checkin_validation_logs (
  id                uuid primary key default gen_random_uuid(),
  at                timestamptz not null default now(),
  operator_user_id  uuid references auth.users (id),
  event_id          uuid references public.checkin_events (id) on delete set null,
  member_id         uuid references public.members (id) on delete set null,
  query             text,
  source            text not null,
  result            text not null check (result in ('validated', 'not_found', 'already_validated', 'suspended', 'no_permission', 'event_closed', 'exception_granted')),
  reason            text,
  checkin_id        uuid references public.member_checkins (id) on delete set null
);
create index if not exists idx_validation_logs_at on public.checkin_validation_logs (at desc);

-- Valida um check-in numa transação: trava por (membro, evento), aplica a
-- política de duplicidade, permite exceção com justificativa e registra a
-- tentativa, qualquer que seja o resultado.
create or replace function public.ch_validar_checkin(
  p_member uuid, p_event uuid, p_operator uuid, p_source text,
  p_query text default null, p_exception_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_member public.members%rowtype;
  v_event  public.checkin_events%rowtype;
  v_day    date := (now() at time zone 'America/Sao_Paulo')::date;
  v_dup    uuid;
  v_ck     uuid;
  v_result text;
begin
  select * into v_event from public.checkin_events where id = p_event;
  if not found or v_event.status <> 'open' then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result)
    values (p_operator, case when found then p_event end, p_member, p_query, p_source, 'event_closed');
    return jsonb_build_object('result', 'event_closed');
  end if;

  select * into v_member from public.members where id = p_member;
  if not found then
    insert into public.checkin_validation_logs (operator_user_id, event_id, query, source, result)
    values (p_operator, p_event, p_query, p_source, 'not_found');
    return jsonb_build_object('result', 'not_found');
  end if;

  if v_member.status in ('suspended', 'revoked') then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result)
    values (p_operator, p_event, p_member, p_query, p_source, 'suspended');
    return jsonb_build_object('result', 'suspended', 'status', v_member.status);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_member::text || p_event::text, 0));

  select id into v_dup from public.member_checkins
  where member_id = p_member and event_id = p_event
    and (v_event.duplicate_policy = 'once_per_event'
         or (v_event.duplicate_policy = 'once_per_day' and local_day = v_day))
  order by validated_at desc limit 1;

  if v_dup is not null and coalesce(btrim(p_exception_reason), '') = '' then
    insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, checkin_id)
    values (p_operator, p_event, p_member, p_query, p_source, 'already_validated', v_dup);
    return jsonb_build_object('result', 'already_validated', 'checkin_id', v_dup);
  end if;

  insert into public.member_checkins (member_id, event_id, local_day, operator_user_id, source, exception_reason)
  values (p_member, p_event, v_day, p_operator, p_source, nullif(btrim(coalesce(p_exception_reason, '')), ''))
  returning id into v_ck;

  v_result := case when v_dup is not null then 'exception_granted' else 'validated' end;
  insert into public.checkin_validation_logs (operator_user_id, event_id, member_id, query, source, result, reason, checkin_id)
  values (p_operator, p_event, p_member, p_query, p_source, v_result, p_exception_reason, v_ck);
  return jsonb_build_object('result', v_result, 'checkin_id', v_ck);
end $$;
revoke all on function public.ch_validar_checkin(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;

-- ------------------------------------------------------------ Gold Coins

create table if not exists public.gold_coin_accounts (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null unique references public.members (id) on delete cascade,
  status      text not null default 'open' check (status in ('open', 'frozen')),
  created_at  timestamptz not null default now()
);

create table if not exists public.gold_coin_rules (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[a-z0-9_]{3,40}$'),
  name         text not null,
  description  text,
  amount       integer not null check (amount <> 0),
  active       boolean not null default true,
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_coin_rules_touch before update on public.gold_coin_rules for each row execute function public.ch_touch();

-- Imutável: o saldo é a soma; correção é estorno, nunca edição.
create table if not exists public.gold_coin_transactions (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.gold_coin_accounts (id) on delete restrict,
  amount            integer not null check (amount <> 0),
  kind              text not null check (kind in ('credit', 'debit', 'reversal', 'adjustment')),
  reason            text not null check (char_length(reason) between 3 and 300),
  rule_id           uuid references public.gold_coin_rules (id),
  reference         text,
  operator_user_id  uuid references auth.users (id),
  reverses_id       uuid unique references public.gold_coin_transactions (id),
  idempotency_key   text not null unique,
  created_at        timestamptz not null default now(),
  check ((kind = 'credit' and amount > 0) or (kind = 'debit' and amount < 0) or kind in ('reversal', 'adjustment'))
);
create index if not exists idx_coin_tx_account on public.gold_coin_transactions (account_id, created_at desc);

create or replace function public.ch_coin_imutavel() returns trigger language plpgsql as $$
begin raise exception 'gold_coin_transactions é somente inserção'; end $$;
create trigger trg_coin_tx_imutavel before update or delete on public.gold_coin_transactions for each row execute function public.ch_coin_imutavel();

create or replace view public.gold_coin_balances with (security_invoker = true) as
  select a.id as account_id, a.member_id, coalesce(sum(t.amount), 0)::integer as balance, max(t.created_at) as last_movement_at
  from public.gold_coin_accounts a left join public.gold_coin_transactions t on t.account_id = a.id
  group by a.id, a.member_id;

-- Lança uma movimentação. Idempotente pela chave; débito não deixa o saldo negativo.
create or replace function public.ch_coin_lancar(
  p_member uuid, p_amount integer, p_kind text, p_reason text,
  p_idempotency_key text, p_operator uuid default null, p_rule uuid default null,
  p_reference text default null, p_reverses uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_acc   public.gold_coin_accounts%rowtype;
  v_saldo integer;
  v_tx    public.gold_coin_transactions%rowtype;
begin
  select * into v_tx from public.gold_coin_transactions where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', v_tx.id); end if;

  insert into public.gold_coin_accounts (member_id) values (p_member) on conflict (member_id) do nothing;
  select * into v_acc from public.gold_coin_accounts where member_id = p_member for update;
  if v_acc.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'account_frozen'); end if;

  select coalesce(sum(amount), 0) into v_saldo from public.gold_coin_transactions where account_id = v_acc.id;
  if v_saldo + p_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', v_saldo);
  end if;

  insert into public.gold_coin_transactions (account_id, amount, kind, reason, rule_id, reference, operator_user_id, reverses_id, idempotency_key)
  values (v_acc.id, p_amount, p_kind, p_reason, p_rule, p_reference, p_operator, p_reverses, p_idempotency_key)
  returning * into v_tx;
  return jsonb_build_object('ok', true, 'duplicate', false, 'transaction_id', v_tx.id, 'balance', v_saldo + p_amount);
end $$;
revoke all on function public.ch_coin_lancar(uuid, integer, text, text, text, uuid, uuid, text, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------- diretório

create table if not exists public.directory_preferences (
  member_id          uuid primary key references public.members (id) on delete cascade,
  visible            boolean not null default false,
  display_name       text,
  profession         text,
  company            text,
  city               text,
  interests          text[] not null default '{}',
  skills             text[] not null default '{}',
  description        text check (char_length(description) <= 600),
  -- Contatos que o membro ESCOLHE mostrar; só a conexões aceitas.
  contact_whatsapp   boolean not null default false,
  contact_email      text,
  contact_instagram  text,
  contact_linkedin   text,
  consented_at       timestamptz,
  moderation_status  text not null default 'ok' check (moderation_status in ('ok', 'hidden')),
  moderation_note    text,
  moderated_by       uuid references auth.users (id),
  updated_at         timestamptz not null default now()
);
create trigger trg_directory_touch before update on public.directory_preferences for each row execute function public.ch_touch();

create table if not exists public.member_connections (
  id             uuid primary key default gen_random_uuid(),
  requester_id   uuid not null references public.members (id) on delete cascade,
  addressee_id   uuid not null references public.members (id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked', 'cancelled')),
  message        text check (char_length(message) <= 400),
  blocked_by     uuid references public.members (id),
  created_at     timestamptz not null default now(),
  responded_at   timestamptz,
  check (requester_id <> addressee_id)
);
-- Um vínculo por par, em qualquer direção.
create unique index if not exists uq_connection_par on public.member_connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table if not exists public.directory_events (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.members (id) on delete cascade,
  kind              text not null check (kind in ('search', 'view', 'connect_request')),
  target_member_id  uuid references public.members (id) on delete cascade,
  query             jsonb,
  at                timestamptz not null default now()
);

-- -------------------------------------------------------------- concierge

create table if not exists public.concierge_conversations (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.members (id) on delete cascade,
  title            text,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now()
);
create index if not exists idx_conversations_member on public.concierge_conversations (member_id, last_message_at desc);

create table if not exists public.concierge_requests (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references public.members (id) on delete cascade,
  category           text not null check (category in ('concierge', 'acesso', 'beneficios', 'credencial', 'suporte', 'outros')),
  subject            text not null check (char_length(subject) between 3 and 140),
  status             text not null default 'aberta' check (status in ('aberta', 'em_atendimento', 'aguardando_membro', 'resolvida', 'encerrada')),
  priority           text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  origin             text not null default 'service_bell' check (origin in ('service_bell', 'winston')),
  conversation_id    uuid references public.concierge_conversations (id) on delete set null,
  idempotency_key    text not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  closed_at          timestamptz
);
create index if not exists idx_requests_status on public.concierge_requests (status, updated_at desc);
create index if not exists idx_requests_member on public.concierge_requests (member_id, created_at desc);
create trigger trg_requests_touch before update on public.concierge_requests for each row execute function public.ch_touch();

create table if not exists public.concierge_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references public.concierge_conversations (id) on delete cascade,
  request_id       uuid references public.concierge_requests (id) on delete cascade,
  author_kind      text not null check (author_kind in ('member', 'winston', 'staff', 'system')),
  author_user_id   uuid references auth.users (id),
  author_name      text,
  body             text not null check (char_length(body) between 1 and 4000),
  internal         boolean not null default false,
  intent           text,
  feedback         smallint check (feedback in (-1, 1)),
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  check ((conversation_id is null) <> (request_id is null)),
  check (not internal or author_kind = 'staff')
);
create index if not exists idx_messages_conversation on public.concierge_messages (conversation_id, created_at);
create index if not exists idx_messages_request on public.concierge_messages (request_id, created_at);

create table if not exists public.concierge_assignments (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null references public.concierge_requests (id) on delete cascade,
  assignee_user_id  uuid not null references auth.users (id),
  assigned_by       uuid references auth.users (id),
  assigned_at       timestamptz not null default now(),
  unassigned_at     timestamptz
);
create unique index if not exists uq_assignment_atual on public.concierge_assignments (request_id) where unassigned_at is null;

create table if not exists public.member_notifications (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text check (link is null or link ~ '^/'),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifications_member on public.member_notifications (member_id, created_at desc);

-- ------------------------------------------------------------ comunicados

create table if not exists public.portal_announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 120),
  body         text not null check (char_length(body) between 1 and 1200),
  cta_label    text check (char_length(cta_label) <= 40),
  cta_target   text check (cta_target is null or cta_target ~ '^(/|https://)'),
  kind         text not null default 'modal' check (kind in ('modal', 'banner', 'lobby')),
  frequency    text not null default 'once' check (frequency in ('once', 'session', 'always', 'until_ack')),
  priority     smallint not null default 50 check (priority between 0 and 100),
  audience     jsonb not null default '{"all": true}',
  pages        text[] not null default '{}',
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  active       boolean not null default false,
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create trigger trg_announcements_touch before update on public.portal_announcements for each row execute function public.ch_touch();

create table if not exists public.announcement_impressions (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references public.portal_announcements (id) on delete cascade,
  member_id        uuid not null references public.members (id) on delete cascade,
  page             text,
  device           text check (device in ('mobile', 'desktop')),
  at               timestamptz not null default now()
);
create index if not exists idx_impressions_ann on public.announcement_impressions (announcement_id, member_id);

create table if not exists public.announcement_clicks (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references public.portal_announcements (id) on delete cascade,
  member_id        uuid not null references public.members (id) on delete cascade,
  page             text,
  at               timestamptz not null default now()
);

create table if not exists public.announcement_dismissals (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references public.portal_announcements (id) on delete cascade,
  member_id        uuid not null references public.members (id) on delete cascade,
  kind             text not null check (kind in ('dismiss', 'acknowledge')),
  page             text,
  at               timestamptz not null default now()
);
create index if not exists idx_dismissals_ann on public.announcement_dismissals (announcement_id, member_id);

-- Segmentação NO SERVIDOR. Audiência: {"all":true} ou combinação de
-- {"statuses":[...], "categories":[...], "member_ids":[...]} (todas as
-- chaves presentes precisam casar). A frequência "once" e "until_ack" é
-- resolvida aqui; "session" e "always" pelo cliente, que conhece a sessão.
create or replace function public.ch_comunicados_do_membro(p_member uuid, p_page text default null)
returns setof public.portal_announcements
language sql stable security definer set search_path = public as $$
  select a.* from public.portal_announcements a
  join public.members m on m.id = p_member
  where a.active and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
    and (cardinality(a.pages) = 0 or p_page is null or p_page = any (a.pages)
         or exists (select 1 from unnest(a.pages) pg where pg <> '/' and p_page like pg || '/%'))
    and (
      coalesce((a.audience ->> 'all')::boolean, false)
      or (
        (not (a.audience ? 'statuses')   or m.status   = any (array(select jsonb_array_elements_text(a.audience -> 'statuses'))))
        and (not (a.audience ? 'categories') or m.category = any (array(select jsonb_array_elements_text(a.audience -> 'categories'))))
        and (not (a.audience ? 'member_ids') or m.id::text = any (array(select jsonb_array_elements_text(a.audience -> 'member_ids'))))
        and (a.audience ? 'statuses' or a.audience ? 'categories' or a.audience ? 'member_ids')
      )
    )
    and not (a.frequency = 'once' and exists (
      select 1 from public.announcement_impressions i where i.announcement_id = a.id and i.member_id = p_member))
    and not (a.frequency = 'until_ack' and exists (
      select 1 from public.announcement_dismissals d where d.announcement_id = a.id and d.member_id = p_member and d.kind = 'acknowledge'))
  order by a.priority desc, a.starts_at desc
$$;
revoke all on function public.ch_comunicados_do_membro(uuid, text) from public, anon, authenticated;

-- ======================================================================
-- RLS
-- ======================================================================

alter table public.checkin_events            enable row level security;
alter table public.member_checkins           enable row level security;
alter table public.checkin_validation_logs   enable row level security;
alter table public.gold_coin_accounts        enable row level security;
alter table public.gold_coin_rules           enable row level security;
alter table public.gold_coin_transactions    enable row level security;
alter table public.directory_preferences     enable row level security;
alter table public.member_connections        enable row level security;
alter table public.directory_events          enable row level security;
alter table public.concierge_conversations   enable row level security;
alter table public.concierge_requests        enable row level security;
alter table public.concierge_messages        enable row level security;
alter table public.concierge_assignments     enable row level security;
alter table public.member_notifications      enable row level security;
alter table public.portal_announcements      enable row level security;
alter table public.announcement_impressions  enable row level security;
alter table public.announcement_clicks       enable row level security;
alter table public.announcement_dismissals   enable row level security;

revoke all on public.checkin_validation_logs, public.portal_announcements, public.announcement_impressions,
  public.announcement_clicks, public.announcement_dismissals, public.concierge_assignments, public.directory_events
  from anon, authenticated;

-- Membro: o que é dele.
create policy checkins_self on public.member_checkins for select to authenticated using (member_id = public.current_member_id());
create policy events_visible on public.checkin_events for select to authenticated
  using ((visible_to_members and status <> 'draft' and public.current_member_id() is not null) or public.has_permission('checkins.manage'));

create policy coin_accounts_self on public.gold_coin_accounts for select to authenticated using (member_id = public.current_member_id());
create policy coin_tx_self on public.gold_coin_transactions for select to authenticated
  using (account_id in (select id from public.gold_coin_accounts where member_id = public.current_member_id()));
create policy coin_rules_read on public.gold_coin_rules for select to authenticated using (active and public.current_member_id() is not null);

-- Diretório: o próprio registro, ou quem escolheu aparecer (e não foi ocultado),
-- e só para membros ativos. Contatos são liberados pelo servidor, não aqui.
create policy directory_self on public.directory_preferences for select to authenticated using (member_id = public.current_member_id());
create policy directory_visible on public.directory_preferences for select to authenticated
  using (visible and moderation_status = 'ok' and public.current_member_id() is not null
         and exists (select 1 from public.members m where m.id = member_id and m.status = 'active'));

create policy connections_self on public.member_connections for select to authenticated
  using (public.current_member_id() in (requester_id, addressee_id));

create policy conversations_self on public.concierge_conversations for select to authenticated using (member_id = public.current_member_id());
create policy requests_self on public.concierge_requests for select to authenticated using (member_id = public.current_member_id());
-- Notas internas da equipe NUNCA aparecem para o membro.
create policy messages_self on public.concierge_messages for select to authenticated
  using (not internal and (
    conversation_id in (select id from public.concierge_conversations where member_id = public.current_member_id())
    or request_id in (select id from public.concierge_requests where member_id = public.current_member_id())));

create policy notifications_self on public.member_notifications for select to authenticated using (member_id = public.current_member_id());

-- Equipe (defesa em profundidade; o servidor também checa).
create policy checkins_staff on public.member_checkins for select to authenticated using (public.has_permission('checkins.validate'));
create policy coin_tx_staff on public.gold_coin_transactions for select to authenticated using (public.has_permission('coins.read'));
create policy coin_accounts_staff on public.gold_coin_accounts for select to authenticated using (public.has_permission('coins.read'));
create policy requests_staff on public.concierge_requests for select to authenticated using (public.has_permission('concierge.read'));
create policy messages_staff on public.concierge_messages for select to authenticated using (public.has_permission('concierge.read'));
