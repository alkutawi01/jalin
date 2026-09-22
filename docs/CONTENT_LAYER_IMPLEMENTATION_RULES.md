# Jalin Content Layer Implementation Rules v1

Status: ACTIVE — panduan wajib semasa implementasi Content Layer
Tarikh: 22 September 2026
Diluluskan: semakan editorial AI (Rafiq Naim) + pemilik manusia (Izzat)

Dokumen ini ialah guardrail semasa coding FASA 2B. Ia bukan dokumen reka bentuk; ia menetapkan had dan kewajipan ketika membina Content Layer supaya regresi produk minimum.

---

## 1. Prinsip

1. **Markdown kekal sebagai sumber kandungan utama untuk fasa ini.**
2. **Tiada database.** Belum tambah sebarang driver DB, ORM atau store berasaskan DB.
3. **Tiada CMS.** Belum bina admin/editor UI semasa fasa ini.
4. **Tiada perubahan UI besar.** Sepanjang Content Layer migration, tampilan pembaca mesti kekal seperti sekarang.

---

## 2. Source of truth

Selepas migration selesai, aliran data mesti berbentuk:

```
Work data
    ↓
WorkLoader
    ↓
Reader
```

1. **Reader tidak boleh import metadata karya terus daripada `page.tsx`** — metadata mesti datang daripada `content/works/*.md` melalui WorkLoader.
2. Glossary tidak lagi di-hard-code dalam TS page; mesti datang daripada frontmatter Work.
3. Kredit dan byline mesti dirujuk via contributor key; senarai contributor datang daripada `content/contributors/*.md`, bukan whitelist.

---

## 3. Backward compatibility

Setiap langkah migration wajib memastikan:

- **URL lama kekal** — `/cerpen/kerusi-di-beranda`, `/cerpen/nombor-giliran-117` dan `/penulis/<slug>` tidak berubah;
- **Visual kekal** — imej hero/inline yang sama dipaparkan pada kedudukan yang sama;
- **Glossary kekal** — istilah dan tooltip berfungsi pada istilah yang sama;
- **Contributor link kekal** — byline memaut ke halaman contributor seperti sebelum;
- **Output visual tidak berubah** — tiada perubahan tipografi, layout, warna atau struktur halaman.

Jika sesuatu migration memerlukan perubahan rupa, ia mesti dilaporkan dahulu, bukan terus dibuat.

---

## 4. Testing

Sebelum setiap commit:

1. `npm run build` mesti lulus tanpa error;
2. Halaman cerpen sedia ada diuji (lokal) — tiada regression visual;
3. Jika apa-apa yang tidak dijangka berubah, berhenti dan lapor dahulu.

Peraturan tambahan:
- Jangan gabung perubahan Content Layer dengan kerja lain dalam satu commit, kecuali dokumentasi berkaitan.
- Satu permintaan UI = satu batch commit/deploy (ikut AGENTS.md rule 20).

---

## 5. Had skop (JANGAN buat semasa fasa ini)

- Migrasi aset visual ke object storage durable — **tangguh**, dokumentasi dahulu;
- CI / lockfile / batch deploy guard — **tangguh** ke engineering hygiene phase;
- Error page / not-found page — **tangguh**;
- Account / auth / database — **tangguh**;
- NotesInternal mesti dianggap data dalaman: jangan dedah melalui API awam, RSS atau renderer lain. Pastikan ia tidak sekali-kali disertakan dalam body yang dirender.