-- SETAPAK — khusus fitur Settings (tema, kota, lokasi, foto profil). Jalankan di SQL Editor Supabase.
-- Sudah termasuk di schema.sql; file ini untuk database yang sudah ada.
-- PENGATURAN & FOTO PROFIL USER (tema, kota rumah, lokasi, foto)
-- Aman dijalankan ulang. Foto disimpan di Storage bucket "avatars".
-- ---------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light','dark','system')),
  home_city text not null default '',
  home_lat double precision,
  home_lng double precision,
  location_access boolean not null default false,
  photo_path text,                       -- mis. <user_id>/avatar.jpg di bucket avatars
  photo_url text,                        -- URL publik (sudah + ?v=waktu agar tidak ter-cache)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_owner_select" on public.user_settings;
create policy "user_settings_owner_select" on public.user_settings
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_settings_owner_insert" on public.user_settings;
create policy "user_settings_owner_insert" on public.user_settings
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_settings_owner_update" on public.user_settings;
create policy "user_settings_owner_update" on public.user_settings
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_settings_owner_delete" on public.user_settings;
create policy "user_settings_owner_delete" on public.user_settings
  for delete to authenticated using (auth.uid() = user_id);

-- set_updated_at dibuat di sini juga supaya schema.sql berdiri sendiri.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Bucket foto profil: publik untuk dibaca, tapi hanya pemilik yang boleh tulis
-- di folder miliknya sendiri (<user_id>/...). Maksimal 2 MB, hanya gambar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_owner_select" on storage.objects;
create policy "avatars_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
