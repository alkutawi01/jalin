# Putaran kunci MAC kad

Kod kad yang sudah dicetak kekal sah apabila kunci semasa ditukar. Kunci terdahulu disimpan dalam `CODE_MAC_KEY_PREVIOUS` sebagai senarai `id:64-aksara-hex` yang dipisahkan koma. Simpan nilainya hanya dalam pengurus kata laluan dan pemboleh ubah persekitaran Sensitive; jangan letak dalam repo, log atau tiket.

1. Catat ID dan kunci semasa secara selamat. Tambah pasangan itu kepada `CODE_MAC_KEY_PREVIOUS` di Vercel Production tanpa membuang pasangan lama yang masih diperlukan. ID mesti unik.
2. Jana kunci baharu 32 bait dan ID baharu. Tetapkan `CODE_MAC_KEY_ID` dan `CODE_MAC_KEY` bersama-sama, kemudian redeploy Production. Jangan guna semula kunci pembaca atau kunci sandaran.
3. Uji satu kad lama yang belum ditebus dalam persekitaran terkawal dan pastikan kad baharu menggunakan ID baharu. Jangan menebus kad pelanggan sebenar hanya untuk ujian.
4. Kekalkan pasangan lama selagi ada kad berkaitan yang mungkin belum ditebus. Sebelum membuangnya, audit `redeem_codes.key_id` dan keputusan editorial/pemilik tentang hayat kad. Kehilangan kunci lama boleh menjadikan kad bercetak tidak dapat ditebus.

Kod kongsi tidak menggunakan kunci MAC kad ini. Penebusan tetap menyemak had tekaan dan memberikan respons gagal yang sama tanpa mendedahkan ID kunci.
