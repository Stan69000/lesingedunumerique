const FRENCH_READING_WPM = 200;

export const estimateReadingTimeMinutes = (markdown = '') => {
  const cleanedText = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = cleanedText ? cleanedText.split(' ').length : 0;
  return Math.max(1, Math.ceil(wordCount / FRENCH_READING_WPM));
};
