# Demo Rev03.6 — Schedule Palette, Form Polish, and PDF Image Guard

Patch ini memperbaiki tiga hal terakhir dari hasil review dashboard demo.

## Schedule

- Legend Online/Onsite di kanan atas disesuaikan ke sage dan bronze.
- Event chip memakai class exact dari aplikasi: `schedule-mode-online` dan `schedule-mode-onsite`.
- Online tampil sage, Onsite tampil bronze.
- Card sisi kanan schedule dibuat lebih konsisten dan tidak kebiruan.

## Form Edit Agenda

- Header form dirapikan agar tombol `Agenda Baru` tidak terlihat menabrak area form.
- Input, select, textarea dibuat full width dan konsisten.
- Layout dua kolom tetap dipakai di desktop dan berubah satu kolom di layar kecil.

## PDF Export

- Memperbaiki error `Unknown image format` dari pdfMake.
- File SVG client logo tidak lagi dipaksa masuk sebagai image PDF.
- Hanya raster image yang aman untuk pdfMake, yaitu PNG/JPG/JPEG, yang dipakai sebagai image PDF.
- Jika logo tidak kompatibel, report otomatis memakai text fallback sehingga PDF tetap dapat terunduh.
