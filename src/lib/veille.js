import { fetchInoreaderData, VEILLE_BLOCKS } from './inoreader.js';
import {
  enrichArticlesIfNeeded,
  purgeOldCacheEntries,
  readEnrichedCache,
  writeEnrichedCache,
} from './enrich.js';
import { getEnv, getEnvNumber } from './env.js';
import { enforceOfficialResources, suggestOfficialResources } from './flash-resources.js';

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const SCAM_DANGER_SIGNALS = [
  { terms: ['arnaque', 'arnaques', 'escroquerie', 'fraude'], weight: 3 },
  { terms: ['phishing', 'smishing', 'vishing', 'hameconnage', 'hameconage'], weight: 3 },
  { terms: ['faux conseiller', 'faux livreur', 'faux colis', 'usurpation'], weight: 3 },
  { terms: ['carte bancaire', 'iban', 'compte bancaire', 'paiement', 'prelevement'], weight: 3 },
  { terms: ['donnees personnelles', 'vol de donnees', 'identite', 'prise de controle'], weight: 2 },
  { terms: ['campagne', 'massif', 'a grande echelle', 'en serie'], weight: 2 },
  { terms: ['association', 'benevole', 'pme', 'tpe', 'senior'], weight: 1 },
];

function scoreScamDanger(article) {
  const text = normalizeText(`${article?.title || ''} ${article?.summary || ''} ${(article?.tags || []).join(' ')}`);
  return SCAM_DANGER_SIGNALS.reduce((score, signal) => {
    const hit = signal.terms.some((term) => text.includes(normalizeText(term)));
    return score + (hit ? signal.weight : 0);
  }, 0);
}

function riskLevelFromScore(score) {
  if (score >= 8) return 'Critique';
  if (score >= 5) return 'Élevé';
  if (score >= 3) return 'Modéré';
  return 'Info';
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function isRecentEnough(article, maxAgeDays) {
  if (!maxAgeDays || Number.isNaN(maxAgeDays) || maxAgeDays <= 0) return true;
  const publishedMs = new Date(article?.publishedAt || '').getTime();
  if (!Number.isFinite(publishedMs)) return false;
  const ageMs = Date.now() - publishedMs;
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function articleFingerprint(article) {
  return `${article.normalizedUrl || article.url || ''}::${article.title?.toLowerCase?.() || ''}`;
}

function dedupeCrossSection(sections) {
  const seenIds = new Set();
  const seenFingerprints = new Set();

  return sections.map((section) => {
    const unique = [];

    for (const article of section.articles) {
      const fingerprint = articleFingerprint(article);
      if (seenIds.has(article.id) || seenFingerprints.has(fingerprint)) {
        continue;
      }
      seenIds.add(article.id);
      seenFingerprints.add(fingerprint);
      unique.push(article);
    }

    return {
      ...section,
      articles: unique,
    };
  });
}

function indexCacheByBlocks(cache) {
  const byBlock = new Map();
  for (const block of VEILLE_BLOCKS) {
    byBlock.set(block.key, []);
  }

  for (const value of Object.values(cache)) {
    const blockKeys = Array.isArray(value?.blockKeys) ? value.blockKeys : [];
    for (const key of blockKeys) {
      const current = byBlock.get(key);
      if (!current) continue;
      current.push({
        id: value.id,
        title: value.title,
        url: value.url,
        source: value.source,
        summary: value.summary,
        publishedAt: value.publishedAt || value.lastSeenAt || new Date().toISOString(),
        tags: [...new Set([...(value.sourceTags || []), ...(value.aiTags || [])])],
        enrichment: value.enrichment || null,
        fromCache: true,
      });
    }
  }

  return byBlock;
}

function withCacheEntry(article, cacheEntry) {
  let enrichment = cacheEntry?.enrichment || null;
  if (enrichment?.meta && enrichment?.que_sest_il_passe) {
    const cleaned = enforceOfficialResources(enrichment.ressources || []);
    enrichment = {
      ...enrichment,
      ressources:
        cleaned.length > 0
          ? cleaned
          : suggestOfficialResources({
              badge: enrichment?.meta?.badge || '',
              tags: enrichment?.tags || [],
              text: `${enrichment?.que_sest_il_passe?.resume || ''} ${enrichment?.que_sest_il_passe?.nouveaute || ''}`,
            }),
    };
  }

  return {
    ...article,
    tags: [...new Set([...(article.tags || []), ...(cacheEntry?.aiTags || [])])],
    enrichment,
    fromCache: false,
  };
}

function hasFlashSchema(enrichment) {
  return Boolean(
    enrichment?.meta &&
      enrichment?.que_sest_il_passe &&
      Array.isArray(enrichment?.comment_se_proteger) &&
      Array.isArray(enrichment?.en_cas_dincident),
  );
}

export async function getVeilleData() {
  const maxItemsPerSection = getEnvNumber('VEILLE_MAX_ITEMS_PER_SECTION', 50);
  const cacheTtlDays = getEnvNumber('VEILLE_CACHE_MAX_DAYS', 180);
  const fallbackMaxAgeDays = getEnvNumber('VEILLE_FALLBACK_MAX_AGE_DAYS', 30);
  const enableEnrichment = getEnv('VEILLE_ENABLE_ENRICHMENT') === 'true';
  const autoEnrichScamsLimit = Math.max(0, getEnvNumber('VEILLE_AUTO_ENRICH_SCAMS_LIMIT', 1));
  const autoEnrichScamsMaxAgeHours = Math.max(0, getEnvNumber('VEILLE_AUTO_ENRICH_SCAMS_MAX_AGE_HOURS', 0));

  let cache = await readEnrichedCache();
  let sourceMode = 'live';
  let warnings = [];
  let inoreaderPayload = null;

  try {
    inoreaderPayload = await fetchInoreaderData();
    warnings = inoreaderPayload.errors || [];
  } catch (error) {
    sourceMode = 'cache-only';
    warnings = [error?.message || 'inoreader unavailable'];
  }

  if (!inoreaderPayload?.liveAvailable) {
    const fallbackMap = indexCacheByBlocks(cache);
    const sections = VEILLE_BLOCKS.map((block) => ({
      key: block.key,
      title: block.title,
      label: block.defaultLabel,
      live: false,
      articles: sortByDateDesc((fallbackMap.get(block.key) || []).filter((article) => isRecentEnough(article, fallbackMaxAgeDays))).slice(0, maxItemsPerSection),
    }));
    const dedupedSections = dedupeCrossSection(sections);
    const topScamAlerts = (dedupedSections.find((section) => section.key === 'arnaques')?.articles || [])
      .map((article) => {
        const dangerScore = scoreScamDanger(article);
        return {
          ...article,
          dangerScore,
          dangerLevel: riskLevelFromScore(dangerScore),
        };
      })
      .sort((a, b) => {
        if (b.dangerScore !== a.dangerScore) return b.dangerScore - a.dangerScore;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      })
      .filter((article) => article.dangerScore > 0)
      .slice(0, 1);

    return {
      generatedAt: new Date().toISOString(),
      sourceMode,
      warnings,
      sections: dedupedSections,
      allArticles: dedupedSections.flatMap((section) => section.articles),
      topScamAlerts,
    };
  }

  const allArticles = inoreaderPayload.sections.flatMap((section) => section.articles);
  const arnaquesSection = inoreaderPayload.sections.find((section) => section.key === 'arnaques');
  const now = Date.now();
  const recentScamCandidates = (arnaquesSection?.articles || [])
    .slice(0, maxItemsPerSection)
    .map((article) => ({
      article,
      score: scoreScamDanger(article),
      ageHours: (now - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60),
    }))
    .filter((item) => {
      if (!Number.isFinite(item.ageHours)) return false;
      if (autoEnrichScamsMaxAgeHours <= 0) return true;
      return item.ageHours <= autoEnrichScamsMaxAgeHours;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    })
    .filter((item) => item.score > 0);

  const autoScamTargetIds = enableEnrichment
    ? recentScamCandidates.slice(0, autoEnrichScamsLimit).map((item) => item.article.id)
    : [];
  const enrichmentTargetIds = enableEnrichment
    ? [...new Set([...(inoreaderPayload.enrichmentIds || []), ...autoScamTargetIds])]
    : [];

  const cacheBeforePurgeJson = JSON.stringify(cache);
  let enrichedResult = { cache, changed: false, attempted: 0, succeeded: 0, errors: [] };
  if (enableEnrichment && enrichmentTargetIds.length > 0) {
    enrichedResult = await enrichArticlesIfNeeded({
      cache,
      articles: allArticles,
      targetIds: enrichmentTargetIds,
    });
    if (enrichedResult.attempted > 0 && enrichedResult.succeeded === 0) {
      warnings.push(
        `Claude enrichment failed: 0/${enrichedResult.attempted} article(s) enrichi(s). Vérifie ANTHROPIC_MODEL/ANTHROPIC_API_KEY.`,
      );
    }
    if (Array.isArray(enrichedResult.errors) && enrichedResult.errors.length > 0) {
      warnings.push(...enrichedResult.errors.slice(0, 3));
    }
  }
  cache = purgeOldCacheEntries(enrichedResult.cache, cacheTtlDays);
  const cacheAfterJson = JSON.stringify(cache);

  if (enrichedResult.changed || cacheBeforePurgeJson !== cacheAfterJson) {
    await writeEnrichedCache(cache);
  }

  const sectionsWithCache = inoreaderPayload.sections.map((section) => ({
    ...section,
    articles: section.articles
      .map((article) => withCacheEntry(article, cache[article.id]))
      .slice(0, maxItemsPerSection),
  }));

  const cacheByBlock = indexCacheByBlocks(cache);
  const sectionsWithFallback = sectionsWithCache.map((section) => {
    if (section.articles.length > 0) return section;

    const cachedItems = sortByDateDesc((cacheByBlock.get(section.key) || []).filter((article) => isRecentEnough(article, fallbackMaxAgeDays))).slice(0, maxItemsPerSection);
    if (cachedItems.length === 0) return section;

    return {
      ...section,
      live: false,
      articles: cachedItems,
    };
  });

  const dedupedSections = dedupeCrossSection(sectionsWithFallback);
  let topScamAlerts = (dedupedSections.find((section) => section.key === 'arnaques')?.articles || [])
    .map((article) => {
      const dangerScore = scoreScamDanger(article);
      return {
        ...article,
        dangerScore,
        dangerLevel: riskLevelFromScore(dangerScore),
      };
    })
    .sort((a, b) => {
      if (b.dangerScore !== a.dangerScore) return b.dangerScore - a.dangerScore;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .filter((article) => article.dangerScore > 0)
    .slice(0, 1);

  const flashCandidate = topScamAlerts[0];
  if (enableEnrichment && flashCandidate && !hasFlashSchema(flashCandidate.enrichment)) {
    const sourceArticle = allArticles.find((article) => article.id === flashCandidate.id);
    if (sourceArticle) {
      const retry = await enrichArticlesIfNeeded({
        cache,
        articles: [sourceArticle],
        targetIds: [sourceArticle.id],
      });
      if (retry.changed) {
        await writeEnrichedCache(cache);
      }
      if (retry.attempted > 0 && retry.succeeded === 0) {
        warnings.push(`Flash Cyber Actu: enrichissement Claude impossible pour l'article affiché.`);
      }
      if (Array.isArray(retry.errors) && retry.errors.length > 0) {
        warnings.push(...retry.errors.slice(0, 2));
      }

      const refreshed = cache[sourceArticle.id];
      if (hasFlashSchema(refreshed?.enrichment)) {
        topScamAlerts = topScamAlerts.map((item) =>
          item.id === sourceArticle.id
            ? {
                ...item,
                enrichment: refreshed.enrichment,
                tags: [...new Set([...(item.tags || []), ...(refreshed.aiTags || [])])],
              }
            : item,
        );
      }
    }
  }

  return {
    generatedAt: inoreaderPayload.generatedAt,
    sourceMode: inoreaderPayload.liveAvailable ? 'live' : 'cache-only',
    warnings,
    sections: dedupedSections,
    allArticles: dedupedSections.flatMap((section) => section.articles),
    topScamAlerts,
  };
}
