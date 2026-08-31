import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextFieldConfig from '../TextFieldConfig';
import useNameBadgeStore from '../../../store/useNameBadgeStore';

describe('TextFieldConfig', () => {
  beforeEach(() => {
    useNameBadgeStore.getState().reset();
  });

  test('zeigt Hinweis ohne aktives Feld', () => {
    render(<TextFieldConfig />);
    expect(screen.getByText(/Klicke auf ein Textfeld/)).toBeInTheDocument();
  });

  test('zeigt Konfiguration für aktives Feld', () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    expect(screen.getByText(/Vorname konfigurieren/)).toBeInTheDocument();
  });

  test('zeigt Schriftgröße-Slider', () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    expect(screen.getByText(/Schriftgröße/)).toBeInTheDocument();
  });

  test('zeigt Schriftart-Dropdown', () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    expect(screen.getByText(/Schriftart/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Arial')).toBeInTheDocument();
  });

  test('zeigt Fett/Kursiv-Buttons', () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    expect(screen.getByText('Fett')).toBeInTheDocument();
    expect(screen.getByText('Kursiv')).toBeInTheDocument();
  });

  test('zeigt Ausrichtungs-Buttons', () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    expect(screen.getByText(/Ausrichtung/)).toBeInTheDocument();
  });

  test('zeigt Farb-Picker', () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    expect(screen.getByText('#000000')).toBeInTheDocument();
  });

  test('Fett-Button toggelt fontWeight', async () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    const user = userEvent.setup();

    // vorname starts with fontWeight: 'bold'
    expect(useNameBadgeStore.getState().fields.vorname.fontWeight).toBe('bold');

    const boldBtn = screen.getByText('Fett');
    await user.click(boldBtn);

    expect(useNameBadgeStore.getState().fields.vorname.fontWeight).toBe('normal');
  });

  test('Kursiv-Button toggelt fontStyle', async () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    const user = userEvent.setup();

    expect(useNameBadgeStore.getState().fields.vorname.fontStyle).toBe('normal');

    const italicBtn = screen.getByText('Kursiv');
    await user.click(italicBtn);

    expect(useNameBadgeStore.getState().fields.vorname.fontStyle).toBe('italic');
  });

  test('Schriftart-Dropdown ändert fontFamily', async () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    const user = userEvent.setup();

    const select = screen.getByDisplayValue('Arial');
    await user.selectOptions(select, 'Helvetica');

    expect(useNameBadgeStore.getState().fields.vorname.fontFamily).toBe('Helvetica');
  });

  test('zeigt Position-Eingabefelder', () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    expect(screen.getByText(/X-Position/)).toBeInTheDocument();
    expect(screen.getByText(/Y-Position/)).toBeInTheDocument();
  });

  test('zeigt Breite-Slider', () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    render(<TextFieldConfig />);
    expect(screen.getByText(/Breite/)).toBeInTheDocument();
  });

  test('wechselt Konfiguration bei Feldwechsel', async () => {
    useNameBadgeStore.setState({ activeField: 'vorname' });
    const { rerender } = render(<TextFieldConfig />);
    expect(screen.getByText(/Vorname konfigurieren/)).toBeInTheDocument();

    useNameBadgeStore.setState({ activeField: 'behoerde' });
    rerender(<TextFieldConfig />);
    // Wait for AnimatePresence transition
    await screen.findByText(/Behörde konfigurieren/);
    expect(screen.getByText(/Behörde konfigurieren/)).toBeInTheDocument();
  });
});
