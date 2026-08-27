# FlyerGen — Planung & Design-Entscheidungen

_Stand: 2026-08-24 — Entscheidungen von Bastian_

---

## ✅ Entscheidungen (final)

### 1. Template-Extraktion: Semi-automatisch, Admin-only

- **Nur Admins** können Templates erstellen/ändern
- Admin lädt PDF hoch → System extrahiert Elemente → Admin markiert variable Zonen
- Templates werden als "fertige Vorlagen" für End-User bereitgestellt
- **Kein Wildwuchs** — User können keine eigenen PDFs hochladen
- Templates sind versioniert und haben einen Lifecycle (draft → approved → archived)

### 2. Template-Editor: Formular-basiert

- User füllt **definierte Felder** aus (Texte, Bilder)
- **Kein visueller Editor**, kein Drag & Drop
- Live-Vorschau zeigt Ergebnis, aber nicht editierbar

**Challenge: Verschiedene Flyertypen mit unterschiedlichen Feldern**

Lösung: **Flexibles Content-Schema pro Template**

```json
// Template A: Event-Plakat
{
  "fields": [
    { "id": "headline", "type": "text", "label": "Überschrift", "required": true },
    { "id": "date", "type": "text", "label": "Datum & Uhrzeit", "required": true },
    { "id": "location", "type": "text", "label": "Ort", "required": true },
    { "id": "image", "type": "image", "label": "Veranstaltungsbild", "required": false },
    { "id": "cta", "type": "text", "label": "Call-to-Action", "required": false }
  ]
}

// Template B: Programm/Flyer mit Fließtext
{
  "fields": [
    { "id": "headline", "type": "text", "label": "Überschrift", "required": true },
    { "id": "body", "type": "richtext", "label": "Fließtext", "required": true },
    { "id": "image", "type": "image", "label": "Bild", "required": false }
  ]
}

// Template C: Timetable
{
  "fields": [
    { "id": "headline", "type": "text", "label": "Überschrift", "required": true },
    { "id": "schedule", "type": "table", "label": "Programm", "required": true,
      "columns": ["Zeit", "Programmpunkt", "Ort"] },
    { "id": "image", "type": "image", "label": "Header-Bild", "required": false }
  ]
}
```

**Feld-Typen:**
| Typ | Beschreibung | Rendering |
|-----|-------------|-----------|
| `text` | Einzeiliger Text | `<input>` |
| `richtext` | Mehrzeilig, Formatierung | `<textarea>` / Markdown |
| `image` | Bild-Upload | File-Picker, Crop-Tool |
| `table` | Tabellarische Daten | Dynamische Tabelle |
| `date` | Datum/Zeit | Date-Picker |
| `color` | Farbwahl | Color-Picker |
| `qr` | QR-Code (URL → Bild) | Auto-generiert |

### 3. Rendering: HTML/CSS + Puppeteer

- Templates als **Handlebars + TailwindCSS**
- Puppeteer rendert zu PDF/PNG
- Print-Media-Styles für Druckausgabe
- 300dpi für Print, 72dpi für Digital

### 4. Varianten-Generator: Ja

- Ein Content → automatisch alle gewünschten Formate
- User wählt beim Export: welche Formate?
- Formate definierbar pro Design-System (nicht hardcodiert)

### 5. KI-Integration: Später

- Nicht in V1
- Potenzial für Textvorschläge, Bildgenerierung
- API-Endpoints vorbereiten, aber nicht implementieren

### 6. Ausgabe: Screen + Print

**Screen (Digital):**
- RGB-Farbraum
- 72-150 dpi
- PNG, JPG
- Optimiert für Web/Social/Messaging

**Print (Druck):**
- CMYK-Farbraum (Konvertierung aus RGB)
- 300 dpi
- PDF (Vektor wo möglich)
- Beschnitt (Bleed): 3mm (optional, pro Template konfigurierbar)
- Anschnittmarken (optional)

### 7. Deployment: Web-App

- Eigenständige Web-App
- React Frontend + Express/FastAPI Backend
- Kein Telegram-Bot in V1 (später ergänzbar)
- Kein CLI in V1

---

## Architektur (final)

```
┌─────────────────────────────────────────────────────────┐
│                    Admin-Bereich                         │
│                                                          │
│  PDF-Upload → Extraktion → Zonen markieren → Template   │
│  Design-System erstellen (Farben, Fonts, Logos)          │
│  Template freigeben (draft → approved)                   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   User-Bereich                           │
│                                                          │
│  Template wählen → Felder ausfüllen → Vorschau → Export  │
│  (Formular-basiert, keine Layout-Änderungen)             │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Rendering-Engine                          │
│                                                          │
│  Handlebars + TailwindCSS → Puppeteer → PDF/PNG          │
│  Screen: RGB, 72dpi | Print: CMYK, 300dpi, Beschnitt    │
└─────────────────────────────────────────────────────────┘
```

---

## Datenmodell

```
User
├── id, name, email, role (admin|user)
└── projects → [Project]

DesignSystem
├── id, name, created_by (admin)
├── colors (JSON: primary, secondary, accent, bg, text)
├── fonts (JSON: heading, body, accent — mit Fallbacks)
├── logo_ids → [Asset]
└── element_ids → [Asset] (Shapes, Patterns, Overlays)

Template
├── id, name, design_system_id
├── format (poster-a3, flyer-a5, instagram-post, ...)
├── dimensions (width, height, unit)
├── html_template (Handlebars-String)
├── fields (JSON: Array von Field-Definitionen)
├── zones (JSON: Positionen, Constraints)
├── status (draft, approved, archived)
├── preview_image
└── created_by (admin), created_at

Asset
├── id, name, type (logo|shape|pattern|overlay|font)
├── file_path, mime_type
├── metadata (width, height, format)
└── design_system_id

Project
├── id, name, user_id, template_id
├── content (JSON: User-Input passend zu template.fields)
├── status (draft, final)
└── created_at, updated_at

Export
├── id, project_id
├── format (pdf|png|jpg)
├── variant (screen|print)
├── dpi, cmyk (bool), bleed_mm
├── file_path, file_size
└── created_at
```

---

## Feld-Typen System (für verschiedene Flyertypen)

### Kern-Idee

Jedes Template definiert seine eigenen Felder über ein Schema. Das Frontend rendert dynamisch das passende Formular. Die Rendering-Engine füllt die Felder in die HTML-Template ein.

### Feld-Definition

```typescript
interface FieldDefinition {
  id: string;                    // Einzig, wird in Template referenziert
  type: FieldType;               // text | richtext | image | table | date | color | qr
  label: string;                 // Anzeigename im Formular
  required: boolean;
  placeholder?: string;          // Platzhalter-Text
  defaultValue?: any;            // Vorbelegung
  validation?: {                 // Optionale Validierung
    minLength?: number;
    maxLength?: number;
    pattern?: string;            // Regex
  };
  // Für table-Typ
  columns?: string[];            // Spalten-Definitionen
  maxRows?: number;
  // Für image-Typ
  aspectRatio?: string;          // z.B. "16:9", "1:1"
  maxWidth?: number;             // Maximale Pixel
  maxHeight?: number;
}
```

### Template-Beispiele

**Event-Plakat:**
```json
{
  "fields": [
    { "id": "headline", "type": "text", "label": "Überschrift", "required": true, "maxLength": 80 },
    { "id": "subline", "type": "text", "label": "Untertitel", "required": false },
    { "id": "date", "type": "text", "label": "Datum & Uhrzeit", "required": true },
    { "id": "location", "type": "text", "label": "Veranstaltungsort", "required": true },
    { "id": "image", "type": "image", "label": "Veranstaltungsbild", "required": false, "aspectRatio": "16:9" },
    { "id": "cta", "type": "text", "label": "Call-to-Action", "required": false, "placeholder": "z.B. Eintritt frei!" },
    { "id": "qr_url", "type": "qr", "label": "QR-Code URL", "required": false }
  ]
}
```

**Info-Flyer mit Fließtext:**
```json
{
  "fields": [
    { "id": "headline", "type": "text", "label": "Überschrift", "required": true },
    { "id": "body", "type": "richtext", "label": "Inhalt", "required": true },
    { "id": "image", "type": "image", "label": "Bild", "required": false }
  ]
}
```

**Programm/Timetable:**
```json
{
  "fields": [
    { "id": "headline", "type": "text", "label": "Veranstaltung", "required": true },
    { "id": "date", "type": "text", "label": "Datum", "required": true },
    { "id": "schedule", "type": "table", "label": "Programm", "required": true,
      "columns": ["Uhrzeit", "Programmpunkt", "Raum/Ort"],
      "maxRows": 20 },
    { "id": "footer", "type": "text", "label": "Fußzeile", "required": false }
  ]
}
```

---

## ✅ Weitere Entscheidungen (24.08.2026)

### End-User
- **Zielgruppe:** Angehörige der Polizei
- **Kontext:** Polizeiakademie / interne Veranstaltungen

### Sprache
- **Nur Deutsch** — kein Multi-Language in V1

### Auth
- **Einfach:** Passwort zum Einloggen (für alle User)
- **Admin-Bereich:** Separates Passwort (zusätzlich zum Login)
- Kein OAuth, kein komplexes User-Management
- Keine Rollen-Verwaltung, nur „User“ und „Admin“

### Template-Grundlagen
- Bastian liefert bestehende PDFs als Vorlage
- Diese werden semi-automatisch zu Templates extrahiert

---

## ✅ Corporate Design (25.08.2026)

### Offizielle Farbwerte

| Farbe | Hex | CMYK | Verwendung |
|-------|-----|------|------------|
| **Dunkelblau** | `#003660` | 100/50/0/60 | Hintergrund, Text, Logo |
| **Lime** | `#BFD122` | 34/0/94/0 | Akzente, Headlines, Stern |
| **Weiß** | `#FFFFFF` | — | Text auf dunklem Hintergrund |

### Fonts (aus PDFs extrahiert)

| Font | Verwendung |
|------|------------|
| DIN1451Engschrift | Headlines (groß) |
| DINCondensed-Bold | Sublines, Akzente |
| FrutigerNeueLTPro-Cn | Body Text |
| FrutigerNeueLTPro-CnBold | Body Text fett |
| NDSFrutiger-Bold/Light | Alternative Body |

### Assets

| Datei | Beschreibung |
|-------|-------------|
| `assets/logos/WBM_Blau.svg` | Wortbildmarke (Logo), `#345077` |
| `assets/logos/stern_Blau.svg` | Stern als Designelement, `#345077` |

### Design-Regeln

- **Dunkler Hintergrund** (Dunkelblau oder Schwarz)
- **Lime-Akzente** für Headlines, Stern, Highlights
- **Weißer Text** auf dunklem Hintergrund
- **Logo** oben links oder unten rechts
- **Stern** als dekoratives Element (Ecken, Trenner)

## Offene Fragen

- [x] Bestehende PDFs von Bastian erhalten ✅ (3 Samples)
- [x] Corporate Design ✅ (Farben, Fonts, Logo)
- [ ] Hosting: Eigener Server (VPS)? Docker?
- [ ] URL/Domain für die App?

---

## Nächste Schritte

1. [x] Offene Fragen klären ✅ (25.08.2026)
2. [ ] Spike: PDF-Extraktion testen (Poppler + pdfjs)
3. [x] Spike: Handlebars + Puppeteer Rendering testen ✅ (wkhtmltoimage)
4. [x] Erstes Template manuell bauen (als Referenz) ✅ (3 Templates, 25.08.2026)
5. [ ] Rendering-Engine (Handlebars + wkhtmltoimage/Puppeteer)
6. [ ] API-Design (REST-Endpoints)
7. [ ] UI-Wireframes (Admin + User)
8. [ ] Datenbank-Schema finalisieren
9. [ ] Frontend (React + Zustand)
10. [ ] Deployment (VPS + Caddy)
