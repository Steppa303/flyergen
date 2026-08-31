# Namensschild-Generator — Planung

**Datum:** 2026-08-31
**Status:** Planung
**Feature:** Automatisierte Erstellung von Lanyard-Einlegern (Namensschilder)

---

## 1. Übersicht

Neue Funktion in FlyerGen zur automatisierten Erstellung von Namensschildern in Form von Lanyard-Einlegern. Der User wählt einen Hintergrund (aus Vorlagen-Bibliothek oder per PDF-Upload), lädt eine CSV mit Teilnehmerdaten hoch, definiert Platzierung & Formatierung per Drag & Drop, und erhält ein einzelnes PDF mit allen Namensschildern.

### Workflow
```
Hintergrund wählen/hochladen (Vorderseite)
        ↓
Optional: Rückseiten-Grafik hochladen
        ↓
Optional: Beschnittzugabe angeben
        ↓
CSV hochladen (Vorname, Nachname, Behörde)
        ↓
Platzierung & Formatierung per Drag & Drop (Live-Vorschau)
        ↓
Generierung → Ein PDF mit allen Namensschildern
```

---

## 2. Datenmodell

### 2.1 CSV-Format

```csv
Vorname,Nachname,Behörde
Max,Mustermann,Polizeiakademie Niedersachsen
Erika,Musterfrau,Polizeidirektion Hannover
```

- **Encoding:** UTF-8 (mit BOM-Support für Excel-Exporte)
- **Trennzeichen:** Komma `,` oder Semikolon `;` (Auto-Erkennung)
- **Pflichtspalten:** Vorname, Nachname, Behörde
- **Max. Zeilen:** 500 (sinnvolles Limit für Performance)

### 2.2 Hintergrund-Quellen

| Quelle | Beschreibung |
|--------|-------------|
| Standard-Vorlagen | Bibliothek mit vorgefertigten Lanyard-Layouts (initial leer, später befüllbar). Formate: PDF, PNG, JPG |
| PDF-Upload | User lädt eigenes PDF hoch, erste Seite wird als Hintergrund-Bild extrahiert |
| Bild-Upload | User lädt PNG oder JPG direkt als Hintergrund hoch |

### 2.2b Beschnittzugabe

Beim PDF-Upload kann der User angeben, ob das PDF eine Beschnittzugabe enthält:

```js
{
  hasBleed: Boolean,    // Beschnittzugabe vorhanden?
  bleedSize: Number     // Größe der Zugabe in mm (z.B. 2, 3, 5)
}
```

Wenn `hasBleed: true`, wird die Beschnittzugabe beim Extrahieren automatisch abgeschnitten (Crop). Die physische Seitengröße reduziert sich entsprechend.

### 2.2c Rückseite (Optional)

Beidseitiger Druck ist optional:

```js
{
  doubleSided: Boolean,           // Beidseitig?
  backSideUrl: String | null      // URL zur Rückseiten-Grafik (PDF/PNG/JPG)
}
```

- Rückseite wird als separate Grafik hochgeladen (kein Text-Overlay)
- Rückseiten-Grafik wird 1:1 auf die Rückseite jedes Schildes gesetzt
- Keine automatische Text-Einssetzung auf der Rückseite

### 2.3 Textfeld-Konfiguration

Pro Textfeld (Vorname, Nachname, Behörde):

```js
{
  x: Number,           // X-Position in mm (vom linken Rand)
  y: Number,           // Y-Position in mm (vom oberen Rand)
  width: Number,       // Maximale Breite in mm
  fontSize: Number,    // Schriftgröße in pt
  fontFamily: String,  // Schriftart (z.B. 'Arial', 'Helvetica')
  fontWeight: String,  // 'normal' | 'bold'
  fontStyle: String,   // 'normal' | 'italic'
  color: String,       // Hex-Farbe (z.B. '#000000')
  align: String,       // 'left' | 'center' | 'right'
  lineHeight: Number,  // Zeilenhöhe (Faktor, z.B. 1.2)
  letterSpacing: Number // Buchstabenabstand in pt
}
```

---

## 3. Architektur

### 3.1 Frontend (React)

#### Neue Komponenten

```
frontend/src/
├── pages/
│   └── NameBadgePage.jsx          # Hauptseite für Namensschild-Generator
├── components/
│   ├── NameBadge/
│   │   ├── BackgroundSelector.jsx  # Hintergrund + Beschnitt + Rückseite
│   │   ├── CsvUpload.jsx           # CSV-Upload mit Vorschau
│   │   ├── BadgeCanvas.jsx         # Interaktiver Canvas für Platzierung
│   │   ├── TextFieldConfig.jsx     # Konfiguration für einzelnes Textfeld
│   │   ├── BadgePreview.jsx        # Live-Vorschau eines einzelnen Schilds
│   │   └── ParticipantTable.jsx    # Tabelle der hochgeladenen Teilnehmer
│   └── common/
│       └── DragHandle.jsx          # Wiederverwendbarer Drag-Handle
```

#### Routing

Neue Route in `App.jsx`:
```jsx
<Route path="/namensschild" element={<NameBadgePage />} />
```

Navigation: Link auf der HomePage neben den bestehenden Templates.

### 3.2 Backend (Express)

#### Neue API-Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/namebadge/backgrounds` | GET | Liste der verfügbaren Hintergrund-Vorlagen |
| `/api/namebadge/upload-background` | POST | PDF/PNG/JPG hochladen → Hintergrund-Bild (mit optionaler Beschnittzugabe) |
| `/api/namebadge/upload-backside` | POST | Rückseiten-Grafik hochladen (PDF/PNG/JPG) |
| `/api/namebadge/upload-csv` | POST | CSV hochladen → geparste Teilnehmer-Liste zurück |
| `/api/namebadge/render` | POST | Alle Namensschilder rendern → PDF zurück |
| `/api/namebadge/preview` | POST | Einzelnes Schild als PNG-Vorschau rendern |

#### Neue Module

```
src/
├── namebadge/
│   ├── csv-parser.js       # CSV-Parsing (Auto-Erkennung Trennzeichen, UTF-8 BOM)
│   ├── background-extractor.js # PDF/PNG/JPG → Hintergrund-Bild (mit Beschnitt-Crop)
│   ├── badge-renderer.js   # Namensschild-Rendering (WeasyPrint, einseitig + beidseitig)
│   └── templates/          # Hintergrund-Vorlagen (PDF, PNG, JPG)
│       └── .gitkeep
```

---

## 4. Detailplanung der Komponenten

### 4.1 BackgroundSelector.jsx

**Aufgabe:** Auswahl des Hintergrunds für die Namensschilder.

**Funktionen:**
- Tab-Wechsel: "Vorlagen" | "Eigene Datei"
- Vorlagen-Tab: Kacheln mit Thumbnails der verfügbaren Hintergründe
- Upload-Tab: Drag & Drop oder Klick zum PDF/PNG/JPG-Upload
- Nach Upload: Extrahierte erste Seite als Vorschau anzeigen
- **Beschnittzugabe-Option:** Checkbox "Beschnittzugabe vorhanden" + Eingabefeld (mm)
- **Rückseite (optional):** Toggle "Beidseitig" → Upload-Feld für Rückseiten-Grafik (PDF/PNG/JPG)
- Auswahl wird im State gespeichert (URL zum Hintergrund-Bild)

**State:**
```js
{
  backgroundSource: 'template' | 'upload',
  selectedTemplate: String | null,  // Template-ID
  uploadedPdfUrl: String | null,    // URL zum extrahierten PNG
  backgroundUrl: String | null,     // Finale URL (entweder Template oder Upload)
  hasBleed: Boolean,                // Beschnittzugabe vorhanden?
  bleedSize: Number,                // Zugabe in mm
  doubleSided: Boolean,             // Beidseitig?
  backSideUrl: String | null        // URL zur Rückseiten-Grafik
}
```

### 4.2 CsvUpload.jsx

**Aufgabe:** CSV-Datei hochladen und Teilnehmer-Liste anzeigen.

**Funktionen:**
- Drag & Drop oder Klick zum CSV-Upload
- Auto-Erkennung des Trennzeichens (Komma vs. Semikolon)
- UTF-8 BOM-Handling
- Vorschau der ersten 5 Zeilen als Tabelle
- Fehlermeldungen bei ungültigem Format
- Anzahl der geladenen Teilnehmer anzeigen

**Validierung:**
- Mindestens eine Datenzeile (neben Header)
- Spaltenüberschriften müssen "Vorname", "Nachname", "Behörde" enthalten (case-insensitive)
- Keine leeren Zeilen
- Max. 500 Zeilen

### 4.3 BadgeCanvas.jsx (Kern-Komponente)

**Aufgabe:** Interaktiver Canvas zur Platzierung und Formatierung der Textfelder.

**Funktionen:**
- Hintergrund-Bild als Basis (im richtigen Seitenverhältnis des Lanyard-Einlegers)
- Drei Textfelder (Vorname, Nachname, Behörde) als verschiebbare Elemente
- Drag & Drop zum Verschieben der Textfelder
- Resize-Handles zum Ändern der Breite
- Klick auf Textfeld → Konfigurations-Panel rechts öffnen
- Beispieltext wird live gerendert (z.B. "Max Mustermann, Polizeiakademie")
- Zoom/Pan für präzise Platzierung
- Einrasten an Hilfslinien (Snap-to-Grid, optional)

**Technische Umsetzung:**
- DOM-basiert mit absoluter Positionierung
  - Container mit `position: relative` + Hintergrund-Bild
  - Feste Basis-Breite (z.B. 630px = 105mm bei ~150% Zoom)
  - Zoom-Buttons (+/-) oder Mausrad zum Skalieren
  - Pan per Maus-Drag (bei gezoomtem Canvas)
  - Textfelder als `position: absolute` Divs
  - Drag & Drop via `onMouseDown/Move/Up` oder Library (z.B. `react-draggable`)
  - Maus-Position wird in mm umgerechnet basierend auf Canvas-Größe
  - Mobile: Pinch-to-Zoom + Drag-to-Pan

**Koordinaten-System:**
- Hintergrund-Bild hat definierte physische Größe (A6: 105mm × 148mm)
- Pixel-Position auf dem Canvas → mm-Position auf dem Schild
- Umrechnung: `mm = (pixel / canvasPixel) * physischeGroesseMm`

**State:**
```js
{
  fields: {
    vorname: { x, y, width, fontSize, fontFamily, fontWeight, fontStyle, color, align, ... },
    nachname: { x, y, width, fontSize, fontFamily, fontWeight, fontStyle, color, align, ... },
    behoerde: { x, y, width, fontSize, fontFamily, fontWeight, fontStyle, color, align, ... }
  },
  activeField: 'vorname' | 'nachname' | 'behoerde' | null,
  zoom: Number,
  panX: Number,
  panY: Number
}
```

### 4.4 TextFieldConfig.jsx

**Aufgabe:** Konfigurations-Panel für ein einzelnes Textfeld.

**Funktionen:**
- Schriftgröße (Slider + Eingabefeld, 6–72pt)
- Schriftart (Dropdown: Arial, Helvetica, Times New Roman, etc.)
- Schriftstärke (Normal, Fett)
- Schriftstil (Normal, Kursiv)
- Farbe (Color-Picker)
- Ausrichtung (Links, Zentriert, Rechts)
- Zeilenhöhe (Slider, 0.8–2.0)
- Buchstabenabstand (Slider, -2 bis 10pt)
- Vorschau des aktuellen Textes mit den gewählten Einstellungen

### 4.5 ParticipantTable.jsx

**Aufgabe:** Übersicht der geladenen Teilnehmer.

**Funktionen:**
- Tabelle mit Vorname, Nachname, Behörde
- Sortierbar nach jeder Spalte
- Suchfeld zum Filtern
- Paginierung bei >50 Einträgen
- Anzeige der Gesamtanzahl
- "Alle auswählen / Auswahl aufheben" (für partielle Generierung)

### 4.6 BadgePreview.jsx

**Aufgabe:** Live-Vorschau eines einzelnen Namensschildes.

**Funktionen:**
- Zeigt das Schild mit dem Beispieltext und den aktuellen Formatierungs-Einstellungen
- Wird aktualisiert bei jeder Änderung (Debounce 300ms)
- Zeigt das Schild in Originalgröße (wenn möglich) oder skaliert

---

## 5. Backend-Implementierung

### 5.1 CSV-Parser (`csv-parser.js`)

```js
function parseCsv(buffer) {
  // 1. BOM entfernen (UTF-8: 0xEF 0xBB 0xBF)
  // 2. Trennzeichen erkennen: Komma vs. Semikolon
  //    → Zähle Vorkommen in der ersten Zeile
  // 3. Header-Zeile parsen → Spalten-Mapping
  //    → Case-insensitive Match: "Vorname", "Nachname", "Behörde"
  //    → Auch: "Vorname", "Nachname", "Behörde" (Umlaute)
  // 4. Datenzeilen parsen
  // 5. Input-Sanitizing: Null-Bytes, Control-Chars entfernen
  // 6. Validierung: keine leeren Zeilen, max 500
  // 7. Rückgabe: Array von { vorname, nachname, behoerde }
}
```

### 5.2 Hintergrund-Extraktor (`background-extractor.js`)

```js
async function extractBackground(filePath, options) {
  // options: { hasBleed: Boolean, bleedSize: Number }
  //
  // Bei PDF:
  //   → pdftoppm -png -r 300 -f 1 -l 1 input.pdf output
  //   → Wenn hasBleed: Crop um bleedSize*2 verkleinern (je Seite)
  //
  // Bei PNG/JPG:
  //   → Direkt verwenden, ggf. mit Sharp auf Zielgröße skalieren
  //   → Wenn hasBleed: Crop via Sharp
  //
  // Rückgabe: Pfad zum Hintergrund-Bild (PNG)
}
```

### 5.3 Badge-Renderer (`badge-renderer.js`)

```js
async function renderBadges(config) {
  // config: {
  //   backgroundUrl: String,     // Pfad/URL zum Hintergrund (Vorderseite)
  //   doubleSided: Boolean,      // Beidseitig?
  //   backSideUrl: String|null,  // Pfad/URL zur Rückseiten-Grafik
  //   participants: Array,       // [{ vorname, nachname, behoerde }]
  //   fields: Object,            // Konfiguration pro Feld
  //   badgeSize: { width, height }, // Seitengröße in mm (A6: 105×148)
  //   outputFormat: 'pdf'        // Immer PDF
  // }
  //
  // 1. HTML-Template erstellen (Handlebars)
  //    - Pro Teilnehmer eine Seite (Vorderseite)
  //    - Wenn doubleSided: nach jeder Vorderseite eine Rückseiten-Seite
  //    - Hintergrund als CSS background-image
  //    - Textfelder absolut positioniert
  //    - Font-Settings aus fields-Konfiguration
  //
  // 2. WeasyPrint → Multi-Page PDF
  //    - @page { size: 105mm 148mm; margin: 0; }
  //    - Reihenfolge: V1, R1, V2, R2, V3, R3, ...
  //
  // 3. Optional: PDF/X-4 Post-Processing (Ghostscript)
  //
  // 4. Rückgabe: Pfad zum finalen PDF
}
```

**Rendering-Strategie:**

Alle Namensschilder werden in ein **einziges HTML-Dokument** gerendert, wobei jeder Teilnehmer eine eigene Seite bekommt. Bei beidseitigem Druck folgt nach jeder Vorderseite eine Rückseiten-Seite. WeasyPrint rendert das zu einem Multi-Page PDF.

```html
<!-- Pro Teilnehmer: Vorderseite -->
<div class="badge-page" style="page-break-after: always;">
  <div class="background" style="background-image: url(...)"></div>
  <div class="field vorname" style="left: 20mm; top: 15mm; font-size: 14pt; ...">
    Max
  </div>
  <div class="field nachname" style="left: 20mm; top: 22mm; font-size: 14pt; ...">
    Mustermann
  </div>
  <div class="field behoerde" style="left: 20mm; top: 32mm; font-size: 10pt; ...">
    Polizeiakademie Niedersachsen
  </div>
</div>

<!-- Bei beidseitig: Rückseite (nur Grafik, kein Text) -->
<div class="badge-page back-side" style="page-break-after: always;">
  <div class="background" style="background-image: url(rueckseite.png)"></div>
</div>
```

### 5.4 Hintergrund-Vorlagen

**Verzeichnis:** `src/namebadge/templates/`

**Struktur:**
```
templates/
├── index.json          # Metadaten aller Vorlagen
├── standard-01.png     # Standard-Lanyard-Hintergrund
├── standard-02.png
└── ...
```

**index.json Schema:**
```json
{
  "templates": [
    {
      "id": "standard-01",
      "name": "Standard Blau",
      "description": "Einfacher blauer Hintergrund mit Polizeiakademie-Logo",
      "file": "standard-01.pdf",
      "format": "pdf",
      "width": 105,
      "height": 148,
      "unit": "mm",
      "thumbnail": "standard-01_thumb.jpg"
    }
  ]
}
```

**Erlaubte Formate:** PDF, PNG, JPG

**Hinweis:** Vorlagen können als PDF, PNG oder JPG hochgeladen werden. PDFs werden automatisch zu PNG konvertiert (erste Seite).

**Initialer Zustand:** Leere Bibliothek (nur `.gitkeep`), wird später befüllt.

---

## 6. Lanyard-Einleger-Format

### Standard-Maße

| Eigenschaft | Wert |
|------------|------|
| Breite | 105 mm |
| Höhe | 148 mm |
| Orientierung | Portrait |
| Format | A6 |

### Beschnittzugabe

- Standard-Beschnittzugabe: 2mm (wenn vorhanden)
- User kann beim Upload die tatsächliche Zugabe angeben
- Crop-Berechnung: `endgroesse = hochgeladen - (2 × zugabe)`

### Druck-Empfehlungen

- **Auflösung:** 300 DPI (für Druck)
- **Farbraum:** CMYK (via Ghostscript PDF/X-4 Post-Processing)
- **Anschnitt:** Vom User angegeben (0-10mm)

---

## 7. User-Flow (Detail)

### Schritt 1: Hintergrund auswählen

1. User navigiert zu `/namensschild`
2. Sieht zwei Tabs: "Vorlagen" | "Eigene Datei"
3. **Vorlagen-Tab:** Kacheln mit Thumbnails, Klick zum Auswählen
4. **Upload-Tab:** Drag & Drop PDF/PNG/JPG → Server verarbeitet → Vorschau
5. **Beschnittzugabe:** Checkbox "Beschnittzugabe vorhanden" + Eingabefeld (mm)
6. **Rückseite (optional):** Toggle "Beidseitig" → Upload-Feld für Rückseiten-Grafik
7. Auswahl bestätigen → weiter zu Schritt 2

### Schritt 2: CSV hochladen

1. Drag & Drop oder Klick zum CSV-Upload
2. Server parsed CSV → gibt Teilnehmer-Liste zurück
3. Frontend zeigt Vorschau-Tabelle (erste 5 Zeilen) + Gesamtanzahl
4. Bei Fehlern: Klare Fehlermeldung mit Zeilennummer
5. Bestätigen → weiter zu Schritt 3

### Schritt 3: Platzierung & Formatierung

1. **BadgeCanvas** zeigt Hintergrund mit Beispieltext ("Max Mustermann Polizeiakademie")
2. Drei Textfelder sind als überlagernde Elemente sichtbar
3. User kann:
   - Felder per Drag & Drop verschieben
   - Felder per Resize-Handle in der Breite anpassen
   - Auf ein Feld klicken → rechts öffnet sich TextFieldConfig
   - Schriftart, Größe, Farbe, etc. ändern
4. Live-Vorschau aktualisiert sich sofort
5. Optional: Dropdown zum Wechseln des Beispiel-Teilnehmers
6. "Vorschau" Button → rendert ein einzelnes Schild als PNG
7. "Alle generieren" Button → weiter zu Schritt 4

### Schritt 4: Generierung & Download

1. Loading-Spinner mit Hinweis: "Namensschilder werden generiert..."
2. Server rendert alle Schilder in ein PDF
3. Download-Link wird angezeigt
4. Dateiname: `namensschilder_YYYY-MM-DD.pdf`

---

## 8. Technische Abhängigkeiten

### Bestehend (bereits installiert)

| Paket | Version | Zweck |
|-------|---------|-------|
| WeasyPrint | 68.1 | PDF-Rendering (Namensschilder) |
| wkhtmltoimage | 0.12.6 | PNG-Rendering (Preview) |
| Ghostscript | 10.02.1 | CMYK/PDF/X-4 Konvertierung |
| Handlebars | 4.7.x | Template-Engine |
| Express | 4.18.x | API-Server |
| Multer | 2.2.x | Datei-Upload |
| Sharp | 0.35.x | Bildverarbeitung + Beschnitt-Crop |

### Neu hinzuzufügen

| Paket | Zweck | Größe |
|-------|-------|-------|
| `papaparse` | CSV-Parsing (robust, Auto-Erkennung) | ~50KB |
| `poppler-utils` (System) | PDF → PNG Extraktion (pdftoppm) | System-Paket |

**Hinweise:**
- `poppler-utils` (pdftoppm) — bereits als WeasyPrint-Dependency vorhanden
- `sharp` (bereits installiert) — wird für PNG/JPG-Verarbeitung und Beschnitt-Crop verwendet

### Frontend

| Paket | Zweck | Größe |
|-------|-------|-------|
| `react-draggable` | Drag & Drop für Textfelder | ~15KB |
| `react-colorful` | Color-Picker | ~10KB |

---

## 9. State-Management (Zustand)

### Neuer Store: `useNameBadgeStore.js`

```js
{
  // Schritt-Management
  currentStep: 1 | 2 | 3 | 4,

  // Hintergrund
  backgroundSource: 'template' | 'upload',
  selectedBackground: String | null,  // URL oder Template-ID
  backgroundWidth: 105,               // mm (A6)
  backgroundHeight: 148,              // mm (A6)
  hasBleed: false,                    // Beschnittzugabe?
  bleedSize: 0,                       // Zugabe in mm
  doubleSided: false,                 // Beidseitig?
  backSideUrl: null,                  // Rückseiten-Grafik

  // CSV
  participants: [],                    // [{ vorname, nachname, behoerde }]
  csvFileName: String | null,
  csvError: String | null,

  // Textfeld-Konfiguration
  fields: {
    vorname: {
      x: 20, y: 15, width: 60,
      fontSize: 14, fontFamily: 'Arial',
      fontWeight: 'bold', fontStyle: 'normal',
      color: '#000000', align: 'left',
      lineHeight: 1.2, letterSpacing: 0
    },
    nachname: {
      x: 20, y: 22, width: 60,
      fontSize: 14, fontFamily: 'Arial',
      fontWeight: 'bold', fontStyle: 'normal',
      color: '#000000', align: 'left',
      lineHeight: 1.2, letterSpacing: 0
    },
    behoerde: {
      x: 20, y: 32, width: 60,
      fontSize: 10, fontFamily: 'Arial',
      fontWeight: 'normal', fontStyle: 'normal',
      color: '#333333', align: 'left',
      lineHeight: 1.2, letterSpacing: 0
    }
  },
  activeField: null,

  // UI
  zoom: 1,
  loading: false,
  error: null,
  previewUrl: String | null,
  downloadUrl: String | null,

  // Actions
  setBackground: (source, url) => void,
  setParticipants: (data) => void,
  updateField: (fieldId, config) => void,
  setActiveField: (fieldId) => void,
  nextStep: () => void,
  prevStep: () => void,
  reset: () => void
}
```

---

## 10. API-Spezifikation

### `GET /api/namebadge/backgrounds`

**Response:**
```json
{
  "templates": [
    {
      "id": "standard-01",
      "name": "Standard Blau",
      "thumbnail": "/api/namebadge/templates/standard-01_thumb.png",
      "url": "/api/namebadge/templates/standard-01.png",
      "width": 105,
      "height": 148
    }
  ]
}
```

### `POST /api/namebadge/upload-background`

**Request:** `multipart/form-data`
- `file` — PDF-, PNG- oder JPG-Datei
- `hasBleed` — `true`/`false` (Beschnittzugabe vorhanden?)
- `bleedSize` — Zahl in mm (z.B. `2`)

**Response:**
```json
{
  "success": true,
  "backgroundUrl": "/uploads/namebadge/bg_123456.png",
  "width": 105,
  "height": 148,
  "bleedRemoved": true,
  "bleedSize": 2,
  "pages": 1
}
```

**Fehler:**
```json
{ "error": "Datei enthält keine Seiten" }
{ "error": "Datei zu groß (max. 20MB)" }
{ "error": "Nicht erlaubter Dateityp. Erlaubt: PDF, PNG, JPG" }
```

### `POST /api/namebadge/upload-backside`

**Request:** `multipart/form-data`
- `file` — PDF-, PNG- oder JPG-Datei (Rückseiten-Grafik)

**Response:**
```json
{
  "success": true,
  "backSideUrl": "/uploads/namebadge/back_123456.png"
}
```

**Fehler:**
```json
{ "error": "Datei zu groß (max. 20MB)" }
{ "error": "Nicht erlaubter Dateityp. Erlaubt: PDF, PNG, JPG" }
```

### `POST /api/namebadge/upload-csv`

**Request:** `multipart/form-data` mit `csv` Feld

**Response:**
```json
{
  "success": true,
  "participants": [
    { "vorname": "Max", "nachname": "Mustermann", "behoerde": "Polizeiakademie Niedersachsen" },
    { "vorname": "Erika", "nachname": "Musterfrau", "behoerde": "Polizeidirektion Hannover" }
  ],
  "total": 2,
  "delimiter": ",",
  "encoding": "utf-8"
}
```

**Fehler:**
```json
{ "error": "CSV enthält keine Datenzeilen" }
{ "error": "Spaltenüberschriften nicht erkannt. Erwartet: Vorname, Nachname, Behörde" }
{ "error": "Maximale Zeilenanzahl (500) überschritten" }
```

### `POST /api/namebadge/render`

**Request:**
```json
{
  "backgroundUrl": "/uploads/namebadge/bg_123456.png",
  "doubleSided": false,
  "backSideUrl": null,
  "participants": [
    { "vorname": "Max", "nachname": "Mustermann", "behoerde": "Polizeiakademie" }
  ],
  "fields": {
    "vorname": { "x": 20, "y": 15, "width": 60, "fontSize": 14, "fontFamily": "Arial", "fontWeight": "bold", "color": "#000000", "align": "left" },
    "nachname": { "x": 20, "y": 22, "width": 60, "fontSize": 14, "fontFamily": "Arial", "fontWeight": "bold", "color": "#000000", "align": "left" },
    "behoerde": { "x": 20, "y": 32, "width": 60, "fontSize": 10, "fontFamily": "Arial", "fontWeight": "normal", "color": "#333333", "align": "left" }
  },
  "badgeSize": { "width": 105, "height": 148 }
}
```

**Bei beidseitig:**
- `doubleSided: true`
- `backSideUrl: "/uploads/namebadge/rueckseite.pdf"`
- Rückseite wird als eigene Seite nach jeder Vorderseite ins PDF eingefügt
- Reihenfolge: Vorderseite 1, Rückseite 1, Vorderseite 2, Rückseite 2, ...

**Response:** PDF-Download (Content-Type: application/pdf)

**Header:**
```
Content-Disposition: attachment; filename="namensschilder_2026-08-31.pdf"
```

### `POST /api/namebadge/preview`

**Request:** Gleiche Struktur wie `/render`, aber mit nur einem Teilnehmer.

**Rendering:** `wkhtmltoimage` (gleiche Pipeline wie FlyerGen-Renderer)

**Response:** PNG-Bild (Content-Type: image/png)

---

## 11. Sicherheit & Validierung

### Upload-Sicherheit

- **PDF-Upload:** Max. 20MB, nur `application/pdf`
- **Bild-Upload (Hintergrund):** Max. 20MB, `application/pdf`, `image/png`, `image/jpeg`
- **Bild-Upload (Rückseite):** Max. 20MB, `application/pdf`, `image/png`, `image/jpeg`
- **CSV-Upload:** Max. 5MB, nur `text/csv` oder `application/vnd.ms-excel`
- **Dateinamen:** Sanitized (keine Pfade, keine Sonderzeichen)
- **Temp-Dateien:** Werden nach Verarbeitung gelöscht

### CSV-Validierung

- Keine Code-Injection über CSV-Felder (HTML-Escaping im Renderer)
- Max. 500 Zeilen (Performance + Missbrauchsschutz)
- Encoding-Validierung (UTF-8, Latin-1 Fallback)

### API-Sicherheit

- Rate-Limiting: Max. 10 Render-Requests pro Minute
- Keine Auth (internes Tool, gleiche Infrastruktur wie FlyerGen)

---

## 12. UI/UX-Design

### Layout (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│  Namensschild-Generator                          [Reset]│
├─────────────────────────────────────────────────────────┤
│  [1. Hintergrund] → [2. CSV] → [3. Platzierung] → [4.] │
├────────────────────────────────┬────────────────────────┤
│                                │                        │
│   BadgeCanvas                  │  TextFieldConfig       │
│   (Hintergrund + Textfelder)   │  (Schrift, Farbe, etc.)│
│                                │                        │
│                                │  ─────────────────     │
│                                │  ParticipantTable      │
│                                │  (Teilnehmer-Liste)    │
│                                │                        │
├────────────────────────────────┴────────────────────────┤
│  [ Zurück ]              [ Vorschau ]  [ Alle generieren]│
└─────────────────────────────────────────────────────────┘
```

### Mobile

- BadgeCanvas: Vollbreite, Pinch-to-Zoom + Drag-to-Pan
- TextFieldConfig: Als Bottom-Sheet oder Modal
- ParticipantTable: Accordion oder separates Tab
- Vereinfachte Bedienung: Tap zum Auswählen, Slider für Position

### Farbkonzept

Bestehendes FlyerGen-Design übernehmen:
- Primärfarbe: Blau (Polizeiakademie)
- Akzent: Lime/Grün
- Hintergrund: Dunkelgrau (#1a1a2e)
- Cards: Glassmorphism

---

## 13. Implementierungs-Reihenfolge

### Phase 1: Backend-Grundlagen (Tag 1-2)

1. `csv-parser.js` implementieren + Tests
2. `background-extractor.js` implementieren (pdftoppm + sharp, mit Beschnitt-Crop)
3. API-Endpoints: `/upload-csv`, `/upload-background`, `/upload-backside`, `/backgrounds`
4. Hintergrund-Vorlagen-Struktur anlegen

### Phase 2: Frontend-Grundgerüst (Tag 2-3)

1. `NameBadgePage.jsx` mit Step-Wizard
2. `BackgroundSelector.jsx` (Tab-Wechsel, Upload, Beschnitt, Rückseite)
3. `CsvUpload.jsx` (Upload, Vorschau-Tabelle)
4. Zustand-Store `useNameBadgeStore.js`
5. Routing in `App.jsx`

### Phase 3: BadgeCanvas (Tag 3-5)

1. `BadgeCanvas.jsx` — Hintergrund-Rendering
2. Textfelder als DOM-Elemente mit absoluter Positionierung
3. Drag & Drop (react-draggable oder custom)
4. Resize-Handles für Textfeld-Breite
5. `TextFieldConfig.jsx` — Konfigurations-Panel
6. `BadgePreview.jsx` — Live-Vorschau

### Phase 4: Rendering-Pipeline (Tag 5-6)

1. `badge-renderer.js` — HTML-Template mit Handlebars (einseitig + beidseitig)
2. WeasyPrint-Integration für Multi-Page PDF
3. PDF/X-4 Post-Processing (optional)
4. API-Endpoints: `/render` + `/preview`

### Phase 5: Polish & Testing (Tag 6-7)

1. Error-Handling überall
2. Loading-Spinner mit Hinweistext
3. Mobile-Responsiveness (Pinch-to-Zoom, Drag-to-Pan)
4. Performance-Optimierung (bei vielen Teilnehmern)
5. Deployment (PM2 + Caddy)

---

## 14. Offene Fragen

~~Alle Fragen beantwortet (31.08.2026).~~

| # | Frage | Antwort |
|---|-------|--------|
| 1 | Seitengröße | **A6 (105×148mm)**, Portrait. Beim PDF-Upload kann Beschnittzugabe angegeben werden (mm) |
| 2 | Beidseitig? | **Optional.** Rückseiten-Grafik separat hochladbar, keine automatische Text-Einssetzung |
| 3 | Anschnitt | Siehe Antwort 1 — User gibt Zugabe beim Upload an |
| 4 | Schriften | **Gleiche Schriften wie FlyerGen** (aus den bestehenden Templates) |
| 5 | Batch-Limit | **500 Teilnehmer** als Maximum |
| 6 | Vorlagen-Format | **PDF, PNG und JPG** erlaubt |

---

## 15. Dateistruktur (Zusammenfassung)

```
flyergen/
├── src/
│   ├── server.js                    # Erweitert um NameBadge-Endpoints
│   ├── renderer.js                  # Bestehend (Flyer-Rendering)
│   └── namebadge/
│       ├── csv-parser.js            # CSV-Parsing
│       ├── background-extractor.js # PDF/PNG/JPG → Hintergrund (mit Crop)
│       ├── badge-renderer.js        # Namensschild-Rendering (einseitig + beidseitig)
│       └── templates/
│           ├── index.json           # Vorlagen-Metadaten
│           └── .gitkeep             # Initial leer
├── frontend/src/
│   ├── pages/
│   │   └── NameBadgePage.jsx        # Hauptseite
│   ├── components/
│   │   └── NameBadge/
│   │       ├── BackgroundSelector.jsx  # Hintergrund + Beschnitt + Rückseite
│   │       ├── CsvUpload.jsx
│   │       ├── BadgeCanvas.jsx
│   │       ├── TextFieldConfig.jsx
│   │       ├── BadgePreview.jsx
│   │       └── ParticipantTable.jsx
│   └── store/
│       └── useNameBadgeStore.js     # Zustand Store
├── uploads/
│   └── namebadge/                   # Temporäre Uploads
└── namen.md                         # Diese Datei
```

---

## 16. Metriken & Erfolgskriterien

| Kriterium | Ziel |
|-----------|------|
| Upload → Vorschau | < 3 Sekunden |
| 100 Schilder rendern | < 15 Sekunden |
| 500 Schilder rendern | < 60 Sekunden |
| PDF-Größe (100 Schilder) | < 10MB |
| Mobile nutzbar | Ja (Pinch-to-Zoom, Drag-to-Pan) |
| Browser-Support | Chrome, Firefox, Safari, Edge |

---

## 17. Technische Detail-Entscheidungen

### 17.1 Preview-Rendering

**Lösung:** `wkhtmltoimage` (bereits installiert, wie bei den Flyern).
- Einzelnes Badge als HTML generieren → `wkhtmltoimage` → PNG
- Gleiche Pipeline wie der bestehende Flyer-Renderer
- Keine zusätzlichen Dependencies nötig
- Robust und bewährt in der bestehenden Architektur

### 17.2 Font-Handling

**Lösung:** Gleicher Ansatz wie bei den regulären Flyern.
- Fonts werden über CSS `@font-face` mit lokalen Pfaden (`file://`) eingebunden
- Bestehende Font-Dateien aus `assets/` werden wiederverwendet
- WeasyPrint und wkhtmltoimage greifen beide auf die gleichen lokalen Fonts zu
- Keine System-Font-Installation nötig

### 17.3 Rendering-Fortschritt

**Lösung:** Kein echter Fortschrittsbalken. Loading-Spinner mit Hinweistext.
- Frontend zeigt Spinner: "Namensschilder werden generiert..."
- Server rendert alles in einem Rutsch (ein HTML → ein PDF)
- Bei Fehlern: Error-Message zurück an Frontend
- Einfach, robust, kein WebSocket/SSE nötig

### 17.4 BadgeCanvas-Darstellung

**Lösung:** Feste Pixel-Breite mit Zoom-Funktion.
- Canvas hat eine feste Basis-Breite (z.B. 630px = 105mm bei 150% Zoom)
- Zoom-Buttons (+/-) oder Mausrad zum Skalieren
- Pan per Maus-Drag (bei gezoomtem Canvas)
- Robust und funktional auf allen Bildschirmgrößen
- Mobile: Pinch-to-Zoom + Drag-to-Pan

### 17.5 Background-Image-Pfade

**Lösung:** Gleicher Ansatz wie bestehender Renderer.
- Upload-URLs (`/uploads/namebadge/xxx.png`) → `file:///root/.../uploads/namebadge/xxx.png`
- Vorlagen-URLs → `file://` Pfade zum `templates/`-Verzeichnis
- Konvertierung passiert serverseitig vor dem Rendering

### 17.6 HTML-Escaping & Sonderzeichen

**Lösung:** Handlebars auto-escaping + manuelle Absicherung.
- Handlebars escaped standardmäßig `&`, `<`, `>`, `"` in `{{variable}}`
- Kein Triple-Mustache `{{{ }}}` verwenden (verhindert XSS)
- Zusätzlich: Input-Sanitizing im CSV-Parser (Null-Bytes, Control-Chars entfernen)
- Ergebnis: Sonderzeichen wie `Müller`, `O'Brien`, `Francois` werden korrekt gerendert, Programm stürzt nicht ab
