# Kad langganan Jalin (cetakan fizikal)

Dibuat daripada kad Sains untuk Semua (Kad kod langganan.zip), diubah suai untuk Jalin: warna dan huruf jenama Jalin, motif bidai, logo Jalin oleh Adjung, dan arahan tebus Jalin (kod **dan** nombor batch).

## Fail

| Fail | Guna |
|---|---|
| `jalin-kad-hadapan-1-bulan`, `-6-bulan`, `-12-bulan` | Hadapan kad, satu setiap tempoh. Garis kecil di bawah "Kad langganan" berbeza warna (beige, tanah liat, teal) supaya mudah diasingkan. |
| `jalin-kad-belakang-<batch>` | Belakang kad untuk satu nombor batch. Dijana semula bagi setiap batch (lihat di bawah). Contoh: `B2610-001`. |
| `.svg` | Saiz kad (3.5 x 2 in), teks sudah jadi lengkung (kedai cetak tak perlukan fon). Boleh dibuka dalam Illustrator, Inkscape atau Canva. |
| `-cetak.pdf` | Untuk pencetak: 3 mm bleed setiap sisi (saiz halaman 94.5 x 56.9 mm sebelum dipotong 88.9 x 50.8 mm), 600 dpi. |
| `-cetak-600dpi.png` | Imej yang sama untuk semakan. |

## Buat belakang kad untuk batch baharu

```
node scripts/kad/jana-kad.mjs B2610-001
node scripts/kad/jana-kad.mjs B2610-001 2026   (tahun dalam baris hak cipta; lalai: tahun semasa)
```

Nombor batch mesti sama dengan nombor batch yang dijana dalam admin (Langganan > Kod). Pembeli menaip nombor ini bersama kod semasa menebus.

## Apa yang TIDAK dicetak dalam fail ini

**Kod rahsia.** Kod berada pada label haba yang dilekatkan di ruang kelabu, kemudian ditutup dengan pelekat kikis (38 x 16 mm; ruang kelabu pada reka bentuk ialah saiz itu). Jangan sekali-kali masukkan kod ke dalam fail ini atau hantar fail kod kepada kedai cetak. Lihat `docs/KAJIAN_AKAUN_PEMBACA_DAN_KOD_TEBUS.md` bahagian 16.

## Sebelum cetak ribuan kad

Ujian fizikal yang sudah diputuskan dalam kajian (label haba, pelekat kikis, geseran, haba) masih perlu dibuat dengan label dan pelekat sebenar. Kad percubaan: cetak 10 kad, lekat label dan pelekat, kikis, semak kod masih jelas. Saiz tulisan terkecil pada belakang kad ialah kira-kira 5.5 pt (kira-kira 1.9 mm); semak kebolehbacaan pada cetakan sebenar dan besarkan jika perlu.

## Halaman tebus (kad maya)

Halaman `/tebus` memaparkan belakang kad sebagai **kad maya** (HTML, bukan gambar): kotak kod berada di tempat pelekat kikis pada kad fizikal. Dua aliran:

- **Dibayar dalam Jalin:** kod dihantar ke e-mel. Pembeli menaip atau menampal kod dalam kotak KOD. Tiada nombor batch.
- **Kad fizikal:** pembeli menekan "Saya ada kad fizikal", ruang NO. BATCH muncul pada kad maya, kemudian kikis pelekat, taip kod dan nombor batch. Jika kod ditolak dan nombor batch belum dimasukkan, ruang itu dibuka secara automatik.
