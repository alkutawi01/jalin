# Architecture v0.2

## Baseline

- Next.js
- TypeScript
- PostgreSQL
- deployment awal pada server sendiri
- object storage berasingan untuk media
- GitHub untuk source code dan docs

## Reader architecture

Reader ialah pusat produk.

Semua kategori menggunakan pola asas yang sama:
- Work metadata
- reading body
- illustrations
- glossary
- credits
- reading progress

Cerpen, Sinopsis, Terjemahan dan Fragmen kekal sebagai satu Work walaupun panjang.

### Pagination

Karya panjang menggunakan pagination dalaman / ReadingSection.

Keperluan:
- URL canonical Work kekal stabil;
- halaman boleh mempunyai URL state seperti `?page=2` jika diperlukan;
- progress disimpan pada Work + section/page + position;
- prev/next mesti mesra keyboard dan sentuhan;
- metadata karya, kredit dan glossary tidak perlu diduplikasi sebagai Work berasingan;
- pagination tidak boleh diwujudkan semata-mata untuk pageview/SEO.

Bersiri menggunakan satu Series dengan episod berasingan.

## Layout principle

Desktop/laptop menggunakan **max-width container yang stabil**, bukan layout yang mengembang memenuhi monitor.

Matlamat:
- reading column mempunyai lebar yang hampir sama pada laptop dan monitor besar;
- margin kiri/kanan kekal lapang;
- ruang margin boleh digunakan untuk elemen sekunder seperti progress, glossary aktif, nota atau navigasi, tetapi teks utama tidak berubah lebar secara agresif.

Nilai pixel sebenar ditentukan semasa prototaip UI.

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

- public reading experience;
- auth/account;
- editorial/admin minimum;
- content service/data access;
- rights/provenance metadata;
- media abstraction;
- AI/editorial automation sebagai proses berasingan.

## Admin MVP

Hybrid, bukan CMS besar:
- semak/edit kandungan;
- metadata asas;
- provenance/rights status;
- glosari;
- pagination/section breaks;
- visual;
- publish/unpublish.

## Security

Repo public tidak boleh mengandungi:
- secrets;
- production credentials;
- private story bibles;
- future arcs;
- private user data.

Gunakan environment variables untuk secrets dan sediakan `.env.example` tanpa nilai sebenar.
