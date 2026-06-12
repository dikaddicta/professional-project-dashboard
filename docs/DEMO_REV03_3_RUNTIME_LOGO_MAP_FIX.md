# Demo Rev03.3 — Runtime Logo Map Fix

Patch ini memperbaiki blank screen yang muncul karena error runtime:

```text
Cannot access 'DEMO_CLIENT_LOGO_MAP' before initialization
```

## Perubahan

- Menghapus dependensi top-level `DEMO_CLIENT_LOGO_MAP`.
- Memindahkan mapping logo client ke dalam function `getDemoClientLogoUrl()`.
- Menjaga theme cleanup dari Rev03.2 tetap aktif.
- Tidak mengubah Supabase, database, role, RLS, maupun Edge Functions.

## Validasi

```powershell
node --check app.js
node --check report-export.js
node --check data.js
```

Setelah push ke GitHub dan Vercel selesai deploy, lakukan hard refresh atau buka incognito.
