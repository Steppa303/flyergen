const handlebars = require('handlebars');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../../output');
const NAMEBADGE_UPLOAD_DIR = path.join(__dirname, '../../uploads/namebadge');

// Ensure output dir exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Render all name badges into a single PDF
 * @param {object} config
 * @param {string} config.backgroundUrl - URL/path to background image (front side)
 * @param {boolean} config.doubleSided - Whether to render back side
 * @param {string|null} config.backSideUrl - URL/path to back side image
 * @param {Array<{vorname: string, nachname: string, behoerde: string}>} config.participants
 * @param {object} config.fields - Field configuration { vorname, nachname, behoerde }
 * @param {{ width: number, height: number }} config.badgeSize - Badge size in mm
 * @returns {Promise<string>} - Path to generated PDF
 */
async function renderBadges(config) {
  const {
    backgroundUrl,
    doubleSided = false,
    backSideUrl = null,
    participants,
    fields,
    badgeSize = { width: 105, height: 148 },
  } = config;

  if (!participants || participants.length === 0) {
    throw new Error('Keine Teilnehmer zum Rendern');
  }

  // Resolve file paths
  const bgPath = resolveFilePath(backgroundUrl);
  const backPath = backSideUrl ? resolveFilePath(backSideUrl) : null;

  // Verify background exists
  if (!fs.existsSync(bgPath)) {
    throw new Error(`Hintergrundbild nicht gefunden: ${bgPath}`);
  }

  // Build HTML with all badges
  const html = buildBadgeHtml({
    backgroundPath: bgPath,
    backSidePath: backPath,
    doubleSided,
    participants,
    fields,
    badgeSize,
  });

  // Write temp HTML
  const timestamp = Date.now();
  const tmpHtml = path.join(OUTPUT_DIR, `namebadge_tmp_${timestamp}.html`);
  const outputFile = path.join(OUTPUT_DIR, `namensschilder_${timestamp}.pdf`);

  fs.writeFileSync(tmpHtml, html, 'utf8');

  try {
    // Render with WeasyPrint
    execSync(
      `weasyprint "${tmpHtml}" "${outputFile}"`,
      { stdio: 'pipe', timeout: 120000 }
    );
  } catch (err) {
    try { fs.unlinkSync(tmpHtml); } catch (_) {}
    throw new Error(`WeasyPrint fehlgeschlagen: ${err.stderr?.toString() || err.message}`);
  }

  // Cleanup temp HTML
  try { fs.unlinkSync(tmpHtml); } catch (_) {}

  return outputFile;
}

/**
 * Render a single badge preview as PNG
 * @param {object} config - Same as renderBadges but with single participant
 * @returns {Promise<string>} - Path to generated PNG
 */
async function renderPreview(config) {
  const {
    backgroundUrl,
    participants,
    fields,
    badgeSize = { width: 105, height: 148 },
  } = config;

  const participant = participants[0];
  if (!participant) {
    throw new Error('Kein Teilnehmer für Vorschau');
  }

  const bgPath = resolveFilePath(backgroundUrl);
  if (!fs.existsSync(bgPath)) {
    throw new Error(`Hintergrundbild nicht gefunden: ${bgPath}`);
  }

  // Build single-badge HTML
  const html = buildSingleBadgeHtml({
    backgroundPath: bgPath,
    participant,
    fields,
    badgeSize,
  });

  const timestamp = Date.now();
  const tmpHtml = path.join(OUTPUT_DIR, `namebadge_preview_tmp_${timestamp}.html`);
  const outputFile = path.join(OUTPUT_DIR, `namebadge_preview_${timestamp}.png`);

  fs.writeFileSync(tmpHtml, html, 'utf8');

  try {
    // Use wkhtmltoimage for PNG preview
    const widthPx = Math.round(badgeSize.width * 11.811); // 300 DPI
    const heightPx = Math.round(badgeSize.height * 11.811);

    execSync(
      [
        'wkhtmltoimage',
        `--width ${widthPx}`,
        `--height ${heightPx}`,
        `--crop-w ${widthPx}`,
        `--crop-h ${heightPx}`,
        '--quality 92',
        '--disable-smart-width',
        '--enable-local-file-access',
        `"${tmpHtml}"`,
        `"${outputFile}"`,
      ].join(' '),
      { stdio: 'pipe', timeout: 30000 }
    );
  } catch (err) {
    try { fs.unlinkSync(tmpHtml); } catch (_) {}
    throw new Error(`Preview-Rendering fehlgeschlagen: ${err.stderr?.toString() || err.message}`);
  }

  try { fs.unlinkSync(tmpHtml); } catch (_) {}

  return outputFile;
}

/**
 * Resolve a URL path to a local file path
 */
function resolveFilePath(url) {
  if (!url) return null;

  // Already an absolute file path
  if (url.startsWith('/')) {
    // Check if it's an uploads URL
    if (url.startsWith('/uploads/')) {
      return path.join(__dirname, '../..', url);
    }
    return url;
  }

  // Relative path
  return path.resolve(url);
}

/**
 * Build HTML for all badges (multi-page PDF)
 */
function buildBadgeHtml({ backgroundPath, backSidePath, doubleSided, participants, fields, badgeSize }) {
  const bgDataUri = fileToDataUri(backgroundPath);
  const backDataUri = backSidePath ? fileToDataUri(backSidePath) : null;

  const pages = [];

  for (const participant of participants) {
    // Front side
    pages.push(buildBadgePage(participant, fields, bgDataUri, badgeSize, false));

    // Back side (if double-sided)
    if (doubleSided && backDataUri) {
      pages.push(buildBadgePage(null, null, backDataUri, badgeSize, true));
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${badgeSize.width}mm ${badgeSize.height}mm;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  .badge-page {
    width: ${badgeSize.width}mm;
    height: ${badgeSize.height}mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
  }
  .badge-page:last-child {
    page-break-after: auto;
  }
  .badge-bg {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .text-field {
    position: absolute;
    overflow: hidden;
    word-wrap: break-word;
    white-space: pre-wrap;
  }
</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}

/**
 * Build HTML for a single badge preview
 */
function buildSingleBadgeHtml({ backgroundPath, participant, fields, badgeSize }) {
  const bgDataUri = fileToDataUri(backgroundPath);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  .badge-page {
    width: ${badgeSize.width}mm;
    height: ${badgeSize.height}mm;
    position: relative;
    overflow: hidden;
  }
  .badge-bg {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .text-field {
    position: absolute;
    overflow: hidden;
    word-wrap: break-word;
    white-space: pre-wrap;
  }
</style>
</head>
<body>
${buildBadgePage(participant, fields, bgDataUri, badgeSize, false)}
</body>
</html>`;
}

/**
 * Build a single badge page div
 */
function buildBadgePage(participant, fields, bgDataUri, badgeSize, isBackSide) {
  const bgStyle = `background-image: url('${bgDataUri}');`;

  if (isBackSide || !participant || !fields) {
    // Back side: only background, no text
    return `<div class="badge-page">
  <div class="badge-bg" style="${bgStyle}"></div>
</div>`;
  }

  // Front side: background + text fields
  const fieldHtml = Object.entries(fields).map(([fieldId, config]) => {
    const text = escapeHtml(participant[fieldId] || '');
    if (!text) return '';

    const {
      x = 0, y = 0, width = 60,
      fontSize = 14, fontFamily = 'Arial',
      fontWeight = 'normal', fontStyle = 'normal',
      color = '#000000', align = 'left',
      lineHeight = 1.2, letterSpacing = 0,
    } = config;

    return `<div class="text-field" style="
      left: ${x}mm;
      top: ${y}mm;
      width: ${width}mm;
      font-size: ${fontSize}pt;
      font-family: '${fontFamily}', sans-serif;
      font-weight: ${fontWeight};
      font-style: ${fontStyle};
      color: ${color};
      text-align: ${align};
      line-height: ${lineHeight};
      letter-spacing: ${letterSpacing}pt;
    ">${text}</div>`;
  }).filter(Boolean).join('\n  ');

  return `<div class="badge-page">
  <div class="badge-bg" style="${bgStyle}"></div>
  ${fieldHtml}
</div>`;
}

/**
 * Convert a local file to a data URI for embedding in HTML
 */
function fileToDataUri(filePath) {
  if (!filePath) return '';

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  const mime = mimeTypes[ext] || 'image/png';
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { renderBadges, renderPreview };
