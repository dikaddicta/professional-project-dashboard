# Demo Rev03.7 — Business Language & Copy Consistency Polish

## Objective

Rev03.7 standardizes all user-facing copy across the Professional Project Dashboard demo so the product feels business-ready, concise, and natural in both Indonesian and English.

This revision does not change database structure, authentication, schedule logic, PDF generation logic, or role-based access. It focuses only on UI labels, report labels, empty states, success/error messages, and demo-facing documentation wording.

---

## Scope

### Files to Review / Update

- `index.html`
- `app.js`
- `report-export.js`
- `docs/DEMO_ACCESS_GUIDE.md`
- `docs/DEMO_LIVE_SCENARIO.md`
- `docs/DEMO_ACCOUNT_MATRIX.md`
- Any PDF guide source, if available

### New Supporting Files

- `docs/DEMO_COPY_GUIDE.md`
- `copy/ppd-copy-dictionary.json`
- `tools/ppd-copy-audit.js`

---

## Copy Direction

### Indonesian Style

Use formal but natural business Indonesian. Avoid overly technical wording in user-facing areas.

Preferred tone:

- Clear
- Professional
- Human
- Not too long
- Not developer-oriented

### English Style

Use concise business English. Avoid startup buzzwords, technical console wording, or robotic phrasing.

Preferred tone:

- Direct
- Polished
- Portfolio-ready
- Executive-friendly

---

## Terminology Standardization

### Indonesian

| Previous Copy | Recommended Copy |
|---|---|
| Total Project | Total Proyek |
| Project Berjalan | Proyek Aktif |
| Project Selesai | Proyek Selesai |
| Rata-Rata Progress | Rata-rata Progres |
| Schedule Hari Ini | Jadwal Hari Ini |
| Project Agenda | Agenda Proyek |
| Ringkasan Timeline | Ringkasan Linimasa |
| Task Tracker | Pemantauan Tugas |
| Timeline Project | Linimasa Proyek |
| Edit Agenda | Perbarui Agenda |
| Export PDF | Unduh Laporan |
| Executive Summary PDF | Unduh Ringkasan Eksekutif |
| Full Report Pack PDF | Unduh Laporan Lengkap |
| Timeline PDF | Unduh Linimasa Proyek |
| Prepared For | Disiapkan untuk |
| Project Health | Kondisi Proyek |
| Project Progress | Progres Proyek |
| Upcoming Schedule | Jadwal Mendatang |
| No data available | Belum ada data yang tersedia |
| Data updated successfully | Perubahan berhasil disimpan |
| Unable to export report | Laporan belum dapat diunduh |

### English

| Previous Copy | Recommended Copy |
|---|---|
| Total Project | Total Projects |
| Project Berjalan | Active Projects |
| Project Selesai | Completed Projects |
| Rata-Rata Progress | Average Progress |
| Schedule Hari Ini | Today’s Schedule |
| Project Agenda | Project Agenda |
| Ringkasan Timeline | Timeline Summary |
| Task Tracker | Task Monitoring |
| Timeline Project | Project Timeline |
| Edit Agenda | Update Agenda |
| Export PDF | Download Report |
| Executive Summary PDF | Download Executive Summary |
| Full Report Pack PDF | Download Complete Report |
| Timeline PDF | Download Project Timeline |
| Prepared For | Prepared for |
| Project Health | Project Health |
| Project Progress | Project Progress |
| Upcoming Schedule | Upcoming Schedule |
| No data available | No data is currently available |
| Data updated successfully | Changes have been saved successfully |
| Unable to export report | The report could not be downloaded |

---

## Words to Avoid in User-Facing Copy

| Avoid | Use Instead |
|---|---|
| Dummy | Demo Data / Sample Data |
| Bug | Issue / Finding |
| Fix | Improvement / Resolution |
| Done | Completed / Applied |
| Error | Issue / Unable to process |
| Failed | Unsuccessful / Could not be completed |
| Generated AI / AI Generated | Remove from user-facing copy |
| Cek | Tinjau / Validasi / Review |

Technical wording is acceptable in developer documentation, but it should not appear in the dashboard UI, PDF output, or demo guide that may be shown to clients or recruiters.

---

## User-Facing Message Standard

### Indonesian

- Success: `Perubahan berhasil disimpan.`
- PDF success: `Laporan berhasil diunduh.`
- PDF failure: `Laporan belum dapat diunduh. Silakan coba kembali.`
- Empty state: `Belum ada data yang tersedia.`
- Access limitation: `Data ini hanya tersedia untuk pengguna dengan akses terkait.`
- Save confirmation: `Perubahan agenda berhasil disimpan.`

### English

- Success: `Changes have been saved successfully.`
- PDF success: `The report has been downloaded successfully.`
- PDF failure: `The report could not be downloaded. Please try again.`
- Empty state: `No data is currently available.`
- Access limitation: `This data is only available to users with the required access.`
- Save confirmation: `Agenda changes have been saved successfully.`

---

## Acceptance Criteria

Rev03.7 is considered complete when:

1. The UI no longer mixes Indonesian and English terms in the same label group.
2. The word `dummy` no longer appears in UI or PDF output.
3. PDF actions use business-friendly labels.
4. Empty state, success, and error messages are consistent.
5. Schedule labels remain clear for Online and Onsite events.
6. The demo guide uses `sample data` or `demo data`, not `dummy data`.
7. The copy audit script returns no high-priority user-facing issues.

---

## Recommended Commit

```powershell
git status
git add index.html app.js report-export.js docs/DEMO_COPY_GUIDE.md docs/DEMO_REV03_7_BUSINESS_LANGUAGE_COPY_POLISH.md copy/ppd-copy-dictionary.json tools/ppd-copy-audit.js
git commit -m "Polish business language and copy consistency"
git push origin main
```

