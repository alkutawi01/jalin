# Warna latar blok laman utama

Status: dilaksanakan 2026-10-06 (arahan Izzat).

## Keputusan

- Editor memilih warna latar bagi empat blok laman utama di **Tetapan > Warna blok laman utama**: Karya utama (karusel), Bersiri, Karya Terbaru, Jelajahi Kategori.
- Pilihan **hanya daripada warna tema Jalin**, bukan warna bebas: Kertas, Putih, Peach muda, Peach, Teal tua, Terracotta, Hitam (warna logo ditambah putih dan hitam).
- Memilih warna menukar **warna elemen berkaitan secara automatik** supaya kontras kekal (WCAG AA, 4.5:1 untuk teks): teks, teks lembut, aksen, garis dan pil tarikh. Kad karya, kad kategori dan anak panah karusel kekal berwajah cerah.
- Kepala dan kaki halaman tidak termasuk (komponen dikongsi semua halaman).
- Sebelum sesiapa memilih, rupa laman tidak berubah (Kertas; blok kategori Peach muda).

## Penyimpanan

Tiada migrasi. Pilihan disimpan dalam `prompt_templates` skop `site_theme`, nama `home.<blok>.ground`, `prompt_text` = kunci warna. Setiap simpanan ialah versi baharu dan versi aktif terkini menang (pola sama seperti `site-copy`). Memilih warna asal sesuatu blok membuang baris tersimpan. Pembacaan tidak pernah melempar ralat: masalah pangkalan data memaparkan warna asal.

## Fail

- `src/lib/site-theme.ts`: palet, blok, baca dan simpan.
- `src/app/api/admin/site-theme/route.ts`: GET dan POST (perlu admin, menerima hanya blok dan warna yang dikenali).
- `src/components/admin/SiteThemeSettings.tsx`: petak warna dalam Tetapan.
- `src/app/globals.css`: peraturan `[data-ground]` di hujung fail.
- `__tests__/site-theme.test.ts`: ujian palet, kontras dan pemasangan.

## Pengesahan

Setiap kombinasi blok × warna (4 × 7) disemak pada laman setempat: 616 teks ukur, tiada yang di bawah 4.5:1 (3:1 bagi teks besar).
