# Category Index Plan v1

Status: TEMPLATE extend — dokumen perancangan FASA 2D-1 (dokumentasi sahaja, tiada kod)
Tarikh: 22 September 2026
Milestone: FASA 2D-1 — Reka bentuk indeks kategori `/cerpen`

Dokumen ini merancang penciptaan pintu masuk pertama untuk karya Jalin: halaman indeks kategori yang menyenaraikan karya dalam satu kategori. Selepas ini siap, pengguna tidak lagi perlu tahu URL karya secara langsung — mereka boleh sampai ke karya melalui kategori.

Prasyarat: FASA 2C selesai. `/cerpen/[slug]` ialah satu-satunya reader untuk semua cerpen.

---

## 1. Current state

- Tiada halaman indeks kategori. `/cerpen` masih 404 / tidak wujud.
- Pengguna mesti tahu URL penuh karya (`/cerpen/nombor-giliran-117`) untuk membaca.
- WorkLoader sudah menyediakan `getWorksByType(type)` yang memulangkan semua Work bagi satu jenis (e.g. `getWorksByType("cerpen")`).
- Struktur `content/works/*.md` sudah memuatkan metadata lengkap per karya: `title`, `slug`, `type`, `genre`, `dek`, `readingMinutes`, `publishedAt`, `updatedAt`, `status`, dan sebagainya.

---

## 2. Target

Bina halaman statik `/cerpen` yang membaca `getWorksByType("cerpen")` dan memaparkan satu senarai editorial. Setiap kad memaparkan:

- **Tajuk** — `work.title`
- **Dek** — `work.dek`
- **Jenis karya** — 'Cerpen'
- **Genre** — `work.genre` (e.g. 'Keluarga')
- **Masa bacaan** — `work.readingMinutes` (`± <n> min`)
- **Tarikh kemas kini** — `work.updatedAt` (format tarikh)
- **Status** — status edisi (e.g. 'Karya asli Jalin') atau status penerbitan

Setiap kad ialah pautan ke `/cerpen/<slug>` (route reader generik yang sudah wujud).

Halaman ini statik penuh: `generateStaticParams` / SSG pada build masa; tiada pengambilan runtime.

---

## 3. Jangan buat UI besar dahulu

Versi pertama ialah **senarai editorial** yang ringkas dan boleh dibaca: satu lajur kad, urutan terbit/kemas kini. Bukan:

- grid kompleks;
- recommendation engine;
- keperluan data gunaan (pagination dalaman karya, bookmark, dan sebagainya);
- komponen UI baharu yang berat.

Gunakan corak visual sedia ada (`site-shell`, `story-body`/kad ringkas, `SiteHeader`/`SiteFooter`) supaya konsisten dengan muka Jalin sekarang.

---

## 4. Future categories

Struktur ini direka untuk menyokong kategori lain pada masa hadapan:

```
/cerpen
/novela
/bersiri
/fragmen
/sinopsis
```

Setiap satu menggunakan corak yang sama: satu route statik yang membaca `getWorksByType(<type>)` dengan kad senarai editorial. **Hanya `/cerpen` dibina dahulu** dalam FASA 2D; kategori lain tidak disentuh.

---

## 5. Jangan buat

- Search
- Filter kompleks
- Pagination
- Bookmark
- Login
- Database

---

## Acceptance criteria (FASA 2D)

1. `/cerpen` wujud dan statik.
2. Senarai menampilkan kedua-dua karya cerpen semasa (Kerusi di Beranda, Nombor Giliran 117) dengan semua field kad yang disenaraikan di bahagian Target.
3. Setiap kad memaut ke `/cerpen/<slug>` yang berfungsi.
4. `npm run build` lulus; tiada repo dependency baharu.
5. Tiada `/novela`, `/bersiri`, `/terjemahan`, `/fragmen`, `/sinopsis` dibina dalam fasa ini.