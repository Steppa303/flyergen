import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackgroundSelector from '../BackgroundSelector';
import useNameBadgeStore from '../../../store/useNameBadgeStore';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BackgroundSelector', () => {
  beforeEach(() => {
    useNameBadgeStore.getState().reset();
    mockFetch.mockReset();
  });

  test('zeigt Upload-Tab als Standard', () => {
    render(<BackgroundSelector />);
    expect(screen.getByText(/Eigene Datei/)).toBeInTheDocument();
    expect(screen.getByText(/PDF, PNG oder JPG hier ablegen/)).toBeInTheDocument();
  });

  test('zeigt Vorlagen-Tab', async () => {
    render(<BackgroundSelector />);
    const user = userEvent.setup();

    const templatesTab = screen.getByText(/Vorlagen/);
    await user.click(templatesTab);

    expect(screen.getByText(/Noch keine Vorlagen verfügbar/)).toBeInTheDocument();
  });

  test('zeigt Beschnittzugabe-Option', () => {
    render(<BackgroundSelector />);
    expect(screen.getByText(/Beschnittzugabe vorhanden/)).toBeInTheDocument();
  });

  test('Beschnittzugabe-Checkbox zeigt Eingabefeld', async () => {
    render(<BackgroundSelector />);
    const user = userEvent.setup();

    const checkbox = screen.getByRole('checkbox', { name: /Beschnittzugabe vorhanden/ });
    await user.click(checkbox);

    expect(screen.getByText(/Zugabe in mm/)).toBeInTheDocument();
  });

  test('zeigt Beidseitig-Option', () => {
    render(<BackgroundSelector />);
    expect(screen.getByText(/Beidseitig drucken/)).toBeInTheDocument();
  });

  test('Beidseitig-Checkbox zeigt Upload-Feld', async () => {
    render(<BackgroundSelector />);
    const user = userEvent.setup();

    const checkbox = screen.getByRole('checkbox', { name: /Beidseitig drucken/ });
    await user.click(checkbox);

    expect(screen.getByText(/Rückseiten-Grafik hochladen/)).toBeInTheDocument();
  });

  test('zeigt hochgeladenen Hintergrund', () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png' });
    render(<BackgroundSelector />);
    const img = screen.getByAltText('Hintergrund');
    expect(img).toHaveAttribute('src', '/uploads/namebadge/bg_test.png');
  });

  test('Tab-Wechsel funktioniert', async () => {
    render(<BackgroundSelector />);
    const user = userEvent.setup();

    // Switch to templates
    await user.click(screen.getByText(/Vorlagen/));
    expect(screen.getByText(/Noch keine Vorlagen verfügbar/)).toBeInTheDocument();

    // Switch back to upload
    await user.click(screen.getByText(/Eigene Datei/));
    expect(screen.getByText(/PDF, PNG oder JPG hier ablegen/)).toBeInTheDocument();
  });
});
