export function escapeXml(input = '') {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function safeRssLink(url = '') {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

export function buildRssXml({ title, description, siteUrl, path, items }) {
  const channelUrl = new URL(path, siteUrl).toString();
  const now = new Date().toUTCString();

  const itemXml = items
    .map((item) => {
      const pubDate = new Date(item.publishedAt || Date.now()).toUTCString();
      const safeLink = safeRssLink(item.url || '');
      const source = item.source ? `<source>${escapeXml(item.source)}</source>` : '';
      return `<item>
  <title>${escapeXml(item.title || 'Sans titre')}</title>
  <link>${escapeXml(safeLink || channelUrl)}</link>
  <guid isPermaLink="false">${escapeXml(item.id || safeLink || item.title || pubDate)}</guid>
  <pubDate>${escapeXml(pubDate)}</pubDate>
  ${source}
</item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(title)}</title>
  <description>${escapeXml(description)}</description>
  <link>${escapeXml(channelUrl)}</link>
  <lastBuildDate>${escapeXml(now)}</lastBuildDate>
${itemXml}
</channel>
</rss>`;
}
