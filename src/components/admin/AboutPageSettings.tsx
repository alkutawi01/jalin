"use client";

import PageCopyForm, { type PageCopyGroup } from "./PageCopyForm";

const SECTION_LABELS = ["Apa yang ada di sini", "Siapa di sebalik cerita", "Ilustrasi", "Sinopsis dan fragmen", "Mula membaca", "Hubungi kami"];

const GROUPS: PageCopyGroup[] = [
  {
    title: "Pengenalan di atas halaman",
    hint: "Tajuk halaman (slogan) tetap dan tidak disunting di sini.",
    fields: [{ field: "intro", label: "Ayat pengenalan (di bawah slogan)", long: true }]
  },
  ...SECTION_LABELS.map((label, index) => ({
    title: `Bahagian ${index + 1}: ${label}`,
    fields: [
      { field: `s${index + 1}.heading`, label: "Tajuk bahagian" },
      { field: `s${index + 1}.body`, label: "Teks", long: true }
    ]
  }))
];

/** Tetapan > Halaman Tentang Kami: the words of the public Tentang Kami page. */
export default function AboutPageSettings() {
  return (
    <PageCopyForm
      endpoint="/api/admin/about-page"
      groups={GROUPS}
      savedMessage="Teks halaman Tentang Kami disimpan."
      after={
        <p className="admin-form-hint">
          Pisahkan perenggan dengan satu baris kosong. Untuk pautan, tulis [teks](/alamat), contohnya [cerpen](/kategori/cerpen) atau
          [editorial@adjung.com](mailto:editorial@adjung.com). Logo Jalin di atas halaman tetap.
        </p>
      }
    />
  );
}
