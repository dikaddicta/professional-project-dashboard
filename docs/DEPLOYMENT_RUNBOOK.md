# Deployment Runbook

Runbook ini digunakan untuk deployment Professional Project Dashboard ke GitHub, Vercel, dan Supabase.

## 1. Local Validation

Jalankan dari root project:

```powershell
cd "D:\PRIBADI\4. WEBSITE\cywa_project_dashboard_theme_clean"

node --check app.js
node --check report-export.js
node --check data.js
```

## 2. Database Reference

Struktur database final tersedia di:

```text
supabase/schema.sql
supabase/seed.example.sql
```

Untuk Supabase project baru, jalankan `supabase/schema.sql` melalui SQL Editor setelah user Auth disiapkan. Jalankan `supabase/seed.example.sql` hanya jika membutuhkan data contoh.

Untuk database yang sudah aktif, gunakan `schema.sql` sebagai referensi dan review perubahan sebelum menjalankannya.

## 3. Edge Functions

Deploy ulang Edge Function hanya jika file di folder `supabase/functions/` berubah.

```powershell
npx supabase@latest functions deploy admin-password --use-api
npx supabase@latest functions deploy project-admin --use-api
```

## 4. Git Status

```powershell
git status
```

Pastikan file yang berubah sesuai dengan perubahan yang akan dirilis.

## 5. Commit

```powershell
git add -A
git commit -m "Update dashboard"
```

## 6. Push

```powershell
git push origin main
```

## 7. Vercel Deployment

Setelah push:

1. Buka Vercel dashboard.
2. Pastikan deployment branch `main` berhasil.
3. Buka production URL.
4. Lakukan hard refresh pada browser.

## 8. Smoke Test

### Project Manager

- Login sebagai PM.
- Buka Beranda.
- Buka Activity Log.
- Buka Backup Data.
- Buka Project.
- Export report.
- Buka Schedule.

### Admin

- Login sebagai Admin.
- Pastikan Activity Log dan Backup Data tidak muncul.
- Buka Beranda, Project, dan Schedule.

### Client/Guest

- Login sebagai Client/Guest.
- Pastikan hanya ada Beranda, Project, dan Schedule.
- Pastikan schedule read-only.
- Pastikan agenda internal tidak muncul.
- Export report dengan Bahasa Indonesia dan English.

## 9. Release Decision

Release bisa dianggap siap jika:

```text
Local validation passed
Vercel deployment success
Role smoke test passed
Client data protection verified
Report export verified
```

## 10. Rollback Note

Jika Vercel deployment bermasalah, rollback dapat dilakukan dari Vercel dashboard dengan memilih deployment sebelumnya yang stabil.

Jika database bermasalah, jangan langsung menjalankan SQL perubahan baru. Review perubahan terakhir dan gunakan backup database sesuai prosedur internal.
