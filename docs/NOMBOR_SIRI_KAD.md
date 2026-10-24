# Nombor siri kad langganan (keputusan Izzat, 24 Oktober 2026)

Setiap kad mempunyai satu nombor siri yang tercetak terbuka pada label pelekat, bersama kod (di bawah pelekat kikis).

```
JLN-12B0126-01
 |   |  |  |
 |   |  |  +-- nombor kad itu dalam kumpulannya (sekurang-kurangnya dua digit: 01, 02 ... 99, 100 ...)
 |   |  +----- bulan dan tahun kod dijangka dikeluarkan (MMYY, waktu Malaysia): 0126 = Januari 2026
 |   +-------- tempoh langganan: 01B = 1 bulan, 06B = 6 bulan, 12B = 12 bulan
 +------------ Jalin
```

## Peraturan

- **Faktor kedua.** Pembaca menaip nombor siri bersama kod ketika menebus. Kod sahaja tidak mencukupi: nombor siri terikat dalam HMAC yang disimpan (`HMAC(kunci, "JALIN-V2" + panjang + ":" + siri + ":" + kod)`), jadi sebuah kod hanya sah dengan nombor siri kadnya sendiri.
- **Label hanya mencetak nombor siri dan kod.** Tiada teks lain (arahan dan tempoh ada pada kad yang direka dalam Canva atau Illustrator).
- **Kelompok.** Admin memilih tempoh, bilangan kad dan bulan dijangka dikeluarkan. Nombor kad bermula pada 01. Jika kelompok lain dengan tempoh dan bulan yang sama sudah wujud, nombor kad bersambung daripadanya (contoh 51, 52 ...) dan kelompok dinamakan `JLN-12B0126-B2`. Satu kumpulan (tempoh dan bulan) boleh memuat sehingga 99,999 kad.
- **Penggantian kad** (rosak atau hilang sebelum ditebus): kod lama dibatalkan dan kad baharu mendapat nombor seterusnya dalam kumpulan yang sama.
- **Pemulihan pangkalan data:** nombor seterusnya dikira daripada nombor tertinggi yang ada, jadi selepas fail eksport malam digunakan semula (`reconcileWithExport`) nombor tidak berulang (diuji dalam `scripts/restore-drill.ts`).
- **Pengesahan format:** `normaliseSerial` menerima huruf kecil, jarak, garis bawah dan sengkang panjang daripada papan kekunci telefon.
