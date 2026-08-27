const express = require('express');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const FlyerRenderer = require('./renderer');
const { upload, processImage, UPLOAD_DIR, THUMBS_DIR } = require('./upload');

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
    name: 'Krimi-Tour',
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
  '03-pol-informatik': {
    name: 'Polizei-Informatik',
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
  const templates = Object.entries(templateSchemas).map(([id, schema]) => ({
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
  const { template, data, format, dpi, formatId } = req.body;

  if (!template || !templateSchemas[template]) {
    return res.status(400).json({ error: 'Ungültiges Template. Verfügbare: ' + Object.keys(templateSchemas).join(', ') });
  }

  // Default-Werte setzen
  const schema = templateSchemas[template];
  const renderData = {};
  schema.fields.forEach(field => {
    renderData[field.id] = data?.[field.id] ?? field.default;
  });

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
  const { template, data } = req.body;

  if (!template || !templateSchemas[template]) {
    return res.status(400).json({ error: 'Ungültiges Template' });
  }

  const schema = templateSchemas[template];
  const renderData = {};
  schema.fields.forEach(field => {
    renderData[field.id] = data?.[field.id] ?? field.default;
  });

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

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`FlyerGen API running on port ${PORT}`);
  console.log(`Templates: ${Object.keys(templateSchemas).join(', ')}`);
});
