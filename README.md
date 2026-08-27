# FlyerGen — Plakat & Flyer Generator

**Status:** ✅ Aktiv (Deployed auf steppa.online)
**URL:** `https://flyergen.steppa.online`
**Port:** 3010 (PM2: `flyergen`)
**Angelegt:** 2026-08-24
**Letztes Update:** 2026-08-26

## Konzept

Formular-basierter Flyer-Generator für die Polizeiakademie Niedersachsen.
User wählt Template → füllt Felder aus → Vorschau → Export als PNG/PDF.

## Architektur

```
Frontend (React)          Backend (Express)           Rendering
┌──────────────┐    ┌───────────────────┐    ┌─────────────────────┐
│ Template-    │    │ /api/templates    │    │ Handlebars → HTML   │
│ Auswahl      │───▶│ /api/render       │───▶│ wkhtmltoimage → PNG │
│ Formular     │    │ /api/upload       │    │ (72dpi RGB / 300dpi)│
│ Vorschau     │    │ /api/images       │    └─────────────────────┘
│ Export       │    └───────────────────┘
└──────────────┘
```

## Stack

| Schicht | Tech |
|---------|------|
| Frontend | React 18 + Zustand + TailwindCSS + Vite |
| Backend | Express.js + Handlebars |
| Rendering | wkhtmltoimage 0.12.6 (WebKit) |
| Bild-Upload | Multer + Sharp (Resize/Optimize) |
| Deployment | PM2 + Caddy (Reverse Proxy) |

## Templates

| ID | Name | Overlay-Zeilen | Besonderheiten |
|----|------|----------------|----------------|
| `01-krimi-tour` | Krimi-Tour | overlayLine1/2 | Absperrband (nur ohne Bild), Caution-Tape |
| `02-crime-coaches` | Crime Coaches | overlayLine1/2 | Ähnlich Krimi-Tour |
| `03-pol-informatik` | Polizei-Informatik | titleMain (tagline) | Photo-Bereich, CTA Stamp |

## Features (Stand 26.08.2026)

- ✅ Template-Auswahl (3 Templates)
- ✅ Dynamische Formulare (text, richtext, array, image)
- ✅ Bild-Upload + Galerie (Multer + Sharp, max 10MB)
- ✅ Bild in Vorschau/Export (background-image im Header)
- ✅ Editierbarer Overlay-Text (overlayLine1/2)
- ✅ Felder ausblenden (Eye/EyeOff Toggle)
- ✅ Polizei-Stern als Gestaltungselement (100mm, angeschnitten)
- ✅ Absperrband verschwindet bei Bild
- ✅ Live-Vorschau (debounced, auto-render)
- ✅ Export als PNG/PDF
- ✅ Custom Export-Dateiname
- ✅ Cloudflare Proxy (HTTPS)

## Wichtige technische Einschränkungen

### wkhtmltoimage (0.12.6) — Alter WebKit!
- ❌ `inset: 0` → ✅ `top:0;right:0;bottom:0;left:0`
- ❌ `object-fit` → ✅ `background-size:cover;background-position:center`
- ❌ `gap` in flexbox → ✅ margins
- ✅ `border-radius`, `box-shadow`, `filter`, `position:absolute`

### Renderer-Details
- `renderer.js` konvertiert `/uploads/xxx` URLs zu `file:///` Pfaden
- `--enable-local-file-access` Flag für lokale Dateien
- A5 Format: 560×793 px (72dpi) / 148×210mm (Print)

## API Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/templates` | GET | Alle Templates auflisten |
| `/api/templates/:id` | GET | Template-Details + Feld-Schema |
| `/api/render` | POST | Flyer rendern (PNG/PDF) |
| `/api/render-html` | POST | Gerendertes HTML (Debugging) |
| `/api/upload` | POST | Bild hochladen |
| `/api/images` | GET | Hochgeladene Bilder auflisten |
| `/api/images/:filename` | DELETE | Bild löschen |

## Dateien

```
projects/flyergen/
├── src/
│   ├── server.js          # Express API (Port 3010)
│   ├── renderer.js        # Handlebars + wkhtmltoimage
│   ├── upload.js          # Multer + Sharp
│   └── cli.js             # CLI-Tool
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── EditorPage.jsx    # Haupt-Editor
│       │   └── HomePage.jsx      # Template-Auswahl
│       ├── components/
│       │   ├── FormField.jsx     # Formular-Felder (mit Hide-Toggle)
│       │   ├── ImageUpload.jsx   # Bild-Upload + Galerie
│       │   ├── Preview.jsx       # Vorschau
│       │   ├── ExportButtons.jsx # Export (PNG/PDF + Dateiname)
│       │   ├── TemplateCard.jsx  # Template-Karte
│       │   └── TemplateGrid.jsx  # Template-Grid
│       ├── store/
│       │   └── useStore.js       # Zustand Store
│       └── api/
│           └── client.js         # API-Client
├── templates/
│   ├── 01-krimi-tour.html
│   ├── 02-crime-coaches.html
│   ├── 03-pol-informatik.html
│   └── shared.css
├── assets/                # Logos, Fonts, Shapes
├── uploads/               # Hochgeladene Bilder
├── output/                # Temp-Render-Dateien
├── deploy.sh              # Build + Deploy Script
└── package.json
```

## Deployment

```bash
# Frontend builden + deployen
cd projects/flyergen && bash deploy.sh

# Backend restarten
pm2 restart flyergen

# Manuell builden
cd frontend && npm run build
cp -r dist/* /var/www/apps/flyergen/
```

## Caddy Config

```
flyergen.steppa.online:80 {
    encode gzip
    handle /api/* { reverse_proxy localhost:3010 }
    handle /* {
        root * /var/www/apps/flyergen
        try_files {uri} /index.html
        file_server
    }
}
```

## Bekannte Issues

- Kein Auth (öffentlich zugänglich)
- wkhtmltoimage ist veraltet — langfristig durch Puppeteer ersetzen
- Kein CMYK-Support (nur RGB)
- Kein echtes PDF-Crop/Trim
