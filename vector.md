# Vektor-PDF für Namensschilder — Technische Planung

**Datum:** 2026-09-01
**Status:** Planung
**Betroffene Komponenten:** `background-extractor.js`, `badge-renderer.js`, `server.js`

---

## 1. Problem

Wenn ein **vektorbasiertes PDF** als Hintergrund für Namensschilder hochgeladen wird, konvertiert `background-extractor.js` die erste Seite via `pdftoppm -png -r 300` in ein **Pixelbild** (300 DPI PNG). Dieses PNG wird als Base64-Data-URL ins HTML eingebettet, und WeasyPrint rendert es als Rastergrafik ins finale PDF.

**Ergebnis:** Vektor-Logos, Linien und Text aus der Vorlage werden als Pixelgrafik dargestellt — unscharf bei Zoom, große Datei, nicht drucktauglich im professionellen Umfeld.

**Ziel:** Bei Vektor-PDF-Vorlagen soll das gesamte Ausgabe-PDF komplett in Vektoren bleiben (Hintergrund + Textfelder).

---

## 2. Architektur-Entscheidung: Zwei-Pipeline-Ansatz

### Pipeline A: Raster-Pipeline (bestehend, für PNG/JPG-Vorlagen)
```
PNG/JPG-Vorlage → pdftoppm/schmal → PNG-Hintergrund
→ HTML (background-image: data-uri) → WeasyPrint → PDF
```
Bleibt unverändert für Pixelbilder.

### Pipeline B: Vektor-Pipeline (neu, für PDF-Vorlagen)
```
PDF-Vorlage (Vektor)
→ WeasyPrint rendert NUR Text-Overlay als transparentes PDF
→ PyPDF2 merged: Vorlage-PDF (Seite 1) + Text-Overlay-PDF
→ Ergebnis: Vektor-PDF mit Vektor-Hintergrund + Vektor-Text
```

**Warum PyPDF2?**
- Erhält alle Vektor-Informationen der Vorlage 1:1
- WeasyPrint rendert Textfelder als saubere Vektor-PDF-Seiten
- PyPDF2 merged zwei PDFs auf Seitenebene — keine Konvertierung, kein Qualitätsverlust
- Bewährte Library, ~2MB, keine externen Dependencies

---

## 3. Betroffene Dateien & Änderungen

### 3.1 `src/namebadge/background-extractor.js`

**Änderung:** Extraktion von Metadaten OHNE Rasterisierung bei PDF-Uploads.

```js
// NEU: Metadaten-Extraktion OHNE pdftoppm (für Vektor-Pipeline)
async function extractPdfMetadata(pdfPath) {
  // 1. Seitenanzahl via pdfinfo
  // 2. Seitengröße via pdfinfo (Width/Height in mm)
  // 3. Seitenanzahl für Rückseite-Handling
  
  return {
    type: 'vector',           // ← NEU: Kennzeichnet Vektor-Quelle
    pdfPath: pdfPath,         // ← Original-PDF-Pfad (NICHT konvertiert)
    width: Number,            // Breite in px (Referenz, 300 DPI)
    height: Number,           // Höhe in px (Referenz)
    widthMm: Number,          // Breite in mm (exakt)
    heightMm: Number,         // Höhe in mm (exakt)
    pages: Number,
  };
}
```

**Bestehende `extractFromPdf()` bleibt erhalten** für Raster-Pipeline (wenn User explizit Raster will oder bei Kompatibilität).

**Neue Funktion `extractPdfVector()`:**
- Speichert das Original-PDF NICHT als PNG, sondern belässt es als PDF
- Extrahiert nur Metadaten (Größe, Seitenanzahl) via `pdfinfo`
- Gibt den Original-PDF-Pfad + Metadaten zurück
- Keine `sharp`-Verarbeitung, kein `pdftoppm`

**Bleed-Handling bei Vektor-PDFs:**
- Beschnittzugabe wird NICHT am PNG geschnitten, sondern via `pdftocairo` oder `qpdf` am PDF
- Alternative: Bleed-Crop via PyPDF2 (Seiten-Beschneidung auf Seitenebene)

### 3.2 `src/namebadge/badge-renderer.js`

**Änderung:** Verzweigung je nach Hintergrund-Typ.

#### `renderBadges(config)` — Hauptfunktion

```js
async function renderBadges(config) {
  const bgInfo = config.backgroundInfo; // ← NEU: Metadaten-Objekt
  
  if (bgInfo.type === 'vector') {
    return await renderBadgesVector(config);
  } else {
    return await renderBadgesRaster(config); // bestehender Flow
  }
}
```

#### `renderBadgesVector(config)` — NEU

```js
async function renderBadgesVector(config) {
  // 1. HTML aufbauen mit ALLEN Teilnehmern (Text-Overlay OHNE Hintergrund)
  //    - @page { size: 105mm 148mm; margin: 0; }
  //    - Hintergrund: transparent (kein background-image!)
  //    - Textfelder: absolut positioniert, identisch zum bestehenden HTML
  //    - Jede Teilnehmer-Seite = eine leere Seite mit Textfeldern
  
  // 2. WeasyPrint rendert das HTML zu einem "Text-Overlay-PDF"
  //    - Nur Text, kein Hintergrund → kleines PDF, reine Vektor-Texte
  
  // 3. PyPDF2 merged:
  //    - Für jeden Teilnehmer:
  //      a) Vorlage-PDF Seite 1 (Vektor-Hintergrund)
  //      b) Text-Overlay-PDF Seite N (Vektor-Text)
  //      → Zusammenführen auf eine Seite
  //    - Bei beidseitig:
  //      a) Vorlage-PDF Seite 1 (Vorderseite)
  //      b) Text-Overlay-PDF Seite N (Vorderseite-Text)
  //      c) Rückseiten-PDF Seite 1 (Rückseite, falls PDF)
  //      d) Oder: Rückseiten-PNG als Raster-Seite (falls PNG/JPG)
  
  // 4. Optional: PDF/X-4 Post-Processing (Ghostscript)
  
  // 5. Rückgabe: Pfad zum finalen PDF
}
```

#### HTML-Template für Text-Overlay (Vektor-Pipeline)

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: 105mm 148mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  .badge-page {
    width: 105mm;
    height: 148mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    /* KEIN background-image! */
  }
  .badge-page:last-child {
    page-break-after: auto;
  }
  .text-field {
    position: absolute;
    overflow: hidden;
    word-wrap: break-word;
    white-space: pre-wrap;
  }
</style>
</head>
<body>
<!-- Pro Teilnehmer: eine leere Seite mit Textfeldern -->
<div class="badge-page">
  <div class="text-field" style="left: 20mm; top: 15mm; ...">Max</div>
  <div class="text-field" style="left: 20mm; top: 22mm; ...">Mustermann</div>
  <div class="text-field" style="left: 20mm; top: 32mm; ...">Polizeiakademie</div>
</div>
<!-- Nächster Teilnehmer... -->
</body>
</html>
```

#### PyPDF2-Merging (Kern-Logik)

```js
const { PDFDocument } = require('pdf-lib'); // oder PyPDF2 via Python

async function mergeVectorBadges(bgPdfPath, textOverlayPdfPath, participants, options) {
  const { doubleSided, backSidePath, backSideIsVector } = options;
  
  // Lade Hintergrund-PDF
  const bgPdf = await PDFDocument.load(fs.readFileSync(bgPdfPath));
  const textPdf = await PDFDocument.load(fs.readFileSync(textOverlayPdfPath));
  
  const resultPdf = await PDFDocument.create();
  
  for (let i = 0; i < participants.length; i++) {
    // Vorderseite: Hintergrund + Text zusammenführen
    const [bgPage] = await resultPdf.copyPages(bgPdf, [0]); // Seite 1
    const [textPage] = await resultPdf.copyPages(textPdf, [i]);
    
    // Text-Overlay auf Hintergrund legen
    // pdf-lib: embed textPage as form XObject on bgPage
    // oder: PyPDF2 merge_page()
    
    resultPdf.addPage(mergedPage);
    
    // Rückseite (optional)
    if (doubleSided && backSidePath) {
      if (backSideIsVector) {
        const [backPage] = await resultPdf.copyPages(backsidePdf, [0]);
        resultPdf.addPage(backPage);
      } else {
        // Raster-Rückseite: als separate PDF-Seite einbetten
        // (wkhtmltoimage → PNG → PDF-Seite)
      }
    }
  }
  
  return Buffer.from(await resultPdf.save());
}
```

**Alternative: PyPDF2 (Python) statt pdf-lib (Node.js):**

```python
# merge_vector.py — wird via child_process.execSync aufgerufen
from PyPDF2 import PdfReader, PdfWriter, PdfMerger
import sys

bg_pdf = sys.argv[1]       # Hintergrund-PDF (Vektor)
text_pdf = sys.argv[2]     # Text-Overlay-PDF
output_pdf = sys.argv[3]   # Ausgabe-PDF
num_participants = int(sys.argv[4])

bg_reader = PdfReader(bg_pdf)
text_reader = PdfReader(text_pdf)
writer = PdfWriter()

for i in range(num_participants):
    # Hintergrund-Seite (Seite 0 = Vorlage)
    bg_page = bg_reader.pages[0]
    # Text-Overlay-Seite (Seite i = i-ter Teilnehmer)
    text_page = text_reader.pages[i]
    
    # Merge: Text auf Hintergrund
    bg_page.merge_page(text_page)
    writer.add_page(bg_page)

with open(output_pdf, 'wb') as f:
    writer.write(f)
```

**Entscheidung: pdf-lib (Node.js) vs. PyPDF2 (Python)**

| Kriterium | pdf-lib | PyPDF2 |
|-----------|---------|--------|
| Sprache | Node.js (kein externer Call) | Python (execSync) |
| Merge-Funktion | `embedPages` + `drawPage` | `merge_page()` (einfacher) |
| Wartung | Aktiv | Aktiv |
| Größe | ~2MB | ~1MB |
| Komplexität | Mittel (XObject-Embedding) | Niedrig (eine Zeile) |

**Empfehlung: PyPDF2** — `merge_page()` ist eine einzige Zeile, keine XObject-Kunststücke nötig. Python-Script wird via `execSync` aufgerufen wie bereits `weasyprint` und `pdftoppm`.

### 3.3 `src/server.js`

**Änderung:** Upload-Endpoint gibt Metadaten-Typ zurück.

```js
// POST /api/namebadge/upload-background
// NEU: Antwort enthält 'type' Feld
{
  success: true,
  backgroundUrl: "/uploads/namebadge/bg_123456.png",  // nur bei Raster
  backgroundPdfUrl: "/uploads/namebadge/bg_123456.pdf", // NEU: nur bei Vektor
  type: "vector" | "raster",  // ← NEU
  width: 1240,                // Referenz-Pixel (300 DPI)
  height: 1748,
  widthMm: 105,               // ← NEU: exakte mm-Maße
  heightMm: 148,
  pages: 1,
  bleedRemoved: false,
  bleedSize: 0
}
```

**Änderung:** Render-Endpoint akzeptiert neuen `backgroundInfo`-Parameter.

```js
// POST /api/namebadge/render
// NEU: backgroundInfo wird mitgeschickt
{
  backgroundUrl: "/uploads/namebadge/bg_123456.pdf",  // PDF-Pfad bei Vektor
  backgroundInfo: {
    type: "vector",
    pdfPath: "/uploads/namebadge/bg_123456.pdf",
    widthMm: 105,
    heightMm: 148
  },
  participants: [...],
  fields: {...},
  badgeSize: { width: 105, height: 148 }
}
```

### 3.4 Frontend: `BackgroundSelector.jsx`

**Änderung:** Zeigt an ob Vektor- oder Raster-Pipeline genutzt wird.

- Nach Upload: Badge "✨ Vektorqualität" oder "📷 Raster (300 DPI)"
- Kein funktionaler Unterschied im UI, nur Info für den User
- Upload-URL: Bei Vektor-PDF wird die `.pdf`-URL gespeichert (nicht `.png`)

### 3.5 Frontend: `useNameBadgeStore.js`

**Änderung:** Neues Feld `backgroundInfo` im State.

```js
{
  // ... bestehender State ...
  backgroundInfo: {
    type: 'vector' | 'raster',
    pdfPath: String | null,    // nur bei Vektor
    widthMm: Number,
    heightMm: Number,
  } | null,
}
```

---

## 4. Neue Dependencies

### Node.js

| Paket | Zweck | Größe |
|-------|-------|-------|
| `pdf-lib` | PDF-Merging (Vektor-Overlay) | ~2MB |

**ODER** (Python-basiert):

| Paket | Zweck | Größe |
|-------|-------|-------|
| `PyPDF2` (pip) | PDF-Merging (Vektor-Overlay) | ~1MB |

**Empfehlung: `pdf-lib`** — bleibt im Node.js-Ökosystem, kein Python-Dependency. Aber: `merge_page()`-Äquivalent ist komplexer (XObject-Embedding).

**Alternative: `qpdf` (CLI)** — `qpdf --overlay` kann zwei PDFs auf Seitenebene mergen. Bereits auf vielen Systemen vorhanden oder leicht installierbar.

```bash
# qpdf Overlay-Merging
qpdf --overlay text_overlay.pdf -- input.pdf output.pdf
```

**Beste Option: qpdf (CLI)** — einfachster Befehl, kein npm/pip nötig, robust.

---

## 5. Detaillierte Implementierung

### 5.1 `background-extractor.js` — Neue Funktion

```js
/**
 * Extract PDF metadata WITHOUT rasterizing (for vector pipeline)
 * @param {string} pdfPath - Path to uploaded PDF
 * @param {object} options - { hasBleed, bleedSize }
 * @returns {Promise<{type: 'vector', pdfPath: string, widthMm: number, heightMm: number, pages: number}>}
 */
async function extractPdfVector(pdfPath, options = {}) {
  const { hasBleed = false, bleedSize = 0 } = options;
  
  // 1. Metadaten via pdfinfo
  let widthMm, heightMm, pages;
  try {
    const info = execSync(`pdfinfo "${pdfPath}"`, { encoding: 'utf8' });
    const pageMatch = info.match(/Pages:\s*(\d+)/);
    const sizeMatch = info.match(/Page size:\s*([\d.]+)\s*x\s*([\d.]+)\s*pts/);
    
    pages = pageMatch ? parseInt(pageMatch[1]) : 1;
    if (sizeMatch) {
      // Points → mm (1 pt = 0.3528 mm)
      widthMm = parseFloat(sizeMatch[1]) * 0.3528;
      heightMm = parseFloat(sizeMatch[2]) * 0.3528;
    } else {
      // Fallback: A6
      widthMm = 105;
      heightMm = 148;
    }
  } catch (err) {
    throw new Error(`PDF-Metadaten konnten nicht gelesen werden: ${err.message}`);
  }
  
  // 2. Beschnittzugabe: PDF beschneiden (NICHT rasterisieren)
  let finalPdfPath = pdfPath;
  if (hasBleed && bleedSize > 0) {
    finalPdfPath = await cropPdfBleed(pdfPath, bleedSize, widthMm, heightMm);
  }
  
  // 3. Referenz-Pixel für Frontend (300 DPI)
  const widthPx = Math.round(widthMm * (300 / 25.4));
  const heightPx = Math.round(heightMm * (300 / 25.4));
  
  return {
    type: 'vector',
    pdfPath: finalPdfPath,
    width: widthPx,
    height: heightPx,
    widthMm,
    heightMm,
    pages,
  };
}

/**
 * Crop bleed from PDF without rasterizing
 * Uses qpdf or pdftocairo to trim page boxes
 */
async function cropPdfBleed(pdfPath, bleedMm, pageWidthMm, pageHeightMm) {
  const timestamp = Date.now();
  const outputPath = path.join(NAMEBADGE_UPLOAD_DIR, `bg_cropped_${timestamp}.pdf`);
  
  // Methode 1: qpdf --trim-box
  // Setzt die TrimBox auf die gewünschte Größe (ohne Beschnittzugabe)
  const bleedPt = bleedMm / 0.3528; // mm → points
  const newWidthPt = (pageWidthMm / 0.3528) - (bleedPt * 2);
  const newHeightPt = (pageHeightMm / 0.3528) - (bleedPt * 2);
  
  execSync(
    `qpdf --trim-box="${bleedPt}:${bleedPt}:${newWidthPt}:${newHeightPt}" "${pdfPath}" "${outputPath}"`,
    { stdio: 'pipe' }
  );
  
  return outputPath;
}
```

### 5.2 `badge-renderer.js` — Vektor-Rendering

```js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Render badges using vector pipeline (PDF background stays vector)
 */
async function renderBadgesVector(config) {
  const {
    backgroundPdfPath,
    doubleSided = false,
    backSidePath = null,
    backSideIsVector = false,
    participants,
    fields,
    badgeSize = { width: 105, height: 148 },
  } = config;
  
  const timestamp = Date.now();
  const tmpDir = path.join(OUTPUT_DIR, `tmp_vector_${timestamp}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  
  try {
    // 1. Text-Overlay-HTML erstellen (OHNE Hintergrund)
    const html = buildTextOverlayHtml({
      participants,
      fields,
      badgeSize,
    });
    
    // 2. WeasyPrint → Text-Overlay-PDF (transparent, nur Text)
    const textOverlayPdf = path.join(tmpDir, 'text_overlay.pdf');
    const tmpHtml = path.join(tmpDir, 'overlay.html');
    fs.writeFileSync(tmpHtml, html, 'utf8');
    
    execSync(
      `weasyprint "${tmpHtml}" "${textOverlayPdf}"`,
      { stdio: 'pipe', timeout: 120000 }
    );
    
    // 3. PDFs zusammenführen (Vektor-Hintergrund + Vektor-Text)
    const outputFile = path.join(OUTPUT_DIR, `namensschilder_${timestamp}.pdf`);
    
    if (doubleSided && backSidePath) {
      await mergeDoubleSided({
        bgPdfPath: backgroundPdfPath,
        textPdfPath: textOverlayPdf,
        backSidePath,
        backSideIsVector,
        participants,
        badgeSize,
        outputFile,
      });
    } else {
      await mergeSingleSided({
        bgPdfPath: backgroundPdfPath,
        textPdfPath: textOverlayPdf,
        numPages: participants.length,
        outputFile,
      });
    }
    
    // 4. Optional: PDF/X-4 Post-Processing
    // (gleiche Ghostscript-Pipeline wie bei Flyern)
    
    return outputFile;
  } finally {
    // Cleanup temp dir
    try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
  }
}

/**
 * Build HTML for text-only overlay (no background)
 */
function buildTextOverlayHtml({ participants, fields, badgeSize }) {
  const pages = participants.map(participant => {
    const fieldHtml = Object.entries(fields).map(([fieldId, config]) => {
      const text = escapeHtml(participant[fieldId] || '');
      if (!text) return '';
      
      const {
        x = 0, y = 0, width = 60,
        fontSize = 14, fontFamily = 'Arial',
        fontWeight = 'normal', fontStyle = 'normal',
        color = '#000000', align = 'left',
        lineHeight = 1.2, letterSpacing = 0,
      } = config;
      
      return `<div class="text-field" style="
        left: ${x}mm;
        top: ${y}mm;
        width: ${width}mm;
        font-size: ${fontSize}pt;
        font-family: '${fontFamily}', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans', Arial, Helvetica, sans-serif;
        font-weight: ${fontWeight};
        font-style: ${fontStyle};
        color: ${color};
        text-align: ${align};
        line-height: ${lineHeight};
        letter-spacing: ${letterSpacing}pt;
      ">${text}</div>`;
    }).filter(Boolean).join('\n    ');
    
    return `<div class="badge-page">\n    ${fieldHtml}\n  </div>`;
  }).join('\n');
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${badgeSize.width}mm ${badgeSize.height}mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  .badge-page {
    width: ${badgeSize.width}mm;
    height: ${badgeSize.height}mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
  }
  .badge-page:last-child {
    page-break-after: auto;
  }
  .text-field {
    position: absolute;
    overflow: hidden;
    word-wrap: break-word;
    white-space: pre-wrap;
  }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

/**
 * Merge: background PDF + text overlay PDF (single-sided)
 */
async function mergeSingleSided({ bgPdfPath, textPdfPath, numPages, outputFile }) {
  // qpdf --overlay: legt textPdf über bgPdf
  // Problem: bgPdf hat nur 1 Seite, textPdf hat N Seiten
  // Lösung: bgPdf N-mal duplizieren, dann mergen
  
  const tmpDir = path.dirname(outputFile);
  
  // Erstelle ein Hintergrund-PDF mit N identischen Seiten
  const bgMultiPath = path.join(tmpDir, 'bg_multi.pdf');
  const bgPages = [];
  for (let i = 0; i < numPages; i++) {
    bgPages.push(bgPdfPath);
  }
  
  // qpdf: mehrere Kopien der Seite 1 zu einem Multi-Page-PDF
  // qpdf --pages input.pdf 1 -- input.pdf output.pdf (1 Seite)
  // Für N Seiten: qpdf --pages input.pdf 1-1 -- ... 
  // Einfacher: pdfunite (poppler-utils) oder PyPDF2
  
  // Verwende Python/PyPDF2 für den Merge (einfachste Lösung)
  const mergeScript = path.join(__dirname, 'merge_vector.py');
  execSync(
    `python3 "${mergeScript}" "${bgPdfPath}" "${textPdfPath}" "${outputFile}" "${numPages}"`,
    { stdio: 'pipe', timeout: 60000 }
  );
}

/**
 * Merge: double-sided badges (vector)
 */
async function mergeDoubleSided({ bgPdfPath, textPdfPath, backSidePath, backSideIsVector, participants, badgeSize, outputFile }) {
  const mergeScript = path.join(__dirname, 'merge_vector_double.py');
  execSync(
    `python3 "${mergeScript}" "${bgPdfPath}" "${textPdfPath}" "${backSidePath}" "${backSideIsVector}" "${outputFile}" "${participants.length}"`,
    { stdio: 'pipe', timeout: 60000 }
  );
}
```

### 5.3 `merge_vector.py` — Python Merge Script (Single-Sided)

```python
#!/usr/bin/env python3
"""Merge vector PDF background with text overlay PDF (single-sided)."""
import sys
from PyPDF2 import PdfReader, PdfWriter

bg_pdf_path = sys.argv[1]
text_pdf_path = sys.argv[2]
output_pdf_path = sys.argv[3]
num_participants = int(sys.argv[4])

bg_reader = PdfReader(bg_pdf_path)
text_reader = PdfReader(text_pdf_path)
writer = PdfWriter()

bg_page = bg_reader.pages[0]  # Vorlage: Seite 1

for i in range(num_participants):
    # Hintergrund-Seite kopieren
    merged = writer.add_blank_page(
        width=bg_page.mediabox.width,
        height=bg_page.mediabox.height
    )
    merged.merge_page(bg_page)
    
    # Text-Overlay-Seite drüberlegen
    if i < len(text_reader.pages):
        text_page = text_reader.pages[i]
        merged.merge_page(text_page)

with open(output_pdf_path, 'wb') as f:
    writer.write(f)
```

### 5.4 `merge_vector_double.py` — Python Merge Script (Double-Sided)

```python
#!/usr/bin/env python3
"""Merge vector PDFs for double-sided badges."""
import sys
from PyPDF2 import PdfReader, PdfWriter

bg_pdf_path = sys.argv[1]
text_pdf_path = sys.argv[2]
back_pdf_path = sys.argv[3]
back_is_vector = sys.argv[4].lower() == 'true'
output_pdf_path = sys.argv[5]
num_participants = int(sys.argv[6])

bg_reader = PdfReader(bg_pdf_path)
text_reader = PdfReader(text_pdf_path)
back_reader = PdfReader(back_pdf_path) if back_pdf_path != 'null' else None
writer = PdfWriter()

bg_page = bg_reader.pages[0]
back_page = back_reader.pages[0] if back_reader else None

for i in range(num_participants):
    # Vorderseite: Hintergrund + Text
    front = writer.add_blank_page(
        width=bg_page.mediabox.width,
        height=bg_page.mediabox.height
    )
    front.merge_page(bg_page)
    if i < len(text_reader.pages):
        front.merge_page(text_reader.pages[i])
    
    # Rückseite (optional)
    if back_page:
        back = writer.add_blank_page(
            width=back_page.mediabox.width,
            height=back_page.mediabox.height
        )
        back.merge_page(back_page)

with open(output_pdf_path, 'wb') as f:
    writer.write(f)
```

---

## 6. Bleed-Handling bei Vektor-PDFs

### Problem
Beschnittzugabe muss auch bei Vektor-PDFs funktionieren — aber OHNE Rasterisierung.

### Lösung: `qpdf --trim-box`

```bash
# Setzt die TrimBox (definiert den sichtbaren Bereich)
qpdf --trim-box="left:top:right:bottom" input.pdf output.pdf
```

- `qpdf` ändert nur die CropBox/TrimBox-Metadaten
- Alle Vektor-Inhalte bleiben erhalten
- Viewer/Drucker schneidet automatisch auf die TrimBox

### Fallback: `pdftocairo` (wenn qpdf nicht installiert)

```bash
# pdftocairo kann PDFs beschneiden (aber: rendert zu PDF → Ghostscript)
pdftocairo -pdf -x 0 -y 0 -W 595 -H 842 input.pdf output.pdf
```

### Implementierung

```js
async function cropPdfBleed(pdfPath, bleedMm, pageWidthMm, pageHeightMm) {
  const timestamp = Date.now();
  const outputPath = path.join(NAMEBADGE_UPLOAD_DIR, `bg_cropped_${timestamp}.pdf`);
  
  // mm → points (1 mm = 2.835 pt)
  const bleedPt = bleedMm * 2.835;
  const newWidthPt = (pageWidthMm * 2.835) - (bleedPt * 2);
  const newHeightPt = (pageHeightMm * 2.835) - (bleedPt * 2);
  
  // qpdf: TrimBox setzen (links, unten, rechts, oben)
  execSync(
    `qpdf --trim-box="${bleedPt}:${bleedPt}:${newWidthPt + bleedPt}:${newHeightPt + bleedPt}" "${pdfPath}" "${outputPath}"`,
    { stdio: 'pipe' }
  );
  
  return outputPath;
}
```

---

## 7. Rückseiten-Handling

### Szenarien

| Vorderseite | Rückseite | Pipeline |
|-------------|-----------|----------|
| PDF (Vektor) | PDF (Vektor) | Beide Vektor → PyPDF2 merge |
| PDF (Vektor) | PNG/JPG | Vektor + Raster → PyPDF2 (PNG als eingebettetes Bild) |
| PNG/JPG | PNG/JPG | Beide Raster → bestehende Pipeline |
| PNG/JPG | PDF (Vektor) | Raster + Vektor → gemischt (Vorderseite Raster, Rückseite Vektor) |

### Implementierung

Für gemischte Szenarien: Rückseite wird als separate PDF-Seite erzeugt (WeasyPrint mit `background-image` für PNG, oder `pdf-lib` zum Einbetten).

---

## 8. Frontend-Anpassungen

### 8.1 `BackgroundSelector.jsx`

```jsx
// Nach Upload: Zeige Pipeline-Typ
{backgroundInfo?.type === 'vector' && (
  <span className="text-emerald-400 text-sm">
    ✨ Vektorqualität — scharf bei jeder Vergrößerung
  </span>
)}
{backgroundInfo?.type === 'raster' && (
  <span className="text-amber-400 text-sm">
    📷 Rastergrafik (300 DPI)
  </span>
)}
```

### 8.2 `useNameBadgeStore.js`

```js
// Neues Feld im State
backgroundInfo: null, // { type, pdfPath, widthMm, heightMm }

// setBackground Action erweitern
setBackground: (source, url, info) => set({
  backgroundSource: source,
  selectedBackground: url,
  backgroundInfo: info, // ← NEU
}),
```

### 8.3 API-Client (`client.js`)

```js
// Upload-Response enthält jetzt 'type' und 'backgroundPdfUrl'
// Render-Request sendet 'backgroundInfo' mit
```

---

## 9. System-Dependencies

### Bereits installiert
- `weasyprint` 68.1
- `pdftoppm` (poppler-utils)
- `ghostscript` 10.02.1

### Neu zu installieren

| Tool | Zweck | Install |
|------|-------|---------|
| `PyPDF2` (pip) | PDF-Merging (Vektor-Overlay) | `pip install PyPDF2` |
| `qpdf` (optional) | Bleed-Crop via TrimBox | `apt install qpdf` |

**Alternative zu PyPDF2:** `pdf-lib` (npm) — bleibt im Node.js-Ökosystem, aber Merge-Logik ist komplexer.

---

## 10. Test-Strategie

### Unit Tests

1. **`extractPdfVector()`** — Metadaten-Extraktion korrekt (Breite/Höhe in mm)
2. **`cropPdfBleed()`** — TrimBox korrekt gesetzt, Vektor-Inhalt erhalten
3. **`buildTextOverlayHtml()`** — HTML-Struktur korrekt, keine Hintergrund-Bilder
4. **`mergeSingleSided()`** — N Seiten im Output, Text auf Hintergrund
5. **`mergeDoubleSided()`** — 2N Seiten im Output, korrekte Reihenfolge

### Integration Tests

1. **Vektor-PDF-Upload** → Metadaten korrekt, kein PNG erzeugt
2. **Vektor-Rendering** → Output-PDF enthält Vektor-Logos (kein Pixelbild)
3. **Raster-PNG-Upload** → bestehende Pipeline funktioniert unverändert
4. **Beidseitig (Vektor)** → korrekte Seitenreihenfolge
5. **Bleed-Crop (Vektor)** → TrimBox korrekt, keine Rasterisierung

### Qualitätstests

1. **Zoom-Test:** Vektor-Logos bleiben scharf bei 500% Zoom
2. **Dateigröße:** Vektor-PDF kleiner als Raster-PDF (bei gleicher Vorlage)
3. **Drucktest:** Ausdruck auf Drucker hat keine sichtbaren Pixelränder

---

## 11. Migrations-Pfad

### Abwärtskompatibilität

- Bestehende Raster-Pipeline bleibt 1:1 erhalten
- `extractBackground()` wird nicht geändert, nur erweitert
- Frontend zeigt Pipeline-Typ an, aber User muss nichts tun
- Alte Uploads (PNG) funktionieren weiter

### Feature-Flag (optional)

```js
// server.js
const ENABLE_VECTOR_PIPELINE = true; // Feature-Flag

// Im Upload-Endpoint:
if (ext === '.pdf' && ENABLE_VECTOR_PIPELINE) {
  result = await extractPdfVector(filePath, options);
} else {
  result = await extractBackground(filePath, options); // Raster
}
```

---

## 12. Risiken & Mitigation

| Risiko | Impact | Mitigation |
|--------|--------|------------|
| PyPDF2-Merge zerbricht komplexe PDFs | Hoch | Fallback auf Raster-Pipeline bei Fehler |
| qpdf nicht installiert | Mittel | `pdftocairo` als Fallback, oder Bleed-Crop via PyPDF2 |
| WeasyPrint rendert Fonts anders als Vorlage | Niedrig | Gleiche Font-Config wie bestehende Pipeline |
| Gemischte Szenarien (PDF+PNG Rückseite) | Mittel | PyPDF2 kann PNGs als XObject einbetten |
| Große PDFs (>50MB) bei vielen Teilnehmern | Niedrig | PyPDF2 streamed, kein Problem |

---

## 13. Offene Fragen

| # | Frage | Optionen |
|---|-------|----------|
| 1 | Merge-Library | **PyPDF2 (Python)** vs. pdf-lib (Node.js) vs. qpdf (CLI) |
| 2 | Bleed-Crop | **qpdf --trim-box** vs. PyPDF2 page.cropBox vs. pdftocairo |
| 3 | Feature-Flag? | Ja (sicher) vs. Nein (direkt aktiv) |
| 4 | PDF/X-4 auch für Namensschilder? | Optional (Ghostscript-Pipeline ist schon da) |

---

## 14. Geschätzter Aufwand

| Phase | Aufwand |
|-------|---------|
| `background-extractor.js` erweitern | ~1h |
| `badge-renderer.js` Vektor-Pipeline | ~2h |
| Python Merge-Skripte | ~1h |
| `server.js` API-Anpassungen | ~0.5h |
| Frontend (Info-Badge, Store) | ~0.5h |
| Tests | ~1h |
| **Gesamt** | **~6h** |
