# Visual Audit & Brief v2 — Waktu Sebenar

Status: **DILULUSKAN Director dengan pindaan** — penjanaan satu aset demi satu; audit setiap aset sebelum
aset seterusnya. Pindaan asal: (1) Hero: kekal Wardah + kedai jam + puluhan jam, elak komposisi
poster/metafora, utamakan suasana cerita sebenar; (2) B2: kekal Bab 19, fokus hubungan kerja dua generasi,
jangan dramatikkan emosi; (3) B3: bukan objek jam sahaja — interaksi dua tangan/generasi, jam hanya medium
hubungan.

**B1 v2.2 diluluskan** dengan struktur naratif mengalir + HANYA dua larangan (no other people; face not
visible) + larangan sebutan objek (kitchen/tea/European/wrong objects) DILARANG disebut dalam prompt.
Audit selepas jana: 5 soalan output sahaja (Ada Wardah? Perempuan? Kedai jam dominan? Rasa Malaysia?
Boleh jadi hero novel?). Jika gagal: jangan tambah prompt panjang — pertimbang tukar komposisi.

Rujukan: `docs/VISUAL_GENERATION_GUARDRAILS.md`, `docs/VISUAL_BIBLE.md` (Soft Cinematic Literary Editorial
Illustration). Menggantikan arah Scene 1–3 dalam `visual-plan-waktu-sebenar.md` (plan v1 lemah).

---

## 1. Tiga momen paling penting dalam novel

| # | Momen | Lokasi | Emosi teras |
|---|-------|--------|-------------|
| 1 | **Pulang & bunyi puluhan jam** — "Puluhan jam berdetik serentak. Tiada satu pun benar-benar bergerak bersama." | Bab 1 (L5) | Berang, tanggungjawab, masa tidak sinkron — premis tema |
| 2 | **Kongsi meja kerja / "cerangkang"** — dua figura, nama alat yang mula hilang dari ingatan abah | Bab 19 (L2199) | Rekonsiliasi senyap, warisan kraf, ingatan mula terputus |
| 3 | **"Kau tengok dulu" → "Betul."** — abah menolak jam poket; Wardah memulihkan komponen asal | Bab 25 (L2493) | Kepercayaan, pengesahan senyap, makna masa dipegang tangan |

## 2. Audit visual sedia ada (plan v1 → semua REGENERATE)

| Visual | Masalah | Verdict |
|--------|---------|---------|
| Hero: kedai jam (tiada manusia) | Tempat sahaja, generik | REGENERATE |
| Abah + mekanisme jam | Literal-objek; terlalu rapat dengan hero (bab 1) | REGENERATE |
| "Konflik" berdepan | Anchor jatuh bab 1 (drift dari plan); 3 visual terperangkap bab 1 → gagal breathing | REGENERATE |

## 3. Pelan "chapter breathing" baharu

```text
Hero (cover) → Bab 1–18 teks → Visual 2: Bab 19 → Bab 19–24 teks → Visual 3: Bab 25 → Bab 25–Epilog teks
```
Visual lama (hero + 2 dalam bab 1) dibuang. Visual 4–5 (klimaks Bab 20–21; Epilog) kekal optional.

---

## 4. Log janaan (Magnific, official pipeline visual-requests)

### B1 — Hero
| Cubaan | Request | Keputusan |
|--------|---------|-----------|
| 1 (v2) | #2 (`617923bf…`) | **REJECTED** — dua watak, dua muka jelas, adegan kerja meja |
| 2 (alternatif) | #3 (`736bb026…`, `vr-3-v3-0d7dde43.png`) | **REJECTED** — lulus 5/6 tetapi figura lelaki, bukan Wardah |
| 3 (v2 diperkukuh) | #4 (`4d698e5d…`, `vr-4-v3-123be1ab.png`) | **REJECTED** — watak tiada dalam frame; elemen dapur menguasai |
| 4 (v2.1) | #5 (`f57a7716…`, `vr-5-v3-5d8ebca1.png`) | **REJECTED** — watak tiada; sebutan literal larangan objek menjemput objek tersebut (negatif-inversi) |
| 5 (v2.2 TERAKHIR) | #6 (`c08b22af…`, `vr-6-v3-89d30e10.png`) | **LULUS 5/5** — Wardah hadir (back view, feminin); kedai jam dominan (puluhan jam); rasa kayu kampung tropika; layak hero novel. Nota: "bun" = ikat rendah; rasa lebih generik-tropika |

**Kandidat hero = req #6 (`vr-6-v3-89d30e10.png`), status `under_review` — menunggu kelulusan Director untuk approve/attach.**

### B2 — Bab 19 (dihentikan — menunggu keputusan Director)
| Cubaan | Request | Keputusan |
|--------|---------|-----------|
| B2-1 | #7 (`8791c7e4…`, `vr-7-v3-411a3f98.png`) | **REJECTED** — hubungan dua generasi, restrained, kedai jam semua betul; TETAPI dua muka jelas melanggar brief "faces not visible" + rule muka Jalin |
| B2-2 (over-shoulder) | #8 (`28ea9d9b…`, `vr-8-v3-8a2e9845.png`) | **REJECTED** — arahan "faces cannot be seen" diabaikan model; dua muka jelas lagi |

**Keputusan menunggu Director (B2):**
- **(A) Exception muka editor** — AGENTS #16 benarkan muka jelas dengan kelulusan editor eksplisit; kedua-dua
  aset B2 kuat naratif/restrained.
- **(B) Komposisi crop tangan/torso** — tiada kepala dalam bingkai; satu cubaan baharu selepas arahan.

Tiada janaan lanjut tanpa salah satu arahan. **B3 belum dijana.**

### Corak kegagalan (diagnosis)
- Ayat mengalir + figura diselitkan → figura MUNCUL (cubaan 2 & v2.2).
- Struktur telegrafik + negatif panjang → figura DIGUGURKAN (cubaan 3, 4).
- Sebutan literal larangan objek → objek dijana (negatif-inversi, cubaan 4).
- Larangan muka tak cukup kuat untuk babak dua-figura (B2-1 & B2-2).

## 5. Brief final

### B1 — HERO (LULUS — req #6)
Prompt v2.2: "A young Malay woman in her twenties, with a feminine silhouette and long dark hair tied in a
simple bun, has just returned to her father's old Malaysian clock repair shop. Seen from behind, she
quietly stands inside the shop observing the familiar space filled with old clocks. Wooden shelves filled
with many clocks. A clock repair bench with watch repair tools, a magnifying lamp, small gears and watch
movements. Warm morning sunlight through the window. Soft cinematic editorial illustration, literary novel
illustration. No other people. Face not visible."
- Scene/anchor: Bab 1 (L5). Placement: hero.
- Alt: "Wardah, perempuan Melayu muda berambut disanggul, dilihat dari belakang, berdiri memerhati kedai
  jam lama ayahnya disinari cahaya pagi."

### B2 — INLINE (Bab 19) — belum lulus
Scene truth: Bab 19 (L2199) "Semenjak pagi mereka mula berkongsi meja kerja…". Anchor (unik): "Semenjak
pagi mereka mula berkongsi meja kerja", place=after. Dua generasi di meja kerja; restrained; muka tak
jangka (masalah A/B di atas).

### B3 — INLINE (Bab 25) — belum dijana
Scene truth: Bab 25 "Kali ini, abah menolak jam itu sedikit ke arah Wardah." (anchor unik) → "Kau tengok
dulu." Interaksi dua tangan dua generasi; jam poket hanya medium; crop tangan/torso; tiada muka; pagi.
Alt: "Tangan abah yang tua menghulur dan tangan Wardah yang muda menerima di atas meja kerja — jam poket
hanyalah medium pertukaran itu."

## 6. Peraturan pelaksanaan
1. Satu aset demi satu; audit sebelum teruskan aset seterusnya.
2. Magnific sahaja · one-item rule (satu alternatif selepas penolakan beralasan; tukar komposisi, jangan
   prompt panjang).
3. Rule muka: tiada muka jelas tanpa kelulusan editor eksplisit (AGENTS #16).
4. Larangan objek JANGAN disebut dalam prompt (negatif-inversi); dua larangan minimum sahaja.
5. Selepas kelulusan Director: kemas kini DB visuals (src/alt/anchor) + `is_asset_finalized`; jangan
   attach tanpa kelulusan.

## 7. Keadaan pipeline sekarang
- #6 under_review (kandidat hero — LULUS) · #3 under_review (rujukan) · #2/#4/#5/#7/#8 rejected.
- Semua aset di storan Neon staging; tiada attach; hero produksi lama kekal terbit; DB visuals tidak berubah.