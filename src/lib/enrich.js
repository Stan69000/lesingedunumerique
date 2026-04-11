import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getEnv } from './env.js';
import { enforceOfficialResources, suggestOfficialResources } from './flash-resources.js';

const CACHE_FILE = path.resolve(process.cwd(), 'cache/enriched.json');
const FLASH_SYSTEM_PROMPT_FILE = path.resolve(process.cwd(), 'config/flash/system_prompt_cyber_actu.md');
const FLASH_SYSTEM_PROMPT = `Tu es un expert en cybersécurité spécialisé dans la vulgarisation pour le grand public.
Tu travailles pour Le Singe du Numérique, une association de sensibilisation au numérique.

À partir du contenu d'un article de presse fourni, tu produis un "Flash Cyber Actu" structuré.

Règles impératives :
- Langue : français, niveau grand public, zéro jargon technique
- Ton : pédagogique, factuel, sans alarmisme
- Longueur : concis — chaque champ respecte les limites indiquées
- Tu ne produis QUE du JSON valide, sans markdown, sans texte avant ou après
- Si l'article ne concerne pas la cybersécurité ou la fraude numérique, retourne {"erreur": "Contenu hors périmètre"}`;

const FLASH_SCHEMA = {
  meta: {
    titre: 'Titre accrocheur du flash, 10 mots max',
    badge: 'Ex: Alerte escroquerie | Phishing | Ransomware | Vol de données | Fraude',
    date_publication: 'YYYY-MM-DD',
    source_nom: 'Nom du média source',
    source_url: "URL de l'article original",
    niveau_risque: 'faible | modéré | élevé | critique',
  },
  que_sest_il_passe: {
    resume: "2-3 phrases max. Expliquer le quoi, le comment, et pourquoi c'est nouveau ou inquiétant.",
    nouveaute: "Ce qui distingue cette menace des arnaques classiques. 1-2 phrases.",
  },
  comment_se_proteger: [
    'Conseil 1 — actionnable, une phrase',
    'Conseil 2 — actionnable, une phrase',
    'Conseil 3 — actionnable, une phrase',
  ],
  en_cas_dincident: [
    'Action 1 — avec ressource concrète si possible (numéro, URL)',
    'Action 2',
    'Action 3',
  ],
  ressources: [{ nom: 'Nom de la ressource', url: 'https://...' }],
  tags: ['tag1', 'tag2', 'tag3'],
};

let systemPromptCache = null;

function extractFirstCodeBlock(markdown = '') {
  const match = markdown.match(/```(?:[a-zA-Z]+)?\n([\s\S]*?)```/);
  return match?.[1]?.trim() || '';
}

async function loadFlashSystemPrompt() {
  if (systemPromptCache) return systemPromptCache;
  try {
    const file = await readFile(FLASH_SYSTEM_PROMPT_FILE, 'utf-8');
    const extracted = extractFirstCodeBlock(file);
    systemPromptCache = extracted || FLASH_SYSTEM_PROMPT;
    return systemPromptCache;
  } catch {
    systemPromptCache = FLASH_SYSTEM_PROMPT;
    return systemPromptCache;
  }
}

function emptyCache() {
  return {};
}

function asStringArray(value, maxItems = 4) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeFlashPayload(payload, article) {
  if (payload?.erreur) {
    return {
      error: String(payload.erreur),
    };
  }

  // Backward compatibility with previous schema.
  if (payload?.about || payload?.protection || payload?.incident) {
    return {
      meta: {
        titre: String(article?.title || '').trim(),
        badge: 'Alerte escroquerie',
        date_publication: String(article?.publishedAt || '').slice(0, 10),
        source_nom: String(article?.source || ''),
        source_url: String(article?.url || ''),
        niveau_risque: 'élevé',
      },
      que_sest_il_passe: {
        resume: String(payload?.about || ''),
        nouveaute: String(payload?.concerned || ''),
      },
      comment_se_proteger: asStringArray(String(payload?.protection || '').split(/(?:\.\s+|;\s+)/g), 3),
      en_cas_dincident: asStringArray(String(payload?.incident || '').split(/(?:\.\s+|;\s+)/g), 3),
      ressources: [],
      tags: asStringArray(payload?.tags, 5),
    };
  }

  return {
    meta: {
      titre: String(payload?.meta?.titre || article?.title || '').trim(),
      badge: String(payload?.meta?.badge || 'Alerte escroquerie').trim(),
      date_publication: String(payload?.meta?.date_publication || String(article?.publishedAt || '').slice(0, 10)),
      source_nom: String(payload?.meta?.source_nom || article?.source || '').trim(),
      source_url: String(payload?.meta?.source_url || article?.url || '').trim(),
      niveau_risque: String(payload?.meta?.niveau_risque || 'modéré').trim(),
    },
    que_sest_il_passe: {
      resume: String(payload?.que_sest_il_passe?.resume || '').trim(),
      nouveaute: String(payload?.que_sest_il_passe?.nouveaute || '').trim(),
    },
    comment_se_proteger: asStringArray(payload?.comment_se_proteger, 3),
    en_cas_dincident: asStringArray(payload?.en_cas_dincident, 3),
    ressources: Array.isArray(payload?.ressources)
      ? payload.ressources
          .map((item) => ({
            nom: String(item?.nom || '').trim(),
            url: String(item?.url || '').trim(),
            tel: String(item?.tel || '').trim(),
          }))
          .filter((item) => item.nom && (item.url || item.tel))
          .slice(0, 4)
      : [],
    tags: asStringArray(payload?.tags, 6),
  };
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function extractJsonObject(input) {
  const direct = safeJsonParse(input);
  if (direct) return direct;

  const firstBrace = input.indexOf('{');
  const lastBrace = input.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return safeJsonParse(input.slice(firstBrace, lastBrace + 1));
}

export async function readEnrichedCache() {
  try {
    const raw = await readFile(CACHE_FILE, 'utf-8');
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return emptyCache();
    }
    return parsed;
  } catch {
    return emptyCache();
  }
}

export async function writeEnrichedCache(cache) {
  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8');
}

async function callClaudeForEnrichment(article) {
  const apiKey = getEnv('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing');
  }

  const configuredModel = getEnv('ANTHROPIC_MODEL');
  const fallbackModels = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250929'];
  const modelsToTry = [...new Set([configuredModel, ...fallbackModels].filter(Boolean))];
  const apiUrl = getEnv('ANTHROPIC_API_URL') || 'https://api.anthropic.com/v1/messages';
  const systemPrompt = await loadFlashSystemPrompt();

  const prompt = [
    "Voici le contenu d'un article de presse. Produis un Flash Cyber Actu en respectant exactement ce schéma JSON :",
    JSON.stringify(FLASH_SCHEMA, null, 2),
    '',
    '---',
    'Article :',
    `Titre: ${article.title}`,
    `Source: ${article.source}`,
    `URL: ${article.url}`,
    `Date: ${article.publishedAt}`,
    `Contenu/Résumé: ${(article.summary || '').slice(0, 6000)}`,
    '---',
  ].join('\n');

  let lastError = null;
  for (const model of modelsToTry) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorMessage = `Claude API failed with model ${model} (${response.status}): ${errorBody.slice(0, 250)}`;
      if (response.status === 404 || errorBody.includes('not_found_error')) {
        lastError = new Error(errorMessage);
        continue;
      }
      throw new Error(errorMessage);
    }

    const payload = await response.json();
    const text = (payload?.content || [])
      .map((item) => (item?.type === 'text' ? item.text : ''))
      .join('\n')
      .trim();

    const parsed = extractJsonObject(text);
    if (!parsed) {
      throw new Error(`Claude response could not be parsed as JSON (model ${model})`);
    }
    const normalized = normalizeFlashPayload(parsed, article);
    const cleanedResources = enforceOfficialResources(normalized.ressources || []);
    return {
      ...normalized,
      ressources:
        cleanedResources.length > 0
          ? cleanedResources
          : suggestOfficialResources({
              badge: normalized?.meta?.badge || '',
              tags: normalized?.tags || [],
              text: `${normalized?.que_sest_il_passe?.resume || ''} ${normalized?.que_sest_il_passe?.nouveaute || ''}`,
            }),
    };
  }

  throw lastError || new Error('Claude API failed for all configured models');
}

export function purgeOldCacheEntries(cache, maxAgeDays) {
  if (!maxAgeDays || Number.isNaN(maxAgeDays) || maxAgeDays <= 0) return cache;

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const nextCache = {};

  for (const [articleId, value] of Object.entries(cache)) {
    const seenAt = new Date(value?.lastSeenAt || value?.publishedAt || 0).getTime();
    if (!seenAt || now - seenAt <= maxAgeMs) {
      nextCache[articleId] = value;
    }
  }

  return nextCache;
}

export async function enrichArticlesIfNeeded({ cache, articles, targetIds }) {
  let changed = false;
  let attempted = 0;
  let succeeded = 0;
  const errors = [];
  const targetSet = new Set(targetIds || []);
  const enableAiTags = getEnv('VEILLE_ENABLE_AI_TAGS') !== 'false';

  for (const article of articles) {
    const previous = cache[article.id] || {};
    const blockKeys = [...new Set([...(previous.blockKeys || []), article.blockKey])];
    const merged = {
      ...previous,
      id: article.id,
      title: article.title,
      url: article.url,
      source: article.source,
      summary: article.summary,
      publishedAt: article.publishedAt,
      blockKeys,
      sourceTags: [...new Set([...(previous.sourceTags || []), ...(article.tags || [])])],
      lastSeenAt: previous.lastSeenAt || new Date().toISOString(),
    };

    let nextEntry = merged;
    const hasFlashSchema = Boolean(
      merged?.enrichment?.meta &&
      merged?.enrichment?.que_sest_il_passe &&
      Array.isArray(merged?.enrichment?.comment_se_proteger) &&
      Array.isArray(merged?.enrichment?.en_cas_dincident),
    );
    const requiresEnrichment = targetSet.has(article.id) && !hasFlashSchema;

    if (requiresEnrichment) {
      attempted += 1;
      try {
        const enrichment = await callClaudeForEnrichment(article);
        nextEntry = {
          ...merged,
          enrichment,
          aiTags: enableAiTags ? enrichment.tags : [],
          enrichedAt: new Date().toISOString(),
        };
        succeeded += 1;
      } catch (error) {
        errors.push(`enrichment ${article.id}: ${error?.message || 'Claude call failed'}`);
        nextEntry = merged;
      }
    }

    const previousJson = JSON.stringify(previous);
    const nextJson = JSON.stringify(nextEntry);
    if (previousJson !== nextJson) {
      changed = true;
      cache[article.id] = nextEntry;
    } else if (!cache[article.id]) {
      changed = true;
      cache[article.id] = nextEntry;
    }
  }

  return { cache, changed, attempted, succeeded, errors };
}
