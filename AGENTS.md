# AGENTS.md

Dokumen ini ialah arahan kerja bersama untuk semua AI/agent yang menyentuh repository Jalin.

## Produk

Jalin — oleh Adjung ialah platform fiksyen berilustrasi untuk remaja 13–17 tahun. Kandungan utama: Cerpen, Novel Pendek, dan Bersiri.

## Hard rules

1. Jangan ubah keputusan produk yang sudah dilock tanpa arahan manusia.
2. Jangan masukkan manuskrip belum terbit, story bible sebenar, arc masa depan, API key, token, atau data peribadi ke repo public.
3. AI tidak menerbitkan kandungan secara autonomi. Kawal selia manusia wajib.
4. Penulis/penyemak maya boleh menggunakan persona bernama, tetapi bio mesti menyatakan dengan jelas bahawa mereka ialah AI/penulis maya.
5. Semua ilustrasi mesti mematuhi Jalin House Style.
6. Untuk watak/lokasi berulang, guna canonical visual reference apabila tersedia; jangan reka semula daripada prompt teks sahaja.
7. Cerpen tunggal ialah satu halaman. Novel Pendek dan Bersiri menyokong bab, progress dan sambung bacaan.
8. Semua karya perlu menyokong glosari ringkas pada perkataan terpilih.
9. Jangan overengineer MVP.
10. Perubahan besar pada schema, auth, publishing flow atau deployment perlu didokumenkan dahulu.

## Working style

- Utamakan perubahan kecil yang boleh diuji.
- Pisahkan content model daripada UI.
- Gunakan TypeScript strict.
- Pastikan reka bentuk responsif dan mobile-first.
- Elakkan vendor lock-in yang tidak perlu.
- Jangan tambah dependency besar tanpa justifikasi.
- Simpan keputusan penting dalam docs/.

## Source of truth

- docs/PRODUCT.md
- docs/EDITORIAL_SYSTEM.md
- docs/AI_WRITERS_ROOM.md
- docs/VISUAL_BIBLE.md
- docs/CONTENT_MODEL.md
- docs/ARCHITECTURE.md
