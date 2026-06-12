# Demo Rev03.4 — Theme Consistency and PDF Export Fix

Patch ini memperbaiki dua area utama yang masih terlihat setelah Rev03.3.

## Visual

- Memperbaiki kartu Rata-Rata Progress yang text/value-nya tidak terbaca.
- Menghapus sisa warna biru pada Schedule, Timeline, modal progress project, hover sidebar, dan Report Center.
- Mengganti badge PDF menjadi bronze premium.
- Menyamakan badge role untuk PM/Admin/Client/Guest.
- Memperbaiki number box pada Timeline Project.
- Memastikan bar Timeline Assessment memakai sage dan Reporting memakai bronze.

## Export PDF

- Memperkuat `report-export.js` agar menggunakan mekanisme download PDF yang lebih langsung.
- Menambahkan fallback download jika browser tidak menjalankan callback download.
- Menyamakan palet PDF ke sage/bronze/charcoal.

## Tidak Diubah

- Supabase schema
- Seed data
- Role access
- RLS
- Edge Functions
