import fs from 'fs';
import path from 'path';

describe('Articles data validation', () => {
  const articlesDir = path.join(process.cwd(), 'content/articles');

  it('should have articles directory', () => {
    expect(fs.existsSync(articlesDir)).toBe(true);
  });

  it('should have valid MDX files', () => {
    if (fs.existsSync(articlesDir)) {
      const files = fs.readdirSync(articlesDir);
      const mdxFiles = files.filter(f => f.endsWith('.mdx'));

      mdxFiles.forEach(file => {
        const content = fs.readFileSync(path.join(articlesDir, file), 'utf8');
        // Check for frontmatter
        expect(content.startsWith('---')).toBe(true);
        expect(content.indexOf('---', 3)).toBeGreaterThan(3);
      });
    }
  });
});
