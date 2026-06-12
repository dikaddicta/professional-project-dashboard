# Repository Structure

Struktur repository dibuat ringkas agar mudah direview dan dideploy.

```text
cywa_project_dashboard_theme_clean/
├─ assets/
│  └─ professional-dashboard-logo.png
├─ docs/
│  ├─ DATABASE_SETUP.md
│  ├─ DEPLOYMENT_RUNBOOK.md
│  ├─ HANDOVER_GUIDE.md
│  ├─ REPOSITORY_STRUCTURE.md
│  ├─ SECURITY_PRODUCTION_NOTES.md
│  ├─ SOP_BACKUP_DATA.md
│  ├─ SOP_CLIENT_ACCESS.md
│  ├─ SOP_PROJECT_ONBOARDING.md
│  ├─ SOP_REPORT_EXPORT.md
│  ├─ TROUBLESHOOTING_GUIDE.md
│  ├─ USER_GUIDE_ADMIN.md
│  ├─ USER_GUIDE_CLIENT.md
│  └─ USER_GUIDE_PM.md
├─ supabase/
│  ├─ config.toml
│  ├─ schema.sql
│  ├─ seed.example.sql
│  └─ functions/
│     ├─ admin-password/
│     └─ project-admin/
├─ app.js
├─ data.js
├─ index.html
├─ report-export.js
├─ styles.css
├─ supabase-config.js
├─ README.md
├─ SECURITY.md
└─ vercel.json
```

## Runtime files

File berikut digunakan langsung oleh aplikasi:

```text
index.html
app.js
styles.css
report-export.js
data.js
supabase-config.js
assets/professional-dashboard-logo.png
```

## Supabase files

```text
supabase/schema.sql
supabase/seed.example.sql
supabase/functions/admin-password/index.ts
supabase/functions/project-admin/index.ts
```

`schema.sql` menjadi referensi final database. File migration historis tidak diperlukan lagi di repository utama setelah struktur final tersedia.

## Documentation files

Folder `docs/` berisi panduan setup, deployment, handover, SOP, dan panduan pengguna. Dokumentasi dibuat ringkas dan fokus pada penggunaan operasional.

## Temporary files

File berikut tidak perlu masuk repository:

```text
*.zip
.vercel/
node_modules/
repo-files.txt
project-structure.txt
text-audit.txt
review_files.txt
```

Daftar tersebut sudah ditangani melalui `.gitignore`.
