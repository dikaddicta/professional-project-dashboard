# Studi Kasus Portfolio — Professional Project Dashboard

## Ringkasan Project

Professional Project Dashboard adalah dashboard tata kelola proyek berbasis web yang dibuat untuk menunjukkan bagaimana Project Manager, Admin, dan Client dapat memantau progres proyek dalam satu lingkungan yang terstruktur.

Dashboard ini menampilkan progres proyek, pemantauan tugas, jadwal, linimasa, informasi dokumen, serta unduhan laporan eksekutif menggunakan data demo yang disusun menyerupai kebutuhan proyek profesional.

## Konteks Masalah

Dalam pelaksanaan proyek, informasi sering tersebar di beberapa tempat seperti spreadsheet, catatan meeting, task list, tracker dokumen, dan laporan manual. Kondisi tersebut dapat menyulitkan stakeholder untuk memahami progres, melihat agenda terbaru, atau meninjau status proyek secara konsisten.

Demo ini dibuat untuk menjawab kebutuhan tersebut dengan menyatukan informasi tata kelola proyek ke dalam satu dashboard yang memiliki tampilan berbeda untuk PM, Admin, dan Client.

## Tujuan

Tujuan utama project ini adalah membuat dashboard profesional yang dapat digunakan sebagai portfolio demo untuk tata kelola proyek, pelaporan, dan pemantauan delivery.

Dashboard ini dirancang untuk menunjukkan:

- Ringkasan status portfolio proyek secara jelas.
- Detail proyek untuk kebutuhan monitoring delivery.
- Visibilitas jadwal untuk agenda online dan onsite.
- Pemantauan tugas dan linimasa proyek.
- Unduhan laporan untuk kebutuhan review eksekutif dan stakeholder.
- Tampilan bisnis yang konsisten dan siap dipresentasikan.

## Solusi

Solusi ini menggunakan frontend ringan dengan dukungan Supabase untuk autentikasi dan database. Pengalaman pengguna dipisahkan berdasarkan role, sementara data demo digunakan untuk mensimulasikan alur proyek yang mendekati kebutuhan profesional.

UI disempurnakan melalui beberapa tahap polish untuk memperbaiki konsistensi visual, reliabilitas export PDF, tampilan schedule, responsivitas mobile, serta penggunaan bahasa bisnis yang lebih profesional.

## Fitur Utama

### Ringkasan Portfolio

Dashboard menampilkan informasi utama seperti total proyek, proyek aktif, proyek selesai, rata-rata progres, dan jadwal hari ini.

### Detail Proyek

Setiap proyek memiliki informasi terstruktur seperti progres, ringkasan linimasa, pemantauan tugas, bagian dokumen, agenda, dan update proyek.

### Pengelolaan Jadwal

Modul jadwal membedakan aktivitas Online dan Onsite dengan tampilan visual yang berbeda agar agenda lebih mudah dipahami saat review proyek.

### Unduhan Laporan

Dashboard mendukung unduhan Ringkasan Eksekutif, Laporan Lengkap, dan Linimasa Proyek untuk kebutuhan pelaporan stakeholder.

### Pengalaman Berdasarkan Role

Sistem memisahkan perspektif PM, Admin, dan Client agar demo terasa seperti lingkungan delivery proyek yang profesional.

## Stack Teknis

- HTML, CSS, dan Vanilla JavaScript untuk frontend.
- Supabase dan PostgreSQL untuk backend dan database.
- Supabase Auth untuk autentikasi.
- Row Level Security untuk kontrol akses.
- Supabase Edge Functions untuk serverless logic.
- Vercel untuk hosting.
- GitHub untuk version control.

## Arah Desain

Arah visual akhir menggunakan palet bisnis yang bersih: white base, sage accent, bronze highlight, dan charcoal text. Palet ini dipilih agar dashboard terlihat profesional, modern, dan tidak terlalu generik seperti dashboard enterprise yang dominan biru.

## Nilai Bisnis

Project ini menunjukkan kemampuan menerjemahkan kebutuhan tata kelola proyek menjadi aplikasi web yang praktis. Dashboard ini memperlihatkan pemahaman terhadap visibilitas stakeholder, pemisahan role, monitoring delivery, alur pelaporan, dan desain produk yang siap dipresentasikan.

## Hasil Akhir

Dashboard ini sudah siap digunakan sebagai portfolio project, live demo, atau case study presentation. Project ini menampilkan kombinasi antara eksekusi teknis dan pemahaman project management dalam interface bisnis yang rapi dan profesional.
