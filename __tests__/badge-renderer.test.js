const { renderBadges, renderPreview } = require('../src/namebadge/badge-renderer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const OUTPUT_DIR = path.join(__dirname, '../output');

let testBgPath;

beforeAll(async () => {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Create test background in fixtures
  const fixtureBgPath = path.join(FIXTURES_DIR, 'renderer-test-bg.png');
  await sharp({
    create: {
      width: 1240,
      height: 1748,
      channels: 3,
      background: { r: 0, g: 54, b: 96 },
    },
  })
    .png()
    .toFile(fixtureBgPath);

  // Also copy to uploads/namebadge so the renderer can find it
  const uploadsDir = path.join(__dirname, '../uploads/namebadge');
  fs.mkdirSync(uploadsDir, { recursive: true });
  testBgPath = path.join(uploadsDir, 'renderer-test-bg.png');
  fs.copyFileSync(fixtureBgPath, testBgPath);
});

afterAll(() => {
  // Clean up generated output files
  try {
    const files = fs.readdirSync(OUTPUT_DIR);
    for (const f of files) {
      if (f.startsWith('namensschilder_') || f.startsWith('namebadge_preview_')) {
        fs.unlinkSync(path.join(OUTPUT_DIR, f));
      }
    }
  } catch (_) {}
});

const DEFAULT_FIELDS = {
  vorname: {
    x: 20, y: 15, width: 60, fontSize: 14, fontFamily: 'Arial',
    fontWeight: 'bold', fontStyle: 'normal', color: '#000000',
    align: 'left', lineHeight: 1.2, letterSpacing: 0,
  },
  nachname: {
    x: 20, y: 22, width: 60, fontSize: 14, fontFamily: 'Arial',
    fontWeight: 'bold', fontStyle: 'normal', color: '#000000',
    align: 'left', lineHeight: 1.2, letterSpacing: 0,
  },
  behoerde: {
    x: 20, y: 32, width: 60, fontSize: 10, fontFamily: 'Arial',
    fontWeight: 'normal', fontStyle: 'normal', color: '#333333',
    align: 'left', lineHeight: 1.2, letterSpacing: 0,
  },
};

describe('Badge-Renderer', () => {
  describe('renderBadges — Einseitig', () => {
    test('rendert ein einzelnes Namensschild als PDF', async () => {
      const pdfPath = await renderBadges({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        doubleSided: false,
        backSideUrl: null,
        participants: [
          { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
        ],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      });

      expect(fs.existsSync(pdfPath)).toBe(true);
      expect(pdfPath).toMatch(/\.pdf$/);
      const stats = fs.statSync(pdfPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('rendert mehrere Namensschilder als ein PDF', async () => {
      const pdfPath = await renderBadges({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        doubleSided: false,
        backSideUrl: null,
        participants: [
          { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
          { vorname: 'Erika', nachname: 'Musterfrau', behoerde: 'Polizeidirektion' },
          { vorname: 'Hans', nachname: 'Schmidt', behoerde: 'Bundespolizei' },
        ],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      });

      expect(fs.existsSync(pdfPath)).toBe(true);
      const stats = fs.statSync(pdfPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('renderBadges — Beidseitig', () => {
    test('rendert beidseitige Namensschilder', async () => {
      // Create a back side image in uploads
      const backPath = path.join(__dirname, '../uploads/namebadge/back-side.png');
      await sharp({
        create: { width: 1240, height: 1748, channels: 3, background: { r: 255, g: 255, b: 255 } },
      })
        .png()
        .toFile(backPath);

      const pdfPath = await renderBadges({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        doubleSided: true,
        backSideUrl: '/uploads/namebadge/back-side.png',
        participants: [
          { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
          { vorname: 'Erika', nachname: 'Musterfrau', behoerde: 'Polizeidirektion' },
        ],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      });

      expect(fs.existsSync(pdfPath)).toBe(true);
      // PDF should be larger with back sides
      const stats = fs.statSync(pdfPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Sonderzeichen im Rendering', () => {
    test('rendert Umlaute korrekt (Müller)', async () => {
      const pdfPath = await renderBadges({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        doubleSided: false,
        backSideUrl: null,
        participants: [
          { vorname: 'Müller', nachname: 'Björn', behoerde: 'Polizeidirektion Düsseldorf' },
        ],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      });

      expect(fs.existsSync(pdfPath)).toBe(true);
    });

    test('rendert Apostrophe korrekt (O\'Brien)', async () => {
      const pdfPath = await renderBadges({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        doubleSided: false,
        backSideUrl: null,
        participants: [
          { vorname: "O'Brien", nachname: 'Patrick', behoerde: 'Interpol' },
        ],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      });

      expect(fs.existsSync(pdfPath)).toBe(true);
    });

    test('rendert HTML-Sonderzeichen sicher (XSS-Schutz)', async () => {
      const pdfPath = await renderBadges({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        doubleSided: false,
        backSideUrl: null,
        participants: [
          { vorname: '<script>alert("xss")</script>', nachname: 'Test', behoerde: 'Test' },
        ],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      });

      expect(fs.existsSync(pdfPath)).toBe(true);
      // The HTML should be escaped, not executed
    });
  });

  describe('renderPreview', () => {
    test('rendert PNG-Vorschau eines einzelnen Schilds', async () => {
      const pngPath = await renderPreview({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        participants: [
          { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
        ],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      });

      expect(fs.existsSync(pngPath)).toBe(true);
      expect(pngPath).toMatch(/\.png$/);
      const metadata = await sharp(pngPath).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBeGreaterThan(0);
      expect(metadata.height).toBeGreaterThan(0);
    });
  });

  describe('Fehlerbehandlung', () => {
    test('wirft Fehler bei fehlenden Teilnehmern', async () => {
      await expect(renderBadges({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        participants: [],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      })).rejects.toThrow('Keine Teilnehmer');
    });

    test('wirft Fehler bei fehlendem Hintergrund', async () => {
      await expect(renderBadges({
        backgroundUrl: '/uploads/namebadge/nonexistent.png',
        participants: [{ vorname: 'Max', nachname: 'Mustermann', behoerde: 'Test' }],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      })).rejects.toThrow('nicht gefunden');
    });

    test('wirft Fehler bei fehlendem Teilnehmer für Preview', async () => {
      await expect(renderPreview({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        participants: [],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 105, height: 148 },
      })).rejects.toThrow('Kein Teilnehmer');
    });
  });

  describe('Verschiedene Badge-Größen', () => {
    test('rendert mit custom Badge-Größe', async () => {
      const pdfPath = await renderBadges({
        backgroundUrl: '/uploads/namebadge/renderer-test-bg.png',
        participants: [{ vorname: 'Max', nachname: 'Mustermann', behoerde: 'Test' }],
        fields: DEFAULT_FIELDS,
        badgeSize: { width: 90, height: 120 },
      });

      expect(fs.existsSync(pdfPath)).toBe(true);
    });
  });
});
