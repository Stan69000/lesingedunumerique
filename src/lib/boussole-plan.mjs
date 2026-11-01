/** Select actionable findings; checked boxes never change audit evidence. */
export function selectPlan(checks, budgetMinutes = Infinity) {
  const rank = {action: 0, suggestion: 1};
  const candidates = checks.filter(c => c.planEligible !== false && c.status in rank)
    .sort((a,b) => rank[a.status]-rank[b.status]);
  const chosen = [];
  let total = 0;
  for (const check of candidates) {
    if (chosen.length >= 3) break;
    if (total + check.minutes > budgetMinutes) continue;
    chosen.push(check); total += check.minutes;
  }
  return {checks: chosen, minutes: total};
}
export function glossaryAnchor(term) {
  return term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
export const glossaryByCheck = {
  'SEO-TITLE': ['Balise title', 'SERP'],
  'SEO-DESCRIPTION': ['Méta-description', 'CTR'],
  'SEO-NOINDEX': ['noindex', 'Indexation', 'robots.txt'],
  'SEO-CANONICAL': ['URL canonique', 'Redirection 301'],
  'CONTENT-HEADINGS': ['Titres H1 et H2', 'Intention de recherche'],
  'CONTENT-IMAGES': ['Texte alternatif'],
  'CONTENT-LANG': ['SEO'],
  'TECH-MOBILE': ['Core Web Vitals', 'Rendu JavaScript'],
  'GEO-STRUCTURE': ['Données structurées', 'JSON-LD'],
  'GEO-USEFULNESS': ['Contenu utile', 'GEO'],
  'GEO-CITATIONS': ['Citation IA', 'Robots IA', 'llms.txt'],
};
