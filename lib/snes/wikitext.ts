/*
 * Just enough wikitext handling for the SNES tables and review boxes: strip footnotes and markup, read link
 * display text, split on separators that sit outside [[links]] and {{templates}}, and walk table rows.
 */

export function stripNoise(s: string): string {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<small>[\s\S]*?<\/small>/g, '')
    .replace(/<sup>[\s\S]*?<\/sup>/g, '')
    .replace(/\{\{(?:r|efn|sfn|refn)\|[^{}]*\}\}/gi, '')
    .replace(/&nbsp;/g, ' ');
}

export function linkText(s: string): string {
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/''+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitTopLevel(s: string, sep = '|'): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth++;
      cur += two;
      i += 2;
    } else if ((two === '}}' || two === ']]') && depth > 0) {
      depth--;
      cur += two;
      i += 2;
    } else if (depth === 0 && s.startsWith(sep, i)) {
      parts.push(cur);
      cur = '';
      i += sep.length;
    } else {
      cur += s[i];
      i++;
    }
  }
  parts.push(cur);
  return parts;
}

/** The cells of each data row in a wikitable (header rows dropped). Cells may sit one per line or `||`-joined. */
export function tableRows(table: string): string[][] {
  const out: string[][] = [];
  for (const raw of table.split(/\n\|-[^\n]*\n/).slice(1)) {
    const cells: string[] = [];
    let header = false;
    for (const line of raw.split('\n')) {
      if (line.startsWith('!')) {
        header = true;
        break;
      }
      if (line.startsWith('|')) cells.push(...splitTopLevel(line.slice(1), '||'));
      else if (cells.length && line.trim()) cells[cells.length - 1] += '\n' + line;
    }
    if (!header && cells.length) out.push(cells);
  }
  return out;
}

/** Drops leading cell attributes: `id="A"|text` → `text`. */
export function stripCellAttrs(cell: string): string {
  const parts = splitTopLevel(cell);
  if (parts.length > 1 && /^\s*([a-z-]+\s*=\s*"[^"]*"\s*)+$/i.test(parts[0])) return parts.slice(1).join('|');
  return cell;
}
