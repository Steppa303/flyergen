# FlyerGen — HANDOVER

**Datum:** 2026-08-27 (updated 09:56)
**Status:** Deployed & Aktiv
**URL:** https://flyergen.steppa.online
**Repo:** https://github.com/Steppa303/flyergen

## Was ist FlyerGen?

Formular-basierter Flyer/Plakat-Generator für die Polizeiakademie Niedersachsen.
User wählt ein Template, füllt Felder aus, lädt ggf. ein Bild hoch, sieht live eine Vorschau und exportiert als PNG oder PDF.

## Aktueller Stand (27.08.2026, updated 09:56)

1 Template aktiv:
- **Einzel-Event** (ehem. Krimi-Tour) — Event-Plakat mit Absperrband, Overlay-Text, Yellow Box

2 Templates ausgeblendet (`hidden: true` in server.js):
- **Crime Coaches** — Ähnliches Layout, grüne Info-Bar
- **Polizei-Informatik** — Anderes Layout mit Photo-Bereich, CTA Stamp

### Template-Änderungen (26.08.2026)

#### Logo (Wortbildmarke)
- Templates 01+02: `42mm` (vorher `28mm`)
- Template 03: `100mm` (vorher `50mm`)
- Instagram/Poster Overrides proportional skaliert

#### Header-Text (Templates 01+02)
- `headerLine1` + `headerLine2`: Base `25pt`, Min `15pt`, Max `40` Zeichen
- Bei >40 Zeichen automatische Verkleinerung (max2 Zeilen)
- Instagram: `35pt`, Poster: `33pt`

#### Overlay-Text (Template 01: KRIMI TOUR)
- Einzeilig, zweifarbig: `<span class="overlay-white">KRIMI</span> <span class="overlay-accent">TOUR</span>`
- Font: `56pt` (vorher `88pt` auf zwei Zeilen)
- Position: `position: absolute; bottom: -0.85em; line-height: 0.85;`
- Format-spezifische Overrides: Instagram `-0.75em`, Poster `-0.75em`
- Unterkante berührt pixel-perfekt die Oberkante der gelben Box
- Links-bündig ausgerichtet mit Header-Text (selbe vertikale Achse)

#### Gelbe Box (Template 01)
- `margin-left: 0` — geht bis zum linken Seitenrand (angeschnitten)
- `border-radius: 0 2mm 2mm 0` — nur rechts abgerundet
- `padding-left: 12mm` — Text bündig mit Header-Text

#### CTA Kreis (alle Templates)
- `ctaLines` Helper: Zeilenumbruch bei max9 Zeichen (wortbasiert, word-boundary aware)
- `ctaFontSize` Helper: Dynamische Schriftgröße basierend auf Textlänge
  - `{{ctaFontSize ctaText baseSize minSize}}` — kurz = groß, lang = klein
  - Template 01: Base `26pt`, Min `18pt` (vorher hardcoded `8-11pt`)
  - Linear interpolation: <=8 chars → base, >=22 chars → min
- Kreis: `38mm`, `line-height: 0.95` (Container), `0.9` (pro Zeile)
- `flex-direction: column` für vertikale Anordnung
- Beispiel: "MELDE DICH JETZT AN" → ~20pt, füllt den Kreis gut

### Features
- Dynamische Formulare (text, richtext, array, image)
- Bild-Upload + Galerie (Multer + Sharp, max 40MB)
- Bild wird im Header als Hintergrund gerendert
- Editierbarer Overlay-Text (overlayLine1/2)
- **Felder-Ausblenden (Eye-Toggle)** — Blendet das Element auf dem Flyer aus, Formularzeile bleibt sichtbar aber deaktiviert (opacity-40, disabled inputs)
- Polizei-Stern als Gestaltungselement (100mm, angeschnitten)
- Absperrband verschwindet automatisch bei Bild-Upload
- Live-Vorschau (debounced 800ms)
- Export als PNG/PDF mit custom Dateiname
- **QR-Code-Generierung** — Link-Feld → QR-Code als PNG im Flyer
- **Auto-Schriftenverkleinerung** — Lange Texte werden automatisch kleiner
- **Dynamische Overlay-Skalierung** — Overlay-Text passt sich automatisch an verfügbare Breite an (fitText/fitOverlayText Helper)
- **Multiformat-Export** — Flyer (A5), Plakat (A4), Instagram (1080×1080)
- **Proportionale Gestaltungselemente** — Stern skaliert mit Format (68% der Seitenbreite)
- **Top-Gradient** — Blauverlauf über dem Bild für Logo-Sichtbarkeit
- **Upload-Validierung** — Klare Fehlermeldungen bei zu großen Dateien oder falschem Dateityp

## Tech Stack

- **Frontend:** React 18 + Zustand + TailwindCSS + Vite
- **Backend:** Express.js + Handlebars (Port 3010, PM2 `flyergen`)
- **Rendering (PNG):** wkhtmltoimage 0.12.6 (alter WebKit!)
- **Rendering (PDF):** WeasyPrint 68.1 (Vektor-Text, korrekte Seitengrößen)
- **CMYK-Konvertierung:** Ghostscript 10.02.1 (für Druckformate, nicht Instagram)
- **Bilder:** Multer + Sharp (Resize auf 1200×800, JPEG 85%, max 40MB Upload)
- **QR-Code:** `qrcode` npm Paket (PNG-Generierung serverseitig)
- **Deploy:** PM2 + Caddy

## WICHTIG: wkhtmltoimage Einschränkungen

wkhtmltoimage 0.12.6 nutzt einen alten WebKit-Renderer. Folgendes funktioniert NICHT:
- `inset: 0` → immer `top:0;right:0;bottom:0;left:0` verwenden
- `object-fit` → `background-size:cover` + `background-position:center`
- `gap` in flexbox → margins verwenden
- Modernes CSS Grid → flexbox nutzen
- CSS `clamp()` → serverseitige Berechnung über Handlebars-Helper

## PDF-Export (WeasyPrint + CMYK)

PDF-Export nutzt **WeasyPrint** statt wkhtmltoimage. Vorteile: Vektor-Text (scharf bei jedem Zoom-Level), korrekte Seitengrößen via `@page`-CSS.

### Renderer-Unterscheidung
- `format === 'png'` → wkhtmltoimage (Pixel-basiert)
- `format === 'pdf'` → weasyprint (Vektor-basiert)

### PDF-spezifische Anpassungen im Renderer
1. **Weiße SVG-Varianten:** WeasyPrint unterstützt keine CSS-Filter auf `<img>`. Daher werden bei PDF `WBM_Blau.svg` → `WBM_White.svg` und `stern_Blau.svg` → `stern_White.svg` ersetzt. CSS `filter: brightness(0) invert(1)` wird entfernt.
2. **@page-CSS:** `pageWidth`/`pageHeight` aus dem `formats`-Array werden als `@page { size: ...; margin: 0; }` ins HTML injiziert.
3. **Dimensionen:** PNG nutzt Pixel (z.B. 560×793), PDF nutzt mm/px aus `pageWidth`/`pageHeight` (z.B. 148mm×210mm).

### CMYK-Post-Processing (Ghostscript)
- **Wann:** Nur bei Druckformaten (Flyer A5, Plakat A4), NICHT bei Instagram
- **Warum:** Druckereien erwarten CMYK-Farbraum, nicht RGB
- **Wie:** Ghostscript `pdfwrite` Device mit `-sColorConversionStrategy=CMYK`
- **Fallback:** Bei Fehlschlag wird die RGB-Version beibehalten (non-fatal, nur Warning)

### Befehlskette
```
HTML → weasyprint → RGB-PDF → gs (CMYK) → CMYK-PDF → Download
```

### Wichtig
- WeasyPrint 68.1 + Ghostscript 10.02.1 müssen installiert sein
- `pageWidth`/`pageHeight` im `formats`-Array sindPflicht für PDF (mm oder px)
- Instagram-Format bleibt RGB (kein CMYK)

## Renderer-Flow

1. Frontend sendet `{ template, data, format, formatId, hiddenFields }` an `/api/render`
2. Backend lädt Template-HTML aus `templates/`
3. `hiddenFields` wird als `data._hiddenFields` ans Template übergeben
4. Wenn `qrUrl` angegeben: QR-Code als PNG generieren, Pfad in `data.qrCodeImage`
5. Handlebars kompiliert Template mit data (inkl. `fontSize`, `isHidden`-Helper)
6. `renderer.js` konvertiert:
   - `/uploads/xxx` → `file:///root/.../uploads/xxx` (absoluter Pfad)
   - Asset-Pfade → `file://` URLs
6. Body-Klasse `format-{formatId}` wird ins HTML injiziert
7. Dimensionen aus `formats`-Array (width/height) werden gesetzt
8. Temporäre HTML-Datei schreiben
9. Rendering:
   - **PNG:** `wkhtmltoimage` rendert zu PNG (Pixel-basiert)
   - **PDF:** `weasyprint` rendert zu PDF (Vektor-Text, korrekte Seitengrößen via `@page`-CSS)
10. **PDF CMYK-Post-Processing** (nur Druckformate, nicht Instagram):
    - Ghostscript konvertiert RGB → CMYK (`-sColorConversionStrategy=CMYK`)
    - Bei Fehlschlag: RGB wird beibehalten (non-fatal)
11. Datei wird als Download gesendet, dann gelöscht (inkl. QR-Temp-Datei)

## Multiformat-System

Jedes Template hat ein `formats`-Array im Schema:
```js
formats: [
  { id: 'flyer', name: 'Flyer (A5)', width: 560, height: 793, label: 'A5 Portrait', pageWidth: '148mm', pageHeight: '210mm' },
  { id: 'poster', name: 'Plakat (A4)', width: 793, height: 1123, label: 'A4 Portrait', pageWidth: '210mm', pageHeight: '297mm' },
  { id: 'instagram', name: 'Instagram', width: 1080, height: 1080, label: '1080×1080', pageWidth: '1080px', pageHeight: '1080px' }
]
```

`pageWidth`/`pageHeight` werden für WeasyPrint's `@page`-CSS verwendet (exakte Seitengröße im PDF).

### Format-CSS-Overrides
Die Overrides sitzen direkt in den Template-`<style>` Blöcken (nicht in shared.css), weil Template-Styles höhere Spezifität haben:
- `.format-instagram` — Quadratisch, größere Fonts, Prozent-Padding
- `.format-poster` — A4, größere Fonts, breiteres Padding

**WICHTIG:** Bei neuen Templates MÜSSEN die Format-Overrides im Template-Style-Block stehen, nicht in shared.css!

## Proportionale Gestaltungselemente

Der Stern (`star-deco`) skaliert automatisch mit der Seitengröße:
- `width: 90%` der Seitenbreite (statt feste mm-Werte)
- `bottom: -27%; right: -27%` (prozentuale Position)
- Ergebnis: A5 ~133mm, A4 ~189mm, Instagram ~972px

## Top-Gradient (Logo-Sichtbarkeit)

Jedes Template hat einen Blauverlauf am oberen Rand (`header-top-gradient` / `photo-top-gradient`):
- Höhe: 45% der Header-Section (Template 03: 50%)
- Verlauf: `rgba(0,30,60,0.9)` → transparent
- Sitzt über dem Bild, unter dem Logo
- Garantiert dass die Wortbildmarke (WBM_Blau.svg) immer lesbar ist

## Bottom-Gradient (Header-Overlay)

Der untere Gradient (`header-bg-overlay`) geht flacher ins Bild:
- Verlauf: `0.1 → 0.3 → 0.7` (bei 0%/40%/70%)
- Bild bleibt länger sichtbar, Übergang zu primärem Blau erst spät

## Overlay-Text

- `overlayLine1` (z.B. "KRIMI") — weiß, opak (`rgba(255,255,255,1)`)
- `overlayLine2` (z.B. "TOUR") — Akzentfarbe (Lime)

## QR-Code Slogan

- `qr-slogan` hat `margin-left: 5mm` damit er nicht unter dem QR-Code verschwindet

## Felder-Ausblenden (Hidden Fields)

Eye-Toggle bei jedem Formularfeld. Blendet das **Element auf dem Flyer** aus, nicht die Formularzeile.

### Architektur
1. **Frontend (FormField.jsx):** Ausgeblendete Felder bleiben sichtbar aber deaktiviert (`opacity-40`, `pointer-events-none`, disabled Inputs). Eye-Icon bleibt klickbar (`pointer-events-auto`).
2. **Store (useStore.js):** `hiddenFields` Objekt `{ fieldId: true }` — wird in LocalStorage persistiert.
3. **API (client.js):** `renderFlyer()` sendet `hiddenFields` ans Backend (nicht mehr Filterung der formData).
4. **Backend (server.js):** Akzeptiert `hiddenFields` aus Request, setzt `data._hiddenFields`.
5. **Renderer (renderer.js):** `isHidden` Handlebars-Helper prüft `data._hiddenFields`.
6. **Templates:** Jedes Element mit `{{#unless (isHidden 'fieldId')}}...{{/unless}}` umschlossen.

### Handlebars Helper
```handlebars
{{#unless (isHidden 'headerLine2')}}
  <div class="header-line2">{{headerLine2}}</div>
{{/unless}}
```

### Was ausgeblendet werden kann
- headerLine1, headerLine2 (einzeln)
- overlayLine1, overlayLine2 (einzeln, mit Fallback auf jeweils andere Zeile)
- eventTitle, eventDescription (einzeln, Yellow/Green Box bleibt wenn mind. 1 sichtbar)
- eventDate, locationLines (einzeln)
- ctaText, sloganLine1, sloganLine2 (einzeln)
- qrUrl (QR-Code + Corner-Decorations)

### Wichtig
- `hiddenFields` muss im useEffect-Dependency-Array von EditorPage sein (sonst keine Re-Render bei Toggle)
- Backend füllt Default-Werte für ALLE Felder (auch ausgeblendete) — Template entscheidet via `isHidden` was gerendert wird
- Deploy: Immer `deploy.sh` nutzen (buildet Frontend + kopiert nach `/var/www/apps/flyergen/`)

## Auto-Schriftenverkleinerung

Handlebars-Helper `fontSize` in `renderer.js`:
```
{{fontSize text baseSize minSize maxChars}}
```
- Berechnet: `max(minSize, baseSize * (maxChars / text.length))`
- Gibt nur die Zahl zurück (z.B. "8.5"), Template setzt `style="font-size: Xpt"`
- Angewendet auf: headerLine1/2, eventTitle, eventDescription, ctaText, titleMain

## Dynamische Overlay-Skalierung (fitText / fitOverlayText)

Handlebars-Helper in `renderer.js` die Textbreite schätzen und Font-Size automatisch anpassen:

### `fitText`
```
{{fitText text baseSize availableWidthPt formatId=_formatId instagramWidth=740 posterWidth=540}}
```
- Schätzt Textbreite basierend auf gewichteten Zeichenbreiten (M/W breit, I/V schmal)
- Berücksichtigt `letter-spacing: 0.08em`
- Gibt Font-Size in pt zurück (nie kleiner als 12pt)
- Format-spezifische Breiten via Hash-Parameter (formatId wird vom Renderer als `_formatId` injiziert)
- Template 02 (Crime Coaches): Separat für jede Overlay-Zeile

### `fitOverlayText`
```
{{fitOverlayText line1 line2 baseSize availableWidthPt formatId=_formatId instagramWidth=740 posterWidth=540}}
```
- Kombiniert zwei Zeilen und skaliert gemeinsam
- Template 01 (Krimi-Tour): Beide Zeilen zusammen

### Verfügbare Breiten pro Format
| Format | Seitenbreite | Left Offset | Verfügbar (pt) |
|--------|-------------|-------------|------------------|
| A5 Flyer | 560px | 12mm (45px) | ~380pt |
| Instagram | 1080px | 6% (65px) | ~740pt |
| A4 Poster | 793px | 16mm (60px) | ~540pt |

### Beispiel
- "KRIMI TOUR" → bleibt 56pt (kurz genug)
- "TAG DER NIEDERSACHSEN" → skaliert auf ~26.8pt
- "POLIZEIACADEMIE" → skaliert auf ~42.1pt (bei 84pt Base)

## QR-Code-Generierung

- Feld `qrUrl` (type: 'text') in allen Templates
- Server generiert QR-PNG via `qrcode` Paket vor dem Render
- Pfad als `qrCodeImage` an Template übergeben
- Template zeigt QR-Bild oder Fallback-Corner-Decorations
- Temp-Datei wird nach Download gelöscht

## Template-Schema (server.js)

```js
{
  '01-krimi-tour': {
    name: 'Einzel-Event',
    fields: [
      { id: 'headerLine1', type: 'text', label: '...', default: '...' },
      { id: 'overlayLine1', type: 'text', label: 'Overlay Zeile 1', default: 'KRIMI' },
      { id: 'qrUrl', type: 'text', label: 'QR-Code Link (optional)', default: '' },
      { id: 'imageUrl', type: 'image', label: 'Flyer-Bild', default: '' },
      // ...
    ],
    formats: [
      { id: 'flyer', name: 'Flyer (A5)', width: 560, height: 793, label: 'A5 Portrait', pageWidth: '148mm', pageHeight: '210mm' },
      { id: 'poster', name: 'Plakat (A4)', width: 793, height: 1123, label: 'A4 Portrait', pageWidth: '210mm', pageHeight: '297mm' },
      { id: 'instagram', name: 'Instagram', width: 1080, height: 1080, label: '1080×1080', pageWidth: '1080px', pageHeight: '1080px' }
    ]
  }
}
```

## Frontend State (Zustand + LocalStorage Persistence)

```js
{
  templates: [],              // nicht persistiert
  selectedTemplate: null,     // persistiert
  formData: {},               // persistiert
  hiddenFields: {},           // persistiert
  exportFilename: 'flyer',    // persistiert
  previewUrl: null,           // nicht persistiert (ObjectURL)
  previewHtml: null,          // nicht persistiert
  loading: false,             // nicht persistiert
  renderLoading: false,       // nicht persistiert
  error: null,                // nicht persistiert
  selectedFormat: 'flyer',    // persistiert
  formats: [],                // persistiert
}
```

### LocalStorage Persistence
- Zustand `persist` Middleware mit `createJSONStorage(() => localStorage)`
- Key: `flyergen-editor`
- `partialize`: Nur User-Daten werden persistiert (formData, selectedTemplate, hiddenFields, selectedFormat, exportFilename, formats)
- Transient State (loading, error, previewUrl) wird nicht gespeichert
- Bei Browser-Refresh/-Neustart werden die Felder automatisch wiederhergestellt
- `resetEditor()` löscht auch den LocalStorage-Eintrag

## API Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/templates` | GET | Liste aller Templates (inkl. formats) |
| `/api/templates/:id` | GET | Template-Details mit Schema + formats |
| `/api/render` | POST | Render als PNG/PDF (body: template, data, format, formatId, hiddenFields) |
| `/api/render-html` | POST | Gerendertes HTML (Debugging) |
| `/api/upload` | POST | Bild hochladen |
| `/api/images` | GET | Alle Bilder auflisten |
| `/api/images/:filename` | DELETE | Bild löschen |

## Deployment

```bash
# Frontend + Backend deployen
cd /root/.local/.openclaw/workspace/projects/flyergen
bash deploy.sh

# Nur Backend restarten
pm2 restart flyergen

# Frontend manuell builden
cd frontend && npm run build
```

## Dateistruktur

```
flyergen/
├── src/
│   ├── server.js          # Express API (Port 3010)
│   ├── renderer.js        # Handlebars + wkhtmltoimage + fontSize-Helper
│   └── upload.js          # Multer + Sharp Bildverarbeitung
├── templates/
│   ├── shared.css         # Shared Styles (Fonts, Variablen, Reset)
│   ├── 01-krimi-tour.html # Template 1 (mit Format-Overrides im <style>)
│   ├── 02-crime-coaches.html
│   └── 03-pol-informatik.html
├── frontend/
│   └── src/
│       ├── store/useStore.js    # Zustand State (inkl. selectedFormat, formats)
│       ├── pages/EditorPage.jsx # Editor mit Format-Tabs
│       ├── components/
│       │   ├── ExportButtons.jsx # Export mit Format-Anzeige
│       │   ├── Preview.jsx
│       │   ├── FormField.jsx
│       │   └── ImageUpload.jsx
│       └── api/client.js        # renderFlyer(templateId, data, format, formatId)
├── assets/                # Logos, Fonts
├── uploads/               # Hochgeladene Bilder
└── deploy.sh              # Build + Deploy Script
```

## Bug Fixes (26.08.2026)

### Upload-Images funktionieren nicht (Caddy Routing)
- **Problem:** Caddy hat `/uploads/*` als `index.html` ausgeliefert (SPA-Fallback)
- **Fix:** `handle /uploads/*` → `reverse_proxy localhost:3010` in Caddyfile hinzugefügt
- Content-Type war `text/html` statt `image/jpeg`

### Große Bilder → unklarer Fehler
- **Problem:** Multer `LIMIT_FILE_SIZE` Error wurde nicht abgefangen
- **Fix:** Error-Handler für multer in `server.js` → "Bild zu groß (max. 40MB)"
- Frontend zeigt Upload-Fehler als rote Box mit Alert-Icon

### Falscher Dateityp → stille Ablehnung
- **Problem:** Multer fileFilter hat `false` zurückgegeben ohne Fehlermeldung
- **Fix:** Gibt jetzt "Nicht erlaubter Dateityp. Erlaubt: JPG, PNG, WebP" zurück

### Upload-Limit erhöht
- Vorher: 10MB, jetzt: 40MB
- Multer `limits.fileSize` in `upload.js`

### Overlay-Text läuft über Kante
- **Problem:** "TAG DER NIEDERSACHSEN" (56pt) über rechte Kante hinaus
- **Fix:** `fitText` / `fitOverlayText` Helper → dynamische Skalierung basierend auf Textbreite
- Template 01: `fitOverlayText` (beide Zeilen gemeinsam)
- Template 02: `fitText` (je Zeile einzeln)
- Format-spezifische Breiten (Instagram/Poster haben mehr Platz)

## Nächste Schritte

### Admin-Bereich (geplant, siehe `admin.md`)
- [ ] Auth (Passwort-Abfrage bei "Verwalten"-Button)
- [ ] Template-Editor (3 Tabs: Schema, Code, Vorschau)
- [ ] Asset-Galerie (Logos/Bilder hochladen/verwalten)
- [ ] SQLite-DB für Template-Metadaten + Schema
- [ ] CodeMirror 6 Code-Editor

### Sonstiges
- [ ] Mehr Templates
- [ ] wkhtmltoimage → Puppeteer (modernere Engine)
- [ ] Drag & Drop Störer/CTA (verschiebbar + skalierbar)

### Erledigt
- [x] CMYK-Support für Druck (Ghostscript, 26.08.2026)
- [x] PDF-Export (WeasyPrint, 26.08.2026)
- [x] GitHub Repo (27.08.2026)
- [x] LocalStorage Persistence (Zustand persist, 27.08.2026)
- [x] Template umbenannt: Krimi-Tour → Einzel-Event (27.08.2026)
- [x] Templates ausgeblendet: Crime Coaches + Polizei-Informatik (27.08.2026)
- [x] Felder-Ausblenden: Flyer-Element ausblenden statt Formularzeile (27.08.2026)
