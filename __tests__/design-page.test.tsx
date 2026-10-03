import { render, screen } from '@testing-library/react';
import DesignPage from '@/app/design/page';
import { TOKENS } from '@/app/design/tokens';

jest.mock('next/navigation', () => ({ usePathname: () => '/design' }));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () => new Proxy({}, { get: (t: Record<string, unknown>, k: string) => (k in t ? t[k] : jest.fn()) }),
  ) as never;
});

test('the design page shows every token, the type, the blocks and the rules', () => {
  const { container } = render(<DesignPage />);
  expect(screen.getByRole('heading', { level: 1, name: 'How wesleybard.com is built.' })).toBeInTheDocument();
  for (const name of ['Colour', 'Type', 'The header', 'Building blocks', 'Writing', 'Using it on a page']) {
    expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
  }
  const swatches = Array.from(container.querySelectorAll('.sw code'), (c) => c.textContent);
  expect(swatches.sort()).toEqual(TOKENS.map((t) => t.name).sort());
  expect(screen.getByText('#0f4c5c · #7ec4d4')).toBeInTheDocument();
  expect(screen.getAllByRole('group', { name: 'Colour theme' }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: /Play/ })).toBeInTheDocument();
});
