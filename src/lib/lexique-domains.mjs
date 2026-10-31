export const domainLabels = {numerique:'Numérique au quotidien',seo:'SEO et GEO',accessibilite:'Accessibilité et RGAA',arnaques:'Arnaques et manipulation',jargon:'IA et jargon technique'};
export function domainsFor(entry) {
  const domains=entry.domaines?.length ? [...entry.domaines] : entry.theme.startsWith('SEO et GEO') ? ['seo'] : ['numerique'];
  if(['Texte alternatif','Titres H1 et H2','Accessibilité numérique','PDF'].includes(entry.terme))domains.push('accessibilite');
  if(['URL','Lien hypertexte','Moteur de recherche'].includes(entry.terme))domains.push('seo');
  if(entry.terme==='Lien hypertexte')domains.push('accessibilite');
  if(['Hameçonnage','Harponnage','Smishing','Vishing','Ingénierie sociale','Faux conseiller bancaire','Support technique frauduleux','Usurpation d’identité','Deepfake','Rançongiciel','Logiciel malveillant','Fuite de données','QR code'].includes(entry.terme))domains.push('arnaques');
  if(['JSON','JSON-LD','Markdown','Balise HTML','Attribut HTML','HTML','CSS','Code source','Métadonnée','Prompt','IA générative','Hallucination de l’IA','Algorithme'].includes(entry.terme))domains.push('jargon');
  return [...new Set(domains)];
}
export function normalizeLexique(value='') {return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
export function matchesLexique(entry,{query='',domain='',theme=''}={}) {
  const searchable=[entry.terme,...(entry.aussi||[]),...(entry.recherches||[]),entry.definition,entry.situation,entry.reflexe,entry.theme].join(' ');
  return (!domain||domainsFor(entry).includes(domain))&&(!theme||entry.theme===theme)&&normalizeLexique(query).split(/\s+/).every(word=>normalizeLexique(searchable).includes(word));
}
