import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {domainsFor,matchesLexique,normalizeLexique} from '../src/lib/lexique-domains.mjs';
import {glossaryAnchor} from '../src/lib/boussole-plan.mjs';
const load=name=>JSON.parse(readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8'));
const general=load('lexique'),seo=load('lexique-seo'),rgaa=load('lexique-rgaa'),scams=load('lexique-arnaques'),jargon=load('lexique-jargon');
const all=[...general,...seo,...rgaa,...scams,...jargon];
test('unified lexicon has no duplicate words or permalink collisions',()=>{
  assert.equal(rgaa.length,24);assert.equal(all.length,206);
  assert.equal(new Set(all.map(e=>glossaryAnchor(e.terme))).size,all.length);
});
test('shared terms appear in several universes as a single record',()=>{
  const alt=all.find(e=>e.terme==='Texte alternatif');
  assert.ok(domainsFor(alt).includes('seo'));assert.ok(domainsFor(alt).includes('accessibilite'));
  assert.equal(all.filter(e=>e.terme==='Texte alternatif').length,1);
  assert.ok(domainsFor(all.find(e=>e.terme==='Accessibilité numérique')).includes('accessibilite'));
});
test('search combines universe, accents, aliases and theme',()=>{
  const keyboard=rgaa.find(e=>e.terme==='Navigation au clavier');
  assert.ok(matchesLexique(keyboard,{query:'TABULATION',domain:'accessibilite',theme:keyboard.theme}));
  assert.equal(matchesLexique(keyboard,{query:'tabulation',domain:'seo'}),false);
  assert.equal(matchesLexique(keyboard,{domain:'accessibilite',theme:'autre'}),false);
  assert.equal(normalizeLexique('  ÉCHANTILLON  '),'echantillon');
});
test('RGAA definitions include practical advice and official sources',()=>{
  for(const entry of rgaa){
    assert.ok(entry.definition&&entry.situation&&entry.reflexe&&entry.source.href);
    assert.ok(['accessibilite.numerique.gouv.fr','www.w3.org'].includes(new URL(entry.source.href).hostname));
  }
});

test('technical terms and heading aliases are searchable',()=>{
  for(const query of ['JSON','Markdown','Balise HTML','Attribut HTML','HTML','CSS','Code source','Métadonnée'])assert.ok(all.some(e=>e.terme===query),query);
  assert.ok(matchesLexique(seo.find(e=>e.terme==='Titres H1 et H2'),{query:'H1',domain:'accessibilite'}));
  assert.ok(matchesLexique(general.find(e=>e.terme==='Markdown'),{query:'.md'}));
});

test('44 new scam entries are complete, sourced and searchable through situations',()=>{
  assert.equal(scams.length,44);
  for(const entry of scams){assert.ok(entry.definition&&entry.situation&&entry.reflexe&&entry.source.href);assert.ok(['www.cybermalveillance.gouv.fr','www.amf-france.org','www.economie.gouv.fr'].includes(new URL(entry.source.href).hostname));}
  assert.ok(matchesLexique(scams.find(e=>e.terme==='Demande de secret'),{domain:'arnaques',query:'il me demande de garder le secret'}));
  assert.ok(matchesLexique(scams.find(e=>e.terme==='Engrenage des paiements'),{domain:'arnaques',query:'j’ai déjà payé et on réclame encore de l’argent'}));
  assert.ok(domainsFor(general.find(e=>e.terme==='Ingénierie sociale')).includes('arnaques'));
});
test('MCP and the 16 technical additions have sources and distinct token definitions',()=>{
  assert.equal(jargon.length,16);
  const mcp=jargon.find(e=>e.terme==='MCP');assert.ok(mcp&&mcp.reflexe.includes('autorisations')||mcp&&mcp.reflexe.includes('accès'));
  assert.ok(matchesLexique(mcp,{domain:'jargon',query:'Model Context Protocol'}));
  assert.ok(domainsFor(general.find(e=>e.terme==='JSON')).includes('jargon'));
  assert.ok(jargon.some(e=>e.terme==='Token d’IA')&&jargon.some(e=>e.terme==='Jeton d’accès'));
  for(const entry of jargon)assert.ok(entry.definition&&entry.situation&&entry.reflexe&&entry.source.href);
});

import {enrichLexique,lexiqueForPath} from '../src/lib/lexique-links.mjs';
const relations=load('lexique-relations');
const enriched=enrichLexique(all,relations);
test('editorial relations reference existing terms and published content',()=>{
  assert.equal(new Set(relations.map(r=>r.href)).size,relations.length);
  for(const relation of relations){
    assert.ok(relation.termes.length);
    assert.equal(new Set(relation.termes).size,relation.termes.length);
    for(const term of relation.termes)assert.ok(all.some(e=>e.terme===term),term);
    const path=relation.href.replace(/^\/veille\/briefs\//,'/briefs/').replace(/\/$/,'');
    const content=readFileSync(new URL(`../src/content${path}.md`,import.meta.url),'utf8');
    const frontmatter=content.split('---')[1];
    assert.doesNotMatch(frontmatter,/^draft:\s*true\s*$/m);
    assert.doesNotMatch(frontmatter,/^demo:\s*true\s*$/m);
    assert.ok(frontmatter.includes(relation.label),relation.label);
  }
});
test('links work in both directions without duplicates or loss of existing links',()=>{
  for(const relation of relations){
    const reverse=lexiqueForPath(enriched,relation.href.slice(0,-1));
    for(const term of relation.termes){
      assert.ok(reverse.some(e=>e.terme===term));
      assert.ok(enriched.find(e=>e.terme===term).liens.some(l=>l.href===relation.href));
    }
  }
  for(const entry of enriched){
    assert.equal(new Set(entry.liens.map(l=>l.href.replace(/\/$/,''))).size,entry.liens.length);
    if(entry.lien)assert.ok(entry.liens.some(l=>l.href===entry.lien.href));
  }
  assert.ok(enriched.find(e=>e.terme==='Métadonnée').liens.some(l=>l.href.startsWith('/blog/')));
  assert.equal(enriched.find(e=>e.terme==='MCP').liens.filter(l=>l.href.startsWith('/blog/')).length,0);
});

import {lexiqueSegments} from '../src/lib/lexique-segments.mjs';
test('inline definitions preserve text and select complete technical words',()=>{
  const entries=[{terme:'JSON',aussi:[]},{terme:'JSON-LD',aussi:[]},{terme:'SEO',aussi:[]},{terme:'Méta-description',aussi:['meta description']}];
  const text='JSON-LD, SEO et une META DESCRIPTION. Pas pseudoSEO ni https://seo.example/JSON-LD.';
  const segments=lexiqueSegments(text,entries);
  assert.equal(segments.map(s=>s.text).join(''),text);
  assert.deepEqual(segments.filter(s=>s.terme).map(s=>s.terme),['JSON-LD','SEO','Méta-description']);
});
test('inline definitions escape aliases and leave markup as plain text',()=>{
  const text='<img src=x onerror=alert(1)> C++ et noindex.';
  const segments=lexiqueSegments(text,[{terme:'C++',aussi:[]},{terme:'noindex',aussi:[]}]);
  assert.equal(segments.map(s=>s.text).join(''),text);
  assert.deepEqual(segments.filter(s=>s.terme).map(s=>s.terme),['C++','noindex']);
  assert.deepEqual(lexiqueSegments('Sans mot défini',[]),[{text:'Sans mot défini'}]);
});
