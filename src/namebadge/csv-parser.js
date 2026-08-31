const Papa = require('papaparse');

const MAX_ROWS = 500;
const REQUIRED_COLUMNS = ['vorname', 'nachname', 'behoerde'];

// Column name aliases (case-insensitive)
const COLUMN_ALIASES = {
  vorname: ['vorname', 'vornamen', 'first name', 'firstname', 'first_name', 'name'],
  nachname: ['nachname', 'nachnamen', 'last name', 'lastname', 'last_name', 'surname', 'family name'],
  behoerde: ['behoerde', 'behörde', 'behörde', 'behörde', 'dienststelle', 'abteilung', 'organisation', 'organization', 'department', 'agency', 'authority', 'office', 'behörde/dienststelle'],
};

// German umlauts and special chars to score encoding quality
const GERMAN_CHARS = /[äöüßÄÖÜ]/g;

/**
 * Try multiple encodings and pick the one that produces the most German umlauts.
 * This handles Latin-1, Windows-1252, CP850, ISO-8859-15, etc.
 */
function decodeBuffer(buffer) {
  // First try UTF-8
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  // Count German chars in UTF-8 decode
  const utf8Matches = text.match(GERMAN_CHARS) || [];
  const hasReplacement = text.includes('\uFFFD');

  // If UTF-8 looks good (has umlauts or no replacement chars), use it
  if (!hasReplacement && utf8Matches.length > 0) {
    return text;
  }

  // UTF-8 has issues — try other encodings
  const encodings = ['latin1', 'windows-1252', 'iso-8859-15', 'cp850'];
  let bestText = text;
  let bestScore = utf8Matches.length;

  for (const enc of encodings) {
    try {
      const candidate = buffer.toString(enc);
      const matches = candidate.match(GERMAN_CHARS) || [];
      if (matches.length > bestScore) {
        bestScore = matches.length;
        bestText = candidate;
      }
    } catch {
      // encoding not supported by Buffer.toString, skip
    }
  }

  // Remove BOM if present
  if (bestText.charCodeAt(0) === 0xFEFF) {
    bestText = bestText.slice(1);
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

  // 5. Build column map — either from user mapping or auto-detect
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
  } else {
    // Auto-detect via aliases
    for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
      const found = headers.find(h => aliases.includes(h.toLowerCase()));
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

  // 6. Extract and validate data rows
  const participants = [];
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const vorname = (row[columnMap.vorname] || '').trim();
    const nachname = (row[columnMap.nachname] || '').trim();
    const behoerde = (row[columnMap.behoerde] || '').trim();

    // Skip completely empty rows
    if (!vorname && !nachname && !behoerde) continue;

    // Validate non-empty
    if (!vorname || !nachname) {
      throw new Error(`Zeile ${i + 2}: Vorname und Nachname sind Pflichtfelder`);
    }

    participants.push({ vorname, nachname, behoerde });
  }

  // 7. Validate row count
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
