# Jalin Admin: design system (fasa 1)

Fail: `src/app/admin/admin.css` (token dan komponen), `src/components/admin/AdminShell.tsx` (rangka).

## Logo (TERKUNCI, lihat `public/brand/README.md`)
- Pengepala/navigasi guna `jalin-wordmark.svg` sahaja. Jangan lukis semula, warna semula, potong, atau taip semula "Jalin" dengan fon dalam kod.
- Wordmark diletakkan di atas permukaan kertas (`--a-side`, #fbf8f2) yang ia direka untuk; lebar 118px (sama dengan pengepala pembaca); ada ruang bersih sekeliling.
- "Admin" ialah label berasingan di sebelahnya, bukan sebahagian logo.
- Jangan letak wordmark atas latar gelap: `jalin-logo-reversed.svg` ada masalah (latar dan bentuk sama-sama krim, jadi tidak kelihatan). Betulkan aset itu dahulu jika perlu sidebar gelap.
- Aset ikon bulat sahaja (`jalin-icon-color.svg`) untuk konteks ikon sahaja.

## Token (`--a-*`)
Warna (kertas, dakwat teal, tanah liat sebagai aksen; status ok/amaran/bahaya/info), fon (`--a-font` sistem UI untuk kawalan; `--a-serif` Georgia hanya untuk tajuk halaman), jejari (8/12px), bayang, lebar sidebar.

## Komponen
Kelas sedia ada `.admin-*` distailkan semula di bawah `.a-shell`, jadi setiap halaman dapat rupa baharu tanpa diubah: butang (`.admin-btn`, `-primary`, `-outline`, `-danger`, `-sm`), medan/select/textarea (tinggi 38px, fon UI, radio/kotak semak beraksen), jadual, lencana status, tab, amaran, kad (`.admin-section`, `.admin-stat-card`, `.admin-nav-card`), pemilih jenis (`.admin-choice`).
Komponen baharu bertanda `.a-*`: rangka (`.a-shell`, `.a-side`, `.a-topbar`, `.a-drawer`), `.a-btn`, `.a-nav-link`.

## Rangka
Sidebar kiri (Papan Pemuka, Karya, Editorial, Tetapan), butang **Tambah Karya** tetap di atas, Laman awam dan Log keluar di bawah. Bawah 900px: bar atas dengan butang Menu dan laci. Halaman log masuk tanpa rangka.

## Belum (fasa 2)
Selesai dalam fasa 2: dialog pengesahan dan toast dalam laman (`lib/admin/dialogs.ts`, `DialogHost`), rangka pemuatan (`LoadingBlock`), keadaan kosong (`.a-empty`). Belum: menyusun semula halaman tab karya yang panjang, gaya cetak, mod gelap.
