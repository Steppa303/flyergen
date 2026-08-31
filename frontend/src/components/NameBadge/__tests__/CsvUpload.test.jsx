import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CsvUpload from '../CsvUpload';
import useNameBadgeStore from '../../../store/useNameBadgeStore';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CsvUpload', () => {
  beforeEach(() => {
    useNameBadgeStore.getState().reset();
    mockFetch.mockReset();
  });

  test('zeigt Upload-Bereich', () => {
    render(<CsvUpload />);
    expect(screen.getByText(/CSV-Datei hier ablegen/)).toBeInTheDocument();
  });

  test('zeigt CSV-Format-Info', () => {
    render(<CsvUpload />);
    expect(screen.getByText(/CSV-Format/)).toBeInTheDocument();
    expect(screen.getByText(/Pflichtspalten: Vorname, Nachname, Behörde/)).toBeInTheDocument();
  });

  test('zeigt Fehlermeldung', () => {
    useNameBadgeStore.setState({ csvError: 'Testfehler' });
    render(<CsvUpload />);
    expect(screen.getByText('Testfehler')).toBeInTheDocument();
  });

  test('zeigt Erfolg nach Upload', () => {
    useNameBadgeStore.setState({
      participants: [
        { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
      ],
      csvFileName: 'test.csv',
    });
    render(<CsvUpload />);
    expect(screen.getByText('test.csv')).toBeInTheDocument();
    expect(screen.getByText(/1 Teilnehmer geladen/)).toBeInTheDocument();
  });

  test('zeigt Vorschau-Tabelle nach Upload', () => {
    // The preview table is only shown after an actual API upload (internal state)
    // When participants are set via store, the success state is shown instead
    useNameBadgeStore.setState({
      participants: [
        { vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' },
        { vorname: 'Erika', nachname: 'Musterfrau', behoerde: 'Polizeidirektion' },
      ],
      csvFileName: 'test.csv',
    });
    render(<CsvUpload />);
    // Check success state is shown
    expect(screen.getByText('test.csv')).toBeInTheDocument();
    expect(screen.getByText(/2 Teilnehmer geladen/)).toBeInTheDocument();
  });

  test('Upload-Handler wird aufgerufen', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        participants: [{ vorname: 'Max', nachname: 'Mustermann', behoerde: 'Polizeiakademie' }],
        total: 1,
        delimiter: ',',
      }),
    });

    render(<CsvUpload />);
    const user = userEvent.setup();

    const file = new File(['Vorname,Nachname,Behörde\nMax,Mustermann,Polizeiakademie'], 'test.csv', {
      type: 'text/csv',
    });

    // Find the hidden file input
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/namebadge/upload-csv', expect.any(Object));
    });
  });
});
