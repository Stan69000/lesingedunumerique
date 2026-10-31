// Relations éditoriales explicites : une occurrence d’un mot ne suffit pas.
export const cleanLexiquePath = value => value.replace(/\/+$/, '');

export function enrichLexique(entries, relations) {
  return entries.map(entry => {
    const links = relations.filter(relation => relation.termes.includes(entry.terme))
      .map(({ href, label }) => ({ href, label }));
    // Conserver le lien antérieur et les sources, sans doublon de destination.
    if (entry.lien) links.push(entry.lien);
    const seen = new Set();
    const liens = links.filter(link => {
      const key = cleanLexiquePath(link.href);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { ...entry, liens };
  });
}

export const lexiqueForPath = (entries, path) => entries.filter(entry =>
  entry.liens.some(link => cleanLexiquePath(link.href) === cleanLexiquePath(path)));
