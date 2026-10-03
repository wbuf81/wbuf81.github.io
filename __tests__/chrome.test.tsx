import { render, screen } from '@testing-library/react';
import { Nav } from '@/app/components/Nav';
import Footer from '@/app/components/Footer';

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));

test('header has the wordmark, the two links and the theme switch', () => {
  render(<Nav theme />);
  expect(screen.getByRole('link', { name: 'Wesley Bard' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/#projects');
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
