# TEMUIN — Admin Setup

Temuin tidak memiliki UI untuk mengelola admin (by design untuk MVP).
Role admin diberikan langsung lewat database Supabase oleh operator project.

Admin dapat mengakses halaman `/admin` (statistik & laporan terbaru) serta
melihat detail laporan/match milik user lain untuk keperluan moderasi.

## Menjadikan user sebagai admin

1. Buka **Supabase Dashboard → SQL Editor** pada project Temuin.
2. Temukan user berdasarkan email (join `auth.users` ↔ `public.profiles`):

   ```sql
   select p.id, u.email, p.full_name, p.role
   from public.profiles p
   join auth.users u on u.id = p.id
   where u.email = 'email-user@contoh.com';
   ```

3. Ubah role menjadi admin:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = '<uuid-user-dari-langkah-2>';
   ```

4. User perlu memuat ulang halaman; tautan Admin akan aktif.

## Mengembalikan role menjadi user biasa

```sql
update public.profiles
set role = 'user'
where id = '<uuid-user>';
```

Kolom `role` memiliki CHECK constraint (`user` / `admin`), nilai lain akan ditolak.

## Peringatan keamanan

- Berikan role admin **hanya** ke akun yang Anda kendalikan sendiri.
- Admin bisa melihat semua laporan, termasuk info verifikasi privat penemu —
  perlakukan akses ini seperti akses operator.
- Jangan pernah membuat endpoint publik / tombol frontend untuk self-promote
  menjadi admin.
- Jangan menaruh `SUPABASE_SERVICE_ROLE_KEY` di dokumen, chat, atau frontend;
  key tersebut hanya boleh ada di `.env.local` / environment variable server.
