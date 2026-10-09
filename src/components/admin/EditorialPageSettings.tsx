"use client";

import PageCopyForm, { type PageCopyGroup } from "./PageCopyForm";
import ProfileImageField from "./ProfileImageField";

/** Groups of fields in the order the public Editorial page shows them. */
const GROUPS: PageCopyGroup[] = [
  {
    title: "Pengenalan di atas halaman",
    fields: [
      { field: "dek", label: "Ayat pengenalan (di bawah tajuk Editorial)", long: true },
      { field: "definition", label: "Takrif karya, fragmen dan sinopsis", long: true }
    ]
  },
  {
    title: "Tajuk bahagian",
    fields: [
      { field: "heading.editors", label: "Bahagian editor" },
      { field: "heading.writers", label: "Bahagian penulis dan penyumbang" },
      { field: "heading.ways", label: "Bahagian cara bekerja" }
    ]
  },
  {
    title: "Pendedahan penulis maya",
    hint: "Dipaparkan sekali di atas senarai penyumbang, hanya apabila ada penulis maya yang dipaparkan.",
    fields: [{ field: "disclosure", label: "Teks pendedahan", long: true }]
  },
  {
    title: "Cara kami bekerja",
    hint: "Empat perkara pendek. Kosongkan satu medan untuk mengembalikan teks asal.",
    fields: [1, 2, 3, 4].flatMap((n) => [
      { field: `way.${n}.title`, label: `Perkara ${n}: tajuk` },
      { field: `way.${n}.text`, label: `Perkara ${n}: teks`, long: true }
    ])
  }
];

/** Tetapan > Halaman Editorial: the words of the public Editorial page and the picture across its top. */
export default function EditorialPageSettings() {
  return (
    <PageCopyForm
      endpoint="/api/admin/editorial-page"
      groups={GROUPS}
      savedMessage="Teks halaman Editorial disimpan."
      render={({ hero }, reload) => (
        <ProfileImageField
          id="editorial-hero"
          endpoint="/api/admin/editorial-page/hero"
          src={hero.src}
          alt={hero.alt}
          title="Gambar di atas halaman Editorial"
          hint="Gambar lebar yang dipaparkan antara pengenalan dan senarai editor (dipaparkan dalam nisbah lebih kurang 2:1; bahagian tengah gambar sentiasa kelihatan). Tanpa gambar, halaman awam tidak memaparkan ruang kosong."
          onChanged={reload}
        />
      )}
      after={
        <p className="admin-form-hint">
          Jawatan editor dan tanggungjawabnya disunting di <a href="/admin/contributors">Penyumbang</a>: buka orang itu dan isi &quot;Jawatan editorial&quot;.
          Orang yang tiada jawatan dipaparkan di bahagian penulis dan penyumbang.
        </p>
      }
    />
  );
}
