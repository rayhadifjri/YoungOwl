/**
 * Minimal, dependency-free Markdown renderer for trusted lesson content (seeded by us, not user
 * input). Supports headings, paragraphs, bold, inline code, fenced code blocks, bullet lists,
 * blockquotes and simple pipe tables. It never uses dangerouslySetInnerHTML.
 */
import type { ReactNode } from 'react';

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on `code` and **bold**; everything else is plain text.
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      nodes.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded bg-slate-900/[0.06] px-1 py-0.5 font-mono text-[0.85em] text-slate-700"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-slate-900">
          {tok.slice(2, -2)}
        </strong>,
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trimStart().startsWith('```')) body.push(lines[i++]!);
      i++; // closing fence
      blocks.push(
        <pre
          key={key++}
          className="my-3 overflow-auto rounded-xl bg-slate-900/[0.04] p-3 font-mono text-[12px] leading-relaxed text-slate-700 ring-1 ring-slate-200/70"
        >
          <code>{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1]!.length;
      const cls =
        level === 1
          ? 'mt-1 mb-3 text-2xl font-light tracking-tight text-slate-900'
          : level === 2
            ? 'mt-5 mb-2 text-lg font-medium text-slate-900'
            : 'mt-4 mb-1.5 text-sm font-semibold text-slate-800';
      const content2 = renderInline(h[2]!, `h${key}`);
      blocks.push(
        level === 1 ? (
          <h2 key={key++} className={cls}>
            {content2}
          </h2>
        ) : level === 2 ? (
          <h3 key={key++} className={cls}>
            {content2}
          </h3>
        ) : (
          <h4 key={key++} className={cls}>
            {content2}
          </h4>
        ),
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>'))
        body.push(lines[i++]!.replace(/^>\s?/, ''));
      blocks.push(
        <blockquote
          key={key++}
          className="my-3 border-l-2 border-cyan-300/70 bg-cyan-50/40 py-2 pl-4 pr-3 text-sm text-slate-600"
        >
          {renderInline(body.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // Table (pipe) — header row, separator, body rows
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?[-:\s|]+\|?\s*$/.test(lines[i + 1]!)
    ) {
      const cells = (row: string) =>
        row
          .replace(/^\s*\|/, '')
          .replace(/\|\s*$/, '')
          .split('|')
          .map((c) => c.trim());
      const header = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.includes('|')) rows.push(cells(lines[i++]!));
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th
                    key={ci}
                    className="border-b border-slate-200/80 px-3 py-1.5 text-left text-xs font-semibold text-slate-600"
                  >
                    {renderInline(c, `th${key}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className="border-b border-slate-200/50 px-3 py-1.5 text-slate-600"
                    >
                      {renderInline(c, `td${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i++]!.replace(/^\s*[-*]\s+/, ''));
      }
      blocks.push(
        <ul key={key++} className="my-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `li${key}-${ii}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i++]!.replace(/^\s*\d+\.\s+/, ''));
      }
      blocks.push(
        <ol key={key++} className="my-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `ol${key}-${ii}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph (gather until blank)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !/^(#{1,4}\s|>|\s*[-*]\s|\s*\d+\.\s|```)/.test(lines[i]!)
    ) {
      para.push(lines[i++]!);
    }
    blocks.push(
      <p key={key++} className="my-2 text-sm leading-relaxed text-slate-600">
        {renderInline(para.join(' '), `p${key}`)}
      </p>,
    );
  }

  return <div className="max-w-none">{blocks}</div>;
}
