const Papa = require('papaparse');
const iconv = require('iconv-lite');

const MAX_ROWS = 500;
const REQUIRED_COLUMNS = ['vorname', 'nachname', 'behoerde'];
const OPTIONAL_COLUMNS = ['workshop'];

// Column name aliases (case-normalized)
const COLUMN_ALIASES = {
  vorname: ['vorname', 'vornamen', 'first name', 'firstname', 'first_name', 'name'],
  nachname: ['nachname', 'nachnamen', 'last name', 'lastname', 'last_name', 'surname', 'family name'],
  behoerde: ['behoerde', 'behörde', 'dienststelle', 'abteilung', 'organisation', 'organization', 'department', 'agency', 'authority', 'office', 'behörde/dienststelle'],
  workshop: ['workshop', 'workshops', 'seminar', 'seminare', 'kurs', 'kurse', 'gruppe', 'group', 'workshop/titel', 'workshop/raum'],
};

// German umlauts and special chars to score encoding quality
const GERMAN_CHARS = /[äöüßÄÖÜ]/g;

// Encodings to try (order matters — most likely for German CSVs first)
// macintosh = MacRoman: Mac users export CSVs in system encoding (common in German offices)
// cp850: DOS/Windows command-line tools often use CP850
// iso-8859-15/1: legacy Linux/Unix
const CANDIDATE_ENCODINGS = ['windows-1252', 'macintosh', 'cp850', 'iso-8859-15', 'iso-8859-1'];

/**
 * Decode a CSV buffer to UTF-8 string with proper encoding detection.
 * Uses iconv-lite for correct byte→character mapping (unlike Buffer.toString
 * which doesn't distinguish Latin-1 from Windows-1252).
 *
 * Strategy:
 * 1. Try UTF-8 — if valid and no replacement chars, use it
 * 2. Otherwise try Windows-1252, ISO-8859-15, ISO-8859-1, CP850
 * 3. Pick the decoding that produces the most German umlauts
 */
function decodeBuffer(buffer) {
  // Remove UTF-8 BOM if present
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    buffer = buffer.slice(3);
  }

  // 1. Try UTF-8
  const utf8Text = buffer.toString('utf8');
  const hasReplacement = utf8Text.includes('\uFFFD');
  const utf8Score = (utf8Text.match(GERMAN_CHARS) || []).length;

  // UTF-8 is valid if no replacement chars AND (has umlauts OR is pure ASCII)
  if (!hasReplacement) {
    return utf8Text;
  }

  // 2. UTF-8 has issues — try candidate encodings via iconv-lite
  let bestText = utf8Text;
  let bestScore = utf8Score;

  for (const enc of CANDIDATE_ENCODINGS) {
    try {
      const candidate = iconv.decode(buffer, enc);
      const score = (candidate.match(GERMAN_CHARS) || []).length;
      if (score > bestScore) {
        bestScore = score;
        bestText = candidate;
      }
    } catch {
      // encoding not supported, skip
    }
  }

  return bestText;
}

/**
 * Parse CSV buffer and return participant list.
 * @param {Buffer} buffer - CSV file buffer
 * @param {Object|null} columnMapping - Optional user-provided column mapping { vorname: 'Spalte A', nachname: 'Spalte B', behoerde: 'Spalte C' }
 * @returns {{ participants: Array, delimiter: string, total: number, headers: string[]|null, needsMapping: boolean }}
 */
function parseCsv(buffer, columnMapping = null) {
  // 1. Decode with best encoding
  let text = decodeBuffer(buffer);

  // 2. Remove null bytes and control characters (except newline, tab, carriage return)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // 3. Auto-detect delimiter: count comma vs semicolon in first line
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  // 4. Parse with papaparse
  const result = Papa.parse(text, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    const criticalErrors = result.errors.filter(e => e.type !== 'FieldMismatch');
    if (criticalErrors.length > 0) {
      throw new Error(`CSV-Parsing Fehler: ${criticalErrors[0].message} (Zeile ${criticalErrors[0].row + 1})`);
    }
  }

  const headers = result.meta.fields || [];

  // 5. Normalize headers for matching (lowercase + normalize umlauts)
  // Handles both lowercase (äöü) and uppercase (ÄÖÜ) since toLowerCase() converts ÄÖÜ→äöü
  const normalizeForMatch = (s) => s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[/\s]+/g, '');

  // 6. Build column map — either from user mapping or auto-detect
  let columnMap = {};

  if (columnMapping) {
    // User-provided mapping: { vorname: 'actual header 1', nachname: 'actual header 2', ... }
    for (const target of REQUIRED_COLUMNS) {
      const mappedHeader = columnMapping[target];
      if (!mappedHeader || !headers.includes(mappedHeader)) {
        throw new Error(`Spalte "${mappedHeader}" nicht in CSV gefunden. Verfügbare: ${headers.join(', ')}`);
      }
      columnMap[target] = mappedHeader;
    }
    // Optional columns: map if provided, skip silently if not
    for (const target of OPTIONAL_COLUMNS) {
      const mappedHeader = columnMapping[target];
      if (mappedHeader && headers.includes(mappedHeader)) {
        columnMap[target] = mappedHeader;
      }
    }
  } else {
    // Auto-detect via aliases (normalized matching for umlauts)
    for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
      const normalizedAliases = aliases.map(a => normalizeForMatch(a));
      const found = headers.find(h => normalizedAliases.includes(normalizeForMatch(h)));
      if (found) {
        columnMap[target] = found;
      }
    }

    // If auto-detect fails, return headers so frontend can show mapping UI
    const missing = REQUIRED_COLUMNS.filter(col => !columnMap[col]);
    if (missing.length > 0) {
      return {
        participants: [],
        delimiter,
        total: 0,
        headers,
        needsMapping: true,
      };
    }
  }

  // 7. Extract and validate data rows
  const participants = [];
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const vorname = (row[columnMap.vorname] || '').trim();
    const nachname = (row[columnMap.nachname] || '').trim();
    const behoerde = (row[columnMap.behoerde] || '').trim();
    const workshop = columnMap.workshop ? (row[columnMap.workshop] || '').trim() : '';

    // Skip completely empty rows
    if (!vorname && !nachname && !behoerde) continue;

    // Validate non-empty
    if (!vorname || !nachname) {
      throw new Error(`Zeile ${i + 2}: Vorname und Nachname sind Pflichtfelder`);
    }

    const participant = { vorname, nachname, behoerde };
    if (workshop) participant.workshop = workshop;
    participants.push(participant);
  }

  // 8. Validate row count
  if (participants.length === 0) {
    throw new Error('CSV enthält keine Datenzeilen');
  }

  if (participants.length > MAX_ROWS) {
    throw new Error(`Maximale Zeilenanzahl (${MAX_ROWS}) überschritten. Gefunden: ${participants.length}`);
  }

  return {
    participants,
    delimiter,
    total: participants.length,
    headers: null,
    needsMapping: false,
  };
}

module.exports = { parseCsv };
