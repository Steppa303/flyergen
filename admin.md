# FlyerGen — Admin-Bereich Plan

**Datum:** 2026-08-27
**Status:** Planung

---

## 1. Übersicht

Admin-Bereich für FlyerGen mit Template-Editor, Asset-Verwaltung und einfachem Auth.
Zugang über "Verwalten"-Button auf der Startseite → Passwort-Abfrage.

---

## 2. Auth

### Flow
1. User klickt "Verwalten" auf der Startseite
2. Modal mit Passwort-Feld erscheint
3. `POST /api/admin/login` mit `{ password }`
4. Server prüft gegen Env-Variable `ADMIN_PASSWORD`
5. Bei Erfolg: Session-Cookie (`flyergen_session`) mit HttpOnly, SameSite=Strict
6. Bei Fehlschlag: Error-Meldung
7. Alle `/api/admin/*` Endpoints prüfen Session-Cookie

### Session-Handling
- Cookie-Name: `flyergen_session`
- Cookie-Werte: `{ authenticated: true, loginAt: timestamp }`
- Gültigkeit: 24 Stunden (dann erneute Eingabe nötig)
- HttpOnly, SameSite=Strict, Secure (in Produktion)
- Kein JWT, kein komplexes Token-Management — reine Cookie-Session

### Logout
- `POST /api/admin/logout` → Cookie löschen
- "Abmelden"-Button im Admin-Bereich

### Konfiguration
- `ADMIN_PASSWORD` als Env-Variable (in `.env` oder PM2 ecosystem)
- Fallback: `admin` (nur für Development, mit Warning im Log)

---

## 3. Template-Editor

### Storage: Hybrid (Files + DB)

**HTML-Dateien** bleiben als Files:
- `templates/01-krimi-tour.html` etc.
- Einfach, git-trackbar, direkt editierbar

**SQLite-DB** (`data/flyergen.db`) für Metadaten + Schema:
- Tabelle `templates`: Metadaten + Schema als JSON
- Tabelle `assets`: Asset-Metadaten
- Tabelle `exports`: Export-Statistiken (Phase 2)

### DB-Schema

```sql
-- Templates
CREATE TABLE templates (
  id TEXT PRIMARY KEY,                    -- '01-krimi-tour'
  name TEXT NOT NULL,                     -- 'Krimi-Tour'
  description TEXT DEFAULT '',
  schema_json TEXT NOT NULL,              -- { fields: [...], formats: [...] }
  html_file TEXT NOT NULL,                -- '01-krimi-tour.html'
  thumbnail TEXT DEFAULT '',              -- Pfad zum Thumbnail
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Assets (Logos, Bilder, Fonts)
CREATE TABLE assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,                 -- 'WBM_Blau.svg'
  original_name TEXT NOT NULL,            -- 'Wortbildmarke Blau.svg'
  category TEXT DEFAULT 'image',          -- 'logo', 'image', 'font', 'icon'
  mime_type TEXT DEFAULT 'image/png',
  file_size INTEGER DEFAULT 0,
  file_path TEXT NOT NULL,                -- 'assets/WBM_Blau.svg'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Export-Statistiken (Phase 2, vorerst nur Schema)
CREATE TABLE exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  format TEXT NOT NULL,                   -- 'flyer', 'poster', 'instagram'
  output_format TEXT NOT NULL,            -- 'png', 'pdf'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES templates(id)
);
```

### Migration: Bestehende Templates importieren

Beim ersten Start (DB leer):
1. Alle `templates/*.html` Dateien scannen
2. `templateSchemas` aus `server.js` als JSON extrahieren
3. Einträge in `templates`-Tabelle erstellen
4. `server.js` liest Schema danach aus DB statt aus hardcoded Objekt

---

## 4. API-Endpoints

### Auth
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/admin/login` | POST | Login mit `{ password }` |
| `/api/admin/logout` | POST | Logout, Cookie löschen |
| `/api/admin/status` | GET | Prüft ob Session gültig ist |

### Templates (admin)
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/admin/templates` | GET | Alle Templates mit Schema |
| `/api/admin/templates/:id` | GET | Einzelnes Template mit vollem Schema |
| `/api/admin/templates/:id` | PUT | Template aktualisieren (name, description, schema_json) |
| `/api/admin/templates/:id/html` | GET | HTML-Content des Templates |
| `/api/admin/templates/:id/html` | PUT | HTML-Content speichern |
| `/api/admin/templates/:id/preview` | POST | Rendert Vorschau mit Default-Werten |
| `/api/admin/templates` | POST | Neues Template erstellen |
| `/api/admin/templates/:id` | DELETE | Template löschen (Datei + DB-Eintrag) |

### Assets (admin)
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/admin/assets` | GET | Alle Assets auflisten |
| `/api/admin/assets` | POST | Asset hochladen (multipart) |
| `/api/admin/assets/:id` | DELETE | Asset löschen |
| `/api/admin/assets/:id` | PUT | Asset-Metadaten ändern (category, name) |

### Bestehende Endpoints (bleiben unverändert)
| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/templates` | GET | Templates für User (aus DB statt hardcoded) |
| `/api/templates/:id` | GET | Template-Details |
| `/api/render` | POST | Flyer rendern |
| `/api/upload` | POST | Bild hochladen |
| `/api/images` | GET | Bilder auflisten |

---

## 5. Frontend

### Neue Dependencies
- `@codemirror/view` + `@codemirror/lang-html` + `@codemirror/theme-one-dark` — Code-Editor
- `js-cookie` — Cookie-Handling (optional, fetch reicht auch)

### Routing

```
/                    → HomePage (Template-Auswahl, wie bisher)
/editor/:templateId  → EditorPage (wie bisher)
/admin               → AdminPage (geschützt)
/admin/templates     → TemplateListe
/admin/templates/:id → TemplateEditor (3 Tabs)
/admin/assets        → AssetGalerie
```

### Komponenten

```
frontend/src/
├── pages/
│   ├── HomePage.jsx          (bestehend, + "Verwalten"-Button)
│   ├── EditorPage.jsx        (bestehend, unverändert)
│   └── admin/
│       ├── AdminPage.jsx     (Dashboard: Template-Liste + Stats)
│       ├── TemplateEditor.jsx (3-Tab-Editor)
│       └── AssetPage.jsx     (Asset-Galerie)
├── components/
│   ├── LoginModal.jsx        (Passwort-Abfrage)
│   ├── CodeEditor.jsx        (CodeMirror-Wrapper)
│   ├── SchemaEditor.jsx      (Felder-Editor)
│   ├── FormatEditor.jsx      (Formats-Array-Editor)
│   ├── LivePreview.jsx       (Vorschau im Admin)
│   └── AssetGrid.jsx         (Asset-Galerie-Grid)
└── store/
    └── useAdminStore.js      (Zustand: Admin-State)
```

### AdminStore (Zustand)

```js
{
  authenticated: false,
  templates: [],
  assets: [],
  selectedTemplate: null,
  activeTab: 'schema',        // 'schema' | 'code' | 'preview'
  htmlContent: '',
  schemaData: { fields: [], formats: [] },
  previewUrl: null,
  loading: false,
  error: null
}
```

### TemplateEditor — 3 Tabs

**Tab 1: Schema-Editor**
- Feld-Liste mit Drag & Drop (Reihenfolge)
- Pro Feld:
  - ID (text, readonly nach Erstellung)
  - Typ (Dropdown: text, richtext, array, image)
  - Label (text)
  - Default-Wert (text/textarea je nach Typ)
  - Löschen-Button
- "Feld hinzufügen"-Button
- Format-Editor separat:
  - Tabelle: id, name, width, height, pageWidth, pageHeight
  - Format hinzufügen/löschen

**Tab 2: Code-Editor**
- CodeMirror 6 mit HTML-Syntax-Highlighting
- Dark Theme (One Dark)
- Auto-Completion für Handlebars-Helper (`{{fontSize}}`, `{{fitText}}`, etc.)
- shared.css wird als Readonly-Panel angezeigt (oder als Referenz-Link)
- Speichern aktualisiert die HTML-Datei auf dem Server

**Tab 3: Live-Vorschau**
- Nutzt den bestehenden Preview-Flow (`/api/render-html`)
- Default-Werte aus dem Schema werden als Formular-Daten gesetzt
- Format-Umschaltung (Flyer/Poster/Instagram)
- Wird bei Tab-Wechsel oder manuellem "Aktualisieren" aktualisiert

### AdminPage (Dashboard)

- Template-Liste als Grid (Name, Thumbnail, letzte Änderung)
- "Neues Template"-Button
- Klick auf Template → TemplateEditor öffnet sich
- Thumbnail wird automatisch gerendert (erstes Mal, dann gecacht)

---

## 6. Dateistruktur (nach Implementierung)

```
flyergen/
├── data/
│   └── flyergen.db              # SQLite-DB
├── src/
│   ├── server.js                # Express API (erweitert)
│   ├── renderer.js              # Handlebars + wkhtmltoimage/WeasyPrint
│   ├── upload.js                # Multer + Sharp
│   ├── db.js                    # SQLite-Setup + Migration
│   └── admin/
│       ├── auth.js              # Login/Logout/Session-Middleware
│       ├── templates.js         # Admin Template-Endpoints
│       └── assets.js            # Admin Asset-Endpoints
├── templates/
│   ├── shared.css
│   ├── 01-krimi-tour.html
│   ├── 02-crime-coaches.html
│   └── 03-pol-informatik.html
├── assets/
│   ├── logos/
│   └── fonts/
├── frontend/
│   └── src/
│       ├── pages/admin/
│       │   ├── AdminPage.jsx
│       │   ├── TemplateEditor.jsx
│       │   └── AssetPage.jsx
│       ├── components/
│       │   ├── LoginModal.jsx
│       │   ├── CodeEditor.jsx
│       │   ├── SchemaEditor.jsx
│       │   ├── FormatEditor.jsx
│       │   ├── LivePreview.jsx
│       │   └── AssetGrid.jsx
│       └── store/
│           └── useAdminStore.js
└── admin.md                     # Diese Datei
```

---

## 7. Implementierungs-Reihenfolge

### Schritt 1: Backend-Grundlage
- [ ] `better-sqlite3` installieren
- [ ] `src/db.js` erstellen (DB-Setup, Schema, Migration)
- [ ] `src/admin/auth.js` erstellen (Login, Logout, Session-Middleware)
- [ ] Bestehende `templateSchemas` in DB migrieren
- [ ] `server.js` anpassen: Schema aus DB lesen statt hardcoded

### Schritt 2: Admin API
- [ ] `src/admin/templates.js` — CRUD-Endpoints für Templates
- [ ] `src/admin/assets.js` — Upload/Liste/Delete für Assets
- [ ] Route-Registrierung in `server.js`

### Schritt 3: Frontend — Auth + Dashboard
- [ ] `LoginModal.jsx` — Passwort-Abfrage
- [ ] `AdminPage.jsx` — Template-Liste
- [ ] `useAdminStore.js` — Admin-State
- [ ] "Verwalten"-Button auf `HomePage.jsx`
- [ ] Route `/admin` einrichten

### Schritt 4: Frontend — Template-Editor
- [ ] `SchemaEditor.jsx` — Feld-Editor
- [ ] `FormatEditor.jsx` — Format-Editor
- [ ] `CodeEditor.jsx` — CodeMirror-Wrapper
- [ ] `LivePreview.jsx` — Vorschau
- [ ] `TemplateEditor.jsx` — 3-Tab-Container

### Schritt 5: Frontend — Asset-Galerie
- [ ] `AssetGrid.jsx` — Galerie-Grid
- [ ] `AssetPage.jsx` — Upload + Verwaltung

### Schritt 6: Polish + Deploy
- [ ] Thumbnails auto-generieren
- [ ] Error-Handling überall
- [ ] Loading-States
- [ ] Mobile (Admin primär Desktop, aber basics)
- [ ] Doku + HANDOVER.md aktualisieren

---

## 8. Offene Fragen

1. **shared.css im Code-Editor:** Soll die shared.css auch editierbar sein? Oder nur als Referenz?
2. **Template-Löschen:** Soll das HTML-File wirklich gelöscht werden oder nur in DB als "deaktiviert" markiert?
3. **Thumbnails:** Automatisch beim Speichern rendern? Oder manuell?
4. **Neues Template:** Leeres HTML-Grundgerüst oder Kopie eines bestehenden Templates?
5. **Code-Editor Sicherheit:** Handlebars-Helpers sind serverseitig — kein XSS-Risiko durch Template-Code, aber Code-Injection möglich. Einschränkungen nötig?

---

## 9. Sicherheits-Überlegungen

- **Admin-Password** in Env-Variable, nie im Code
- **Session-Cookie** HttpOnly + SameSite → kein CSRF/XSS
- **Template-Code** wird serverseitig gerendert (Handlebars) — aber `execSync` in `renderer.js` ist potenziell gefährlich wenn Template-Code manipuliert wird
- **Upload-Validierung** bereits vorhanden (Multer fileFilter + size limit)
- **Rate-Limiting** für Login-Endpoint (Brute-Force-Schutz, z.B. 5 Versuche/Minute)

---

## 10. Geschätzter Aufwand

| Schritt | Aufwand | Abhängigkeiten |
|---------|---------|----------------|
| Backend-Grundlage (DB + Auth) | ~2h | — |
| Admin API | ~2h | Schritt 1 |
| Frontend Auth + Dashboard | ~2h | Schritt 2 |
| Template-Editor | ~4h | Schritt 3 |
| Asset-Galerie | ~1.5h | Schritt 2 |
| Polish + Deploy | ~1.5h | Schritt 4+5 |
| **Gesamt** | **~13h** | |

---

_Plan erstellt: 2026-08-27 07:37_
