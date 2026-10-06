# Modul Penilaian (rating)

Keputusan Izzat, 7 Oktober 2026. Modul ini di sisi editor sahaja buat masa ini: tempat paparan awam belum diputuskan.

## Apa yang dinilai

- Cerpen, novela (semua bab) dan siri yang **sudah tamat** (semua episod). Karya penuh sahaja.
- Tidak dinilai: sinopsis, fragmen, satu episod, satu bab, siri yang masih diteruskan.
- Penilaian **tidak wajib**. Prinsip editorial: karya di bawah 8/10 tidak diterbitkan.

## Aliran

1. Admin > karya atau siri > **Penilaian & teks penuh** (`/admin/penilaian/work|series/[id]`).
2. **Muat turun teks penuh (.txt)** atau **Salin teks penuh**: seluruh karya dalam satu klik (juga tersedia untuk karya yang tidak dinilai).
3. **Salin arahan** (bersama teks, atau arahan sahaja untuk dilampirkan fail), tampal ke chatbot dalam sesi baharu.
4. Tampal jawapan chatbot, **Semak**, kemudian **Simpan penilaian**.
5. Tandakan untuk disiarkan, tarik balik, atau tolak. Skor dan ayat tidak boleh disunting.

## Rubrik (`JALIN-PENILAIAN-1`)

Tujuh komponen berat sama, nombor bulat 0–10: Plot & Struktur, Watak, Bahasa & Gaya, Dialog, Tema & Makna, Kesan Emosi, Keaslian. Sauh bertulis pada 2, 4, 6, 8, 10; 6 ialah aras lalai. Skor keseluruhan (purata) dan labelnya dikira oleh sistem, bukan chatbot. Konsensus ialah median penilai semasa yang masih sah.

Chatbot juga memberi: nama modelnya, "Sesuai Untuk", **Verdict** (maksimum 30 patah perkataan), **Ulasan** (100–300 patah perkataan), kekuatan, kelemahan, amaran kandungan.

## Jaminan

- **Kod rujukan** (`JP-XXXX-XXXX`) terbit daripada karya + teks + versi rubrik. Jawapan dengan kod lain ditolak; apabila teks berubah, penilaian lama ditanda **lapuk** dan tidak masuk konsensus.
- Setiap komponen membawa satu **petikan bukti** yang dicari dalam teks. Satu hingga tiga petikan tidak ditemui: amaran. Empat atau lebih: jawapan ditolak.
- Satu penilaian semasa bagi setiap model bagi setiap karya; yang terdahulu kekal sebagai sejarah. Model yang turut menulis karya boleh menilai.
- Jawapan mentah chatbot disimpan.

## Data

Migrasi `024_ratings`: satu jadual `ratings` (aditif, boleh diundur). Tiada perubahan pada jadual lain, snapshot terbitan atau payload awam.

## Kod

- `src/lib/admin/rating/`: `rubric.ts`, `full-text.ts`, `prompt.ts`, `parse.ts`, `rating-service.ts`
- `src/app/api/admin/ratings/`, `src/app/api/admin/full-text/`
- `src/app/admin/penilaian/[kind]/[id]/page.tsx`
- Ujian: `__tests__/rating.test.ts`
