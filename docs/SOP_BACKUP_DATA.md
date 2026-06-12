# SOP — Backup Data

SOP ini digunakan oleh Project Manager untuk melakukan backup/export data dari dashboard.

## 1. Akses

Backup Data hanya tersedia untuk Project Manager.

Admin dan Client/Guest tidak melihat menu ini.

## 2. Jenis Export

Format yang tersedia:

```text
Backup Project Terpilih - JSON
Backup Semua Project - JSON
Task Tracker - CSV
Schedule - CSV
Activity Log - CSV
```

## 3. Backup Project Terpilih

Gunakan untuk menyimpan snapshot data satu project.

Langkah:

```text
1. Login sebagai PM.
2. Buka Backup Data.
3. Pilih project.
4. Klik Backup Project Terpilih.
5. Simpan file JSON di lokasi internal yang aman.
```

## 4. Backup Semua Project

Gunakan sebelum perubahan besar atau review berkala.

Langkah:

```text
1. Buka Backup Data.
2. Klik Backup Semua Project.
3. Simpan file JSON di folder backup internal.
```

## 5. Export CSV

Gunakan CSV untuk kebutuhan analisis atau pelaporan internal.

```text
Task Tracker CSV  : daftar task project.
Schedule CSV      : agenda project.
Activity Log CSV  : histori aktivitas terbaru.
```

## 6. Keamanan File Backup

File backup dapat memuat data project. Simpan hanya di lokasi yang aman.

Jangan membagikan file backup kepada client kecuali sudah direview dan memang diperlukan.

## 7. Batasan

Fitur Backup Data saat ini hanya menyediakan export/backup read-only. Restore/import belum tersedia untuk menghindari risiko overwrite data project.
