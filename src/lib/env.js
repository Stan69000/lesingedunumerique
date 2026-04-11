export function getEnv(key) {
  if (process.env[key] !== undefined) {
    return process.env[key];
  }

  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key];
  }

  return undefined;
}

export function getEnvNumber(key, fallback) {
  const raw = getEnv(key);
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
