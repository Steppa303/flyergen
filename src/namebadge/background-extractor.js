const { execSync } = require('child_process');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const NAMEBADGE_UPLOAD_DIR = path.join(__dirname, '../../uploads/namebadge');

/**
 * Extract background image from uploaded file (PDF, PNG, JPG)
 * @param {string} filePath - Path to uploaded file
 * @param {object} options
 * @param {boolean} options.hasBleed - Whether bleed margin exists
 * @param {number} options.bleedSize - Bleed size in mm
 * @returns {Promise<{ backgroundPath: string, width: number, height: number, pages: number }>}
 */
async function extractBackground(filePath, options = {}) {
  const { hasBleed = false, bleedSize = 0 } = options;
  const ext = path.extname(filePath).toLowerCase();
  const timestamp = Date.now();
  const outputPath = path.join(NAMEBADGE_UPLOAD_DIR, `bg_${timestamp}.png`);

  fs.mkdirSync(NAMEBADGE_UPLOAD_DIR, { recursive: true });

  if (ext === '.pdf') {
    return await extractFromPdf(filePath, outputPath, { hasBleed, bleedSize });
  } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
    return await extractFromImage(filePath, outputPath, { hasBleed, bleedSize });
  } else {
    throw new Error('Nicht erlaubter Dateityp. Erlaubt: PDF, PNG, JPG');
  }
}

/**
 * Extract first page from PDF as PNG using pdftoppm
 */
async function extractFromPdf(pdfPath, outputPath, options) {
  const { hasBleed, bleedSize } = options;
  const tmpPrefix = outputPath.replace('.png', '_tmp');

  try {
    // Get page count
    let pageCount = 1;
    try {
      const info = execSync(`pdfinfo "${pdfPath}" 2>/dev/null | grep Pages`, { encoding: 'utf8' });
      const match = info.match(/Pages:\s*(\d+)/);
      if (match) pageCount = parseInt(match[1]);
    } catch (_) {
      // pdfinfo might not be available, default to 1
    }

    // Convert first page to PNG at 300 DPI
    execSync(
      `pdftoppm -png -r 300 -f 1 -l 1 "${pdfPath}" "${tmpPrefix}"`,
      { stdio: 'pipe' }
    );

    // pdftoppm creates file like tmpPrefix-1.png
    const generatedFile = `${tmpPrefix}-1.png`;
    if (!fs.existsSync(generatedFile)) {
      throw new Error('PDF-Konvertierung fehlgeschlagen: Keine Ausgabedatei');
    }

    // Apply bleed crop if needed
    if (hasBleed && bleedSize > 0) {
      await applyBleedCrop(generatedFile, outputPath, bleedSize);
      fs.unlinkSync(generatedFile);
    } else {
      fs.renameSync(generatedFile, outputPath);
    }

    // Get dimensions
    const metadata = await sharp(outputPath).metadata();

    return {
      backgroundPath: outputPath,
      width: metadata.width,
      height: metadata.height,
      pages: pageCount,
    };
  } catch (err) {
    // Cleanup temp files
    try {
      const tmpFiles = fs.readdirSync(NAMEBADGE_UPLOAD_DIR)
        .filter(f => f.includes(path.basename(tmpPrefix)));
      tmpFiles.forEach(f => {
        try { fs.unlinkSync(path.join(NAMEBADGE_UPLOAD_DIR, f)); } catch (_) {}
      });
    } catch (_) {}
    throw new Error(`PDF-Extraktion fehlgeschlagen: ${err.message}`);
  }
}

/**
 * Process uploaded image (PNG/JPG)
 */
async function extractFromImage(imagePath, outputPath, options) {
  const { hasBleed, bleedSize } = options;

  // Get image info
  const metadata = await sharp(imagePath).metadata();

  if (hasBleed && bleedSize > 0) {
    await applyBleedCrop(imagePath, outputPath, bleedSize);
  } else {
    // Just copy/convert to PNG
    await sharp(imagePath)
      .png({ quality: 95 })
      .toFile(outputPath);
  }

  const finalMetadata = await sharp(outputPath).metadata();

  return {
    backgroundPath: outputPath,
    width: finalMetadata.width,
    height: finalMetadata.height,
    pages: 1,
  };
}

/**
 * Apply bleed crop to an image
 * Crops the image by bleedSize on each side
 * @param {string} inputPath - Input image path
 * @param {string} outputPath - Output image path
 * @param {number} bleedMm - Bleed size in mm
 */
async function applyBleedCrop(inputPath, outputPath, bleedMm) {
  const metadata = await sharp(inputPath).metadata();
  const { width, height } = metadata;

  // Assume 300 DPI for PDF extraction, calculate pixels per mm
  // 300 DPI = 300/25.4 ≈ 11.811 pixels per mm
  const pxPerMm = 300 / 25.4;
  const cropPx = Math.round(bleedMm * pxPerMm);

  // Calculate crop dimensions
  const cropWidth = width - (cropPx * 2);
  const cropHeight = height - (cropPx * 2);

  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new Error('Beschnittzugabe ist zu groß für die Bildgröße');
  }

  await sharp(inputPath)
    .extract({
      left: cropPx,
      top: cropPx,
      width: cropWidth,
      height: cropHeight,
    })
    .png({ quality: 95 })
    .toFile(outputPath);
}

/**
 * Extract backside image from uploaded file
 * @param {string} filePath - Path to uploaded file
 * @returns {Promise<{ backSidePath: string }>}
 */
async function extractBackside(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const timestamp = Date.now();
  const outputPath = path.join(NAMEBADGE_UPLOAD_DIR, `back_${timestamp}.png`);

  fs.mkdirSync(NAMEBADGE_UPLOAD_DIR, { recursive: true });

  if (ext === '.pdf') {
    const tmpPrefix = outputPath.replace('.png', '_tmp');
    try {
      execSync(
        `pdftoppm -png -r 300 -f 1 -l 1 "${filePath}" "${tmpPrefix}"`,
        { stdio: 'pipe' }
      );
      const generatedFile = `${tmpPrefix}-1.png`;
      if (!fs.existsSync(generatedFile)) {
        throw new Error('PDF-Konvertierung fehlgeschlagen');
      }
      fs.renameSync(generatedFile, outputPath);
    } catch (err) {
      throw new Error(`Rückseiten-Extraktion fehlgeschlagen: ${err.message}`);
    }
  } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
    await sharp(filePath)
      .png({ quality: 95 })
      .toFile(outputPath);
  } else {
    throw new Error('Nicht erlaubter Dateityp. Erlaubt: PDF, PNG, JPG');
  }

  return { backSidePath: outputPath };
}

module.exports = { extractBackground, extractBackside };
