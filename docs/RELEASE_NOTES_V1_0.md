# Professional Project Dashboard v1.0 — Commercial Release Notes

## Release Type

Commercial Release Candidate

## Release Summary

Professional Project Dashboard v1.0 menghadirkan dashboard project management dan client portal berbasis role, dengan dukungan Supabase, Vercel, report export multilingual, schedule management, project lifecycle control, backup/export tools, dan activity log untuk Project Manager.

## Major Modules

### 1. Authentication & Role Access

- Login berbasis Supabase Auth.
- Role utama: Project Manager, Admin, Client/Guest.
- Sidebar dan fitur mengikuti role user.
- Client/Guest hanya melihat project sesuai akses.

### 2. PM/Admin Command Center

- Beranda internal untuk monitoring project.
- KPI project dan progress.
- Notifikasi prioritas.
- Project agenda.
- Schedule overview.

### 3. Client Portal

- Beranda client.
- Project detail sesuai akses.
- Schedule read-only.
- Data internal disembunyikan dari client.

### 4. Schedule Management

- Schedule calendar.
- Agenda Online/Onsite dengan warna berbeda.
- Tipe agenda standar.
- Internal agenda untuk PM/Admin.
- Client hanya melihat agenda yang aman ditampilkan.

### 5. Project Lifecycle

- Project Berjalan.
- Project Selesai.
- Project Arsip.
- Project selesai tetap bisa dilihat/report.
- Project arsip disembunyikan dari tampilan aktif.

### 6. Report Center

- Ringkasan Eksekutif.
- Paket Laporan Lengkap.
- Timeline Project.
- Pilihan Bahasa Indonesia dan English saat export.
- Branding project tetap digunakan pada report.

### 7. Backup Data

- Backup project JSON.
- Backup semua project JSON.
- Export task tracker CSV.
- Export schedule CSV.
- Export activity log CSV.
- Hanya tersedia untuk Project Manager.

### 8. Activity Log

- Hanya tersedia untuk Project Manager.
- Mencatat aktivitas penting untuk kebutuhan governance dan audit trail.

### 9. White Label Branding

- Prepared For.
- Prepared By.
- Confidentiality Label.
- Footer Label.
- Accent Color.
- Client Logo.

### 10. Responsive Layout

- Layout desktop, tablet, dan mobile sudah dipoles.
- Sidebar menyesuaikan layar kecil.
- Table/editor mendukung horizontal scroll pada layar kecil.

## Security Highlights

- Supabase RLS digunakan untuk membatasi akses data.
- Client access dikendalikan melalui table `project_access`.
- Internal agenda tidak tampil untuk client.
- Activity Log dan Backup Data hanya tersedia untuk Project Manager.
- Tidak boleh ada service role key di frontend.

## Production Readiness Notes

Sebelum production release, jalankan:

```powershell
node --check app.js
node --check report-export.js
node --check data.js
```

Pastikan Supabase policy, role access, dan client data protection sudah diverifikasi melalui review manual atau query internal yang sesuai dengan environment production.

## Known Boundaries

- Restore/import backup belum diaktifkan untuk menghindari risiko overwrite data client.
- Email notification dan calendar integration belum termasuk release v1.0.
- Activity Log difokuskan untuk Project Manager.
- Report export mengikuti data yang tersedia pada dashboard, bukan menggantikan laporan audit formal.
