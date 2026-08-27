# FlyerGen — Design-System

_Stand: 25.08.2026_

---

## Farben

### Primärfarben

| Name | Hex | CMYK | RGB | Verwendung |
|------|-----|------|-----|------------|
| **Dunkelblau** | `#003660` | 100/50/0/60 | 0/54/96 | Hintergrund, Text, Logo |
| **Lime** | `#BFD122` | 34/0/94/0 | 191/209/34 | Akzente, Headlines, Stern |
| **Weiß** | `#FFFFFF` | 0/0/0/0 | 255/255/255 | Text auf dunklem Hintergrund |

### Abgeleitete Farben

| Name | Hex | Verwendung |
|------|-----|------------|
| Dunkelblau (Logo) | `#345077` | Logo-Variante (heller) |
| Dunkelblau (90%) | `#002D4F` | Hover-States |
| Lime (80%) | `#99A71B` | Deaktivierte Elemente |
| Grau | `#F5F5F5` | Hintergrund (Light Mode) |

---

## Typografie

### Fonts

| Font | Familie | Schnitt | Verwendung |
|------|---------|---------|------------|
| **DIN1451Engschrift** | DIN | Engschrift | Headlines (groß, 30-80pt) |
| **DINCondensed-Bold** | DIN | Condensed Bold | Sublines, Akzente (11-28pt) |
| **FrutigerNeueLTPro-Cn** | Frutiger | Condensed | Body Text (9-12pt) |
| **FrutigerNeueLTPro-CnBold** | Frutiger | Condensed Bold | Body Text fett (9-28pt) |
| **NDSFrutiger-Bold** | NDS Frutiger | Bold | Alternative Headlines |
| **NDSFrutiger-Light** | NDS Frutiger | Light | Alternative Body |

### Schriftgrößen (aus Samples extrahiert)

| Element | Größe | Font | Farbe |
|---------|-------|------|-------|
| Headline (groß) | 54-80pt | DIN1451Engschrift | Lime |
| Headline (mittel) | 25-40pt | DINCondensed-Bold | Weiß |
| Subline | 17-28pt | DINCondensed-Bold | Lime/Weiß |
| Body | 9-12pt | FrutigerNeueLTPro-Cn | Weiß/Dunkelblau |
| CTA | 12pt | FrutigerNeueLTPro-CnBold | Weiß |

---

## Assets

### Logo (Wortbildmarke)

- **Datei:** `assets/logos/WBM_Blau.svg`
- **Originalfarbe:** `#345077`
- **Varianten:** Blau (Standard), Weiß (auf dunklem Hintergrund), Lime (Akzent)
- **CSS-Anpassung:** `fill` Property überschreiben für Farbvarianten

### Stern (Designelement)

- **Datei:** `assets/logos/stern_Blau.svg`
- **Originalfarbe:** `#345077`
- **Verwendung:** Dekoratives Element in Ecken, als Trenner, als Akzent
- **Größe:** Variabel (20-100px je nach Kontext)
- **CSS-Anpassung:** `fill` Property überschreiben für Farbvarianten

---

## Layout-Regeln

### Allgemein

- **Hintergrund:** Dunkelblau (`#003660`) oder Schwarz
- **Text:** Weiß auf dunklem Hintergrund
- **Akzente:** Lime (`#BFD122`) für Headlines, Stern, Highlights
- **Logo:** Oben links oder unten rechts
- **Stern:** Dekorativ in Ecken oder als Trenner

### Abstände

- **Seitenrand:** 15mm (Print), 20px (Screen)
- **Innenabstand:** 10mm (Print), 16px (Screen)
- **Zeilenabstand:** 1.4-1.6

### Grid

- **Spalten:** 1-3 je nach Inhalt
- **Ausrichtung:** Links-bündig (Standard), Zentriert (Headlines)

---

## Flyer-Typen

### 1. Event-Plakat (A5 Hochformat)

- **Headline:** Groß, Lime, DIN1451Engschrift
- **Subline:** Mittel, Weiß, DINCondensed-Bold
- **Details:** Klein, Weiß, FrutigerNeueLTPro
- **Bild:** Optional, 16:9 oder 4:3
- **CTA:** Unten, Weiß, fett

### 2. Info-Flyer (A5 Hochformat)

- **Headline:** Groß, Lime, DIN1451Engschrift
- **Body:** Fließtext, Weiß, FrutigerNeueLTPro
- **Bild:** Optional, oben oder seitlich
- **Logo:** Unten rechts

### 3. Programm/Timetable (A5 Hochformat)

- **Headline:** Groß, Lime, DIN1451Engschrift
- **Tabelle:** Weißer Text auf dunklem Hintergrund
- **Spalten:** Zeit, Programmpunkt, Ort
- **Footer:** Zusatzinfos, klein

---

## CSS-Variablen (für Templates)

```css
:root {
  /* Farben */
  --color-primary: #003660;      /* Dunkelblau */
  --color-accent: #BFD122;       /* Lime */
  --color-white: #FFFFFF;
  --color-black: #000000;
  --color-gray: #F5F5F5;
  
  /* Logo-Farben */
  --color-logo-blue: #345077;
  
  /* Fonts */
  --font-headline: 'DIN1451Engschrift', 'DIN Condensed', sans-serif;
  --font-subline: 'DINCondensed-Bold', 'DIN Condensed', sans-serif;
  --font-body: 'FrutigerNeueLTPro-Cn', 'Frutiger', sans-serif;
  --font-body-bold: 'FrutigerNeueLTPro-CnBold', 'Frutiger', sans-serif;
  
  /* Abstände */
  --spacing-page: 15mm;
  --spacing-content: 10mm;
  --spacing-line: 1.5;
}
```

---

## Dateien

```
projects/flyergen/
├── assets/
│   └── logos/
│       ├── WBM_Blau.svg          # Logo
│       └── stern_Blau.svg        # Stern
├── docs/
│   ├── PLANUNG.md                # Projektplannung
│   └── DESIGN-SYSTEM.md          # Diese Datei
├── samples/
│   ├── 01-krimi-tour.pdf         # Sample-Flyer
│   ├── 02-crime-coaches.pdf      # Sample-Flyer
│   ├── 03-pol-informatik.pdf     # Sample-Flyer
│   └── previews/                 # PNG-Vorschauen
└── templates/                    # HTML/CSS Templates (noch leer)
```
