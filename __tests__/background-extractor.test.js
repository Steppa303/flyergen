const { extractBackground, extractBackside } = require('../src/namebadge/background-extractor');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const NAMEBADGE_DIR = path.join(__dirname, '../uploads/namebadge');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Create test fixtures before all tests
beforeAll(async () => {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.mkdirSync(NAMEBADGE_DIR, { recursive: true });

  // Create a test PNG (1240x1748 = A6 at 300 DPI)
  await sharp({
    create: {
      width: 1240,
      height: 1748,
      channels: 3,
      background: { r: 0, g: 54, b: 96 },
    },
  })
    .png()
    .toFile(path.join(FIXTURES_DIR, 'test-bg.png'));

  // Create a test JPG
  await sharp({
    create: {
      width: 1240,
      height: 1748,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .jpeg({ quality: 90 })
    .toFile(path.join(FIXTURES_DIR, 'test-bg.jpg'));

  // Create a test PDF using wkhtmltoimage → actually we need a real PDF
  // Use a simple HTML → PDF approach
  const { execSync } = require('child_process');
  const htmlPath = path.join(FIXTURES_DIR, 'test.html');
  const pdfPath = path.join(FIXTURES_DIR, 'test-bg.pdf');
  fs.writeFileSync(htmlPath, `<!DOCTYPE html><html><head><style>
    @page { size: 105mm 148mm; margin: 0; }
    body { margin: 0; background: navy; width: 105mm; height: 148mm; }
  </style></head><body></body></html>`);
  try {
    execSync(`weasyprint "${htmlPath}" "${pdfPath}"`, { stdio: 'pipe' });
  } catch (_) {
    // If weasyprint not available, skip PDF tests
    console.warn('WeasyPrint not available, PDF tests will be skipped');
  }
});

// Cleanup after all tests
afterAll(() => {
  // Clean up generated files in namebadge dir (not fixtures)
  try {
    const files = fs.readdirSync(NAMEBADGE_DIR);
    for (const f of files) {
      if (f.startsWith('bg_') || f.startsWith('back_')) {
        fs.unlinkSync(path.join(NAMEBADGE_DIR, f));
      }
    }
  } catch (_) {}
});

describe('Background-Extractor', () => {
  describe('PNG-Verarbeitung', () => {
    test('extrahiert PNG-Hintergrund korrekt', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.png');
      const result = await extractBackground(inputPath);

      expect(result).toHaveProperty('backgroundPath');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('pages');
      expect(result.pages).toBe(1);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(fs.existsSync(result.backgroundPath)).toBe(true);
    });

    test('PNG wird als PNG gespeichert', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.png');
      const result = await extractBackground(inputPath);
      const metadata = await sharp(result.backgroundPath).metadata();
      expect(metadata.format).toBe('png');
    });
  });

  describe('JPG-Verarbeitung', () => {
    test('extrahiert JPG-Hintergrund korrekt', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.jpg');
      const result = await extractBackground(inputPath);

      expect(result.pages).toBe(1);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    test('JPG wird zu PNG konvertiert', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.jpg');
      const result = await extractBackground(inputPath);
      const metadata = await sharp(result.backgroundPath).metadata();
      expect(metadata.format).toBe('png');
    });
  });

  describe('PDF-Extraktion', () => {
    const pdfPath = path.join(FIXTURES_DIR, 'test-bg.pdf');
    const hasPdf = fs.existsSync(pdfPath);

    (hasPdf ? test : test.skip)('extrahiert erste Seite aus PDF', async () => {
      const result = await extractBackground(pdfPath);

      expect(result.pages).toBeGreaterThanOrEqual(1);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(fs.existsSync(result.backgroundPath)).toBe(true);
    });

    (hasPdf ? test : test.skip)('PDF wird als PNG gespeichert', async () => {
      const result = await extractBackground(pdfPath);
      const metadata = await sharp(result.backgroundPath).metadata();
      expect(metadata.format).toBe('png');
    });
  });

  describe('Beschnitt-Crop', () => {
    test('schneidet Beschnittzugabe korrekt ab', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.png');
      const resultWithout = await extractBackground(inputPath, { hasBleed: false });
      const resultWith = await extractBackground(inputPath, { hasBleed: true, bleedSize: 2 });

      // With bleed crop, dimensions should be smaller
      expect(resultWith.width).toBeLessThan(resultWithout.width);
      expect(resultWith.height).toBeLessThan(resultWithout.height);
    });

    test('berechnet Crop-Pixel korrekt (300 DPI)', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.png');
      const result = await extractBackground(inputPath, { hasBleed: true, bleedSize: 3 });

      // 3mm at 300 DPI = 3 * 300/25.4 ≈ 35.43px per side
      // Total reduction: ~71px
      const original = await sharp(inputPath).metadata();
      const expectedCropPx = Math.round(3 * 300 / 25.4);
      expect(result.width).toBe(original.width - expectedCropPx * 2);
      expect(result.height).toBe(original.height - expectedCropPx * 2);
    });

    test('wirft Fehler bei zu großer Beschnittzugabe', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.png');
      // Create a small image
      const smallPath = path.join(FIXTURES_DIR, 'small.png');
      await sharp({ create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 0, b: 0 } } })
        .png()
        .toFile(smallPath);

      await expect(extractBackground(smallPath, { hasBleed: true, bleedSize: 10 }))
        .rejects.toThrow('Beschnittzugabe ist zu groß');
    });
  });

  describe('Ungültige Dateitypen', () => {
    test('wirft Fehler bei ungültigem Dateityp', async () => {
      const txtPath = path.join(FIXTURES_DIR, 'test.txt');
      fs.writeFileSync(txtPath, 'not an image');

      await expect(extractBackground(txtPath)).rejects.toThrow('Nicht erlaubter Dateityp');
    });
  });

  describe('Rückseiten-Extraktion', () => {
    test('extrahiert Rückseite aus PNG', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.png');
      const result = await extractBackside(inputPath);

      expect(result).toHaveProperty('backSidePath');
      expect(fs.existsSync(result.backSidePath)).toBe(true);
    });

    test('Rückseite wird als PNG gespeichert', async () => {
      const inputPath = path.join(FIXTURES_DIR, 'test-bg.png');
      const result = await extractBackside(inputPath);
      const metadata = await sharp(result.backSidePath).metadata();
      expect(metadata.format).toBe('png');
    });
  });
});
