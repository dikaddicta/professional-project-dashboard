# Security Production Notes

Dokumen ini merangkum prinsip keamanan utama untuk menjalankan Professional Project Dashboard di lingkungan production.

## 1. Supabase Keys

### Anon Key

Supabase anon key boleh digunakan di frontend selama Row Level Security aktif dan policy sudah benar.

### Service Role Key

Service role key tidak boleh ditempatkan di:

```text
app.js
data.js
report-export.js
supabase-config.js
GitHub repository
Vercel public environment variable
Chat atau dokumentasi public
```

Service role hanya boleh digunakan pada server-side trusted environment seperti Supabase Edge Function.

## 2. Row Level Security

RLS wajib aktif untuk table yang menyimpan data project dan data user-related.

Minimum table yang perlu diperhatikan:

```text
projects
project_access
project_schedule_events
audit_logs
project_branding
meeting_logs
tasks/timeline/documents sesuai schema aplikasi
```

## 3. Client Access

Client/Guest hanya boleh membaca project yang memiliki akses aktif melalui `project_access`.

Prinsip akses:

```text
Client/Guest + project_access aktif = boleh melihat project
Client/Guest tanpa project_access = tidak boleh melihat project
Client/Guest dengan akses disabled = tidak boleh melihat project
```

## 4. Internal Agenda

Agenda yang ditandai internal harus tetap tersembunyi dari client.

Expected behavior:

```text
PM/Admin  : melihat agenda internal dan non-internal
Client    : hanya melihat agenda non-internal
```

## 5. Activity Log

Activity Log hanya tersedia untuk Project Manager. Admin dan Client/Guest tidak melihat menu ini.

## 6. Backup Data

Backup Data hanya tersedia untuk Project Manager. Export bersifat read-only dan tidak melakukan restore otomatis.

File backup harus disimpan di storage internal yang aman karena dapat berisi ringkasan data project.

## 7. Report Export

Report untuk client tidak boleh memuat:

```text
Internal note
Internal agenda
Activity log
Backup data
Data project lain
Istilah teknis database seperti project_access/RLS/Supabase
```

## 8. Deployment Security

Sebelum release:

```powershell
git grep -n "service_role\|service role\|SERVICE_ROLE" -- .
git grep -n "password\|secret\|private key" -- .
```

Pastikan hasilnya tidak menunjukkan secret aktif.

## 9. Operational Notes

- Reset password client hanya menghasilkan password baru, bukan melihat password lama.
- Guest `.local` email bersifat internal dan tidak perlu ditampilkan ke client.
- Client label harus menggunakan nama project/client yang natural.
- Jangan menampilkan istilah development pada UI client.
