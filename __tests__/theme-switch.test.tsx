import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSwitch from '@/app/components/ThemeSwitch';
import { THEME_KEY, THEME_BOOT_SCRIPT } from '@/lib/theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

test('dark sets the attribute and remembers it', () => {
  render(<ThemeSwitch />);
  fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
});

test('match my computer clears the saved choice', () => {
  localStorage.setItem(THEME_KEY, 'light');
  document.documentElement.setAttribute('data-theme', 'light');
  render(<ThemeSwitch />);
  fireEvent.click(screen.getByRole('button', { name: 'Match my computer' }));
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  expect(localStorage.getItem(THEME_KEY)).toBeNull();
});

test('starts from the saved choice', () => {
  localStorage.setItem(THEME_KEY, 'light');
  render(<ThemeSwitch />);
  expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
});

test('the boot script applies a saved theme before React runs', () => {
  localStorage.setItem(THEME_KEY, 'dark');
  new Function(THEME_BOOT_SCRIPT)();
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});

test('the boot script ignores anything that is not light or dark', () => {
  localStorage.setItem(THEME_KEY, 'purple');
  new Function(THEME_BOOT_SCRIPT)();
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
});
