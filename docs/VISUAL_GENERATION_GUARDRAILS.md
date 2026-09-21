# Visual Generation Guardrails

Status: **LOCKED**

Dokumen ini ialah pre-flight dan post-flight gate wajib untuk semua AI/agent yang menghasilkan, mengubah atau meluluskan visual Jalin.

## 1. Tool provenance

Jika tugasan atau arahan projek menetapkan **Magnific**, agent WAJIB menggunakan Magnific.

- Jangan menggantikan Magnific dengan generator imej lain tanpa arahan manusia.
- Jangan mendakwa sesuatu visual dijana melalui Magnific jika provenance sebenar berbeza.
- Jika tool yang diminta tidak tersedia atau gagal, berhenti dan laporkan blocker. Jangan silently substitute.
- Nama/tool provenance bagi visual draft mesti boleh dijejaki dalam nota kerja dalaman.

Pelanggaran provenance dianggap **factual/editorial failure**, bukan variasi kreatif kecil.

## 2. Faces — default Jalin fiction rule

Untuk ilustrasi fiksyen Jalin, **muka manusia tidak dipaparkan dengan jelas secara default**.

Kaedah yang dibenarkan:
- belakang badan;
- profil separa;
- muka dilindungi objek/foreground;
- siluet;
- crop pada tangan, bahu, torso atau objek;
- depth-of-field yang menjadikan wajah tidak boleh dikenal pasti dengan jelas.

Muka jelas hanya dibenarkan jika editor manusia secara eksplisit meluluskan untuk visual tertentu.

## 3. Scene truth gate

Setiap visual mesti dipaut pada **beat/adegan teks yang spesifik** sebelum generation.

Pre-flight wajib menjawab:
- karya apa?
- adegan/baris mana?
- siapa yang berada dalam adegan?
- siapa melakukan tindakan?
- masa/tempat apa?
- objek mana penting?
- apa yang TIDAK berlaku dalam adegan?

Jika fakta adegan tidak pasti, baca source text/repo dahulu. **Jangan jana berdasarkan ingatan atau andaian.**

## 4. Canonical continuity gate

Sebelum generate:
- semak sama ada watak sudah ada canonical reference;
- semak sama ada lokasi sudah ada canonical reference;
- semak sama ada objek simbolik sudah ada canonical reference;
- jika ada, gunakan reference tersebut;
- jangan jana semula elemen kanonik daripada teks kosong.

Prinsip:
**one symbolic object = one canonical visual representation**, kecuali editor meluluskan keperluan naratif khusus.

## 5. One-item generation rule

Untuk objek/lokasi/shot yang sama, jana **satu output dahulu**.

Jangan menghasilkan beberapa alternatif serentak hanya untuk mencari versi cantik. Ini meningkatkan risiko:
- bentuk objek berubah;
- pakaian berubah;
- seni bina berubah;
- props berubah;
- style drift.

Alternatif kedua hanya dibuat selepas output pertama ditolak dengan sebab yang jelas.

## 6. Style consistency gate

Semua visual mesti sepadan dengan Jalin House Style dan approved visual references.

Semak sekurang-kurangnya:
- rendering/painterly treatment;
- palette;
- lighting;
- contrast;
- texture;
- anatomy;
- composition;
- realism level;
- amount of anime influence.

Prompt gaya yang sama sahaja tidak mencukupi jika canonical reference tersedia.

## 7. Anatomy gate

Sebelum visual diluluskan:
- kira tangan/lengan/jari;
- semak arah ibu jari;
- semak pegangan objek;
- semak anggota bertindih;
- semak prop tidak bercantum dengan badan;
- semak tiada extra limb/finger.

Jika anatomi meragukan, **REJECT**. Jangan cuba menjelaskan kecacatan sebagai pose.

## 8. Narrative audit after generation

Setiap output dinilai dengan tiga status sahaja:

- **PASS** — fakta adegan, continuity, style dan anatomy betul.
- **FIX** — konsep betul tetapi satu isu boleh diperbaiki tanpa menukar identiti visual.
- **REJECT** — bercanggah dengan cerita, provenance salah, anatomy rosak, muka melanggar rule, atau continuity drift besar.

Agent tidak boleh mempromosikan visual ke halaman produksi sebelum PASS.

## 9. No silent factual substitution

Visual tidak boleh:
- menukar siapa melakukan tindakan;
- menambah watak yang tiada;
- menukar masa/ruang penting;
- mengubah objek simbolik;
- menjadikan inferred detail sebagai fakta cerita.

Jika prompt memerlukan detail yang teks tidak tetapkan, pilih detail paling neutral dan jangan jadikannya canonical tanpa review.

## 10. Stop rule

STOP dan semak source apabila:
- tidak pasti siapa melakukan sesuatu;
- tidak pasti objek mana canonical;
- tidak pasti sama ada muka boleh kelihatan;
- tidak pasti tool yang diwajibkan;
- tidak pasti visual itu hero atau inline;
- source text dan prompt nampak bercanggah.

Jangan generate dahulu dan cuba betulkan kemudian.

## 11. Kerusi di Beranda — locked specifics

- Tool workflow: **Magnific**.
- Human faces: **tidak jelas**; gunakan crop, back/side, silhouette atau obstruction.
- Hero: **kerusi di beranda** sebagai subjek utama/canonical hero.
- Jangan hasilkan hero kedua yang bersaing dengan canonical chair hero.
- Inline image baharu tidak boleh mengulangi kerusi sebagai subjek utama.
- Adegan awal: **Along** yang menulis cerita Pak Long.
- Adegan menjelang senja: **Pak Long** meminta pen dan menulis namanya sendiri.
- Visual tulisan Pak Long mesti dipaut hanya pada adegan menjelang senja.
- Jangan tunjuk nama atau tulisan yang boleh dibaca dalam visual jika ia mengganggu reveal prosa.
