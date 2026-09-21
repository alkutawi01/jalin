# Architecture v0.1

## Baseline

- Next.js
- TypeScript
- PostgreSQL
- deployment awal pada server sendiri
- object storage berasingan untuk media
- GitHub untuk source code dan docs

## Hosting principle

Kod tidak boleh bergantung secara ketat kepada satu vendor deployment. Self-hosting ialah sasaran awal, tetapi migrasi ke platform lain perlu kekal praktikal.

## Database

PostgreSQL pada server awal.

Backup:
- dump automatik berkala;
- salinan tempatan terhad;
- sekurang-kurangnya satu salinan offsite;
- Google Drive boleh menjadi salinan tambahan;
- lakukan restore test berkala.

## Media

Jangan simpan imej sebagai blob besar dalam PostgreSQL.

Gunakan object storage S3-compatible; Cloudflare R2 ialah calon utama semasa. DB menyimpan key/URL dan metadata.

## App layers

Cadangan pemisahan:
- public reading experience;
- auth/account;
- editorial/admin minimum;
- content service/data access;
- media abstraction;
- AI/editorial automation sebagai proses berasingan.

## Admin MVP

Hybrid, bukan CMS besar:
- semak/edit kandungan;
- metadata asas;
- glosari;
- visual;
- status publish/unpublish.

## Security

Repo public tidak boleh mengandungi:
- secrets;
- production credentials;
- unpublished manuscripts;
- private story bibles;
- future arcs;
- private user data.

Gunakan environment variables untuk secrets dan sediakan `.env.example` tanpa nilai sebenar.
