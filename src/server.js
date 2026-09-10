const express = require('express');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const multer = require('multer');
const FlyerRenderer = require('./renderer');
const { upload, processImage, UPLOAD_DIR, THUMBS_DIR } = require('./upload');
const { parseCsv } = require('./namebadge/csv-parser');
const { extractBackground, extractBackside } = require('./namebadge/background-extractor');
const { renderBadges, renderPreview } = require('./namebadge/badge-renderer');

const app = express();
const renderer = new FlyerRenderer();

app.use(express.json());

// CORS für Upload-Endpoints
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Statische Dateien für Uploads
app.use('/uploads', express.static(UPLOAD_DIR));

// Template-Definitionen mit Feld-Schemas
const templateSchemas = {
  '01-krimi-tour': {
    name: 'Einzel-Event',
    formats: [
      { id: 'flyer', name: 'Flyer (A5)', width: 560, height: 793, label: 'A5 Portrait', pageWidth: '148mm', pageHeight: '210mm' },
      { id: 'poster', name: 'Plakat (A4)', width: 793, height: 1123, label: 'A4 Portrait', pageWidth: '210mm', pageHeight: '297mm' },
      { id: 'instagram', name: 'Instagram', width: 1080, height: 1080, label: '1080×1080', pageWidth: '1080px', pageHeight: '1080px' }
    ],
    fields: [
      { id: 'headerLine1', type: 'text', label: 'Header Zeile 1', default: 'DEIN FALL' },
      { id: 'headerLine2', type: 'text', label: 'Header Zeile 2', default: 'IN HANNOVER!' },
      { id: 'overlayLine1', type: 'text', label: 'Overlay Zeile 1', default: 'KRIMI' },
      { id: 'overlayLine2', type: 'text', label: 'Overlay Zeile 2', default: 'TOUR' },
      { id: 'eventTitle', type: 'text', label: 'Event-Titel', default: 'DER GOLDENE KEKS WURDE AUS DEM HANNOVERSCHEN MUSEUM GESTOHLEN!' },
      { id: 'eventDescription', type: 'richtext', label: 'Beschreibung', default: 'Schlüpft in die Rolle der Kriminalpolizei und ermittelt selbst: Tatort sichern, Spuren auswerten, Zeugenaussagen aufnehmen und die tatverdächtige Person überführen.' },
      { id: 'eventDate', type: 'text', label: 'Datum', default: '19. April 2026' },
      { id: 'locationLines', type: 'array', label: 'Ort', default: ['Polizeidirektion Hannover', 'Waterloostraße 9', '30169 Hannover'] },
      { id: 'ctaText', type: 'text', label: 'CTA-Text', default: 'MELDE DICH JETZT AN!' },
      { id: 'sloganLine1', type: 'text', label: 'Slogan Zeile 1', default: 'WER ERMITTELT …' },
      { id: 'sloganLine2', type: 'text', label: 'Slogan Zeile 2', default: 'WENN NICHT DU?' },
      { id: 'imageUrl', type: 'image', label: 'Flyer-Bild', default: '' },
      { id: 'qrUrl', type: 'text', label: 'QR-Code Link (optional)', default: '' }
    ]
  },
  '02-crime-coaches': {
    name: 'Crime Coaches',
    hidden: true,
    formats: [
      { id: 'flyer', name: 'Flyer (A5)', width: 560, height: 793, label: 'A5 Portrait', pageWidth: '148mm', pageHeight: '210mm' },
      { id: 'poster', name: 'Plakat (A4)', width: 793, height: 1123, label: 'A4 Portrait', pageWidth: '210mm', pageHeight: '297mm' },
      { id: 'instagram', name: 'Instagram', width: 1080, height: 1080, label: '1080×1080', pageWidth: '1080px', pageHeight: '1080px' }
    ],
    fields: [
      { id: 'headerLine1', type: 'text', label: 'Header Zeile 1', default: 'DEIN FALL:' },
      { id: 'headerLine2', type: 'text', label: 'Header Zeile 2', default: 'MORD!' },
      { id: 'overlayLine1', type: 'text', label: 'Overlay Zeile 1', default: 'CRIME' },
      { id: 'overlayLine2', type: 'text', label: 'Overlay Zeile 2', default: 'COACHES' },
      { id: 'eventTitle', type: 'text', label: 'Event-Titel', default: 'JEDER MORD HINTERLÄSST SPUREN. FINDE SIE UND WERDE TEIL DER ERMITTLUNGEN!' },
      { id: 'eventDescription', type: 'richtext', label: 'Beschreibung', default: 'Du möchtest echte Polizeiarbeit hautnah erleben? Hier ist deine Chance dazu! Bewirb dich für einen der beiden Termine für das Crime Coaches Event und löse den Fall.' },
      { id: 'eventDate', type: 'text', label: 'Datum', default: '16. & 17.10.2026' },
      { id: 'locationLines', type: 'array', label: 'Ort', default: ['INFORUM – Tagungszentrum', 'der Polizei Niedersachsen', 'Ahrensburger Straße 1', '30659 Hannover'] },
      { id: 'ctaText', type: 'text', label: 'CTA-Text', default: 'MELDE DICH JETZT AN!' },
      { id: 'sloganLine1', type: 'text', label: 'Slogan Zeile 1', default: 'WER ERMITTELT …' },
      { id: 'sloganLine2', type: 'text', label: 'Slogan Zeile 2', default: 'WENN NICHT DU?' },
      { id: 'imageUrl', type: 'image', label: 'Flyer-Bild', default: '' },
      { id: 'qrUrl', type: 'text', label: 'QR-Code Link (optional)', default: '' }
    ]
  },
  '04-run-with-police': {
    name: 'Run with the Police',
    formats: [
      { id: 'flyer', name: 'Flyer (A5)', width: 560, height: 793, label: 'A5 Portrait', pageWidth: '148mm', pageHeight: '210mm' },
      { id: 'poster', name: 'Plakat (A4)', width: 793, height: 1123, label: 'A4 Portrait', pageWidth: '210mm', pageHeight: '297mm' },
      { id: 'instagram', name: 'Instagram', width: 1080, height: 1080, label: '1080×1080', pageWidth: '1080px', pageHeight: '1080px' }
    ],
    fields: [
      { id: 'titleLine', type: 'text', label: 'Titel', default: 'RUN WITH THE POLICE' },
      { id: 'tagline', type: 'text', label: 'Tagline', default: 'Dein Lauf. Deine Fragen. Deine Zukunft.' },
      { id: 'eventDate', type: 'text', label: 'Datum', default: '30.09.26' },
      { id: 'eventTime', type: 'text', label: 'Uhrzeit', default: '17 Uhr' },
      { id: 'strecke', type: 'text', label: 'Strecke', default: '5 Kilometer' },
      { id: 'treffpunkt', type: 'text', label: 'Treffpunkt', default: 'Kommissariat Emden' },
      { id: 'ctaText', type: 'text', label: 'Call-to-Action', default: 'ASK THE RECRUITER – STELL DEINE FRAGEN DIREKT' },
      { id: 'disclaimer', type: 'text', label: 'Hinweis (unten)', default: 'EGAL, OB LAUFPROFI ODER ANFÄNGER – DU MUSST NUR LUST HABEN, MITZULAUFEN.' },
      { id: 'sloganLine1', type: 'text', label: 'Slogan Zeile 1', default: '' },
      { id: 'sloganLine2', type: 'text', label: 'Slogan Zeile 2', default: '' },
      { id: 'imageUrl', type: 'image', label: 'Hero-Bild', default: '' },
      { id: 'qrUrl', type: 'text', label: 'QR-Code Link (optional)', default: '' },
      { id: 'starVisible', type: 'boolean', label: 'Polizei-Stern anzeigen', default: true }
    ]
  },
  '03-pol-informatik': {
    name: 'Polizei-Informatik',
    hidden: true,
    formats: [
      { id: 'flyer', name: 'Flyer (A5)', width: 560, height: 793, label: 'A5 Portrait', pageWidth: '148mm', pageHeight: '210mm' },
      { id: 'poster', name: 'Plakat (A4)', width: 793, height: 1123, label: 'A4 Portrait', pageWidth: '210mm', pageHeight: '297mm' },
      { id: 'instagram', name: 'Instagram', width: 1080, height: 1080, label: '1080×1080', pageWidth: '1080px', pageHeight: '1080px' }
    ],
    fields: [
      { id: 'titleMain', type: 'text', label: 'Haupttitel', default: 'DER STUDIENGANG POLIZEI-INFORMATIK' },
      { id: 'tagline', type: 'text', label: 'Tagline', default: 'allesaufeinenblick!' },
      { id: 'ctaText', type: 'text', label: 'CTA-Text', default: 'BEWIRB DICH JETZT!' },
      { id: 'imageUrl', type: 'image', label: 'Flyer-Bild', default: '' },
      { id: 'qrUrl', type: 'text', label: 'QR-Code Link (optional)', default: '' }
    ]
  }
};

// GET /api/templates — Liste aller Templates
app.get('/api/templates', (req, res) => {
  const templates = Object.entries(templateSchemas)
    .filter(([, schema]) => !schema.hidden)
    .map(([id, schema]) => ({
      id,
      name: schema.name,
      fields: schema.fields
    }));
  res.json(templates);
});

// GET /api/templates/:id — Template-Details
app.get('/api/templates/:id', (req, res) => {
  const schema = templateSchemas[req.params.id];
  if (!schema) return res.status(404).json({ error: 'Template nicht gefunden' });
  res.json({ id: req.params.id, ...schema });
});

// POST /api/render — Flyer rendern
app.post('/api/render', async (req, res) => {
  const { template, data, format, dpi, formatId, hiddenFields } = req.body;

  if (!template || !templateSchemas[template]) {
    return res.status(400).json({ error: 'Ungültiges Template. Verfügbare: ' + Object.keys(templateSchemas).join(', ') });
  }

  // Default-Werte setzen
  const schema = templateSchemas[template];
  const renderData = {};
  schema.fields.forEach(field => {
    renderData[field.id] = data?.[field.id] ?? field.default;
  });

  // Hidden Fields an Renderer weitergeben
  renderData._hiddenFields = hiddenFields || {};

  // QR-Code generieren wenn URL angegeben
  let qrPath = null;
  if (renderData.qrUrl && renderData.qrUrl.trim()) {
    qrPath = path.join(UPLOAD_DIR, `qr_${Date.now()}.png`);
    await QRCode.toFile(qrPath, renderData.qrUrl, { width: 300, margin: 1 });
    renderData.qrCodeImage = 'file://' + qrPath;
  }

  try {
    const outputFile = renderer.render(template, renderData, { format, dpi, formatId, formats: schema.formats });

    const downloadName = `flyer_${template}.${format || 'png'}`;
    res.download(outputFile, downloadName, (err) => {
      // Dateien nach Download löschen
      try { fs.unlinkSync(outputFile); } catch (_) {}
      if (qrPath) { try { fs.unlinkSync(qrPath); } catch (_) {} }
      if (err && !res.headersSent) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download fehlgeschlagen' });
      }
    });
  } catch (err) {
    // Cleanup bei Fehler
    if (qrPath) { try { fs.unlinkSync(qrPath); } catch (_) {} }
    console.error('Render error:', err);
    res.status(500).json({ error: 'Rendering fehlgeschlagen', details: err.message });
  }
});

// POST /api/render-html — Gerendertes HTML zurückgeben (Debugging)
app.post('/api/render-html', async (req, res) => {
  const { template, data, hiddenFields } = req.body;

  if (!template || !templateSchemas[template]) {
    return res.status(400).json({ error: 'Ungültiges Template' });
  }

  const schema = templateSchemas[template];
  const renderData = {};
  schema.fields.forEach(field => {
    renderData[field.id] = data?.[field.id] ?? field.default;
  });

  // Hidden Fields an Renderer weitergeben
  renderData._hiddenFields = hiddenFields || {};

  // QR-Code generieren wenn URL angegeben
  let qrPath = null;
  if (renderData.qrUrl && renderData.qrUrl.trim()) {
    qrPath = path.join(UPLOAD_DIR, `qr_${Date.now()}.png`);
    await QRCode.toFile(qrPath, renderData.qrUrl, { width: 300, margin: 1 });
    renderData.qrCodeImage = 'file://' + qrPath;
  }

  try {
    const html = renderer.renderToHtml(template, renderData);
    res.type('html').send(html);
  } catch (err) {
    console.error('Render error:', err);
    res.status(500).json({ error: 'Rendering fehlgeschlagen', details: err.message });
  } finally {
    if (qrPath) { try { fs.unlinkSync(qrPath); } catch (_) {} }
  }
});

// POST /api/upload — Bild hochladen
app.post('/api/upload', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Bild zu groß (max. 40MB)' });
      }
      if (err.message && err.message.includes('Nicht erlaubter Dateityp')) {
        return res.status(400).json({ error: 'Nicht erlaubter Dateityp. Erlaubt: JPG, PNG, WebP' });
      }
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Upload fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler') });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Bilddatei' });
  }

  try {
    const result = await processImage(req.file.path, {
      width: parseInt(req.body.width) || 1200,
      height: parseInt(req.body.height) || 800,
      quality: parseInt(req.body.quality) || 85
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Image processing error:', err);
    res.status(500).json({ error: 'Bildverarbeitung fehlgeschlagen' });
  }
});

// GET /api/images — alle hochgeladenen Bilder auflisten
app.get('/api/images', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR)
      .filter(f => f.endsWith('_processed.jpg'))
      .map(f => ({
        filename: f,
        url: `/uploads/${f}`,
        thumbUrl: `/uploads/thumbs/${f.replace('_processed', '_thumb')}`,
        size: fs.statSync(path.join(UPLOAD_DIR, f)).size,
        created: fs.statSync(path.join(UPLOAD_DIR, f)).mtime
      }))
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json(files);
  } catch (err) {
    console.error('List images error:', err);
    res.status(500).json({ error: 'Bilder konnten nicht geladen werden' });
  }
});

// DELETE /api/images/:filename — Bild löschen
app.delete('/api/images/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);
    const thumbPath = path.join(THUMBS_DIR, filename.replace('_processed', '_thumb'));

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: 'Bild konnte nicht gelöscht werden' });
  }
});

// ============================================================
// NameBadge API Endpoints
// ============================================================

const NAMEBADGE_UPLOAD_DIR = path.join(__dirname, '../uploads/namebadge');
fs.mkdirSync(NAMEBADGE_UPLOAD_DIR, { recursive: true });

// Multer storage for namebadge uploads
const namebadgeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, NAMEBADGE_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `nb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const namebadgeUploadBg = multer({
  storage: namebadgeStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Nicht erlaubter Dateityp. Erlaubt: PDF, PNG, JPG'));
    }
    cb(null, true);
  }
});

const namebadgeUploadCsv = multer({
  storage: namebadgeStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.csv'].includes(ext)) {
      return cb(new Error('Nicht erlaubter Dateityp. Erlaubt: CSV'));
    }
    cb(null, true);
  }
});

// GET /api/namebadge/backgrounds — List available background templates
app.get('/api/namebadge/backgrounds', (req, res) => {
  try {
    const templatesPath = path.join(__dirname, 'namebadge/templates/index.json');
    const data = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('List backgrounds error:', err);
    res.json({ templates: [] });
  }
});

// Static serving for namebadge templates
app.use('/api/namebadge/templates', express.static(
  path.join(__dirname, 'namebadge/templates')
));

// POST /api/namebadge/upload-background — Upload background image
app.post('/api/namebadge/upload-background', (req, res, next) => {
  namebadgeUploadBg.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Datei zu groß (max. 20MB)' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }

  try {
    const hasBleed = req.body.hasBleed === 'true' || req.body.hasBleed === true;
    const bleedSize = parseFloat(req.body.bleedSize) || 0;

    const result = await extractBackground(req.file.path, { hasBleed, bleedSize });

    // Clean up original upload
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    // Return URL relative to uploads
    const bgUrl = `/uploads/namebadge/${path.basename(result.backgroundPath)}`;

    res.json({
      success: true,
      backgroundUrl: bgUrl,
      width: result.width,
      height: result.height,
      bleedRemoved: hasBleed && bleedSize > 0,
      bleedSize: hasBleed ? bleedSize : 0,
      pages: result.pages,
    });
  } catch (err) {
    console.error('Background upload error:', err);
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ error: err.message || 'Hintergrund-Verarbeitung fehlgeschlagen' });
  }
});

// POST /api/namebadge/upload-backside — Upload back side image
app.post('/api/namebadge/upload-backside', (req, res, next) => {
  namebadgeUploadBg.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Datei zu groß (max. 20MB)' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }

  try {
    const result = await extractBackside(req.file.path);

    // Clean up original upload
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    const backUrl = `/uploads/namebadge/${path.basename(result.backSidePath)}`;

    res.json({
      success: true,
      backSideUrl: backUrl,
    });
  } catch (err) {
    console.error('Backside upload error:', err);
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ error: err.message || 'Rückseiten-Verarbeitung fehlgeschlagen' });
  }
});

// POST /api/namebadge/upload-csv — Upload and parse CSV
// Supports optional columnMapping in form field for manual column mapping
app.post('/api/namebadge/upload-csv', (req, res, next) => {
  namebadgeUploadCsv.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'CSV zu groß (max. 5MB)' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine CSV-Datei hochgeladen' });
  }

  try {
    const buffer = fs.readFileSync(req.file.path);

    // Parse optional columnMapping from form field (JSON string)
    let columnMapping = null;
    if (req.body.columnMapping) {
      try {
        columnMapping = JSON.parse(req.body.columnMapping);
      } catch (_) {
        return res.status(400).json({ error: 'Ungültiges columnMapping JSON' });
      }
    }

    const result = parseCsv(buffer, columnMapping);

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    // If auto-detect failed, return headers so frontend can show mapping UI
    if (result.needsMapping) {
      return res.json({
        success: false,
        needsMapping: true,
        headers: result.headers,
        delimiter: result.delimiter,
      });
    }

    res.json({
      success: true,
      participants: result.participants,
      total: result.total,
      delimiter: result.delimiter,
    });
  } catch (err) {
    console.error('CSV parse error:', err);
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(400).json({ error: err.message || 'CSV-Verarbeitung fehlgeschlagen' });
  }
});

// POST /api/namebadge/render — Render all badges to PDF
app.post('/api/namebadge/render', async (req, res) => {
  const {
    backgroundUrl,
    doubleSided = false,
    backSideUrl = null,
    participants,
    fields,
    badgeSize = { width: 105, height: 148 },
  } = req.body;

  if (!backgroundUrl) {
    return res.status(400).json({ error: 'Hintergrund fehlt' });
  }
  if (!participants || participants.length === 0) {
    return res.status(400).json({ error: 'Keine Teilnehmer angegeben' });
  }
  if (!fields) {
    return res.status(400).json({ error: 'Textfeld-Konfiguration fehlt' });
  }

  try {
    const outputFile = await renderBadges({
      backgroundUrl,
      doubleSided,
      backSideUrl,
      participants,
      fields,
      badgeSize,
    });

    const today = new Date().toISOString().split('T')[0];
    const downloadName = `namensschilder_${today}.pdf`;

    res.download(outputFile, downloadName, (err) => {
      try { fs.unlinkSync(outputFile); } catch (_) {}
      if (err && !res.headersSent) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download fehlgeschlagen' });
      }
    });
  } catch (err) {
    console.error('Badge render error:', err);
    res.status(500).json({ error: err.message || 'Rendering fehlgeschlagen' });
  }
});

// POST /api/namebadge/preview — Render single badge preview as PNG
app.post('/api/namebadge/preview', async (req, res) => {
  const {
    backgroundUrl,
    participants,
    fields,
    badgeSize = { width: 105, height: 148 },
  } = req.body;

  if (!backgroundUrl) {
    return res.status(400).json({ error: 'Hintergrund fehlt' });
  }
  if (!participants || participants.length === 0) {
    return res.status(400).json({ error: 'Kein Teilnehmer angegeben' });
  }

  try {
    const outputFile = await renderPreview({
      backgroundUrl,
      participants: [participants[0]],
      fields,
      badgeSize,
    });

    res.download(outputFile, 'preview.png', (err) => {
      try { fs.unlinkSync(outputFile); } catch (_) {}
      if (err && !res.headersSent) {
        console.error('Preview download error:', err);
        res.status(500).json({ error: 'Download fehlgeschlagen' });
      }
    });
  } catch (err) {
    console.error('Badge preview error:', err);
    res.status(500).json({ error: err.message || 'Vorschau fehlgeschlagen' });
  }
});

const PORT = process.env.PORT || 3010;

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`FlyerGen API running on port ${PORT}`);
    console.log(`Templates: ${Object.keys(templateSchemas).join(', ')}`);
    console.log(`NameBadge API: /api/namebadge/`);
  });
}

module.exports = app;
