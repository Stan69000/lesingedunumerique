// Return text/term segments, never HTML. Callers create text nodes and anchors.
export function lexiqueSegments(text, entries) {
  const aliases = new Map();
  for (const entry of entries) {
    for (const alias of [entry.terme, ...(entry.aussi ?? [])]) {
      if (alias) aliases.set(alias.toLocaleLowerCase('fr'), entry.terme);
    }
  }
  if (!aliases.size) return [{text}];
  const escaped = [...aliases.keys()].sort((a,b)=>b.length-a.length)
    .map(alias=>alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const expression = new RegExp(escaped.join('|'),'giu');
  const urls = [...text.matchAll(/https?:\/\/[^\s<>"»]+/gi)].map(match=>[match.index,match.index+match[0].length]);
  const word = /[\p{L}\p{N}_]/u;
  const segments = []; let cursor = 0;
  for (const match of text.matchAll(expression)) {
    const start = match.index, end = start + match[0].length;
    if ((start && word.test(text[start-1])) || (end<text.length && word.test(text[end]))
      || urls.some(([a,b])=>start<b&&end>a)) continue;
    if (start>cursor) segments.push({text:text.slice(cursor,start)});
    segments.push({text:match[0],terme:aliases.get(match[0].toLocaleLowerCase('fr'))});
    cursor=end;
  }
  if (cursor<text.length) segments.push({text:text.slice(cursor)});
  return segments.length ? segments : [{text}];
}
