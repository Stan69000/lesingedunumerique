import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectPlan,glossaryAnchor,glossaryByCheck} from '../src/lib/boussole-plan.mjs';
const load = name => JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const demos=load('../src/data/boussole-demo.json');
const glossary=load('../src/data/lexique-seo.json');
test('15-minute plan respects total budget, priorities and excludes human decisions',()=>{
  const plan=selectPlan(demos.before.checks,15);
  assert.ok(plan.minutes<=15);assert.ok(plan.checks.length<=3);
  assert.ok(plan.checks.every(c=>['action','suggestion'].includes(c.status)));
  assert.equal(plan.checks[0].id,'SEO-TITLE');
});
test('planning never changes audit findings',()=>{
  const snapshot=JSON.stringify(demos.before);selectPlan(demos.before.checks,15);
  assert.equal(JSON.stringify(demos.before),snapshot);
  assert.deepEqual(selectPlan([{id:'x',status:'review',minutes:1}]).checks,[]);
});
test('every contextual term exists and all glossary anchors are unique',()=>{
  const terms=new Set(glossary.map(e=>e.terme));
  for(const words of Object.values(glossaryByCheck))for(const word of words)assert.ok(terms.has(word),word);
  assert.equal(new Set(glossary.map(e=>glossaryAnchor(e.terme))).size,glossary.length);
  assert.equal(glossaryAnchor('Méta-description'),'meta-description');
});
test('32 entries each have a situation, action and primary documentation source',()=>{
  assert.equal(glossary.length,32);
  for(const entry of glossary){
    assert.ok(entry.definition&&entry.situation&&entry.reflexe);
    assert.ok(['developers.google.com','support.google.com','www.w3.org','developers.openai.com','www.bing.com'].includes(new URL(entry.source.href).hostname));
  }
});

test('an optional missing canonical does not become a priority correction',()=>{
  const canonical=demos.before.checks.find(c=>c.id==='SEO-CANONICAL');
  assert.equal(canonical.planEligible,false);
  assert.ok(!selectPlan(demos.before.checks).checks.some(c=>c.id==='SEO-CANONICAL'));
  const next=selectPlan([{id:'optional',status:'suggestion',minutes:1,planEligible:false},{id:'useful',status:'suggestion',minutes:5}]);
  assert.deepEqual(next.checks.map(c=>c.id),['useful']);
});
