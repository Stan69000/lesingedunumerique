import general from '../data/lexique.json';
import seo from '../data/lexique-seo.json';
import rgaa from '../data/lexique-rgaa.json';
import arnaques from '../data/lexique-arnaques.json';
import jargon from '../data/lexique-jargon.json';
import relations from '../data/lexique-relations.json';
import { enrichLexique } from './lexique-links.mjs';

export const lexique = enrichLexique([...general, ...seo, ...rgaa, ...arnaques, ...jargon], relations);
