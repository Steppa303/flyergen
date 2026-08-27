const handlebars = require('handlebars');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class FlyerRenderer {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.outputDir = path.join(__dirname, '../output');
    this.assetsDir = path.join(__dirname, '../assets');

    // Ensure output dir exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Read shared CSS once
    this.sharedCSS = fs.readFileSync(
      path.join(this.templatesDir, 'shared.css'),
      'utf8'
    );

    // Register Handlebars helpers
    this._registerHelpers();
  }

  _registerHelpers() {
    // nl2br: convert newlines to <br>
    handlebars.registerHelper('nl2br', function (text) {
      if (!text) return '';
      return new handlebars.SafeString(
        text.replace(/\n/g, '<br>')
      );
    });

    // join: join array with separator
    handlebars.registerHelper('join', function (arr, sep) {
      if (!Array.isArray(arr)) return '';
      return arr.join(sep);
    });

    // fontSize: auto-shrink font size based on text length
    handlebars.registerHelper('fontSize', function (text, baseSize, minSize, maxChars) {
      if (!text) return new handlebars.SafeString(String(baseSize));
      const len = String(text).length;
      if (len <= maxChars) return new handlebars.SafeString(String(baseSize));
      const size = Math.max(minSize, baseSize * (maxChars / len));
      return new handlebars.SafeString(String(Math.round(size * 10) / 10));
    });

    // ctaFontSize: dynamic font size for CTA circle based on text length
    // Short text → big font, long text → smaller font, to fill the circle
    handlebars.registerHelper('ctaFontSize', function (text, baseSize, minSize) {
      if (!text) return new handlebars.SafeString(String(baseSize));
      var len = String(text).replace(/\s+/g, '').length;
      // Short (<=8): max size
      // Long (>=22): min size
      if (len <= 8) return new handlebars.SafeString(String(baseSize));
      if (len >= 22) return new handlebars.SafeString(String(minSize));
      var size = baseSize - ((baseSize - minSize) * ((len - 8) / 14));
      return new handlebars.SafeString(String(Math.round(size * 10) / 10));
    });

    // fitText: scale font-size so text fits within a given pixel width
    // Usage: {{fitText text baseSize availableWidthPt}} — returns font-size in pt
    // Hash params: formatId, instagramWidth, posterWidth
    handlebars.registerHelper('fitText', function (text, baseSize, availableWidthPt, options) {
      if (!text) return new handlebars.SafeString(String(baseSize));
      baseSize = parseFloat(baseSize) || 56;
      // Format-specific width override
      var fmt = (options && options.hash && options.hash.formatId) || '';
      if (fmt === 'instagram' && options.hash.instagramWidth) {
        availableWidthPt = parseFloat(options.hash.instagramWidth);
      } else if (fmt === 'poster' && options.hash.posterWidth) {
        availableWidthPt = parseFloat(options.hash.posterWidth);
      }
      availableWidthPt = parseFloat(availableWidthPt) || 400;
      var str = String(text).toUpperCase();
      // Weighted character width estimation (uppercase, bold, relative to font-size)
      var totalWidth = 0;
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        if (ch === ' ') totalWidth += 0.30;
        else if ('MW'.indexOf(ch) >= 0) totalWidth += 0.80;
        else if ('NHDUKXB'.indexOf(ch) >= 0) totalWidth += 0.72;
        else if ('AEFPRSZ'.indexOf(ch) >= 0) totalWidth += 0.62;
        else if ('GJLOYTC'.indexOf(ch) >= 0) totalWidth += 0.58;
        else if ('IV'.indexOf(ch) >= 0) totalWidth += 0.42;
        else totalWidth += 0.60;
      }
      // letter-spacing: 0.08em per character (except last)
      var letterSpacing = (str.length > 1) ? (str.length - 1) * 0.08 : 0;
      totalWidth += letterSpacing;
      // totalWidth is in units of font-size (em)
      // availableWidthPt is in pt
      // We need: totalWidth * fontSize <= availableWidthPt
      var maxSize = availableWidthPt / totalWidth;
      var result = Math.min(baseSize, maxSize);
      result = Math.max(result, 12); // min 12pt
      return new handlebars.SafeString(String(Math.round(result * 10) / 10));
    });

    // fitOverlayText: combine two overlay lines and scale to fit available width
    // Usage: {{fitOverlayText line1 line2 baseSize availableWidthPt}}
    // Hash params (for format overrides): instagramWidth, posterWidth
    // The renderer passes formatId via data, so we check data.formatId
    handlebars.registerHelper('fitOverlayText', function (line1, line2, baseSize, availableWidthPt, options) {
      var combined = (line1 || '') + ' ' + (line2 || '');
      baseSize = parseFloat(baseSize) || 56;
      // Check for format-specific width override via hash params
      var fmt = (options && options.hash && options.hash.formatId) || '';
      if (fmt === 'instagram' && options.hash.instagramWidth) {
        availableWidthPt = parseFloat(options.hash.instagramWidth);
      } else if (fmt === 'poster' && options.hash.posterWidth) {
        availableWidthPt = parseFloat(options.hash.posterWidth);
      }
      availableWidthPt = parseFloat(availableWidthPt) || 400;
      var str = combined.toUpperCase();
      var totalWidth = 0;
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        if (ch === ' ') totalWidth += 0.30;
        else if ('MW'.indexOf(ch) >= 0) totalWidth += 0.80;
        else if ('NHDUKXB'.indexOf(ch) >= 0) totalWidth += 0.72;
        else if ('AEFPRSZ'.indexOf(ch) >= 0) totalWidth += 0.62;
        else if ('GJLOYTC'.indexOf(ch) >= 0) totalWidth += 0.58;
        else if ('IV'.indexOf(ch) >= 0) totalWidth += 0.42;
        else totalWidth += 0.60;
      }
      var letterSpacing = (str.length > 1) ? (str.length - 1) * 0.08 : 0;
      totalWidth += letterSpacing;
      var maxSize = availableWidthPt / totalWidth;
      var result = Math.min(baseSize, maxSize);
      result = Math.max(result, 12);
      return new handlebars.SafeString(String(Math.round(result * 10) / 10));
    });

    // ctaLines: split CTA text into lines — max N chars per line (word-boundary aware)
    handlebars.registerHelper('ctaLines', function (text, options) {
      if (!text) return '';
      var maxChars = (options && options.hash && options.hash.maxChars) || 6;
      var words = String(text).split(/\s+/);
      var lines = [];
      var current = '';
      words.forEach(function (word) {
        var test = current ? current + ' ' + word : word;
        if (test.length > maxChars && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      });
      if (current) lines.push(current);
      return lines.map(function (line) {
        return '<div class="cta-line">' + handlebars.Utils.escapeExpression(line) + '</div>';
      }).join('\n');
    });

    // isHidden: check if a field is in the hiddenFields object
    // Usage: {{#unless (isHidden 'fieldId')}}...{{/unless}}
    handlebars.registerHelper('isHidden', function (fieldId, options) {
      var hiddenFields = options.data.root._hiddenFields || {};
      return !!hiddenFields[fieldId];
    });
  }

  /**
   * Rendert einen Flyer
   * @param {string} templateName - Name des Templates (z.B. '01-krimi-tour')
   * @param {object} data - Variablen für das Template
   * @param {object} options - { format: 'png'|'pdf', dpi: 72|300, width, height }
   * @returns {string} - Pfad zur gerenderten Datei
   */
  render(templateName, data, options = {}) {
    const format = options.format || 'png';
    const dpi = options.dpi || 72;

    // 1. Template laden
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template "${templateName}" nicht gefunden: ${templatePath}`);
    }
    let templateSrc = fs.readFileSync(templatePath, 'utf8');

    // 2. CSS inline einbetten (shared.css)
    templateSrc = templateSrc.replace(
      '<link rel="stylesheet" href="shared.css">',
      `<style>\n${this.sharedCSS}\n</style>`
    );

    // 3. Asset-Pfade zu absoluten Pfaden konvertieren
    const absAssetsDir = path.resolve(this.assetsDir);
    templateSrc = templateSrc.replace(
      /\.\.\/assets\//g,
      `file://${absAssetsDir}/`
    );

    // 3b. Für PDF: Weiße SVG-Varianten verwenden (WeasyPrint unterstützt keine CSS-Filter auf <img>)
    if (format === 'pdf') {
      templateSrc = templateSrc.replace(/WBM_Blau\.svg/g, 'WBM_White.svg');
      templateSrc = templateSrc.replace(/stern_Blau\.svg/g, 'stern_White.svg');
      // filter: brightness(0) invert(1) entfernen (nicht mehr nötig)
      templateSrc = templateSrc.replace(/filter:\s*brightness\(0\)\s*invert\(1\);?/g, '');
    }

    // 4. Handlebars kompilieren und rendern
    // imageUrl verarbeiten
    if (data.imageUrl) {
      if (data.imageUrl.startsWith('/uploads/')) {
        // Upload-URL → absoluter Pfad im uploads-Verzeichnis
        const uploadDir = path.join(__dirname, '../uploads');
        const filename = data.imageUrl.replace('/uploads/', '');
        data.imageUrl = 'file://' + path.join(uploadDir, filename);
      } else if (!data.imageUrl.startsWith('http')) {
        // Lokale Datei → absolute file:// URL
        data.imageUrl = 'file://' + path.resolve(data.imageUrl);
      }
    }

    // Inject formatId into data so helpers can access it
    if (options.formatId) {
      data._formatId = options.formatId;
    }

    const template = handlebars.compile(templateSrc);
    let html = template(data);

    // 5. Dimensionen: Format-Override oder Defaults
    let width = options.width || (format === 'pdf' ? 148 : 560);
    let height = options.height || (format === 'pdf' ? 210 : 793);
    let pageWidth, pageHeight;

    // Multiformat: formatId + formats Array
    if (options.formatId && options.formats) {
      const fmt = options.formats.find(f => f.id === options.formatId);
      if (fmt) {
        width = fmt.width;
        height = fmt.height;
        pageWidth = fmt.pageWidth;
        pageHeight = fmt.pageHeight;
      }
    }

    // 6. @page-CSS injizieren (für WeasyPrint PDF)
    if (format === 'pdf' && pageWidth && pageHeight) {
      const pageCSS = `\n@page { size: ${pageWidth} ${pageHeight}; margin: 0; }\n`;
      html = html.replace('</style>', `${pageCSS}</style>`);
    }

    // 7. Body-Klasse für Format hinzufügen
    if (options.formatId) {
      html = html.replace(
        /<body([^>]*)>/,
        `<body$1 class="format-${options.formatId}">`
      );
    }

    // 8. Temporäre HTML-Datei schreiben
    const timestamp = Date.now();
    const tmpHtml = path.join(this.outputDir, `${templateName}_tmp_${timestamp}.html`);
    fs.writeFileSync(tmpHtml, html, 'utf8');

    const outputFile = path.join(this.outputDir, `${templateName}_${timestamp}.${format}`);

    let cmd;
    if (format === 'pdf') {
      // WeasyPrint for PDF output — vector text, correct page sizes
      cmd = `weasyprint "${tmpHtml}" "${outputFile}"`;
    } else {
      // wkhtmltoimage for PNG output
      cmd = [
        'wkhtmltoimage',
        `--width ${width}`,
        `--height ${height}`,
        `--crop-w ${width}`,
        `--crop-h ${height}`,
        '--quality 92',
        '--disable-smart-width',
        '--enable-local-file-access',
        `"${tmpHtml}"`,
        `"${outputFile}"`
      ].join(' ');
    }

    try {
      execSync(cmd, { stdio: 'pipe' });
    } catch (err) {
      try { fs.unlinkSync(tmpHtml); } catch (_) {}
      throw new Error(`${format === 'pdf' ? 'WeasyPrint' : 'wkhtmltoimage'} fehlgeschlagen: ${err.stderr?.toString() || err.message}`);
    }

    // 9. PDF/X-4 Post-Processing (Ghostscript)
    // Converts RGB PDF to CMYK with PDF/X-4:2007 conformance
    // Uses FOGRA27 ICC profile (Coated FOGRA27, ISO 12647-2:2004)
    if (format === 'pdf' && options.formatId !== 'instagram') {
      const cmykFile = outputFile.replace(`_${timestamp}`, `_${timestamp}_cmyk`);
      const absAssets = path.resolve(this.assetsDir);
      const gsCmd = [
        'gs', '-dNOSAFER', '-dNOPAUSE', '-dBATCH', '-dQUIET',
        '-sDEVICE=pdfwrite',
        '-dPDFX',
        '-sColorConversionStrategy=CMYK',
        '-dProcessColorModel=/DeviceCMYK',
        `-sDefaultRGBProfile=${absAssets}/sRGB.icc`,
        `-sOutputICCProfile=${absAssets}/CoatedFOGRA27.icc`,
        `-I${absAssets}`,
        `-sOutputFile="${cmykFile}"`,
        `"${absAssets}/PDFX4_def.ps"`,
        `"${outputFile}"`
      ].join(' ');
      try {
        execSync(gsCmd, { stdio: 'pipe' });
        // Replace RGB PDF with CMYK/PDFX-4 version
        fs.unlinkSync(outputFile);
        fs.renameSync(cmykFile, outputFile);
      } catch (gsErr) {
        // If PDF/X-4 conversion fails, keep RGB version (non-fatal)
        console.warn('PDF/X-4 Konvertierung fehlgeschlagen (RGB wird beibehalten):', gsErr.message);
        try { fs.unlinkSync(cmykFile); } catch (_) {}
      }
    }

    // 10. Temp-Datei löschen
    try { fs.unlinkSync(tmpHtml); } catch (_) {}

    return outputFile;
  }

  /**
   * Gibt das gerenderte HTML zurück (für Debugging)
   */
  renderToHtml(templateName, data) {
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template "${templateName}" nicht gefunden`);
    }
    let templateSrc = fs.readFileSync(templatePath, 'utf8');

    templateSrc = templateSrc.replace(
      '<link rel="stylesheet" href="shared.css">',
      `<style>\n${this.sharedCSS}\n</style>`
    );

    const absAssetsDir = path.resolve(this.assetsDir);
    templateSrc = templateSrc.replace(
      /\.\.\/assets\//g,
      `file://${absAssetsDir}/`
    );

    // imageUrl verarbeiten
    if (data.imageUrl) {
      if (data.imageUrl.startsWith('/uploads/')) {
        const uploadDir = path.join(__dirname, '../uploads');
        const filename = data.imageUrl.replace('/uploads/', '');
        data.imageUrl = 'file://' + path.join(uploadDir, filename);
      } else if (!data.imageUrl.startsWith('http')) {
        data.imageUrl = 'file://' + path.resolve(data.imageUrl);
      }
    }

    const template = handlebars.compile(templateSrc);
    return template(data);
  }
}

module.exports = FlyerRenderer;
