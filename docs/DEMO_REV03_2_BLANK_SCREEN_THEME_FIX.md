# Demo Rev03.2 — Blank Screen Recovery & Final Theme Cleanup

Patch ini mengembalikan `app.js` ke versi stabil dan memindahkan perapian visual ke CSS override.

## Fokus

- Memulihkan dashboard yang sempat blank setelah patch tema.
- Menghindari perubahan logic besar untuk kebutuhan warna.
- Mengurangi sisa warna biru pada dashboard demo.
- Memakai palet white base, sage, bronze, warm gray, dan charcoal.
- Menambahkan fallback logo client demo melalui asset lokal.
- Menjaga Supabase, role, RLS, dan Edge Functions tetap tidak berubah.

## File

- `app.js`
- `styles.ppd-tone.css`
- `assets/client-logos/*.svg`

## Validasi

Jalankan:

```powershell
node --check app.js
node --check report-export.js
node --check data.js
```

Lalu deploy melalui GitHub/Vercel.
