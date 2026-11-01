import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSite} from '../src/lib/boussole-site.mjs';
const check=(id,status,evidence='x',extra={})=>({id,status,evidence,title:id,action:'Corriger',...extra});
test('site priorities group matching problems by status and affected pages, exclude human decisions',()=>{
 const pages=[{url:'https://example.com/',checks:[check('SEO-TITLE','action'),check('GEO-USEFULNESS','review'),check('SEO-CANONICAL','suggestion','x',{planEligible:false})]},{url:'https://example.com/a',checks:[check('SEO-TITLE','action'),check('GEO-USEFULNESS','review'),check('GEO-CITATIONS','unmeasured')]}];
 const before=JSON.stringify(pages);const summary=summarizeSite(pages);
 assert.equal(summary.priorities.length,1);assert.equal(summary.priorities[0].urls.length,2);assert.equal(summary.issues.find(i=>i.id==='GEO-USEFULNESS').status,'review');assert.equal(JSON.stringify(pages),before);
});
test('duplicates compare present titles and descriptions without merging distinct check types',()=>{
 const pages=['/','/a'].map(path=>({url:'https://example.com'+path,checks:[check('SEO-TITLE','ok',' Même titre '),check('SEO-DESCRIPTION','ok','Même titre'),check('CONTENT-HEADINGS','review','Même titre')]}));
 assert.deepEqual(summarizeSite(pages).duplicates.map(g=>g.id),['SEO-TITLE','SEO-DESCRIPTION']);
 assert.equal(summarizeSite([{url:'a',checks:[check('SEO-TITLE','action','Aucun titre HTML trouvé.')]},{url:'b',checks:[check('SEO-TITLE','action','Aucun titre HTML trouvé.')]}]).duplicates.length,0);
});
test('empty and healthy samples do not fabricate issues or priorities',()=>{
 assert.deepEqual(summarizeSite([]),{issues:[],priorities:[],duplicates:[]});
 assert.equal(summarizeSite([{url:'a',checks:[check('SEO-TITLE','ok','unique')]}]).priorities.length,0);
});
