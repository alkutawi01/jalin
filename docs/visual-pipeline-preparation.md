# Visual Pipeline Preparation — Waktu Sebenar

## Visual Plan (Menunggu Keputusan)

### Minimum Publish Requirements
- Hero cover: 1 visual
- Inline visuals: 5 visuals
- **Total: 6 visual minimum**

### Why 6 (not 18)?
- Novela panjang (135 minit)
- Terlalu banyak visual mengganggu pembacaan
- Lebih mudah kawal credit/anchor
- Standard untuk novela berilustrasi

### Visual Placement Plan

| Visual | Location | Function | Anchor |
|--------|----------|----------|--------|
| Hero | Cover | Identiti karya | Cover page |
| 1 | Bab awal | Pengenalan dunia | "Dia berdiri seketika di ambang pintu" |
| 2 | Konflik utama | Emosi | "Yang ini belum siap" |
| 3 | Titik perubahan | Naratif | [Tentukan dari manuskrip] |
| 4 | Klimaks | Impak | [Tentukan dari manuskrip] |
| 5 | Epilog | Penutup | [Tentukan dari manuskrip] |

### Visual Metadata Structure

```json
{
  "role": "hero",
  "src": "/visuals/waktu-sebenar/hero.png",
  "alt": "Ilustrasi waktu-sebenar",
  "provider": "Magnific",
  "anchor": "text anchor from manuscript",
  "place": "after",
  "credit": "Ilustrasi AI — Jalin Visual Archive"
}
```

### Visual Workflow
1. Director tentukan 6 scene penting
2. Generate visual dengan Magnific
3. Assign anchor text dari manuskrip
4. Assign credit
5. Add ke database
6. Verify snapshot reconstruction

### DO NOT
- Generate semua visual sekaligus
- Skip credit assignment
- Use placeholder images