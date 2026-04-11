function normalizeUrl(value = '') {
  try {
    const url = new URL(String(value).trim());
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function normalizeTel(value = '') {
  return String(value).replace(/\D+/g, '');
}

export const OFFICIAL_RESOURCES = [
  { nom: 'Pharos', url: 'https://www.pharos.interieur.gouv.fr' },
  { nom: 'Signal Spam', url: 'https://www.signal-spam.fr' },
  { nom: 'Signalement appels 33700', url: 'https://www.33700.fr' },
  { nom: 'Cybermalveillance.gouv.fr', url: 'https://www.cybermalveillance.gouv.fr' },
  { nom: 'Dépôt de plainte en ligne', url: 'https://www.service-public.fr/particuliers/vosdroits/F1435' },
  { nom: 'SMS frauduleux (33700)', tel: '33700' },
  { nom: 'France Victimes', tel: '116006' },
  { nom: 'Info Escroqueries', tel: '0805805817' },
  { nom: 'Opposition interbancaire', tel: '0892705705' },
];

const ALLOWED_URLS = new Set(OFFICIAL_RESOURCES.map((item) => normalizeUrl(item.url)).filter(Boolean));
const ALLOWED_TELS = new Set(OFFICIAL_RESOURCES.map((item) => normalizeTel(item.tel)).filter(Boolean));

function findOfficialByUrl(url = '') {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  return OFFICIAL_RESOURCES.find((item) => normalizeUrl(item.url) === normalized) || null;
}

function findOfficialByTel(tel = '') {
  const normalized = normalizeTel(tel);
  if (!normalized) return null;
  return OFFICIAL_RESOURCES.find((item) => normalizeTel(item.tel) === normalized) || null;
}

export function enforceOfficialResources(resources) {
  const out = [];
  const seen = new Set();

  for (const resource of resources || []) {
    const url = normalizeUrl(resource?.url || '');
    const tel = normalizeTel(resource?.tel || '');
    const byUrl = findOfficialByUrl(url);
    const byTel = findOfficialByTel(tel);
    const allowedUrl = url && ALLOWED_URLS.has(url);
    const allowedTel = tel && ALLOWED_TELS.has(tel);
    if (!allowedUrl && !allowedTel) continue;

    const official = byUrl || byTel;
    const key = `${url}|${tel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      nom: official?.nom || String(resource?.nom || '').trim(),
      url: official?.url || (allowedUrl ? url : ''),
      tel: official?.tel || (allowedTel ? tel : ''),
    });
  }

  return out.slice(0, 4);
}

export function suggestOfficialResources({ badge = '', tags = [], text = '' }) {
  const haystack = `${badge} ${(tags || []).join(' ')} ${text}`.toLowerCase();
  const picks = [];

  const add = (predicate) => {
    const found = OFFICIAL_RESOURCES.find(predicate);
    if (!found) return;
    if (picks.some((item) => item.nom === found.nom)) return;
    picks.push(found);
  };

  if (haystack.includes('sms') || haystack.includes('smishing')) {
    add((item) => item.nom.includes('33700'));
    add((item) => item.nom === 'Signal Spam');
  }
  if (haystack.includes('email') || haystack.includes('phishing')) {
    add((item) => item.nom === 'Signal Spam');
  }
  if (haystack.includes('banc') || haystack.includes('conseiller')) {
    add((item) => item.nom === 'Info Escroqueries');
  }
  if (haystack.includes('rançong') || haystack.includes('ransomware') || haystack.includes('pirat')) {
    add((item) => item.nom === 'Cybermalveillance.gouv.fr');
  }
  if (haystack.includes('identit')) {
    add((item) => item.nom === 'France Victimes');
  }

  add((item) => item.nom === 'Dépôt de plainte en ligne');

  return picks.slice(0, 3).map((item) => ({
    nom: item.nom,
    url: item.url || '',
    tel: item.tel || '',
  }));
}

