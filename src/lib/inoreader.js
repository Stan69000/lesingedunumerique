const INOREADER_STREAMS_BASE = 'https://www.inoreader.com/reader/api/0/stream/contents';
const INOREADER_OAUTH_TOKEN_URL_DEFAULT = 'https://www.inoreader.com/oauth2/token';
import { getEnv, getEnvNumber } from './env.js';

export const VEILLE_BLOCKS = [
  {
    key: 'arnaques',
    title: 'Dernières arnaques',
    labelEnv: 'INOREADER_LABEL_SCAMS',
    streamEnv: 'INOREADER_STREAM_SCAMS',
    extraStreamsEnv: 'INOREADER_EXTRA_STREAMS_SCAMS',
    defaultExtraStreams: [
      'https://www.inoreader.com/feed/https%3A%2F%2Fwww.google.fr%2Falerts%2Ffeeds%2F01273499914718871183%2F5082566693348274241',
    ],
    suggestedLabel: 'site-asso-arnaques',
  },
  {
    key: 'failles',
    title: 'Dernières fuites de données',
    labelEnv: 'INOREADER_LABEL_VULNERABILITIES',
    streamEnv: 'INOREADER_STREAM_VULNERABILITIES',
    extraStreamsEnv: 'INOREADER_EXTRA_STREAMS_VULNERABILITIES',
    defaultExtraStreams: ['https://www.inoreader.com/feed/https%3A%2F%2Fbonjourlafuite.eu.org%2Ffeed.xml'],
    suggestedLabel: 'site-asso-failles',
  },
  {
    key: 'cyber',
    title: 'Actu',
    labelEnv: 'INOREADER_LABEL_CYBER',
    streamEnv: 'INOREADER_STREAM_CYBER',
    extraStreamsEnv: 'INOREADER_EXTRA_STREAMS_CYBER',
    defaultExtraStreams: [
      'https://news.google.com/rss/search?q=(cybers%C3%A9curit%C3%A9%20OR%20ran%C3%A7ongiciel%20OR%20vuln%C3%A9rabilit%C3%A9)%20(site:cert.ssi.gouv.fr%20OR%20site:anssi.gouv.fr%20OR%20site:numerama.com%20OR%20site:lemonde.fr)&hl=fr&gl=FR&ceid=FR:fr',
    ],
    suggestedLabel: 'site-asso-cyber',
  },
  {
    key: 'associations',
    title: 'Actu associations',
    labelEnv: 'INOREADER_LABEL_ASSOCIATIONS',
    streamEnv: 'INOREADER_STREAM_ASSOCIATIONS',
    extraStreamsEnv: 'INOREADER_EXTRA_STREAMS_ASSOCIATIONS',
    defaultExtraStreams: [
      'https://news.google.com/rss/search?q=(association%20num%C3%A9rique%20OR%20cybers%C3%A9curit%C3%A9%20associations)%20(site:associations.gouv.fr%20OR%20site:service-public.fr%20OR%20site:banque-france.fr)&hl=fr&gl=FR&ceid=FR:fr',
    ],
    suggestedLabel: 'site-asso-associations',
  },
];

const ENRICHED_LABEL_ENV = 'INOREADER_LABEL_ENRICHED';
const ENRICHED_STREAM_ENV = 'INOREADER_STREAM_ENRICHED';
const ENRICHED_LABEL_SUGGESTED = 'site-asso-enrichi';

function decodeHtmlEntities(input = '') {
  return input
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&#160;', ' ');
}

function stripHtml(input = '') {
  return decodeHtmlEntities(String(input).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function getBestUrl(item) {
  if (item?.canonical?.[0]?.href) return item.canonical[0].href;
  if (item?.alternate?.[0]?.href) return item.alternate[0].href;
  return '';
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    const blockedPrefixes = ['utm_', 'fbclid', 'gclid', 'mc_cid', 'mc_eid'];
    for (const key of [...parsed.searchParams.keys()]) {
      if (blockedPrefixes.some((prefix) => key.startsWith(prefix))) {
        parsed.searchParams.delete(key);
      }
    }
    const keepHashAsIdentity = parsed.pathname === '/' && !parsed.search && Boolean(parsed.hash);
    if (!keepHashAsIdentity) {
      parsed.hash = '';
    }
    let normalized = parsed.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return '';
  }
}

function domainFromUrl(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeSourceLabel(rawSource = '', articleUrl = '', blockKey = '') {
  const source = stripHtml(rawSource || '').trim();
  const normalized = source
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const domain = domainFromUrl(articleUrl);

  if (blockKey === 'failles' && domain.includes('bonjourlafuite.eu.org')) {
    return 'bonjourlafuite.eu.org';
  }

  if (blockKey === 'failles' && (normalized.includes('fuite aujourd') || normalized.includes('fuite aujourdhui'))) {
    return 'bonjourlafuite.eu.org';
  }

  if (!source || normalized === 'source externe' || normalized === 'source inconnue') {
    return domain || 'Source externe';
  }

  if (source.length > 48 && domain) {
    return domain;
  }

  return source;
}

function getPublishedAt(item) {
  if (typeof item?.published === 'number') {
    return new Date(item.published * 1000).toISOString();
  }
  if (item?.updated) {
    return new Date(item.updated).toISOString();
  }
  return new Date().toISOString();
}

function toTagList(item) {
  const categories = Array.isArray(item?.categories) ? item.categories : [];
  const blockedTags = new Set([
    'read',
    'reading-list',
    'starred',
    'kept-unread',
    'tracking-kept-unread',
    'broadcast',
    'saved',
    'lock',
    'shared',
  ]);

  return categories
    .map((category) => String(category).split('/').pop())
    .filter(Boolean)
    .map((tag) => String(tag).trim())
    .filter((tag) => {
      if (!tag) return false;
      const normalized = tag.toLowerCase();
      return !normalized.startsWith('state') && !normalized.startsWith('label') && !blockedTags.has(normalized);
    });
}

function normalizeArticle(item, blockKey) {
  const rawUrl = getBestUrl(item);
  const url = normalizeUrl(rawUrl);
  const title = stripHtml(item?.title || 'Article sans titre');
  const source = normalizeSourceLabel(item?.origin?.title || '', url, blockKey);
  const summaryHtml = item?.summary?.content || item?.content?.content || '';
  const summary = stripHtml(summaryHtml);
  const id = String(item?.id || `${title}-${url}`);

  return {
    id,
    title,
    url,
    normalizedUrl: url,
    source,
    publishedAt: getPublishedAt(item),
    summary,
    tags: toTagList(item),
    blockKey,
  };
}

const SCAM_KEYWORDS = [
  'arnaque',
  'escroquerie',
  'phishing',
  'hameconnage',
  'hameçonnage',
  'smishing',
  'vishing',
  'fraude',
  'faux conseiller',
  'faux livreur',
  'faux colis',
  'usurpation',
  'spoofing',
  'carte bancaire',
  'iban',
  'compte bancaire',
  'vol de donnees',
  'vol de données',
  'arnaques',
];

const SCAM_CYBER_CONTEXT_KEYWORDS = [
  'cyber',
  'internet',
  'en ligne',
  'mail',
  'email',
  'sms',
  'telephone',
  'téléphone',
  'application',
  'banque',
  'bancaire',
  'paiement',
  'livraison',
  'colis',
  'reseau social',
  'réseau social',
  'compte',
  'mot de passe',
  'code de verification',
  'code de vérification',
  'donnees personnelles',
  'données personnelles',
  'identite',
  'identité',
  'site web',
];

const SCAM_PRIORITY_DOMAINS = [
  'cybermalveillance.gouv.fr',
  'service-public.fr',
  'economie.gouv.fr',
  'franceinfo.fr',
  'lemonde.fr',
  'lefigaro.fr',
  'bfmtv.com',
  'francetvinfo.fr',
];

function extractDomain(url = '') {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function countKeywordMatches(text, keywords) {
  return keywords.reduce((acc, keyword) => {
    return acc + (text.includes(normalizeTextForSearch(keyword)) ? 1 : 0);
  }, 0);
}

function normalizeTextForSearch(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function keepOnlyScamArticles(articles) {
  const withScore = articles.map((article) => {
    const titleText = normalizeTextForSearch(article.title || '');
    const summaryText = normalizeTextForSearch(article.summary || '');
    const tagsText = normalizeTextForSearch((article.tags || []).join(' '));
    const combinedText = `${titleText} ${summaryText} ${tagsText}`;

    const scamInTitle = countKeywordMatches(titleText, SCAM_KEYWORDS);
    const scamInBody = countKeywordMatches(`${summaryText} ${tagsText}`, SCAM_KEYWORDS);
    const cyberContext = countKeywordMatches(combinedText, SCAM_CYBER_CONTEXT_KEYWORDS);

    const sourceDomain = extractDomain(article.url);
    const sourceLabel = normalizeTextForSearch(article.source || '');
    const hasPrioritySource = SCAM_PRIORITY_DOMAINS.some(
      (domain) => sourceDomain.endsWith(domain) || sourceLabel.includes(normalizeTextForSearch(domain)),
    );

    const score = scamInTitle * 3 + scamInBody * 1 + cyberContext * 1 + (hasPrioritySource ? 2 : 0);
    const isTargeted = scamInTitle > 0 && (cyberContext > 0 || hasPrioritySource);

    return { article, score, isTargeted };
  });

  const filtered = withScore
    .filter((entry) => entry.isTargeted || entry.score >= 5)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.article);

  if (filtered.length > 0) return filtered;

  return withScore
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((entry) => entry.article);
}

function decodeXmlEntities(input = '') {
  return String(input)
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&#160;', ' ');
}

function extractExternalFeedUrlFromInoreaderFeed(stream = '') {
  if (!stream.startsWith('https://www.inoreader.com/feed/')) return '';
  const encoded = stream.split('/feed/')[1] || '';
  if (!encoded) return '';
  try {
    return decodeURIComponent(encoded);
  } catch {
    return '';
  }
}

function extractXmlTagValue(block, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  if (!match) return '';
  return decodeXmlEntities(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim());
}

function extractXmlTagAttribute(block, tagName, attributeName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}=["']([^"']+)["'][^>]*\\/?>`, 'i');
  const match = block.match(regex);
  if (!match) return '';
  return decodeXmlEntities(match[1].trim());
}

function parseExternalRss(xml) {
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  const items = [];
  let match = itemRegex.exec(xml);

  while (match) {
    const block = match[0];
    const title = extractXmlTagValue(block, 'title');
    const guidRaw = extractXmlTagValue(block, 'guid');
    const link = extractXmlTagValue(block, 'link') || guidRaw;
    const description = extractXmlTagValue(block, 'description');
    const source = extractXmlTagValue(block, 'source') || extractXmlTagValue(block, 'dc:creator');
    const guid = guidRaw || link || title;
    const pubDateRaw = extractXmlTagValue(block, 'pubDate');
    const publishedMs = pubDateRaw ? new Date(pubDateRaw).getTime() : NaN;
    const published =
      Number.isFinite(publishedMs) && publishedMs > 0 ? Math.floor(publishedMs / 1000) : Math.floor(Date.now() / 1000);

    items.push({
      id: guid,
      title,
      canonical: [{ href: link }],
      origin: { title: source || 'Source externe' },
      summary: { content: description },
      published,
      categories: [],
    });

    match = itemRegex.exec(xml);
  }

  if (items.length > 0) {
    return items;
  }

  const entryRegex = /<entry\b[\s\S]*?<\/entry>/gi;
  match = entryRegex.exec(xml);

  while (match) {
    const block = match[0];
    const title = extractXmlTagValue(block, 'title');
    const link = extractXmlTagAttribute(block, 'link', 'href') || extractXmlTagValue(block, 'link');
    const description = extractXmlTagValue(block, 'summary') || extractXmlTagValue(block, 'content');
    const source = extractXmlTagValue(block, 'name') || extractXmlTagValue(block, 'author');
    const guid = extractXmlTagValue(block, 'id') || link || title;
    const pubDateRaw = extractXmlTagValue(block, 'published') || extractXmlTagValue(block, 'updated');
    const publishedMs = pubDateRaw ? new Date(pubDateRaw).getTime() : NaN;
    const published =
      Number.isFinite(publishedMs) && publishedMs > 0 ? Math.floor(publishedMs / 1000) : Math.floor(Date.now() / 1000);

    items.push({
      id: guid,
      title,
      canonical: [{ href: link }],
      origin: { title: source || 'Source externe' },
      summary: { content: description },
      published,
      categories: [],
    });

    match = entryRegex.exec(xml);
  }

  return items;
}

function resolveStreamUrl({ label, stream }) {
  if (stream) {
    if (stream.startsWith('https://www.inoreader.com/feed/')) {
      const feedPart = stream.split('/feed/')[1];
      if (feedPart) {
        return `${INOREADER_STREAMS_BASE}/feed/${feedPart}`;
      }
    }

    if (stream.startsWith('http://') || stream.startsWith('https://')) {
      return `${INOREADER_STREAMS_BASE}/feed/${encodeURIComponent(stream)}`;
    }
    return `${INOREADER_STREAMS_BASE}/${stream.replace(/^\//, '')}`;
  }

  return `${INOREADER_STREAMS_BASE}/user/-/label/${encodeURIComponent(label)}`;
}

function parseExtraStreams(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchInoreaderStream(target, authorizationHeader, { pageSize, maxPages }) {
  const externalFromInoreader = extractExternalFeedUrlFromInoreaderFeed(target.stream || '');
  if (externalFromInoreader) {
    const response = await fetch(externalFromInoreader);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `External RSS ${externalFromInoreader} failed (${response.status}): ${errorBody.slice(0, 200)}`,
      );
    }
    const xml = await response.text();
    return parseExternalRss(xml);
  }

  if (target.stream && /^https?:\/\//i.test(target.stream) && !target.stream.includes('inoreader.com/feed/')) {
    const response = await fetch(target.stream);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `External RSS ${target.stream} failed (${response.status}): ${errorBody.slice(0, 200)}`,
      );
    }
    const xml = await response.text();
    return parseExternalRss(xml);
  }

  const allItems = [];
  let continuation = null;
  let page = 0;
  const baseUrl = resolveStreamUrl(target);

  while (page < maxPages) {
    const url = new URL(baseUrl);
    url.searchParams.set('n', String(pageSize));

    if (continuation) {
      url.searchParams.set('c', continuation);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: authorizationHeader,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Inoreader ${target.label || target.stream || 'stream'} failed (${response.status}): ${errorBody.slice(0, 200)}`,
      );
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    allItems.push(...items);

    continuation = payload?.continuation || null;
    page += 1;

    if (!continuation || items.length === 0) {
      break;
    }
  }

  return allItems;
}

async function fetchBlockItems(block, authorizationHeader, { pageSize, maxPages }) {
  const targets = [];
  if (block.stream) {
    targets.push({ label: block.label, stream: block.stream });
  } else if (block.label) {
    targets.push({ label: block.label, stream: '' });
  }

  const configuredExtraStreams = parseExtraStreams(getEnv(block.extraStreamsEnv) || '');
  const defaultExtraStreams = Array.isArray(block.defaultExtraStreams) ? block.defaultExtraStreams : [];
  const extraStreams = [...new Set([...defaultExtraStreams, ...configuredExtraStreams])];

  for (const stream of extraStreams) {
    targets.push({ label: block.label, stream });
  }

  const results = await Promise.allSettled(
    targets.map((target) => fetchInoreaderStream(target, authorizationHeader, { pageSize, maxPages })),
  );

  const items = [];
  const errors = [];
  if (targets.length === 0) {
    return { items, errors, configured: false };
  }

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const target = targets[index];
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      errors.push(`${target.stream || target.label}: ${result.reason?.message || 'unknown error'}`);
    }
  }

  return { items, errors, configured: true };
}

function dedupeArticles(articles) {
  const byId = new Map();
  const byUrl = new Map();

  for (const article of articles) {
    const existingById = byId.get(article.id);
    if (existingById) {
      existingById.tags = [...new Set([...existingById.tags, ...article.tags])];
      continue;
    }

    if (article.normalizedUrl) {
      const existingByUrl = byUrl.get(article.normalizedUrl);
      if (existingByUrl) {
        existingByUrl.tags = [...new Set([...existingByUrl.tags, ...article.tags])];
        continue;
      }
    }

    byId.set(article.id, article);
    if (article.normalizedUrl) {
      byUrl.set(article.normalizedUrl, article);
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

async function resolveInoreaderAuthorizationHeader() {
  const legacyToken = getEnv('INOREADER_TOKEN');
  if (legacyToken) {
    return `GoogleLogin auth=${legacyToken}`;
  }

  const directAccessToken = getEnv('INOREADER_ACCESS_TOKEN');
  if (directAccessToken) {
    return `Bearer ${directAccessToken}`;
  }

  const clientId = getEnv('INOREADER_CLIENT_ID');
  const clientSecret = getEnv('INOREADER_CLIENT_SECRET');
  const refreshToken = getEnv('INOREADER_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Inoreader auth: set INOREADER_TOKEN (legacy) or INOREADER_CLIENT_ID + INOREADER_CLIENT_SECRET + INOREADER_REFRESH_TOKEN',
    );
  }

  const tokenUrl = getEnv('INOREADER_OAUTH_TOKEN_URL') || INOREADER_OAUTH_TOKEN_URL_DEFAULT;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Inoreader OAuth token refresh failed (${response.status}): ${errorBody.slice(0, 220)}`);
  }

  const payload = await response.json();
  const accessToken = payload?.access_token;
  if (!accessToken) {
    throw new Error('Inoreader OAuth token response missing access_token');
  }

  return `Bearer ${accessToken}`;
}

export async function fetchInoreaderData() {
  const authorizationHeader = await resolveInoreaderAuthorizationHeader();

  const pageSize = getEnvNumber('INOREADER_PAGE_SIZE', 100);
  const maxPages = getEnvNumber('INOREADER_MAX_PAGES', 10);

  const blockLabels = VEILLE_BLOCKS.map((block) => ({
    ...block,
    label: getEnv(block.labelEnv) || '',
    stream: getEnv(block.streamEnv) || '',
  }));

  const sections = [];
  const errors = [];

  for (const block of blockLabels) {
    const blockResult = await fetchBlockItems(block, authorizationHeader, { pageSize, maxPages });
    const hasAnyData = blockResult.items.length > 0;

    if (!blockResult.configured) {
      sections.push({
        key: block.key,
        title: block.title,
        label: null,
        stream: null,
        articles: [],
        live: false,
      });
      continue;
    }

    if (hasAnyData) {
      const normalized = blockResult.items.map((item) => normalizeArticle(item, block.key));
      const cleaned = block.key === 'arnaques' ? keepOnlyScamArticles(normalized) : normalized;
      sections.push({
        key: block.key,
        title: block.title,
        label: block.label,
        stream: block.stream || null,
        articles: dedupeArticles(cleaned),
        live: true,
      });
      errors.push(...blockResult.errors);
    } else {
      sections.push({
        key: block.key,
        title: block.title,
        label: block.label,
        stream: block.stream || null,
        articles: [],
        live: false,
      });
      if (blockResult.errors.length > 0) {
        errors.push(...blockResult.errors);
      } else {
        errors.push(`${block.key}: stream returned no items`);
      }
    }
  }

  const enrichedLabel = getEnv(ENRICHED_LABEL_ENV) || '';
  const enrichedStream = getEnv(ENRICHED_STREAM_ENV) || '';
  let enrichmentIds = [];

  if (enrichedLabel || enrichedStream) {
    try {
      const enrichItems = await fetchInoreaderStream(
        { label: enrichedLabel, stream: enrichedStream },
        authorizationHeader,
        { pageSize, maxPages },
      );
      enrichmentIds = [...new Set(enrichItems.map((item) => String(item?.id || '')).filter(Boolean))];
    } catch (error) {
      errors.push(`enrichment: ${error?.message || 'unknown error'}`);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sections,
    enrichmentIds,
    errors,
    liveAvailable: sections.some((section) => section.live),
  };
}
