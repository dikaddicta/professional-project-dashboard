# Commercial QA Matrix

QA matrix ini digunakan untuk memastikan Professional Project Dashboard berjalan sesuai role dan tidak ada data internal yang terbuka ke client.

## Role & Menu Matrix

| Role | Beranda | Notifikasi | Activity Log | Backup Data | Project | Schedule | Kelola Project |
|---|---:|---:|---:|---:|---:|---:|---:|
| Project Manager | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | No | No | Yes | Yes | Yes |
| Client/Guest | Yes | No | No | No | Yes | Yes | No |

## Client Portal Matrix

| Scenario | Expected Result |
|---|---|
| Client login dengan 1 project | Beranda langsung menampilkan ringkasan project tersebut |
| Client login dengan lebih dari 1 project | Filter project tersedia |
| Client buka Project | Hanya project sesuai akses yang tampil |
| Client buka Schedule | Agenda tampil read-only |
| Client membuka agenda internal | Agenda internal tidak muncul |
| Client export report | Data internal tidak masuk PDF |

## Schedule Matrix

| Scenario | Expected Result |
|---|---|
| PM membuat agenda Online | Bar agenda berwarna sesuai Online |
| PM membuat agenda Onsite | Bar agenda berwarna sesuai Onsite |
| PM checklist Internal Agenda | Agenda tetap terlihat untuk PM/Admin |
| Client melihat schedule | Internal Agenda tidak tampil |
| Start time lebih akhir dari end time | Form menolak save |
| Client membuka Schedule mobile | Tidak ada tombol edit/delete |

## Report Export Matrix

| Role | Report | Bahasa | Expected Result |
|---|---|---|---|
| PM | Ringkasan Eksekutif | Indonesia | PDF berhasil dibuat |
| PM | Ringkasan Eksekutif | English | PDF berhasil dibuat |
| PM | Paket Laporan Lengkap | Indonesia | PDF berhasil dibuat |
| PM | Paket Laporan Lengkap | English | PDF berhasil dibuat |
| Client | Ringkasan Eksekutif | Indonesia | PDF tanpa data internal |
| Client | Paket Laporan Lengkap | English | PDF tanpa data internal |
| Client | Timeline Project | Indonesia | PDF tanpa agenda internal |

## Security Matrix

| Check | Expected Result |
|---|---|
| Service role key di frontend | Tidak ada |
| RLS project_access | Aktif dan membatasi client |
| RLS project_schedule_events | Client hanya membaca agenda non-internal |
| audit_logs | PM-only |
| Backup Data | PM-only |
| Activity Log | PM-only |

## Regression Matrix

| Module | Critical Scenario | Expected Result |
|---|---|---|
| Login | PM/Admin/Client login | Masuk sesuai role |
| Sidebar | Menu sesuai role | Tidak ada menu salah role |
| Beranda | KPI tampil | Data sesuai role |
| Project | Detail project tampil | Tidak bocor ke client lain |
| Schedule | Agenda tampil | Filter role berjalan |
| Report | Export PDF | File terbentuk dan bahasa sesuai |
| Backup | Export data | Hanya PM |
| Activity Log | Aktivitas tercatat | Hanya PM |
