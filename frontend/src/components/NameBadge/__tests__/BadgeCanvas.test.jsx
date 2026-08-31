import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BadgeCanvas from '../BadgeCanvas';
import useNameBadgeStore from '../../../store/useNameBadgeStore';

describe('BadgeCanvas', () => {
  beforeEach(() => {
    useNameBadgeStore.getState().reset();
  });

  test('zeigt Hinweis ohne Hintergrund', () => {
    render(<BadgeCanvas />);
    expect(screen.getByText(/Bitte zuerst einen Hintergrund auswählen/)).toBeInTheDocument();
  });

  test('zeigt Zoom-Controls', () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png' });
    render(<BadgeCanvas />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('zeigt Hintergrund-Bild', () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png' });
    render(<BadgeCanvas />);
    const img = screen.getByAltText('Hintergrund');
    expect(img).toHaveAttribute('src', '/uploads/namebadge/bg_test.png');
  });

  test('zeigt Textfeld-Legende', () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png' });
    render(<BadgeCanvas />);
    // Use getAllByText since 'Vorname' appears both in canvas label and legend button
    const vornameElements = screen.getAllByText('Vorname');
    expect(vornameElements.length).toBeGreaterThanOrEqual(1);
    const nachnameElements = screen.getAllByText('Nachname');
    expect(nachnameElements.length).toBeGreaterThanOrEqual(1);
    const behoerdeElements = screen.getAllByText('Behörde');
    expect(behoerdeElements.length).toBeGreaterThanOrEqual(1);
  });

  test('Zoom-In Button funktioniert', async () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png' });
    render(<BadgeCanvas />);
    const user = userEvent.setup();

    const zoomInBtn = screen.getByTitle('Vergrößern');
    await user.click(zoomInBtn);

    expect(useNameBadgeStore.getState().zoom).toBe(1.25);
  });

  test('Zoom-Out Button funktioniert', async () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png' });
    render(<BadgeCanvas />);
    const user = userEvent.setup();

    const zoomOutBtn = screen.getByTitle('Verkleinern');
    await user.click(zoomOutBtn);

    expect(useNameBadgeStore.getState().zoom).toBe(0.75);
  });

  test('Zoom-Reset Button funktioniert', async () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png', zoom: 2 });
    render(<BadgeCanvas />);
    const user = userEvent.setup();

    const resetBtn = screen.getByTitle('Zurücksetzen');
    await user.click(resetBtn);

    expect(useNameBadgeStore.getState().zoom).toBe(1);
  });

  test('Feld-Legende setzt aktives Feld', async () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png' });
    render(<BadgeCanvas />);
    const user = userEvent.setup();

    // Click the legend button (last 'Vorname' element is the button)
    const vornameButtons = screen.getAllByText('Vorname');
    const vornameBtn = vornameButtons[vornameButtons.length - 1];
    await user.click(vornameBtn);

    expect(useNameBadgeStore.getState().activeField).toBe('vorname');
  });

  test('zeigt Beispieltext wenn keine Teilnehmer', () => {
    useNameBadgeStore.setState({ backgroundUrl: '/uploads/namebadge/bg_test.png' });
    render(<BadgeCanvas />);
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Mustermann')).toBeInTheDocument();
  });

  test('zeigt Teilnehmer-Daten wenn vorhanden', () => {
    useNameBadgeStore.setState({
      backgroundUrl: '/uploads/namebadge/bg_test.png',
      participants: [
        { vorname: 'Erika', nachname: 'Musterfrau', behoerde: 'Polizeidirektion' },
      ],
      previewParticipantIndex: 0,
    });
    render(<BadgeCanvas />);
    expect(screen.getByText('Erika')).toBeInTheDocument();
    expect(screen.getByText('Musterfrau')).toBeInTheDocument();
  });
});
