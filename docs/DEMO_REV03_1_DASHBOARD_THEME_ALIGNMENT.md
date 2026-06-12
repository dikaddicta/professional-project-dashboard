# Demo Rev03.1 — Dashboard Theme Alignment

Fokus patch ini adalah merapikan tampilan dashboard demo agar tidak lagi membawa nuansa biru dari project CY-WA.

## Perubahan

- Mengubah sisa aksen biru menjadi palet putih, sage, bronze, warm gray, dan charcoal.
- Menambahkan asset logo sederhana untuk 10 client demo.
- Menjadikan logo client sebagai default pada kartu identitas client dan area prepared-for.
- Menjaga base dashboard tetap putih dan clean.
- Tidak mengubah database, role access, Supabase policy, atau Edge Functions.

## Client Logo Asset

Logo demo disimpan di:

```text
assets/client-logos/
```

Daftar asset:

```text
asteria-bank.svg
merapi-retail-group.svg
sagara-logistics.svg
vantara-insurance.svg
arunika-healthcare.svg
zenith-finance.svg
borealis-energy.svg
lumina-telco.svg
kaldera-manufacturing.svg
nova-public-services.svg
```

## Validasi Visual

Setelah deploy, cek bagian berikut:

- Kartu Identitas Client tidak lagi menampilkan kotak inisial seperti `VA` jika client demo memiliki logo.
- Report Center dan Backup Data tidak dominan biru.
- Tab Ringkasan / Task Tracker / Document List menggunakan sage dan bronze.
- Timeline bar assessment memakai sage, reporting memakai bronze.
- Schedule Online memakai sage, Onsite memakai bronze.
- Base halaman tetap putih.
