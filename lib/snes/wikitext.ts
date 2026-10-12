/*
 * Just enough wikitext handling for the SNES tables and review boxes: strip footnotes and markup, read link
 * display text, split on separators that sit outside [[links]] and {{templates}}, and walk table rows.
 */

/** Removes every {{name|…}} for the given template names, nested braces and all. */
export function removeTemplates(s: string, names: string[]): string {
  const open = new RegExp(`\\{\\{\\s*(?:${names.join('|')})\\s*(?:\\||\\}\\})`, 'i');
  let out = s;
  for (let m = out.match(open); m && m.index !== undefined; m = out.match(open)) {
    let depth = 0;
    let end = out.length;
    for (let i = m.index; i < out.length - 1; i++) {
      const two = out.slice(i, i + 2);
      if (two === '{{') {
        depth++;
        i++;
      } else if (two === '}}') {
        depth--;
        i++;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    out = out.slice(0, m.index) + out.slice(end);
  }
  return out;
}

const FOOTNOTES = ['r', 'efn', 'efn-ua', 'efn-lr', 'sfn', 'sfnm', 'refn', 'cn', 'citation needed'];

export function stripNoise(s: string): string {
  return removeTemplates(
    s
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<ref[^>]*\/>/g, '')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/<small>[\s\S]*?<\/small>/g, '')
      .replace(/<sup>[\s\S]*?<\/sup>/g, '')
      .replace(/&nbsp;/g, ' '),
    FOOTNOTES,
  );
}

/** Replaces formatting templates with the text they show: {{small|x}} → x, {{abbr|GEN|Sega Genesis}} → GEN. */
export function unwrapTemplates(s: string): string {
  let out = s.replace(/\{\{'s\}\}/g, "'s").replace(/\{\{'\}\}/g, "'");
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out
      .replace(/\{\{\s*(?:small|nowrap|abbr|tooltip|abbr2|vgr)\s*\|([^{}|]*)(?:\|[^{}]*)?\}\}/gi, '$1')
      // {{ill|Article|lt=Shown|de|…}}: the lt= text, else the article name
      .replace(/\{\{\s*ill\s*\|([^{}|]*)((?:\|[^{}|]*)*)\}\}/gi, (_m, article: string, rest: string) => rest.match(/\|\s*lt\s*=\s*([^|]*)/)?.[1].trim() || article)
      // {{Rating|4|5|score=3.8/5 stars}}: the score= text, else "4/5"
      .replace(/\{\{\s*rating\s*\|([^{}|]*)\|([^{}|]*)((?:\|[^{}|]*)*)\}\}/gi, (_m, a: string, b: string, rest: string) => rest.match(/\|\s*score\s*=\s*([^|]*)/)?.[1].trim() || `${a.trim()}/${b.trim()}`)
      // {{ubl|a|b}} and {{plainlist|…}}: one line per item, as <br /> would give
      .replace(/\{\{\s*(?:ubl|unbulleted list|plainlist|hlist)\s*\|([^{}]*)\}\}/gi, (_m, items: string) => items.split('|').join('<br />'));
  }
  return out;
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
      // `! scope="row" | Title` is a data row's first cell marked up as a row header, not a header row.
      if (line.startsWith('!') && !/^!\s*scope\s*=\s*"?row/i.test(line)) {
        header = true;
        break;
      }
      if (line.startsWith('!')) cells.push(...splitTopLevel(line.slice(1), '!!'));
      else if (line.startsWith('|')) cells.push(...splitTopLevel(line.slice(1), '||'));
      else if (cells.length && line.trim()) cells[cells.length - 1] += '\n' + line;
    }
    if (!header && cells.length) out.push(cells);
  }
  return out;
}

/** Drops leading cell attributes: `id="A"|text` → `text`. */
export function stripCellAttrs(cell: string): string {
  const parts = splitTopLevel(cell);
  if (parts.length > 1 && /^\s*([a-z-]+\s*=\s*("[^"]*"|[^\s|"]+)\s*)+$/i.test(parts[0])) return parts.slice(1).join('|');
  return cell;
}

/** A wikitable as a header plus a full grid of raw cells, with rowspan cells copied down into the rows they span. */
export function tableGrid(table: string): { header: string[]; rows: string[][] } {
  let header: string[] = [];
  const rows: string[][] = [];
  let pending = new Map<number, { left: number; cell: string }>();
  for (const raw of table.split(/\n\|-[^\n]*/)) {
    const cells: { head: boolean; cell: string }[] = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('{|') || line.startsWith('|+') || line.startsWith('|}')) continue;
      if (line.startsWith('!')) for (const c of splitTopLevel(line.slice(1), '!!')) for (const cc of splitTopLevel(c, '||')) cells.push({ head: true, cell: cc });
      else if (line.startsWith('|')) for (const c of splitTopLevel(line.slice(1), '||')) cells.push({ head: false, cell: c });
      else if (cells.length && line.trim()) cells[cells.length - 1].cell += '\n' + line;
    }
    if (!cells.length) continue;
    const rowHeader = cells.some((c) => /scope\s*=\s*"?row/i.test(c.cell));
    if (!rows.length && cells.every((c) => c.head) && !rowHeader) {
      header = cells.map((c) => linkText(unwrapTemplates(stripNoise(stripCellAttrs(c.cell)))));
      continue;
    }
    const row: string[] = [];
    const queue = [...cells];
    for (let col = 0; queue.length || pending.has(col); col++) {
      const carried = pending.get(col);
      if (carried) {
        row.push(carried.cell);
        if (carried.left <= 1) pending.delete(col);
        else pending.set(col, { left: carried.left - 1, cell: carried.cell });
        continue;
      }
      const { cell } = queue.shift()!;
      const attrs = cell.length > stripCellAttrs(cell).length ? cell.slice(0, cell.length - stripCellAttrs(cell).length) : '';
      const content = stripCellAttrs(cell);
      const span = Number(attrs.match(/rowspan\s*=\s*"?(\d+)/i)?.[1] ?? 1);
      if (span > 1) pending.set(col, { left: span - 1, cell: content });
      row.push(content);
    }
    rows.push(row);
    pending = new Map(pending);
  }
  return { header, rows };
}
