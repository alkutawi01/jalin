# B3 Visual Request — Waktu Sebenar (Bab 25) — **EDITORIAL VISUAL PENDING**

> **STATUS (Director, 2026-09-28): pursuit B3 generation DIHENTIKAN.**
> - Tiada janaan baharu; **jangan attach** calon komposit.
> - Calon komposit (role `inline_bab25_candidate_composite`): **#14** "abah melepaskan" (`vr-14-v3-db9e50dd.png`, under_review, LULUS audit) + **#16** "Wardah menerima" (`vr-16-v3-ecfbd32b.png`, under_review, LULUS audit) — kedua-duanya KEKAL sebagai calon, bukan aset production; #15 = provider-failed.
> - Percubaan single-image: #9, #11, #12, #13 — semua **rejected** (rekod audit §6–§9).
> - Reader TIDAK bergantung kepada B3: `visuals` kekal 2 (hero #166 + bab19 #167); tiada kod/kandungan merujuk `inline_02_bab25` (verified via grep).
> - B3 bukan kritikal kepada pembaca (keputusan Director) — gabung editorial hanya jika/semasa diarah.

~~Status lama: disediakan sahaja — TIADA request dihantar.~~ (dikemas kini — 4 percubaan telah dijalankan & direkod di bawah)
Gate selesai: revision patch JLN-NOV-9990 rev3 (`rev_JLN-NOV-9990_3_1790566174135`) telah disahkan — snapshot kini membawa 7 istilah glosari; pembaca menerima glosari + visual + teks dalam revision yang sama.
Sumber: Phase 3 Preflight (disahkan terhadap manuskrip `Waktu_Sebenar_Structural_Edit_v1.0.txt`).
Rujukan wajib: `docs/VISUAL_GENERATION_GUARDRAILS.md`, `docs/VISUAL_BIBLE.md`, `docs/visual-brief-waktu-sebenar-v2.md`.

## 1. Anchor

| Field | Value |
|---|---|
| work_id | `JLN-NOV-9990` |
| role (cadangan) | `inline_02_bab25` |
| anchor (unique, 1/1) | `Kali ini, abah menolak jam itu sedikit ke arah Wardah` |
| place | `after` |
| Bab / baris | BAB 25 (header L2493; adegan L2495-2521) |
| Alt (BM) | "Tangan abah yang tua menghulurkan jam poket gear berlapis kepada tangan Wardah yang muda di atas meja kerja jam pada waktu pagi." |

## 2. Fact check (teks → imej)

| Fakta | Sahih | Baris |
|---|---|---|
| Waktu | Pagi ("pada suatu pagi") | L2495 |
| Babak | Pelanggan lama (awal) → abah menolak jam ke arah Wardah → "Kau tengok dulu" → Wardah pulihkan komponen asal → abah periksa dekat → "Betul." | L2495-2517 |
| Bingkai | Dua tangan sahaja; pelanggan/watak lain TIADA dalam visual | L2495-2499 |
| Jam | Jam poket, gear berlapis, penutup belakang boleh buka/tutup | L2495, 2511-2515 |
| Lokasi | Meja kerja bersama (sejak Bab 19) | L2195+ |
| Props sah | Alat tukang jam, skru kecil, kain lap, lampu meja, rak jam latar | L7, 56, 140 |
| BUKAN dalam babak | Komputer riba/buku nota (babak malam) · "hari abah pening" (rujukan lalu) · teks boleh dibaca · muka · orang lain | L2519-2521 |

## 3. Komposisi

- Crop tangan + torso — tiada kepala dalam bingkai (AGENTS #16; larangan eksplisit maksimum 2).
- Dua pasangan tangan berbeza usia; jam poket = medium pertukaran, bukan subjek dramatik.
- Pagi, cahaya melalui tingkap berhabuk; rak jam kayu kabur latar; restrained — tiada dramatisasi emosi.
- Visual Continuity: interior/meja kerja = reference `vr-6` (#166) + `vr-7` (#167).

## 4. Magnific prompt (READY-TO-SEND — versi akhir Director)

```
A young woman's hands receive an open pocket watch with layered gears from an elderly watchmaker's weathered hands across a worn wooden clock-repair bench. Watchmaker tools, tiny screws and cotton cloth on the bench; shelves of old clocks softly blurred behind. Morning light through a dusty shop window. Warm muted palette, soft cinematic editorial illustration, literary novel illustration. Cropped at torso, faces not visible. No other people.
```

- **Identiti datang daripada reference image, bukan nama watak** — jangan sebut "Wardah"/"abah" dalam prompt; nama watak boleh mencetus interpretasi luar Magnific.
- Larangan eksplisit: 2 sahaja (ada dalam prompt): `faces not visible`, `No other people`. **Jangan tambah larangan lain.**
- References (imej): `vr-6-v3-89d30e10` (meja kerja/interior) + `vr-7-v3-411a3f98` (abah/tangan) · House Style Jalin sebagai disiplin generasi (AGENTS #6, #19).
- Pipeline: Magnific sahaja · satu aset demi satu · one-item rule.

## 5. Audit 5 soalan (sebelum aset seterusnya)

1. Ada dua pasangan tangan berbeza usia?
2. Jam poket jadi medium, bukan subjek?
3. Tiada kepala/muka dalam bingkai?
4. Suasana kedai jam Malaysia + cahaya pagi?
5. Layak mengiringi Bab 25 tanpa memaksa cerita?

Gagal → tukar komposisi; jangan panjangkan prompt.
Selepas LULUS + kelulusan Director → fasa implementasi (kemas kini DB visuals: src/alt/anchor + `is_asset_finalized`).

## 6. Keputusan audit B3 — REJECT (2026-09-28)

### Provenance (Phase 3C)

| | |
|---|---|
| visual_request | **#9** — `inline_02_bab25`, status **`rejected`** (rejected_at 2026-09-28T06:47:02Z, by admin) |
| Provider | Magnific Mystic — task `b67d129b-6ea5-47aa-8b1d-7985be198be3`, model `flexible`, aspect 3:2 |
| References | `structure_reference` = **vr-7** (strength 60) · `style_reference` = **vr-6** (adherence 50, hdr 40) — hierarki Director |
| Asset | provider URL → stable `vr-9-v3-3d7e8062.png` (asset_finalized=true), **TIDAK dipaut, TIDAK diterbitkan** |
| visuals table | kekal 2 (hero #166, inline_01_bab19 #167) — tiada attach |

### Gate Director (7 titik)

| Kriteria | Keputusan | Catatan |
|---|---|---|
| Dua tangan berbeza generasi (beat terima-menerima) | ❌ | Wujud dua generasi TETAPI adegan = dua figura duduk bekerja sendiri; tiada adegan menerima jam |
| Jam poket jelas, bukan close-up produk | ❌ | Jam poket terbuka gear berlapis TIDAK kelihatan; objek tangan hanya alat kecil |
| Meja kerja tukang jam | ✅ | Bangku kayu, alat, ragum, bahagian kecil — selari vr-7 |
| Tiada muka | ❌ **(hard fail)** | DUA MUKA penuh profil, jelas dikenali — langgar AGENTS #16 + guardrail §2 + larangan prompt |
| Tiada orang ketiga | ✅ | Hanya dua watak |
| Bukan seperti iklan jam | ✅ | Adegan bengkel lukisan, bukan produk mewah |
| Emosi terkawal | ❌ | Pose wanita tangan ke leher + pandangan turun = sentimental/romantis (diwarisi struktur vr-7), bukan penerimaan neutral |

### Guardrail lain

- **Scene truth**: beat Bab 25 (abah menolak jam → Wardah menerima) **TIDAK dilukis** — output mengulang babak berkongsi-meja Bab 19. Silently factual substitution (guardrail §9) → **REJECT**.
- **Continuity**: komposisi hampir **klon vr-7** (structure_strength 60 menarik layout + pose tangan-ke-leher vr-7); identiti watak condong Kaukasia/rambut perang vs Melayu gelap dalam vr-6/vr-7 → **drift identiti**.
- **Anatomy**: lengan/jari/pegangan — tiada anggota lebih, tiada prop bercantum → PASS.
- **Style**: palet hangat, lukisan lembut, cahaya pagi ✓; glow HDR lebih kuat daripada kanonik (kesan hdr/structure) — perbezaan sederhana.

### Punca teknikal (untuk percubaan seterusnya — menunggu arahan)

1. `structure_reference` vr-7 @60 **mengklon komposisi Bab 19** (figura penuh + pose emotif) — bertentangan dengan crop-tangan Bab 25.
2. `adherence` 50 tidak cukup memaksa larangan `faces not visible` menentang structure.
3. Cadangan pilihan (Director pilih sebelum retry): (a) **tanpa** structure_reference — vr-6 kekal style, prompt mengawal komposisi crop tangan; (b) structure vr-7 diturunkan ke ~25-30 + adherence naik ~70; (c) tukar strategy: vr-7 → style, tiada structure.
4. Rule muka: perketat framing prompt ("extreme close crop, heads out of frame") — tetapi PRIMIER tetap audit selepas generate.

## 7. B3 RETRY (C + sedikit A) — REJECT (2026-09-28)

### Strategi reference baharu (arahan Director)

- **TIADA `structure_reference`** — vr-7 langsung tidak digunakan untuk komposisi.
- `style_reference` = **vr-6** sahaja (interior/style) · adherence & hdr **default** (tiada peningkatan).
- Hierarki: scene truth Bab 25 > crop > suasana vr-6 > house style.

### Provenance

| | |
|---|---|
| Percubaan | visual_request **#10** gagal (Magnific 502 "Error consuming credits", tiada task) → **#11** berjaya |
| Task | `cf28b1c8-c5b8-428f-8174-a385cd3429e3` · model `flexible` · 3:2 |
| References | structure = **NONE** · style = **vr-6** · adherence/hdr default |
| Asset | `vr-11-v3-ed86452c.png` (asset_finalized=true), status kini **`rejected`** (2026-09-28T07:03:08Z) — tiada attach/publish |
| visuals | kekal 2 (hero #166, inline_01_bab19 #167) |

### Audit 5-titik (arahan retry)

| Kriteria | Keputusan | Catatan |
|---|---|---|
| 1. Dua tangan generasi berbeza | ⚠️ lemah | Dua pasangan tangan wujud (lelaki luas vs wanita halus) tetapi KEDUA-DUANYA licin — kontras usia/`weathered` tidak ketara |
| 2. Tindakan "menolak ke arah", bukan bekerja | ❌ **(decisive)** | Tangan kanan wanita MENGPEGANG ALAT (bukan tangan terbuka menerima); tangan abah memegang/menunjuk jam di atas meja — bacaan = "sama-sama bekerja atas jam", tiada vektor tolak-ke-arah-menerima |
| 3. Tiada muka | ✅ | Kepala luar bingkai sepenuhnya |
| 4. Tidak menyerupai Bab 19 | ✅ | Komposisi crop tangan berjaya — bukan klon dua-figura |
| 5. Suasana kedai jam konsisten | ✅ | Rak jam, cahaya pagi, palet hangat, lukisan lembut ✓ |

Anatomy: lengan/jari/prop — tiada anggota lebih/cantuman → PASS. Jam = medium tindakan (bukan poster produk) — boleh diterima tetapi rasa "showcase" sederhana.

### Keputusan: REJECT (#11)

**Punca**: strategi reference kini BETUL (4/5 lulus — crop, muka, bukan Bab 19, suasana) tetapi **beat execution gagal** — tangan penerima tidak "menerima" (pegang alat) dan adegan masih membaca sebagai bekerja, bukan pemindahan.

### Cadangan percubaan #3 (menunggu arahan — tiada auto-retry)

Kekalkan strategi reference SAMA (tiada structure, vr-6 style, default params). Sasar HANYA beat pada prompt:
- tangan wanita **terbuka/telapak menerima, kosong — tiada alat di tangan wanita**;
- vektor aktif: tangan lelaki tua **menghulur/menolak** jam lintas meja (jam bergerak ke arah kanan);
- alat tukang jam hanya di tangan ATAU atas meja — bukan di tangan penerima.

## 8. B3 RETRY #3 — REJECT (2026-09-28)

### Strategi (arah Director): strategi reference TIDAK berubah

Tiada `structure_reference` · `style_reference` = **vr-6** sahaja · adherence/hdr default. Prompt = teks verbatim arahan "B3 RETRY #3" (arah gerakan `old hand → pocket watch → young open palm`).

### Provenance

| | |
|---|---|
| visual_request | **#12** · task `77fc243d-724a-4fb6-8fdf-97f9feebe77d` · model `flexible` · 3:2 |
| Asset | `vr-12-v3-872b8c53.png` · status **`rejected`** (2026-09-28T07:11:50Z) — tiada attach/publish |
| visuals | kekal 2 (hero #166, inline_01_bab19 #167) |

### Audit 5-titik (arahan retry #3)

| Kriteria | Keputusan | Catatan |
|---|---|---|
| 1. Telapak kosong Wardah | ❌ | Pose telapak terbara-ke-atas SUDAH BETUL, TETAPI ada objek kecil (tutup biru/loupe kecil) di atas telapak — bukan kosong |
| 2. Tangan abah menolak jam | ❌ | Jari telunjuk MENUNJUK jam dari atas — tiada sentuhan menolak/menghulur; jam statik di atas kertas |
| 3. Jam di tengah antara dua tangan | ✅ | Layout diagonal: tangan abah (kiri-atas) → jam (tengah) → telapak Wardah (kanan-bawah) |
| 4. Tiada alat di tangan Wardah | ❌ | Objek asing di telapak (sama kelas kegagalan #11 — tangan penerima sentiasa "diisi" model) |
| 5. Tidak nampak seperti Bab 19 | ✅ | Crop tangan ketat, tiada figura penuh |

Anatomy: OK · suasana kedai jam: konsisten · arah komposisi: kini BETUL (kemajuan besar vs #11).

### Keputusan: REJECT (#12) + DIAGNOSIS

**Kemajuan**: layout `abah → jam → telapak` akhirnya terbentuk; muka hilang; bukan Bab 19. **Sisa gagal (2 punca, sama seperti corak #11)**: (a) model sentiasa MELETAK SESUATU di telapak penerima (alat #11, objek kecil #12) walaupun prompt "empty open palm"; (b) "menolak" ditafsir sebagai menunjuk, bukan menghulur/menolak aktif.

### Belum diputuskan (menunggu Director)

Arahan sedia ada: "Jika gagal lagi, saya tidak akan terus paksa generate. Selepas 2 kegagalan tambahan, lebih baik tukar medium kepada crop objek + tangan sahaja." Kegagalan tambahan setelah arahan = **1 (#12)** — sama ada had "2 kegagalan tambahan" sudah dicapai (kira #11+#12) atau tinggal 1 percubaan lagi (#13) adalah **tidak jelas** → laporan + permintaan klarifikasi dihantar; tiada auto-retry.

## 9. B3 MEDIUM BAHARU (#13) — REJECT (2026-09-28) + BERHENTI

### Keputusan Director: ② Tukar medium sekarang

Spec verbatim: abah **meletakkan** jam poket terbuka di atas meja; tangan Wardah **masuk dari sisi dengan telapak kosong hampir menyentuh jam**; tiada wajah; tiada kepala; tiada alat di tangan Wardah. Fokus: **"pemindahan sebuah jam"**, bukan "dua orang bekerja". Strategi reference kekal (tiada structure, vr-6 style, default).

### Provenance

| | |
|---|---|
| visual_request | **#13** · task `e102da8e-3f97-4961-9502-ec7e3889480c` · model `flexible` · 3:2 |
| Asset | `vr-13-v3-9b08671a.png` · status **`rejected`** (2026-09-28T07:22:44Z) — tiada attach/publish |
| visuals | kekal 2 (hero #166, inline_01_bab19 #167) |

### Audit spec medium

| Kriteria | Keputusan | Catatan |
|---|---|---|
| Tangan abah meletakkan jam | ⚠️ lemah | Tangan kanan di atas jam ✓ tetapi tangan kiri MENGPEGANG ALAT (+rantai) — bacaan = membaik pulih, bukan meletak-untuk-memberi |
| Tangan Wardah masuk dari sisi, telapak kosong hampir menyentuh | ❌ **decisive** | **TANGAN KEDUA TIADA LANGSUNG dalam bingkai** — hanya satu orang (baju+kot satu torso) |
| Tiada wajah | ✅ | |
| Tiada kepala | ✅ | |
| Tiada alat di tangan Wardah | ❌ | N/A-melanggar: tangan Wardah tidak wujud; tangan abah pula memegang alat |
| Fokus "pemindahan", bukan "dua orang bekerja" | ❌ | Adegan = **solo repair** (tukang jam bekerja bersendirian dengan alat) — pemindahan tiada |

Anatomy OK; props: objek kipas/pelat aneh di bawah jam (hallucination kecil); suasana jam konsisten.

### Keputusan: REJECT (#13) — DAN BERHENTI (tiada #14 tanpa arahan baharu)

**Corak kegagalan merentas 4 percubaan (diagnosis muktamad)**:
- #11, #12 → dua tangan wujud tetapi sentiasa **bekerja bersama** (alat/objek di tangan penerima);
- #13 (medium dilupuskan interaksi kompleks) → model **membuang penerima terus** — solo repair.
- Model generatif tidak stabil menghasilkan **interaksi dua tangan berarah** (hulur-terima) untuk beat ini; kegagalan tidak lagi prompt/refrence — ia keupayaan komposisi interaksi.

**Status**: B3 `inline_02_bab25` = 4 reject berturut (#9, #11, #12, #13). Menunggu keputusan Director: pilihan antara (a) komposit dua-lapis (jana tangan letak + tangan terima berasingan, gabung manual), (b) serah ilustrasi kepada manusia, (c) cadangan lain — TIADA auto-retry, kredit tidak dibelanjakan tanpa arahan.

## 10. KEPUTUSAN DIRECTOR + KOMPOSIT DUAPING (#14/#16) — KEDUA-DUA LULUS (2026-09-28)

### Keputusan

- **Pilih (a) komposit dua-lapis** — jana dua aset SATU tindakan, gabung secara editorial; **jangan attach**; rekod sebagai **`inline_bab25_candidate_composite`** (bukan aset production tunggal Magnific).
- **Berhenti kejar single-image generation** — B3 kekal eksperimen komposit sahaja.
- B3 **bukan kritikal kepada pembaca**: Hero #166 (kedai jam + Wardah) + Bab19 #167 (dua generasi) sudah kuat; lebih baik 2 visual kuat daripada visual ketiga yang salah.

### Provenance

| Part | visual_request | Task | Asset | Status |
|---|---|---|---|---|
| 1 "abah melepaskan" | **#14** | `94cd9d17-6e8c-459d-ad09-3b6a655d495a` | `vr-14-v3-db9e50dd.png` | `under_review` ✅ |
| 2 (percubaan awal) | **#15** | `76ce8382-…` | — | `failed` (task provider mati; tiada aset) |
| 2 "Wardah menerima" (retry) | **#16** | `b69fa79e-f08c-4ff0-8fd4-ad4f6fd99f0d` | `vr-16-v3-ecfbd32b.png` | `under_review` ✅ |

Strategi reference kekal kedua-duanya: tiada structure · vr-6 style · default. Role kedua-dua row: `inline_bab25_candidate_composite`. **Tiada attach/publish; visuals kekal 2 (#166, #167).**

### Audit

**Aset 1 (#14)** — soalan: "nampak sedang menyerahkan, bukan membaiki?"
- ✅ Jam diangkat/dihulur dari meja (gestur menyerahkan) · ✅ tiada alat di tangan · ✅ tangan kedua tiada · ✅ tiada muka/k kepala · ✅ tiada Wardah · anatomy OK · suasana pagi/kedai jam konsisten.
- Nota kecil: muka jam tertutup (bukan gear terbuka) — bukan kriteria audit Aset 1.

**Aset 2 (#16)** — spesifikasi: tangan muda · telapak kosong · jam hampir sampai · tiada alat.
- ✅ Tangan muda masuk dari sisi · ✅ telapak terbuka KOSONG · ✅ jam poket terbuka (hunter) di atas kayu sebelah telapak · ✅ tiada alat · ✅ tiada muka/k kepala · anatomy OK.
- Nota kecil: prop rantai/penimbun kecil aneh di bawah pergelangan (hallucination minor, atas meja — boleh dibuang semasa edit).

### Nota penyediaan gabungan editorial (belum dilaksana)

- Pose A (jam diangkat di tangan kiri-atas) ≠ pose B (jam berdiri di kayu sebelah telapak) — **pilihan editor**: gunakan jam B sebagai jangkar, tangan A menghulur ke arahnya (atau sebaliknya); padankan cahaya pagi (kedua-duanya sesuai).
- Penyatuan pixel/TAHAP editorial = langkah seterusnya MENUNGGU arahan (sama ada saya cuba dengan tool atau editor manusia).
