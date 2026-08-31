const { parseCsv } = require('../src/namebadge/csv-parser');

describe('CSV-Parser', () => {
  describe('Trennzeichen-Erkennung', () => {
    test('erkennt Komma als Trennzeichen', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMax,Mustermann,Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.delimiter).toBe(',');
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0]).toEqual({
        vorname: 'Max',
        nachname: 'Mustermann',
        behoerde: 'Polizeiakademie',
      });
    });

    test('erkennt Semikolon als Trennzeichen', () => {
      const csv = Buffer.from('Vorname;Nachname;Behörde\nMax;Mustermann;Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.delimiter).toBe(';');
      expect(result.participants).toHaveLength(1);
    });

    test('bevorzugt Semikolon bei gleicher Anzahl', () => {
      // Semikolon hat mehr Vorkommen in der ersten Zeile
      const csv = Buffer.from('Vorname;Nachname;Behörde;Extra\nMax;Mustermann;Polizeiakademie;Test');
      const result = parseCsv(csv);
      expect(result.delimiter).toBe(';');
    });
  });

  describe('UTF-8 BOM-Handling', () => {
    test('entfernt UTF-8 BOM korrekt', () => {
      // UTF-8 BOM: 0xEF 0xBB 0xBF
      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      const csv = Buffer.concat([bom, Buffer.from('Vorname,Nachname,Behörde\nMax,Mustermann,Polizeiakademie')]);
      const result = parseCsv(csv);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].vorname).toBe('Max');
    });

    test('funktioniert ohne BOM', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMax,Mustermann,Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.participants).toHaveLength(1);
    });
  });

  describe('Umlaute und Sonderzeichen', () => {
    test('verarbeitet Umlaute korrekt', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMüller,Björn,Polizeidirektion Düsseldorf');
      const result = parseCsv(csv);
      expect(result.participants[0].vorname).toBe('Müller');
      expect(result.participants[0].nachname).toBe('Björn');
      expect(result.participants[0].behoerde).toBe('Polizeidirektion Düsseldorf');
    });

    test('verarbeitet Apostrophe (O\'Brien)', () => {
      const csv = Buffer.from("Vorname,Nachname,Behörde\nO'Brien,Patrick,Interpol");
      const result = parseCsv(csv);
      expect(result.participants[0].vorname).toBe("O'Brien");
    });

    test('verarbeitet Akzente (Élodie)', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nÉlodie,Dubois,Police Nationale');
      const result = parseCsv(csv);
      expect(result.participants[0].vorname).toBe('Élodie');
    });

    test('verarbeitet ß', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nHans,Strauß,Polizei Berlin');
      const result = parseCsv(csv);
      expect(result.participants[0].nachname).toBe('Strauß');
    });
  });

  describe('Spalten-Mapping', () => {
    test('erkennt Spalten case-insensitive', () => {
      const csv = Buffer.from('VORNAME,NACHNAME,BEHÖRDE\nMax,Mustermann,Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.participants).toHaveLength(1);
    });

    test('erkennt alternative Spaltennamen', () => {
      const csv = Buffer.from('First Name,Last Name,Department\nMax,Mustermann,Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].vorname).toBe('Max');
    });

    test('erkennt "Name" als Vorname', () => {
      const csv = Buffer.from('Name,Nachname,Behörde\nMax,Mustermann,Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.participants[0].vorname).toBe('Max');
    });

    test('erkennt "Dienststelle" als Behörde', () => {
      const csv = Buffer.from('Vorname,Nachname,Dienststelle\nMax,Mustermann,Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.participants[0].behoerde).toBe('Polizeiakademie');
    });
  });

  describe('Leere Zeilen und Whitespace', () => {
    test('überspringt leere Zeilen', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMax,Mustermann,Polizeiakademie\n\nErika,Musterfrau,Polizeidirektion\n');
      const result = parseCsv(csv);
      expect(result.participants).toHaveLength(2);
    });

    test('entfernt Whitespace um Werte', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\n  Max  ,  Mustermann  ,  Polizeiakademie  ');
      const result = parseCsv(csv);
      expect(result.participants[0].vorname).toBe('Max');
      expect(result.participants[0].nachname).toBe('Mustermann');
      expect(result.participants[0].behoerde).toBe('Polizeiakademie');
    });
  });

  describe('Validierung', () => {
    test('wirft Fehler bei fehlenden Spaltenüberschriften', () => {
      const csv = Buffer.from('Alpha,Beta,Gamma\nMax,Mustermann,Polizei');
      expect(() => parseCsv(csv)).toThrow('Spaltenüberschriften nicht erkannt');
    });

    test('wirft Fehler bei leeren Datenzeilen', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\n,,');
      expect(() => parseCsv(csv)).toThrow('CSV enthält keine Datenzeilen');
    });

    test('wirft Fehler bei fehlendem Vornamen', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\n,Mustermann,Polizeiakademie');
      expect(() => parseCsv(csv)).toThrow('Vorname und Nachname sind Pflichtfelder');
    });

    test('wirft Fehler bei fehlendem Nachnamen', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMax,,Polizeiakademie');
      expect(() => parseCsv(csv)).toThrow('Vorname und Nachname sind Pflichtfelder');
    });

    test('wirft Fehler bei mehr als 500 Zeilen', () => {
      const header = 'Vorname,Nachname,Behörde\n';
      const rows = Array.from({ length: 501 }, (_, i) => `Person${i},Nachname${i},Behörde`).join('\n');
      const csv = Buffer.from(header + rows);
      expect(() => parseCsv(csv)).toThrow('Maximale Zeilenanzahl (500) überschritten');
    });

    test('akzeptiert genau 500 Zeilen', () => {
      const header = 'Vorname,Nachname,Behörde\n';
      const rows = Array.from({ length: 500 }, (_, i) => `Person${i},Nachname${i},Behörde`).join('\n');
      const csv = Buffer.from(header + rows);
      const result = parseCsv(csv);
      expect(result.participants).toHaveLength(500);
      expect(result.total).toBe(500);
    });

    test('Behörde kann leer sein', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMax,Mustermann,');
      const result = parseCsv(csv);
      expect(result.participants[0].behoerde).toBe('');
    });
  });

  describe('Control-Character-Bereinigung', () => {
    test('entfernt Null-Bytes', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMax\x00,Mustermann,Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.participants[0].vorname).toBe('Max');
    });

    test('entfernt Control-Chars außer Newline/Tab/CR', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMa\x01x,Mustermann,Polizeiakademie');
      const result = parseCsv(csv);
      expect(result.participants[0].vorname).toBe('Max');
    });
  });

  describe('Rückgabe-Format', () => {
    test('gibt korrekte Struktur zurück', () => {
      const csv = Buffer.from('Vorname,Nachname,Behörde\nMax,Mustermann,Polizeiakademie\nErika,Musterfrau,Polizeidirektion');
      const result = parseCsv(csv);
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('delimiter');
      expect(result).toHaveProperty('total');
      expect(result.total).toBe(2);
      expect(result.delimiter).toBe(',');
    });
  });
});
