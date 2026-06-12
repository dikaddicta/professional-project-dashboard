# Professional Project Dashboard — Handover Guide

Dokumen ini menjadi panduan serah terima penggunaan Professional Project Dashboard untuk Project Manager, Admin, dan Client/Guest. Panduan ini berfokus pada alur kerja operasional, batasan akses, dan prosedur penggunaan fitur utama.

## 1. Tujuan Dashboard

Professional Project Dashboard digunakan untuk memantau status project, timeline, task, dokumen, agenda, report, dan akses client dalam satu portal berbasis role.

Dashboard ini mendukung tiga jenis pengguna utama:

```text
Project Manager
Admin
Client / Guest
```

Setiap role memiliki tampilan dan akses berbeda agar data internal tetap aman dan informasi client tetap relevan.

## 2. Ringkasan Role

### Project Manager

Project Manager memiliki akses penuh terhadap fitur operasional dan governance.

Menu yang tersedia:

```text
Beranda
Notifikasi
Activity Log
Backup Data
Project
Schedule
Kelola Project
```

PM dapat membuat project, mengelola client access, mengatur schedule, export report, melihat activity log, melakukan backup data, dan mengubah status lifecycle project.

### Admin

Admin berperan membantu monitoring dan operasional project, tetapi tidak memiliki akses ke fitur governance khusus PM.

Menu yang tersedia:

```text
Beranda
Notifikasi
Project
Schedule
Kelola Project
```

Admin tidak melihat menu Activity Log dan Backup Data.

### Client / Guest

Client/Guest hanya melihat informasi project yang diberikan akses.

Menu yang tersedia:

```text
Beranda
Project
Schedule
```

Client/Guest tidak melihat data internal, activity log, backup data, atau menu kelola project.

## 3. Prinsip Data Visibility

Dashboard menggunakan prinsip least privilege.

```text
PM/Admin     : melihat data operasional sesuai role.
Client/Guest : hanya melihat project yang diberikan akses.
```

Informasi yang tidak boleh terlihat oleh Client/Guest:

```text
Internal agenda
Internal note
Activity Log
Backup Data
Kelola Project
Client Access Management
Data project lain
```

## 4. Modul Utama

### Beranda

Beranda menampilkan ringkasan sesuai role.

Untuk PM/Admin, Beranda berfungsi sebagai command center internal. Untuk Client/Guest, Beranda menampilkan ringkasan project, progress, dokumen, update, dan agenda yang tersedia untuk akun tersebut.

### Project

Modul Project digunakan untuk melihat detail project, timeline, task tracker, dokumen, update, risk/issue, dan report center.

### Schedule

Schedule menampilkan agenda project. PM dapat menambah, mengubah, dan menghapus agenda. Client/Guest hanya melihat agenda yang tidak ditandai internal.

### Report Center

Report Center menyediakan export report dalam Bahasa Indonesia atau English.

Jenis report:

```text
Ringkasan Eksekutif
Paket Laporan Lengkap
Timeline Project
```

### Activity Log

Activity Log hanya tersedia untuk Project Manager. Modul ini digunakan untuk menelusuri aktivitas penting seperti perubahan project, export report, update schedule, dan perubahan akses.

### Backup Data

Backup Data hanya tersedia untuk Project Manager. Fitur ini bersifat read-only dan digunakan untuk export backup project atau data operasional.

## 5. Alur Handover

Checklist handover minimum:

```text
1. Pastikan Supabase dan Vercel sudah aktif.
2. Pastikan login PM, Admin, dan Client/Guest berhasil.
3. Pastikan menu sesuai role.
4. Pastikan project access untuk client sudah sesuai.
5. Pastikan agenda internal tidak tampil untuk client.
6. Pastikan export report ID/EN berhasil.
7. Pastikan backup data hanya tersedia untuk PM.
8. Pastikan activity log hanya tersedia untuk PM.
9. Pastikan dokumentasi penggunaan sudah dibagikan ke user terkait.
```

## 6. Dokumen Pendukung

Dokumentasi operasional terdiri dari:

```text
docs/USER_GUIDE_PM.md
docs/USER_GUIDE_ADMIN.md
docs/USER_GUIDE_CLIENT.md
docs/SOP_PROJECT_ONBOARDING.md
docs/SOP_CLIENT_ACCESS.md
docs/SOP_REPORT_EXPORT.md
docs/SOP_BACKUP_DATA.md
docs/TROUBLESHOOTING_GUIDE.md
docs/HANDOVER_SIGNOFF_TEMPLATE.md
```

## 7. Catatan Penting

Jangan membagikan akses PM kepada client. Jangan menyimpan service role key di frontend, GitHub, atau dokumentasi publik. Semua perubahan production sebaiknya dilakukan melalui Git commit dan Vercel deployment.
