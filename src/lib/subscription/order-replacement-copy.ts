/** Admin copy; language review is recorded in launch plan section 11. */
export const ORDER_REPLACEMENT_COPY = {
  action: "Ganti kod e-mel",
  reason: "Sebab penggantian",
  help: "Kod lama akan dibatalkan dan tidak boleh digunakan lagi. Kod pengganti akan dihantar ke alamat e-mel pesanan asal. Tempoh pakej dan tarikh akhir penebusan asal dikekalkan.",
  confirm: "Ya, ganti dan hantar",
  confirmation: "Adakah anda mahu membatalkan kod lama dan menghantar kod pengganti ke alamat e-mel pesanan asal? Kod lama tidak boleh digunakan lagi selepas penggantian.",
  sent: "Kod berjaya diganti. E-mel kod pengganti telah diterima oleh penyedia perkhidmatan e-mel untuk penghantaran. Penerimaan dalam peti masuk belum dapat disahkan.",
  failed: "Kod berjaya diganti, tetapi status penghantaran e-mel belum dapat disahkan. Muat semula senarai dan semak status penghantaran sebelum mengambil tindakan lanjut.",
  changed: "Maklumat kod pesanan telah berubah sejak senarai ini dimuatkan. Muat semula senarai sebelum meneruskan.",
  notReady: "Pesanan mesti berstatus dibayar dan e-mel asal mesti telah dihantar kepada penyedia perkhidmatan e-mel. Jika penghantaran masih belum berjaya, gunakan Hantar semula e-mel.",
  unavailable: "Kod ini tidak boleh diganti. Semak status kod dan kelompoknya, termasuk sama ada kod telah ditebus, dibatalkan atau kelompoknya tidak lagi aktif.",
  expired: "Tarikh akhir penebusan kod telah berlalu. Penggantian tidak dibuat.",
} as const;
