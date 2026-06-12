# Demo Rev03.5 — Blue Purge and PDF Hard Fix

Patch ini disiapkan untuk membersihkan sisa warna biru yang masih terlihat dan memperkeras mekanisme download PDF.

## Perbaikan Visual

- Notification filter chips tidak lagi memakai biru.
- Badge nomor pada Ringkasan Timeline memakai neutral sage.
- Schedule event chip, selected day, badge online/onsite, dan panel kanan tidak lagi memakai biru.
- Badge PDF memakai bronze premium.
- Tab aktif dan hover state dibuat konsisten dengan white, sage, bronze, dan charcoal.
- Gantt/Timeline bar dipaksa memakai:
  - Assessment: sage
  - Reporting: bronze
  - Hold/Pending: sand

## Perbaikan PDF

- Menambahkan `ensurePdfEngine()` untuk memastikan `pdfMake` dan font siap.
- Mengganti flow download menjadi `getBlob()` langsung.
- Menghapus dependensi utama pada callback `pdf.download()` yang kadang tidak memicu download di browser.
- Menambahkan validasi agar file PDF kosong dianggap error.

## Validasi

```powershell
node --check app.js
node --check report-export.js
node --check data.js
```

Setelah deploy:
- hard refresh / incognito,
- test Executive Summary,
- test Full Report Pack,
- test Timeline PDF.
