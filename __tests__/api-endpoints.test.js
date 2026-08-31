const request = require('supertest');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Set test environment before requiring app
process.env.NODE_ENV = 'test';

const app = require('../src/server');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

beforeAll(async () => {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // Create test images if they don't exist
  const pngPath = path.join(FIXTURES_DIR, 'api-test-bg.png');
  if (!fs.existsSync(pngPath)) {
    await sharp({
      create: { width: 1240, height: 1748, channels: 3, background: { r: 0, g: 54, b: 96 } },
    })
      .png()
      .toFile(pngPath);
  }

  const jpgPath = path.join(FIXTURES_DIR, 'api-test-bg.jpg');
  if (!fs.existsSync(jpgPath)) {
    await sharp({
      create: { width: 1240, height: 1748, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .jpeg({ quality: 90 })
      .toFile(jpgPath);
  }

  // Create test CSV
  const csvPath = path.join(FIXTURES_DIR, 'test.csv');
  fs.writeFileSync(csvPath, 'Vorname,Nachname,Behörde\nMax,Mustermann,Polizeiakademie\nErika,Musterfrau,Polizeidirektion');

  // Create invalid CSV
  const invalidCsvPath = path.join(FIXTURES_DIR, 'invalid.csv');
  fs.writeFileSync(invalidCsvPath, 'Name,Surname\nMax,Mustermann');

  // Create empty CSV
  const emptyCsvPath = path.join(FIXTURES_DIR, 'empty.csv');
  fs.writeFileSync(emptyCsvPath, 'Vorname,Nachname,Behörde\n,,');
});

describe('API-Endpoints', () => {
  describe('GET /api/namebadge/backgrounds', () => {
    test('gibt Vorlagen-Liste zurück', async () => {
      const res = await request(app).get('/api/namebadge/backgrounds');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('templates');
      expect(Array.isArray(res.body.templates)).toBe(true);
    });
  });

  describe('POST /api/namebadge/upload-csv', () => {
    test('parst gültige CSV-Datei', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'test.csv');
      const res = await request(app)
        .post('/api/namebadge/upload-csv')
        .attach('file', csvPath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.participants).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.delimiter).toBe(',');
      expect(res.body.participants[0]).toEqual({
        vorname: 'Max',
        nachname: 'Mustermann',
        behoerde: 'Polizeiakademie',
      });
    });

    test('gibt Fehler bei ungültigem CSV-Format zurück', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'invalid.csv');
      const res = await request(app)
        .post('/api/namebadge/upload-csv')
        .attach('file', csvPath);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('gibt Fehler bei leerer CSV zurück', async () => {
      const csvPath = path.join(FIXTURES_DIR, 'empty.csv');
      const res = await request(app)
        .post('/api/namebadge/upload-csv')
        .attach('file', csvPath);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('keine Datenzeilen');
    });

    test('gibt Fehler ohne Datei zurück', async () => {
      const res = await request(app)
        .post('/api/namebadge/upload-csv');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Keine CSV-Datei');
    });
  });

  describe('POST /api/namebadge/upload-background', () => {
    test('lädt PNG-Hintergrund hoch', async () => {
      const pngPath = path.join(FIXTURES_DIR, 'api-test-bg.png');
      const res = await request(app)
        .post('/api/namebadge/upload-background')
        .attach('file', pngPath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.backgroundUrl).toMatch(/\/uploads\/namebadge\/bg_.*\.png/);
      expect(res.body.width).toBeGreaterThan(0);
      expect(res.body.height).toBeGreaterThan(0);
      expect(res.body.pages).toBe(1);
    });

    test('lädt JPG-Hintergrund hoch', async () => {
      const jpgPath = path.join(FIXTURES_DIR, 'api-test-bg.jpg');
      const res = await request(app)
        .post('/api/namebadge/upload-background')
        .attach('file', jpgPath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('verarbeitet Beschnittzugabe', async () => {
      const pngPath = path.join(FIXTURES_DIR, 'api-test-bg.png');
      const res = await request(app)
        .post('/api/namebadge/upload-background')
        .field('hasBleed', 'true')
        .field('bleedSize', '2')
        .attach('file', pngPath);

      expect(res.status).toBe(200);
      expect(res.body.bleedRemoved).toBe(true);
      expect(res.body.bleedSize).toBe(2);
    });

    test('gibt Fehler ohne Datei zurück', async () => {
      const res = await request(app)
        .post('/api/namebadge/upload-background');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Keine Datei');
    });
  });

  describe('POST /api/namebadge/upload-backside', () => {
    test('lädt Rückseiten-Grafik hoch', async () => {
      const pngPath = path.join(FIXTURES_DIR, 'api-test-bg.png');
      const res = await request(app)
        .post('/api/namebadge/upload-backside')
        .attach('file', pngPath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.backSideUrl).toMatch(/\/uploads\/namebadge\/back_.*\.png/);
    });
  });

  describe('POST /api/namebadge/render', () => {
    let bgUrl;

    beforeAll(async () => {
      // Upload a background first
      const pngPath = path.join(FIXTURES_DIR, 'api-test-bg.png');
      const res = await request(app)
        .post('/api/namebadge/upload-background')
        .attach('file', pngPath);
      bgUrl = res.body.backgroundUrl;
    });

    test('rendert PDF mit gültigen Daten', async () => {
      const res = await request(app)
        .post('/api/namebadge/render')
        .send({
          backgroundUrl: bgUrl,
          participants: [
            { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
          ],
          fields: {
            vorname: { x: 20, y: 15, width: 60, fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', color: '#000000', align: 'left' },
            nachname: { x: 20, y: 22, width: 60, fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', color: '#000000', align: 'left' },
            behoerde: { x: 20, y: 32, width: 60, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', color: '#333333', align: 'left' },
          },
          badgeSize: { width: 105, height: 148 },
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('gibt Fehler bei fehlendem Hintergrund zurück', async () => {
      const res = await request(app)
        .post('/api/namebadge/render')
        .send({
          participants: [{ vorname: 'Max', nachname: 'Mustermann', behoerde: 'Test' }],
          fields: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Hintergrund');
    });

    test('gibt Fehler bei fehlenden Teilnehmern zurück', async () => {
      const res = await request(app)
        .post('/api/namebadge/render')
        .send({
          backgroundUrl: bgUrl,
          participants: [],
          fields: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Teilnehmer');
    });
  });

  describe('POST /api/namebadge/preview', () => {
    let bgUrl;

    beforeAll(async () => {
      const pngPath = path.join(FIXTURES_DIR, 'api-test-bg.png');
      const res = await request(app)
        .post('/api/namebadge/upload-background')
        .attach('file', pngPath);
      bgUrl = res.body.backgroundUrl;
    });

    test('rendert PNG-Vorschau', async () => {
      const res = await request(app)
        .post('/api/namebadge/preview')
        .send({
          backgroundUrl: bgUrl,
          participants: [
            { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
          ],
          fields: {
            vorname: { x: 20, y: 15, width: 60, fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', color: '#000000', align: 'left' },
            nachname: { x: 20, y: 22, width: 60, fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', color: '#000000', align: 'left' },
            behoerde: { x: 20, y: 32, width: 60, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', color: '#333333', align: 'left' },
          },
          badgeSize: { width: 105, height: 148 },
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');
    });
  });

  describe('Bestehende Endpoints (Regression)', () => {
    test('GET /api/templates funktioniert noch', async () => {
      const res = await request(app).get('/api/templates');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('GET /api/templates/:id funktioniert noch', async () => {
      const res = await request(app).get('/api/templates/01-krimi-tour');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('01-krimi-tour');
    });
  });
});
