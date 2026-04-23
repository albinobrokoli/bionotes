# BioNotes

> **Open-source, local-first note-taking app for science students.**
> PDF annotation, LaTeX support, source tracking, and NotebookLM integration. Built with Tauri + React.

BioNotes, fen bilimleri öğrencileri ve araştırmacılar için tasarlanmış, **açık kaynak, ücretsiz ve tamamen yerel** çalışan bir masaüstü not uygulamasıdır. Notion + Obsidian + Zotero'nun bilim odaklı alternatifi olmayı hedefler.

---

## ✨ Öne çıkanlar (v0.1 — temel sürüm)

- 🧠 **Bilim odaklı alanlar** — Nörobiyoloji, moleküler biyoloji, hücre biyolojisi, ekoloji gibi alanlar hazır olarak gelir
- 📝 **Block tabanlı editör** (BlockNote) — Notion tarzı `/` komutu, başlık, liste, kod, tablo blokları
- ⌘K **komut paleti** — herhangi bir sayfaya saniyeler içinde atla
- 🎨 **Tercih edilebilir tema** — 5 aksan rengi, 3 yazı tipi çifti
- 🌐 **TR / EN** — tam çift dilli arayüz (tercih korunur)
- 🖥️ **macOS native** — Apple traffic light'ları, yerel pencere dekorasyonu, ~10MB binary
- 💾 **Local-first** — hiçbir veri sunucuya gitmez; tüm notlar tarayıcı storage'ında (v0.2'de SQLite)

## 🗺️ Yol haritası

| Sürüm | Özellik |
|---|---|
| **v0.1** ✅ | Temel not alma, sidebar, editör, command palette, tercihler |
| v0.2 | SQLite kalıcı kayıt + otomatik kaydetme (debounced) |
| v0.3 | PDF viewer + yan yana notlar + annotation |
| v0.4 | LaTeX (KaTeX), deney defteri bloğu, hipotez/sonuç blokları |
| v0.5 | NotebookLM entegrasyonu (tek tıkla gönder) |
| v0.6 | Graph view, `[[backlinks]]` |
| v1.0 | Kararlı sürüm + auto-updater + onboarding |

## 🚀 Geliştirme

### Ön koşullar
- **Rust** (≥ 1.77) — [rustup.rs](https://rustup.rs/) üzerinden kur
- **Node.js** (≥ 20) — [nvm](https://github.com/nvm-sh/nvm) öneririz
- macOS Xcode Command Line Tools: `xcode-select --install`

### Çalıştırma
```bash
npm install
npm run tauri dev        # geliştirme (macOS penceresi açar)
npm run tauri build      # üretim .dmg bundle (.dmg / .app) üretir
npm run dev              # Tauri olmadan sadece Vite dev (tarayıcıda)
npm run build            # statik web build (dist/)
```

Üretim bundle'ı: `src-tauri/target/release/bundle/dmg/BioNotes_0.1.0_*.dmg`

### Klavye kısayolları
| Kısayol | İşlev |
|---|---|
| ⌘K | Komut paleti |
| Esc | Paleti kapat |
| / (editör içinde) | Block menüsü |

## 🏗️ Mimari

```
src/
├── App.tsx              # 3 panelli ana düzen + klavye kısayolları
├── main.tsx             # React root + i18n bootstrap
├── styles/              # Tasarım token'ları + global CSS
│   ├── tokens.css       # CSS değişkenleri (renkler, tipografi, spacing)
│   └── globals.css      # Reset, scrollbar, fokus, animasyonlar
├── components/          # UI bileşenleri
│   ├── Sidebar.tsx      # Workspace + arama + tree
│   ├── Breadcrumb.tsx   # Üst bar + view mode toggle
│   ├── EditorArea.tsx   # BlockNote sarmalayıcı
│   ├── CommandPalette.tsx
│   ├── TweaksPanel.tsx  # Tercihler overlay'i
│   └── RightRail.tsx    # Sağ panel (meta veri, etiketler)
├── store/
│   └── app.ts           # Zustand + persist (localStorage)
├── data/
│   └── seed.ts          # Varsayılan Spaces / Categories / Pages
├── i18n/
│   ├── index.ts         # react-i18next başlatma
│   ├── tr.json          # Türkçe çeviriler
│   └── en.json          # İngilizce çeviriler
└── lib/
    └── icons.tsx        # Lucide + custom SVG ikonlar

src-tauri/               # Rust backend (Tauri)
├── src/lib.rs           # Tauri komutları (şimdilik iskelet)
├── tauri.conf.json      # Pencere, bundle, macOS ayarları
└── Cargo.toml
```

## 📜 Lisans

MIT — topluluk katkılarına açık.

## 🙏 Teşekkür

HTML tasarım mockup'ı Claude Design ile hazırlandı. Bilim blokları ve içerik vizyonu [Sinirbilim Portalı](https://sinirbilimportali.org) tarafından.
