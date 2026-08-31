import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParticipantTable from '../ParticipantTable';
import useNameBadgeStore from '../../../store/useNameBadgeStore';

const mockParticipants = Array.from({ length: 60 }, (_, i) => ({
  vorname: `Vorname${i}`,
  nachname: `Nachname${i}`,
  behoerde: `Behörde${i % 3}`,
}));

describe('ParticipantTable', () => {
  beforeEach(() => {
    useNameBadgeStore.getState().reset();
  });

  test('rendert nichts ohne Teilnehmer', () => {
    render(<ParticipantTable />);
    expect(screen.queryByText(/Teilnehmer/)).toBeNull();
  });

  test('zeigt Teilnehmer-Anzahl', () => {
    useNameBadgeStore.setState({ participants: mockParticipants });
    render(<ParticipantTable />);
    expect(screen.getByText(/Teilnehmer \(60\)/)).toBeInTheDocument();
  });

  test('zeigt Suchfeld', () => {
    useNameBadgeStore.setState({ participants: mockParticipants });
    render(<ParticipantTable />);
    expect(screen.getByPlaceholderText('Suchen...')).toBeInTheDocument();
  });

  test('filtert nach Suchbegriff', async () => {
    useNameBadgeStore.setState({ participants: mockParticipants });
    render(<ParticipantTable />);
    const user = userEvent.setup();

    const searchInput = screen.getByPlaceholderText('Suchen...');
    await user.type(searchInput, 'Vorname5');

    // Should show Vorname5, Vorname50-59
    expect(screen.getByText('Vorname5')).toBeInTheDocument();
  });

  test('zeigt Paginierung bei >50 Einträgen', () => {
    useNameBadgeStore.setState({ participants: mockParticipants });
    render(<ParticipantTable />);
    expect(screen.getByText(/Seite 1 von 2/)).toBeInTheDocument();
  });

  test('Pagination funktioniert', async () => {
    useNameBadgeStore.setState({ participants: mockParticipants });
    render(<ParticipantTable />);
    const user = userEvent.setup();

    const nextBtn = screen.getByText('Weiter');
    await user.click(nextBtn);

    expect(screen.getByText(/Seite 2 von 2/)).toBeInTheDocument();
  });

  test('Spalten-Sortierung funktioniert', async () => {
    useNameBadgeStore.setState({ participants: mockParticipants.slice(0, 5) });
    render(<ParticipantTable />);
    const user = userEvent.setup();

    // Click on Vorname header to sort
    const vornameHeader = screen.getByText('Vorname');
    await user.click(vornameHeader);

    // Should be sorted ascending
    const rows = screen.getAllByRole('row');
    // First row is header, second is first data row
    expect(rows[1]).toHaveTextContent('Vorname0');
  });

  test('Klick auf Zeile setzt previewParticipantIndex', async () => {
    useNameBadgeStore.setState({ participants: mockParticipants.slice(0, 5) });
    render(<ParticipantTable />);
    const user = userEvent.setup();

    const row = screen.getByText('Vorname2');
    await user.click(row.closest('tr'));

    expect(useNameBadgeStore.getState().previewParticipantIndex).toBe(2);
  });
});
