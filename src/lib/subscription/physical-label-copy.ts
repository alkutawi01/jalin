/** Admin wording; review and operational limits are recorded in launch plan section 14. */
export const PHYSICAL_LABEL_COPY = {
  confirmGenerate: "Kod baharu disimpan dalam bentuk tersulit. PDF label boleh dimuat turun semula selagi kod memenuhi syarat cetakan semula.",
  dimensions: "Saiz label 50 × 30 mm dan pelekat gores 40 × 8 mm telah disahkan. Laraskan kedudukan cetakan mengikut keperluan pencetak yang digunakan.",
  printHelp: "Cetak pada saiz sebenar (100%), satu label bagi setiap halaman. Nyahaktifkan pilihan pelarasan saiz kepada halaman supaya ukuran label dikekalkan.",
  reprintHelp: "Cetakan semula menggunakan kod dan nombor siri asal tanpa menjana kod baharu atau mengubah status pengaktifan. Hanya kod tersimpan dalam kelompok fizikal yang sah, belum ditebus, belum dibatalkan dan belum melepasi tarikh akhir penebusan layak dicetak semula.",
  selected: "PDF label dipilih",
  remaining: "PDF label yang layak dicetak semula",
  one: "PDF label",
  confirm: "Ya, muat turun PDF",
  confirmation: "Muat turun semula PDF label bagi kod yang dipilih? PDF ini mengandungi kod dan nombor siri asal. Jangan gunakan salinan pada kad lain untuk dijual sebagai kod baharu.",
  unavailable: "Tiada label tersimpan yang layak dicetak semula. Kod lama yang hanya mempunyai rekod pengesahan tidak boleh dipulihkan untuk cetakan semula.",
  selection: "Sebahagian kod yang dipilih tidak layak dicetak semula atau bukan daripada kelompok ini. Tiada PDF akan disediakan bagi pilihan tersebut. Semak pilihan dan muat semula senarai.",
  recovery: "Label tidak dapat dipulihkan dengan selamat. Semak kunci penyulitan yang berkaitan dan integriti data tersimpan sebelum mencuba lagi.",
  layout: "Susun atur label tersimpan tidak sah. PDF tidak disediakan.",
  failed: "PDF label tidak dapat disediakan. Semak status kelompok dan kod sebelum mencuba lagi.",
} as const;
