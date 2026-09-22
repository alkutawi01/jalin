# Semakan Editorial — Rumah yang Masih Menyimpan Suara

Status: dokumen semakan FASA 2E-3 (dokumentasi sahaja, tiada kod, tiada visual)
Tarikh: 22 September 2026
Milestone: FASA 2E-3 — Editorial completion workflow sebelum `status: published`

Karya: `content/works/rumah-yang-masih-menyimpan-suara.md` (JLN-CER-0003)
Manuskrip: co-write ChatGPT + Mimo, `status: review`

## 1. Story assessment

**Tema**
- Inti tema: rumah sebagai penyimpan jejak dan suara manusia yang tiada.
- Tema disokong secara konsisten: rumah kosong yang "tidak pernah benar-benar sunyi", kenangan sebagai car a menghargai, bukan cara mengembalikan masa lalu.

**Struktur**
- Pembukaan kuat: dua perenggan pembuka meletakkan premis dengan segera.
- Pergerakan jelas: tiba di rumah → mengemas → objek memicu kenangan → bilik Mak → penutup di beranda dan dalam kereta.
- Keseluruhan linear dan mudah difahami; sesuai pembaca 13–17.

**Permasalahan:** manuskrip terlalu pendek — **983 patah perkataan**, sasaran Jalin 2,000–2,500.

**Watak**
- Aiman: protagonis tersirat, konflik dalaman jelas (pulang → memahami rumah sebagai penyimpan).
- Mak: hadir secara tidak langsung melalui objek dan tulisan; berkesan tetapi perlu lebih babak untuk berat emosi.
- Farid: suara penyeimbang; berguna kerana memberi sudut pandang kedua, tetapi kurang peranan aktif.

**Emosi**
- Detik paling kuat: tulisan Mak "Jangan lupa makan" dan penafian Farid ("rumah ni tempat semua benda yang kita tak sempat cakap masih tinggal").
- Emosi tertahan (subteks) — selari suara Jalin.

**Kekuatan**
- Gaya tenang, subteks, objek harian sebagai pembawa makna.
- Tanpa melodrama; penutup kuat dan berlapis.
- Glosari koheren dengan teks (beranda, kenangan, pusaka, reda).

**Kelemahan**
- Kependekan keseluruhan; hubungan Aiman–Mak terasa dipadamkan.
- Konflik Aiman/Farid tentang nasib rumah belum dibangunkan.
- Tiada babak zaman kanak-kanak; kenangan hanya disebut, tidak dirasa.
- Keputusan akhir terhadap rumah tidak diakhiri dengan jelas.

## 2. Revision list

Perubahan diperlukan sebelum `status: published`, dengan sasaran kiraan 2,000–2,500 patah perkataan:

1. **Hubungan Aiman–Mak** — tambah kedalaman: satu adegan kecil zaman kanak-kanak yang dirasa, bukan hanya disebut (cth Mak membaca, memasak, atau menasihati).
2. **Konflik Aiman/Farid tentang rumah** — bangunkan perbezaan pandangan: simpan vs berikan/letak untuk dijual; lonjakkan perbualan kepada perselisihan kecil yang reda.
3. **Satu babak nostalgia konkret** — objek dengan cerita hidup (kert as kerja sekolah, gambar, alat mengaji) yang menggerakkan emosi Aiman dengan lebih mendalam.
4. **Keputusan akhir rumah** — berikan ketetapan pada penutup: apa yang mereka pilih lakukan dengan rumah, walaupun kecil.
5. **Meningkatkan `readingMinutes`** — jika teks sampai sasaran panjang, semak semula kiraan (~12 min pada 2,000–2,500 patah).
6. **Tiada padding kosong** — tambah kedalaman, bukan ayat pengisi generik.

## 3. Metadata review

| Field | Nilai semasa | Catatan |
| --- | --- | --- |
| `id` | JLN-CER-0003 | OK, urutan betul. |
| `slug` | rumah-yang-masih-menyimpan-suara | OK. |
| `title` | Rumah yang Masih Menyimpan Suara | OK. |
| `type` | cerpen | OK. |
| `status` | review | Betul untuk semasa; → published selepas semakan. |
| `genre` | Keluarga · Ingatan | Nilai semasa ialah string; pastikan konsisten dengan schema (`genre?: string`). |
| `audience` | 13-17 | OK. |
| `version` | v0.1 | Boleh naik ke v1.0 selepas semakan siap. |
| `readingMinutes` | 12 | Perlu disemak semula selepas revisi (lihat §2.5). |
| `dek` | ringkasan kenangan/rumah | OK; boleh dimampatkan sedikit. |
| `glossary` | beranda, kenangan, pusaka, reda | OK; tambah istilah baharu dari revisi jika wujud. |
| `credits` | chatgpt (co_writer), mimo (co_writer), izzat-anas (final_editor) | OK; pastikan kind: virtual pada chatgpt/mimo kekal. |
| `visuals` | [] | Dibiarkan kosong sehingga teks final (§4). |
| `editorialHistory` | v0.1 initial | Tambah entri selepas revisi. |

## 4. Visual brief

Selepas teks final sahaja. **Jangan generate Magnific dahulu.**

Rancangan rujukan bagi semakan kemudian:

- **Hero** — rumah kampung lama seusai hujan petang, basikal bersandar, cahaya lembut dari tingkap.
  - Cadangan anchor: "Rumah itu masih berdiri seperti dahulu." — place: after
- **Inline 1** — meja kayu lama dengan bekas pensel, buku catatan, cahaya pagi.
  - Cadangan anchor: "Di atas meja itu masih ada bekas pensel kayu yang pernah digunakan Mak." — place: before
- **Inline 2** — pintu bilik lama separuh terbuka, suasana tenang dan penuh ingatan.
  - Cadangan anchor: "Aiman berhenti di hadapan pintu bilik yang sudah lama tidak dibuka." — place: after

## Keputusan seterusnya (masa depan)

Selepas dokumen ini: pilih sama ada (a) revisi teks dahulu, atau (b) terus masuk pipeline visual. Cadangan: **revisi teks dahulu** kerana panjang belum sampai standard Jalin.