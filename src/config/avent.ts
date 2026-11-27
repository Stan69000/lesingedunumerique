/**
 * Le calendrier de l’Avent d’Octet (public/calendrier-avent-octet/, copié
 * depuis l’admin) : mis en avant dans le menu et sur l’accueil jusqu’au
 * 6 janvier. Le site est reconstruit plusieurs fois par semaine, et l’encart
 * se masque aussi côté navigateur passé cette date.
 */
export const AVENT_HREF = '/calendrier-avent-octet/';
export const AVENT_FIN = '2027-01-06';

export function aventEnAvant(now = new Date()): boolean {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }) <= AVENT_FIN;
}
