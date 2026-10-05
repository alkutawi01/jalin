# Fasa 0 - Audit Kesediaan: Semakan Pukal dan Penilaian Multi-AI

Status: audit BACA-SAHAJA (cabang main, 2026-10-05). Tiada kod diubah, tiada migration dijalankan, pangkalan data dan produksi tidak disentuh. Tiada rahsia dicetak (hanya NAMA pemboleh ubah env disebut).
Skala keyakinan: Tinggi = dibaca terus dalam kod; Sederhana = disimpulkan; Rendah = andaian/perlu disahkan.

---

## 1. SKEMA

(a) Sedia ada (`src/lib/db/types.ts`, `src/lib/db/migrations/001-022`; 19 jadual dalam `Database`, types.ts:416-436):
- `works` (types.ts:33): `body`, `metadata` jsonb, `editorial_history` jsonb, `published_revision_id`, `revision_count`. Karya bukan-novela menyimpan teks dalam `works.body`; novela dalam `reading_sections.body` (types.ts:340).
- `work_revisions` (types.ts:322): `snapshot` jsonb penuh, `content_hash`, `revision_no`, `published_by`.
- `work_submissions` (types.ts:126): `manuscript`, `status`, `submitter_type` (human/ai/guest). Konsep "penghantaran masuk", BUKAN "penilaian keluar".
- `submission_contributions` (types.ts:149): lajur `ai_provider`, `ai_model`, `ai_persona`, `ai_actual_role`, `ai_identity_source` (migrasi 004, baris ~34-37). Satu-satunya tempat identiti teknikal AI disimpan secara berstruktur; terikat pada `submission_id`, bukan `work_id`.
- `generation_requests` (types.ts:266): corak terbaik untuk dipinjam - `provider`, `model`, `status`, `token_input/output/total`, `estimated_cost_cents`, `currency`, `error_category`, `idempotency_key` (unik), `prompt_composed` (JSON string), `result_manuscript`. Tetapi FK ke `submission_id` (NOT NULL) - tidak boleh dipakai terus untuk penilaian karya.
- `prompt_templates` (types.ts:168): `name`, `prompt_text`, `scope`, `work_type`, `version`, `status`. Sudah "overloaded": `scope="parser"` (authoring/prompt-store.ts:11), `scope="ai_persona"` (ai-personas.ts:12) sebagai simpanan kunci-nilai.
- `editorial_issues` (types.ts:386): hanya `type, work_id, severity, status, message` - tiada `revision`, `section`, `lokasi petikan`, `bukti`, `penilai`. Terlalu nipis untuk dapatan; `editorial_issue_events` (types.ts:397) sesuai sebagai corak jejak audit.
- `visual_requests`: berkaitan imej sahaja; tidak relevan kecuali dapatan merujuk penanda gambar.
- `editorial_roles` (types.ts:408, migrasi 017): jadual wujud tetapi `hasPermission` (editorial-roles.ts:20) TIDAK dipanggil di mana-mana laluan (grep: hanya definisi). Peranan sebenar = satu "admin" (lihat bidang 4).
- `contributors`/`credits`: orang/persona AWAM (`is_visible`, `is_public`). Jangan dijadikan "penilai".

(b) Jurang: tiada jadual untuk pakej penilaian, penilai, rubrik, larian penilaian, dapatan. Tiada jadual "kos/belanjawan". `editorial_issues` tidak boleh menampung dapatan berstruktur.

(c) Risiko:
- Menyimpan dapatan dalam `works.metadata`/`editorial_history` BERBAHAYA: kedua-duanya disalin penuh ke `work_revisions.snapshot.raw.work` (revision-service.ts:167-170) dan dibaca repositori awam daripada snapshot itu. Risiko bocor + cap hash (metadata/characters).
- Memakai semula `prompt_templates` untuk rubrik: baris boleh diedit di tempat (`updatePromptTemplate` prompt-template-service.ts:91-120) dan dipadam keras (`deletePromptTemplate`:122) - bercanggah dengan keperluan "ulang keputusan".
- Memakai `submission_contributions` untuk penilai AI: mencemar model kredit dan terikat pada submission.

(d) Cadangan: jadual BAHARU yang berasingan (lihat Cadangan MVP): `review_rubrics` (tidak berubah, versi tetap), `review_packages`, `review_runs`, `review_findings`, (kemudian) `review_reviewers`. Semua `work_id` tanpa FK ke jadual awam yang disalin snapshot. Corak migrasi: fail `023_*.ts` dengan `IF NOT EXISTS` (contoh 015_editorial_issues.ts:5-22); ujian `migration-inventory.test.ts` mewajibkan urutan tanpa jurang dan fail tertrack.

(e) Keyakinan: Tinggi.

---

## 2. REVISION / SNAPSHOT

(a) Cara berfungsi (`src/lib/admin/revision-service.ts`):
- `computeContentHash` (:36-43) ialah djb2 32-bit atas `JSON.stringify` (hasil 8 aksara hex). `materialHashOf` (:135-159) hanya hash apa yang pembaca nampak: slug, tajuk, dek, body, editorNote, kredit, visual, glosari, `reading_sections` (slug/tajuk/body/position), sumber, siri. Cap masa dikecualikan supaya "tiada perubahan" dapat dikesan.
- `charactersFingerprint` (:109) dibanding di luar hash supaya hash lama kekal sah.
- `createRevisionTx` (:285-~375): kira hash, jika sama dengan semakan sedia ada (+ watak sama) guna semula `id` itu (:~305-325); jika tidak, sisip `work_revisions` baharu (`rev_{workId}_{no}_{Date.now()}`) dan kemas kini `works.published_revision_id`. Dipanggil dalam transaksi SERIALIZABLE dengan retry (publication-service.ts:42 `PUBLISH_SERIALIZABLE_RETRY_MAX = 3`, :319, :538).
- `getUnpublishedChanges` (:392): bandingkan salinan kerja dengan semakan terbit melalui hash. `revertRevision` (:421) mencipta semakan baharu (sejarah tidak ditimpa). Repositori awam membaca snapshot `published_revision_id` (database-repository.ts:152-185, 292-305).
- Teks kanonik = teks terbit: `works.body` dan `reading_sections.body` ialah markdown mentah; pembaca tidak menukarnya kecuali render (lihat bidang 5 - `normalizeSceneBreaks` WUJUD semasa render, StoryMarkdown.tsx:21).

(b) Jurang untuk pengikatan pakej:
1. Semakan hanya dicipta ketika PENERBITAN. Draf yang belum terbit (kes utama "semakan pukal" manuskrip) tiada `content_hash`/snapshot. Pakej mesti membawa hash sendiri.
2. `content_hash` hanya 32-bit djb2 (~4.3 bilion nilai): bukan hash kriptografi; kebarangkalian pelanggaran kecil tetapi bukan sifar dan boleh dipalsukan. Tidak sesuai sebagai satu-satunya kunci integriti dapatan.
3. Hash ini menggabungkan kredit/visual/glosari - perubahan kredit akan "melapukkan" dapatan walaupun prosa sama. Untuk penilaian prosa, hash yang diingini ialah HASH TEKS SAHAJA.
4. Tiada hash per-bab dipersistenkan (hash digabung dalam satu nilai).

(c) Risiko: dapatan menyatakan "bab 3 perenggan 5 janggal" tetapi teks sudah berubah -> dapatan salah; hash lemah -> salah anggap "sama"; pengiraan hash berbeza antara jalan (draf vs terbit) -> hasil tidak konsisten.

(d) Cadangan/keputusan:
- Simpan pada setiap pakej: `source_sha256` (SHA-256 atas teks kanonik tepat yang dihantar: body + setiap bab dalam urutan), `package_sha256` (atas pakej berlabel akhir), `work_revision_id` (nullable, jika karya terbit), `section_hashes` jsonb (SHA-256 per bab), `canonicalizer_version`.
- Dapatan "lapuk" jika SHA-256 teks semasa (dikira dengan fungsi yang sama) != `source_sha256` pakej; boleh lapuk per-bab sahaja berdasarkan `section_hashes`.
- Jangan ubah `materialHashOf` (hash karya terbit sedia ada mesti kekal sah).

(e) Keyakinan: Tinggi.

---

## 3. PROVENANCE (identiti AI)

(a) Sedia ada:
- Pemisahan IDENTITI AWAM vs TEKNIKAL ialah prinsip teras: persona-mapping.ts:1-12 ("Public identity and technical identity MUST remain separate"; "Never expose provider/model/tool names publicly"). `PERSONA_REGISTRY` (:34-69) openai->Rafiq Naim, anthropic->Nara Zahin, mimo/opencode->Amir Syafiq; `detectProviderFamily` (:82) hanya mengenal openai/anthropic/mimo/opencode/unknown (Gemini, Grok, DeepSeek, Copilot jatuh ke "unknown"); `isValidPublicPersona` (:152) menolak nama persona yang mengandungi nama penyedia.
- identity-handshake.ts (provider-agnostic, :1-11): `validateHandshake` (:68), `toPublicProjection` (~:190), `toAdminProjection` (~:226), `verifyPrivacyBoundary` (~:256). Medan DALAMAN yang tidak boleh bocor: `ai_provider`, `ai_model`, `ai_persona` (pra-kelulusan), `ai_actual_role`, `ai_identity_source`, serta `runtimeVerification` (confidence, kaedah). Sumber identiti: `runtime_verified | self_reported | manual | unknown` (types.ts:143) - berguna untuk membezakan model yang dipanggil melalui API (disahkan) berbanding dituntut sendiri.
- ai-personas.ts: peta "AI -> slug contributor" disimpan dalam `prompt_templates` scope `ai_persona` (:12); `DEFAULT_AIS` (:21); `KNOWN_SLUG` (:15). `findOrCreatePersona` (:66) mencipta contributor `virtual` yang `is_visible: true` (:89) - iaitu MUKA AWAM.
- `adapter.ts:28-35` `RuntimeIdentity` (provider, model, requestId, verifiedAt, confidence) direkod semasa janaan; `generation_requests` simpan `provider`+`model`.
- Ujian: `__tests__/identity-privacy.test.ts` (persona, projeksi awam), `__tests__/no-public-contributions.test.ts:16-17` (tiada `/api/public`; laluan "contribution" mesti di bawah `admin/`).

(b) Jurang: model "penilai" tiada. `ai-personas.ts` menjodohkan AI -> persona awam; penilai-AI TIDAK patut diberi persona awam (mereka bukan pengarang/kredit). Rafiq Naim/Nara Zahin ialah nama awam: jika dapatan penilaian dilabel dengan persona itu, ia mengaitkan "dinilai oleh" dengan pengarang awam. `detectProviderFamily` tidak mengenal penyedia penilai biasa (Gemini, Grok, DeepSeek).

(c) Risiko: kebocoran jenama/model (privasi identiti); salah label penilai (integriti) kerana `self_reported`; salah kredit (AGENTS.md peraturan 23: kredit mesti berdasarkan sumbangan sebenar - penilai bukan "Penulis").

(d) Cadangan: rekod penilai dengan medan BERASINGAN dan hanya-admin: `provider` (cth openai/anthropic/google), `model_id` tepat seperti dipulangkan API, `model_version/snapshot` jika ada, `identity_source` (guna enum sedia ada), `params` (temperature, max_tokens), `reviewer_label` dalaman neutral (cth "Penilai A"). Jangan pautkan ke `contributors` dan jangan masuk jadual `credits`. Tambah ujian: nama jadual `review_*` tidak muncul dalam `database-repository.ts`, sitemap, JSON-LD.
Keputusan pemilik: adakah penilai-AI boleh didedahkan secara awam (disclosure agregat sahaja, "disemak oleh beberapa AI", tanpa nama model)? Lalai cadangan: SEMUA dalaman.

(e) Keyakinan: Tinggi (rekod), Sederhana (cadangan model penilai).

---

## 4. AUTH / KEBENARAN

(a) Sedia ada:
- Admin tunggal: `auth.ts` (`AdminUser.role: "admin"` sahaja, :17-22). Log masuk `loginAdmin` (~:100): emel dalam `ADMIN_ALLOWED_EMAILS` + kata laluan = `ADMIN_SECRET`; perbandingan masa-tetap; token sesi HMAC ditandatangani dengan `ADMIN_SECRET` yang sama, tamat 24 jam (:25). `hasAdminRole` (~:268) hanya semak "admin".
- `src/middleware.ts:71-125`: satu pintu untuk `/admin/*` dan `/api/admin/*` (matcher :127-132): sahkan HMAC, tamat, role; fail-closed jika tiada `ADMIN_SECRET` (:13-17). `ADMIN_DEV_BYPASS` hanya jika `NODE_ENV=development` (:85; auth.ts ulang).
- Laluan di bawah `/api/admin/**`: 60+ fail `route.ts`; KEBANYAKAN (cth `generate/route.ts`, `submissions/**`, `credits/**`, `visual-requests/**`, `works/route.ts`, `prompts/**`) tidak memanggil `isAdminAllowed()/getCurrentAdmin()` sendiri - bergantung sepenuhnya pada middleware ("Requires: admin auth (via middleware)", generate/route.ts:11). Hanya laluan lebih baharu (cth `works/[id]/revisions/.../revert`) memanggil `getCurrentAdmin` untuk mendapat `admin.email` sebagai `actor`.
- Corak pemilikan laluan bersarang yang baru dibaiki: `works/[id]/sections/[sectionId]/route.ts:15-22, 44-55, 90-101` - `section.work_id !== workId` -> 404 pada GET/PATCH/DELETE; dikunci oleh `__tests__/section-ownership.test.ts` (regex atas teks laluan). Corak sama sudah betul pada `revisions/[revisionId]/diff` (:14) dan `revertRevision` (WHERE `work_id` + `id`, revision-service.ts:~425-430).
- `editorial_roles` + `hasPermission` (editorial-roles.ts:1-25): peranan admin/editor/reviewer/viewer ditakrif tetapi tidak dikuatkuasakan.

(b) Jurang: tiada peranan sebenar; semua yang lulus middleware = "admin" penuh. Tiada penguatkuasaan per-karya. Tiada had kadar log masuk (tiada rate limit dikesan). `ADMIN_SECRET` berfungsi dua peranan: kata laluan DAN kunci tandatangan sesi (menukarnya membatalkan semua sesi - boleh diterima).

(c) Risiko IDOR bagi feature baharu: laluan seperti `/works/[id]/reviews/[runId]`, `/review-findings/[id]` mesti menyemak `run.work_id === id` (corak 404 yang sama). Risiko lebih besar daripada IDOR ialah KOS: sesiapa yang berjaya masuk sebagai admin (atau sesi dicuri 24 jam) boleh mencetuskan panggilan API berbayar berulang. Satu lapisan (middleware) sahaja; jika `matcher` diubah silap, semua laluan baharu terdedah.

(d) Cadangan: (1) lalu `getCurrentAdmin()` DALAM setiap laluan `reviews/**` (pertahanan berlapis) dan rekod `actor` pada setiap larian; (2) ujian struktur seperti `section-ownership.test.ts` untuk setiap laluan bersarang baharu; (3) mulakan penilaian hanya melalui POST dengan `idempotency_key`; (4) terima model admin-tunggal untuk MVP; peranan "penyemak" ditangguh - jangan bina RBAC sekarang (AGENTS.md peraturan 13).
Keputusan pemilik: adakah penulis/editor lain (bukan admin) akan melihat dapatan? Lalai: tidak.

(e) Keyakinan: Tinggi (middleware & sections), Sederhana (liputan "tiada auth dalam laluan" - disimpulkan daripada grep nama fungsi; middleware tetap melindungi).

---

## 5. TATABAHASA PARSER / FORMAT PAKEJ

(a) Sedia ada:
- Arah SEDIA ADA ialah AI -> struktur (songsang daripada yang kita perlukan): `authoring/labelled-output.ts` membaca jawapan berlabel (format v4, `FORMAT_VERSION`, output-format.ts:13) dengan label `[KARYA] [SIRI] [KANDUNGAN] [BAB] [SUMBER] [WATAK] [GLOSARI] [GAMBAR]` (`SECTION_NAMES`, output-format.ts:15; alias labelled-output.ts:~27-37), medan "Label: nilai", penutup `[/X]` dikesan (`isClosingTag`), pemisah `___/---` (`SEPARATOR`). Label contoh dalam brif ([JUDUL], [DIALOG]) TIDAK wujud; yang ada ialah `[KARYA]` (dengan medan Tajuk/Jenis/Dek/Genre) dan `[BAB]`. Tiada label dialog.
- Penjana terbalik (kanonik -> berlabel) TIDAK wujud untuk penilaian. `publishing/serialize-work.ts:64` menghasilkan markdown + frontmatter ("canonical Jalin Markdown") - hanya `body` karya, tidak `reading_sections`, dan frontmatter bocorkan metadata (perlu dibuang).
- Pengimport v3: `import/manuscript.ts`, `parser-output.ts`, `plan.ts`, `import-service.ts`, `master-parser-prompt.ts` (versi `"v3"`, :10; segerak melalui `scripts/sync-master-parser-prompt.mjs`, fail sumber `docs/JALIN_MASTER_CONTENT_PARSER_PROMPT.md`).
- Konstruk dalam teks kanonik:
  - Penanda gambar: `[[gambar:N]]` (reader/image-markers.ts:2 `MARKER_PATTERN`), disambung ke `visuals.anchor`; `materializeImportImageMarkers` (import/image-markers.ts:5) memasukkannya antara perenggan (`\n\n`).
  - Kotak mesej/e-mel: blok `:::mesej` / `:::emel` ... `:::` (reader/communication-blocks.ts:7 - regex diikat pada baris kosong sebelum/selepas).
  - Pemisah adegan: baris simbol berulang >=3 (`---`, `***`, `* * *`, `~~~`, `###`, `___`, `===`, `• • •`, dll.) - `scene-breaks.ts:9-17`; PENTING: normalisasi ke `---` berlaku semasa RENDER sahaja (StoryMarkdown.tsx:21). Teks tersimpan boleh mengandungi variasi; "tiada penukaran semasa render" tidak tepat untuk pemisah adegan.
  - Italik/tebal: markdown `*...*`/`**...**` (inline-italics.tsx:5 untuk glosari; prosa melalui react-markdown dalam StoryMarkdown).
  - Petikan/dialog: gaya DBP lengkung “ ” ‘ ’ (smart-quotes.ts:1-4), sengkang em dash `—` daripada `--` (auto-dash.ts:1-5). Gaya ini dikenakan semasa menaip/tampal, jadi teks tersimpan sudah lengkung.
  - Glosari ditanda per-karya (jadual `glossary_terms`), bukan dalam teks.

(b) Apa yang hilang jika markdown diratakan: (1) `[[gambar:N]]` -> penilai tidak nampak kedudukan ilustrasi (dan boleh menyalahtafsir sebagai teks); (2) `:::mesej/emel` -> kotak dibaca sebagai perenggan biasa, hilang pembezaan suara/format; (3) pemisah adegan `---` boleh dianggap garis atau heading setext (baris teks + `---` = heading); (4) `*`/`**` -> hilang penekanan, dan `*` boleh tersalah baca sebagai senarai; (5) petikan lengkung -> jika ditukar ke lurus, ujian gaya DBP tidak bermakna; (6) sempadan bab (novela: `reading_sections` berasingan) -> hilang jika digabung; (7) tajuk bab/nombor bab.

(c) Risiko: pakej "dibersihkan" secara senyap mengubah teks (integriti hash dan penilaian atas versi yang bukan versi sebenar); pakej mengandungi frontmatter/metadata/nama persona (privasi); penilai mendapat label yang pengimport tidak faham jika dalam masa depan dapatan diimport semula.

(d) Cadangan: pakej = serializer TULEN daripada teks kanonik, deterministik, dengan envelope label NETRAL (cadangan: `[PAKEJ v1]`, `[KARYA]` tajuk+jenis sahaja, `[BAB n]` per bab, `[TEKS] ... [/TEKS]` dengan teks MENTAH tidak diubah satu bait pun; penanda `[[gambar:N]]`, `:::mesej` dan pemisah dikekalkan sebagai token literal dan diterangkan dalam ARAHAN pakej, bukan diubah). Pakej tidak memuatkan: frontmatter, slug dalaman, kredit/persona, penulis, `metadata`, `editorial_history`, kunci. Tambah lajur `canonicalizer_version` dan ujian bulatan: ekstrak `[TEKS]` daripada pakej === teks sumber (bait-demi-bait). Gunakan semula `isSceneBreakLine` (scene-breaks.ts:12) dan `splitCommunicationBlocks` (communication-blocks.ts:5) untuk SENARAI statistik pakej (bilangan adegan, kotak, imej) tanpa mengubah teks. Gunakan SECTION_NAMES sebagai rujukan nama label supaya tidak bertembung dengan pengimport.
Keputusan pemilik: format pakej (lihat K1).

(e) Keyakinan: Tinggi (konstruk), Sederhana (bahawa pengimport v3 tidak perlu disentuh).

---

## 6. VERSI RUBRIK

(a) Sedia ada:
- `prompt_templates` (types.ts:168) dengan `version` integer & `status` aktif/tidak. Corak "simpan versi baharu, nyahaktif lama": `authoring/prompt-store.ts:1-9, 43-93` (`saveVersion`), `ai-personas.ts:98-134` `saveAiPersona` (transaksi: `max(version)+1`).
- Master Parser: prompt versi dalam kod (`MASTER_PARSER_PROMPT_VERSION="v3"`, master-parser-prompt.ts:10) disegerak daripada dokumen (`scripts/sync-master-parser-prompt.mjs`) dan dijaga oleh `__tests__/master-parser-prompt.test.ts`. Ini model "prompt sebagai kod + ujian drift" yang kuat.
- `generation_requests.prompt_composed` menyimpan prompt akhir + `templateIds/templateNames/templateVersions` (generation-service.ts:~118-130) - jejak sekali guna yang baik.
- `generation/prompt-composer.ts` ada (komposer prompt+templat).

(b) Jurang: tiada konsep rubrik (kriteria, skala, berat). `prompt_templates.prompt_text` boleh diedit/dipadam di tempat -> `template_id + version` TIDAK menjamin teks yang sama pada masa penilaian. Tiada unik `(scope,name,version)` dalam skema yang dibaca. Tiada hash teks rubrik.

(c) Risiko: dapatan dibandingkan merentasi rubrik yang telah berubah secara senyap; tak boleh ulang keputusan; "drift" antara prompt dalam DB dengan dokumen.

(d) Cadangan: jadual `review_rubrics` tidak-boleh-ubah (append-only): `id`, `key` (cth "prosa-umum"), `version` (integer), `body` jsonb (kriteria, skala, arahan keluaran JSON), `body_sha256`, `status`, `created_at`. Kemas kini = baris baharu; tiada UPDATE/DELETE dalam servis. Setiap `review_run` menyimpan `rubric_id`, `rubric_sha256`, `prompt_composed_sha256`, DAN salinan beku prompt akhir (seperti `prompt_composed`), model, params, `seed` jika ada. Pilihan alternatif: rubrik sebagai fail dalam repo + ujian drift (seperti Master Parser v3) dengan `body_sha256` disalin ke DB semasa seed - semakan melalui PR.
Keputusan pemilik: rubrik dalam kod (versi melalui PR) atau dalam DB (boleh diedit dalam admin)? (K5)

(e) Keyakinan: Tinggi.

---

## 7. SEMPADAN AWAM / PERSENDIRIAN

(a) Sedia ada:
- Repositori awam (`src/lib/content/database-repository.ts`) ialah senarai-putih ikut jadual: ia memuat hanya `works`, `credits`, `visuals`, `glossary_terms`, `contributors`, `source_works`, `reading_sections`, `series`, `series_entries`, `work_revisions` (:135-150) dan `status === "published"` sahaja (:155, :294, :342, :359). Jadual lain tidak disentuh -> jadual `review_*` baharu tidak akan sampai ke repositori awam selagi tiada kod menambahnya. Karya terbit dibaca dari snapshot beku (:169-185, :301-304).
- Lapisan unjuran sebelum props RSC: `reader/public-projection.ts:10-19` (komen: "Raw Work internals ... must never cross this boundary"); `reader/credit-projection.ts`, `card-attribution.ts`. Ujian: `__tests__/public-rsc-payload.test.ts`, `reader-credit-projection.test.ts`, `seo-jsonld.test.ts`, `no-public-contributions.test.ts`.
- `robots.ts:9` melarang `/admin` dan `/api`; `sitemap.ts` hanya karya terbit + kategori + 2 penulis tetap (`CONTRIBUTOR_SLUGS`, :8). Satu-satunya laluan API bukan admin: `api/webhooks/magnific/route.ts` (disahkan HMAC, `MAGNIFIC_WEBHOOK_SECRET`). Tiada `/api/public`.
- Pemboleh ubah env (NAMA sahaja, `.env.example`): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `OPENAI_API_KEY` ("admin only, never exposed to client"), `MAGNIFIC_API_KEY`, `MAGNIFIC_WEBHOOK_SECRET`, `OBJECT_STORAGE_*`, `ADMIN_SECRET`, `ADMIN_ALLOWED_EMAILS`. Tiada `NEXT_PUBLIC_` untuk kunci. `.gitignore` menyenarai `.env*` kecuali `.env.example`. `.env.local` tempatan hanya mengandungi 3 pemboleh ubah bukan-rahsia (CONTENT_SOURCE, ADMIN_DEV_BYPASS, NEXT_PUBLIC_APP_URL) - tiada kunci AI tempatan; ujian hidup perlu kunci dalam Vercel/env pembangun.
- Kunci disimpan hanya dalam env; `openai-adapter.ts:36-39` baca `process.env.OPENAI_API_KEY` per-panggilan, tamat masa 120s (:46), `max_tokens` 4096. Hanya OpenAI (+mock) disokong (generate/route.ts:41-59). Penyedia lain (Anthropic, Google, dll.) TIADA adapter.

(b) Jurang dan titik bocor yang perlu dikawal:
1. `work_revisions.snapshot` mengandungi baris penuh `works`/`credits`/`visuals` (revision-service.ts:167-175): JANGAN letak sebarang rujukan/ID penilaian dalam `works`, `metadata`, `editorial_history`, `reader` atau `visuals`.
2. `selectAll()` pada jadual awam (database-repository.ts:135-150): lajur baharu pada jadual itu akan terbawa ke repositori. Elak `ALTER TABLE works ADD review_*`.
3. Satu fail laluan awam yang menyerlahkan "dibuat dengan bantuan AI" tidak boleh membocorkan model: gunakan projeksi (public-projection) bukan objek mentah.
4. `generation_requests.prompt_composed` dan `result_manuscript` menyimpan teks penuh dalam DB; pakej penilaian (teks karya lengkap, mungkin belum terbit) akan disimpan dengan cara sama - sensitif (karya belum terbit, `rights_status` mungkin "restricted"/"needs_review").
5. Teks dihantar ke penyedia pihak ketiga: dasar penyimpanan/latihan data penyedia tidak disemak dalam kod. Sumber berhak cipta (`source_works.rights_status`, types.ts:309; `source-rights.ts`) - karya terjemahan/sumber `restricted/rejected` tidak patut dihantar keluar.
6. Log: `generation-service` hanya log kategori ralat; pastikan penilaian TIDAK `console.log` pakej atau jawapan (teks manuskrip dalam log Vercel).
7. Kos: tiada belanjawan/had. `generation_requests` mencatat token & `estimated_cost_cents` selepas kejadian; tiada semakan pra-panggilan, tiada had harian, tiada had kepada N karya per kelompok. Semakan pukal ialah pendarab kos (karya x penilai x rubrik).

(c) Risiko: bocor (sederhana jika dikawal dengan jadual berasingan - rendah); kos tak terkawal (tinggi untuk pukal); pelanggaran hak cipta/privasi bila hantar teks ke pihak ketiga (sederhana-tinggi); teks karya belum terbit disimpan dalam DB yang sama.

(d) Cadangan: (1) jadual `review_*` sahaja, tiada lajur pada jadual awam; (2) ujian penjaga: baca `database-repository.ts`, `sitemap.ts`, `seo-jsonld.ts`, `public-projection.ts` dan gagal jika mengandungi `review_`; ujian laluan: semua laluan `review*` di bawah `api/admin/`; (3) `reviewer_key_ref` = NAMA env sahaja ("OPENAI_API_KEY"), tidak pernah nilai; (4) pra-semakan kos: anggaran token (panjang pakej / ~4 aksara per token + `max_tokens`) x harga model dalam jadual penyedia; tolak jika melebihi had kelompok; had hentian keras `max_cost_cents` per larian dan per kelompok, dan `max_runs_per_day`; (5) pintu hak: tolak karya `source_works.rights_status` dalam {restricted, rejected, unknown, needs_review} kecuali override sedar; (6) mod "dry-run/mock" (sudah ada `mock-adapter.ts`) wajib untuk ujian; (7) tiada kunci dalam laporan/log/DB.

(e) Keyakinan: Tinggi (sempadan sedia ada), Sederhana (kos - model harga belum disemak).

---

## KEPUTUSAN REKA BENTUK untuk pemilik (sebelum Fasa 1)

K1. Format pakej: (a) satu pakej per karya dengan semua bab, atau (b) per bab/potongan? Label neutral baharu (cadangan `[PAKEJ v1]/[TEKS]`) atau rapatkan dengan label pengimport v4? Cadangan: baharu & neutral; teks mentah dalam `[TEKS]`, penanda gambar/kotak/pemisah literal.
K2. Siapa penilai: model mana dahulu (OpenAI sudah ada adapter; Anthropic/Google perlu adapter baharu)? Dua penyedia untuk MVP atau satu? Adakah penilaian manual-tampal (editor tampal jawapan dari ChatGPT/Claude sendiri - tiada kos API, ikut gaya kerja sedia ada "Tampal") pilihan Fasa 1?
K3. Kawalan kos: had RM/USD per larian, per kelompok, per hari; potong teks panjang atau tolak? Siapa meluluskan kelompok >N karya?
K4. Keterlihatan dapatan: editor sahaja, atau ditunjuk kepada penulis/persona? Jika ditunjuk, dalam bentuk ringkasan disunting dan tanpa nama model? (lalai: dalaman).
K5. Simpanan rubrik: dalam kod + ujian drift (seperti Master Parser v3) atau jadual DB append-only yang boleh diedit dalam admin? Rubrik dibezakan mengikut `work_type` (cerpen/novela/fragmen/terjemahan)?
K6. Dasar teks keluar: karya belum terbit dan karya sumber/terjemahan (hak cipta) - dibenarkan dihantar ke penyedia pihak ketiga? Perlu pilihan "tiada latihan" (zero-retention) pada akaun API?
K7. Kitaran hayat dapatan: bila dianggap "lapuk" (hash teks berubah - seluruh atau per bab)? Dapatan dikekalkan sebagai sejarah atau dipadam/arkib? Adakah dapatan boleh diterima/ditolak oleh editor dan dirujuk dalam `editorial_issues`/Sejarah editorial (hanya rujukan dalaman)?
K8. Skop skor: skor berangka berbilang kriteria, atau hanya senarai dapatan bersifat teks (+ keparahan)? Bagaimana menggabungkan pendapat berbeza antara penilai (tunjuk berdampingan sahaja, tiada skor gabungan, untuk MVP)?

---

## CADANGAN FASA 1 (MVP terkecil bernilai)

Matlamat: satu karya, satu rubrik, satu atau dua penilai, dapatan disimpan dan disemak editor; tiada pukal, tiada penerbitan automatik (AGENTS.md peraturan 4 dan 13).
1. Pakej deterministik (fungsi tulen + ujian bulatan bait-demi-bait) daripada `works.body` / `reading_sections` terkini; hash SHA-256 teks dan pakej.
2. Dua mod larian: (i) MANUAL-TAMPAL: editor salin pakej, tampal jawapan JSON/berlabel penilai kembali (kos 0, tiada adapter baharu); (ii) API OpenAI melalui `createOpenAIAdapter` sedia ada (`generation/openai-adapter.ts`), dengan had kos keras.
3. UI admin minimum di `/admin/works/[id]/reviews` (senarai larian + dapatan, tanda "lapuk" apabila hash berbeza). Hanya admin (middleware + `getCurrentAdmin` dalam laluan).
4. Dapatan berstruktur (keparahan, kategori, bab, petikan pendek sebagai bukti, cadangan) disimpan; tiada import automatik ke teks.

Migrasi diperlukan (hanya nama/skema kasar; fail baharu `023_*` dst. - JANGAN dijalankan dalam Fasa 0):
- `023_review_rubrics`: `id` text PK, `key`, `version` int, `body` jsonb, `body_sha256`, `status`, `created_at`; unik `(key, version)`.
- `024_review_packages`: `id`, `work_id` (text, tanpa FK ke jadual yang disalin snapshot), `work_revision_id` nullable, `source_sha256`, `package_sha256`, `section_hashes` jsonb, `canonicalizer_version`, `package_text` (atau hanya hash + dijana semula), `created_by`, `created_at`.
- `025_review_runs`: `id`, `package_id`, `rubric_id`, `rubric_sha256`, `mode` (manual/api), `provider`, `model_id`, `identity_source`, `params` jsonb, `prompt_composed_sha256`, `status`, token/kos (`token_input/output`, `estimated_cost_cents`, `currency`), `max_cost_cents`, `idempotency_key` unik, `error_category`, `requested_by`, `started_at`, `completed_at`, `created_at`.
- `026_review_findings`: `id`, `run_id`, `severity`, `category`, `section_slug` nullable, `quote` (pendek), `quote_offset` nullable, `message`, `suggestion`, `editor_status` (baru/diterima/ditolak/ditangguh), `editor_note`, `created_at`, `updated_at`.
- (Fasa 1.5, ditangguh) `review_reviewers` (profil penilai: provider/model/params/key_env_name) dan `review_batches` (pukal).

Ujian wajib (sebelum bina): jadual/kod `review_*` tidak muncul dalam jalur awam; laluan `reviews/**` di bawah `api/admin`; pemilikan bersarang `run.work_id === workId`; pakej bulatan; migrasi masuk `migration-inventory`.

---

## RINGKASAN 10 BARIS
1. Skema: tiada jadual penilaian; `generation_requests`/`submission_contributions`/`editorial_issues` hanya corak, tidak boleh dipakai terus; perlu 4 jadual `review_*` baharu (rubrik, pakej, larian, dapatan).
2. Revision: `content_hash` ialah djb2 32-bit (revision-service.ts:36) dan semakan hanya wujud selepas terbit; pakej mesti bawa SHA-256 teks sendiri + hash per bab untuk "lapuk".
3. Provenance: pemisahan identiti awam/teknikal sudah kukuh (persona-mapping, identity-handshake); penilai mesti medan berasingan, dalaman, bukan `contributors`/`credits`.
4. Auth: admin tunggal, satu pintu middleware; kebanyakan laluan tiada semakan sendiri; peranan `editorial_roles` tidak dikuatkuasakan; ikut corak pemilikan `work_id` dan tambah `getCurrentAdmin` pada laluan baharu.
5. Format pakej: tiada serializer kanonik->berlabel; konstruk `[[gambar:N]]`, `:::mesej/emel`, pemisah adegan (dinormalkan SEMASA RENDER, StoryMarkdown.tsx:21), italik, petikan DBP mesti dikekalkan literal.
6. Rubrik: tiada konsep; `prompt_templates` boleh diedit/dipadam -> perlu rubrik append-only dengan `body_sha256` dikunci pada setiap larian.
7. Sempadan awam: repositori awam ialah senarai-putih jadual, jadi jadual `review_*` selamat; bahaya ialah lajur baharu pada `works`/`metadata` yang masuk `snapshot` dan dibaca awam.
8. Kos: tiada belanjawan; hanya adapter OpenAI; pukal mendarab kos - perlu had keras per larian/kelompok/hari dan mod mock/manual-tampal.
9. Privasi data: teks belum terbit dan karya berhak cipta (`source_works.rights_status`) tidak boleh dihantar ke pihak ketiga tanpa pintu hak dan keputusan pemilik (K6).
10. MVP: pakej deterministik + larian manual-tampal/OpenAI untuk SATU karya + simpan dapatan + semakan editor + penanda lapuk; 4 migrasi (023-026); tiada pukal/RBAC dalam Fasa 1.
