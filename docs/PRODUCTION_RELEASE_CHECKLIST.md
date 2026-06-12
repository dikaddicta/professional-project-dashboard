# Production Release Checklist

Gunakan checklist ini sebelum Professional Project Dashboard dinyatakan siap digunakan untuk client atau demonstrasi komersial.

## 1. Source Code

| Check | Expected Result | Status |
|---|---|---|
| `node --check app.js` | Tidak ada syntax error | Pending |
| `node --check report-export.js` | Tidak ada syntax error | Pending |
| `node --check data.js` | Tidak ada syntax error | Pending |
| Source text review | Tidak ada catatan iterasi teknis di UI dan dokumentasi utama | Pending |
| Git status bersih sebelum release | Tidak ada perubahan yang belum dicommit | Pending |

## 2. Environment

| Check | Expected Result | Status |
|---|---|---|
| Supabase URL benar | Mengarah ke project production yang tepat | Pending |
| Supabase anon key benar | Hanya anon/public key | Pending |
| Service role key tidak ada di frontend | Tidak ditemukan di `app.js`, `data.js`, `supabase-config.js` | Pending |
| Vercel environment sesuai | Tidak ada secret sensitif terekspos | Pending |

## 3. Role Access

| Role | Expected Menu | Status |
|---|---|---|
| PM | Beranda, Notifikasi, Activity Log, Backup Data, Project, Schedule, Kelola Project | Pending |
| Admin | Beranda, Notifikasi, Project, Schedule, Kelola Project | Pending |
| Client/Guest | Beranda, Project, Schedule | Pending |

## 4. Client Data Protection

| Check | Expected Result | Status |
|---|---|---|
| Client hanya melihat project sesuai akses | Tidak ada data project lain | Pending |
| Agenda internal disembunyikan | Tidak muncul di Beranda/Schedule/Report client | Pending |
| Internal notes disembunyikan | Client hanya melihat update yang aman ditampilkan | Pending |
| Activity Log hidden | Client/Admin tidak melihat Activity Log | Pending |
| Backup Data hidden | Client/Admin tidak melihat Backup Data | Pending |

## 5. Schedule

| Check | Expected Result | Status |
|---|---|---|
| PM bisa tambah/edit/hapus agenda | Berfungsi | Pending |
| Admin sesuai rule aplikasi | Tidak melanggar akses | Pending |
| Client read-only | Tidak ada tombol tambah/edit/hapus | Pending |
| Online/Onsite color berbeda | Terlihat jelas | Pending |
| Tipe agenda sesuai list resmi | Tidak ada tipe tidak valid | Pending |
| End time tidak lebih awal dari start time | Validasi aktif | Pending |

## 6. Report Export

| Report | Bahasa | Expected Result | Status |
|---|---|---|---|
| Ringkasan Eksekutif | ID | PDF berhasil dibuat | Pending |
| Ringkasan Eksekutif | EN | PDF berhasil dibuat | Pending |
| Paket Laporan Lengkap | ID | PDF berhasil dibuat | Pending |
| Paket Laporan Lengkap | EN | PDF berhasil dibuat | Pending |
| Timeline Project | ID | PDF berhasil dibuat | Pending |
| Timeline Project | EN | PDF berhasil dibuat | Pending |

## 7. Backup & Activity Log

| Check | Expected Result | Status |
|---|---|---|
| Backup Project JSON | Berhasil untuk PM | Pending |
| Backup Semua Project JSON | Berhasil untuk PM | Pending |
| Export Task CSV | Berhasil untuk PM | Pending |
| Export Schedule CSV | Berhasil untuk PM | Pending |
| Export Activity Log CSV | Berhasil untuk PM | Pending |
| Activity Log bertambah setelah export/report | Tercatat | Pending |

## 8. Responsive QA

| Device Width | Expected Result | Status |
|---|---|---|
| 1366px | Desktop rapi | Pending |
| 1024px | Tablet landscape rapi | Pending |
| 768px | Tablet portrait rapi | Pending |
| 390px | Mobile tidak pecah | Pending |

## 9. Final Decision

| Release Gate | Status |
|---|---|
| Code validation complete | Pending |
| Supabase checks complete | Pending |
| Role QA complete | Pending |
| Client data protection verified | Pending |
| Report export verified | Pending |
| Responsive QA complete | Pending |

Final release decision:

```text
Pending / Approved / Need Fix
```
