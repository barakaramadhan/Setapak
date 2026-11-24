-- SETAPAK — pembaruan opsional (aman dijalankan berulang).
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.

-- 1) updated_at otomatis terisi saat trip / chat diubah.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

drop trigger if exists chats_set_updated_at on public.chats;
create trigger chats_set_updated_at before update on public.chats
  for each row execute function public.set_updated_at();

-- 2) Chat yang di-pin cepat ditemukan.
create index if not exists chats_user_pinned_idx
  on public.chats (user_id, pinned desc, updated_at desc);

-- 3) "For you" kini murni dari AI. Cache lama tidak dipakai lagi; bersihkan bila mau.
-- delete from public.city_recommendations;
