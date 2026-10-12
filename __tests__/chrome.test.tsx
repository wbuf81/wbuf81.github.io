import { render, screen, within } from '@testing-library/react';
import { Nav } from '@/app/components/Nav';
import Footer from '@/app/components/Footer';

let mockPath = '/';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));
beforeEach(() => { mockPath = '/'; });

test('header has the wordmark, the three links and the theme switch', () => {
  render(<Nav theme />);
  expect(screen.getByRole('link', { name: 'Wesley Bard' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/#projects');
  expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/videogames');
  expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/#connect');
  expect(screen.getByRole('group', { name: 'Colour theme' })).toBeInTheDocument();
});

test('pages outside the design system get the header without the theme switch', () => {
  render(<Nav />);
  expect(screen.getByRole('link', { name: 'Wesley Bard' })).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Colour theme' })).toBeNull();
});

test('header and footer carry the design system scope', () => {
  const { container } = render(
    <>
      <Nav />
      <Footer />
    </>,
  );
  expect(container.querySelector('header.wb.wb-head')).not.toBeNull();
  expect(container.querySelector('footer.wb.wb-foot')).not.toBeNull();
});

test('footer links LinkedIn, GitHub and the design system', () => {
  render(<Footer />);
  expect(screen.getByRole('link', { name: /Design system/ })).toHaveAttribute('href', '/design');
  expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/wesleybard/');
  expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/wbuf81');
});

test('the nav order is Projects, Games, Connect', () => {
  render(<Nav />);
  expect(within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link').map((a) => a.textContent)).toEqual(['Projects', 'Games', 'Connect']);
});

test('Games is marked current under /videogames, and only there', () => {
  mockPath = '/videogames/snes-history';
  const { unmount } = render(<Nav />);
  expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current');
  unmount();
  mockPath = '/';
  render(<Nav />);
  expect(screen.getByRole('link', { name: 'Games' })).not.toHaveAttribute('aria-current');
});

test('Games is current on /videogames itself and below it, but not on a look-alike path', () => {
  for (const [path, current] of [['/videogames', true], ['/videogames/snes-history/f-zero', true], ['/videogamesxyz', false]] as const) {
    mockPath = path;
    const { unmount } = render(<Nav />);
    const games = screen.getByRole('link', { name: 'Games' });
    if (current) expect(games).toHaveAttribute('aria-current', 'page');
    else expect(games).not.toHaveAttribute('aria-current');
    unmount();
  }
});
