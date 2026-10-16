-- Identidades sintéticas (atalho de desenvolvimento) nunca aparecem no
-- diretório de membros reais.
drop policy if exists directory_visible on public.directory_preferences;
create policy directory_visible on public.directory_preferences for select to authenticated
  using (visible and moderation_status = 'ok' and public.current_member_id() is not null
         and exists (select 1 from public.members m where m.id = member_id and m.status = 'active' and not m.is_synthetic));
