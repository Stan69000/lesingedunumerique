import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSite,requestFailure,exploreSite} from '../src/lib/boussole-site.mjs';
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

test('timeout messages distinguish cancellation without blaming the target site',()=>{
 const error={name:'AbortError'};
 assert.match(requestFailure(error,{url:'https://rvaz.fr'}),/45 secondes pour https:\/\/rvaz.fr/);
 assert.doesNotMatch(requestFailure(error),/arrêtée/);
 assert.match(requestFailure(error,{stopped:true}),/à votre demande/);
 assert.doesNotMatch(requestFailure(error,{stopped:true}),/45 secondes/);
});
const fakePage=(url,links=[])=>({url,checks:[],discoveredLinks:links});
test('a timeout on a later page keeps previous results, updates progress and continues',async()=>{
 const updates=[];
 const result=await exploreSite({url:'https://example.com/',pause:async()=>{},onUpdate:s=>updates.push(s.pages.length),fetchPage:async url=>{
  if(url.endsWith('/slow'))throw {name:'AbortError'};
  return fakePage(url,url.endsWith('.com/')?['https://example.com/slow','https://example.com/ok']:[]);
 }});
 assert.equal(result.pages.length,2);assert.equal(result.failed.length,1);assert.match(result.failed[0].reason,/45 secondes/);assert.ok(updates.includes(1));assert.equal(result.running,false);
});
test('stopping between pages preserves pending links without inventing a request',async()=>{
 let stopped=false;
 const result=await exploreSite({url:'https://example.com/',pause:async()=>{stopped=true;},isStopped:()=>stopped,fetchPage:async url=>fakePage(url,['https://example.com/next'])});
 assert.equal(result.attempts,1);assert.equal(result.pages.length,1);assert.equal(result.stopped,true);assert.deepEqual(result.pending,['https://example.com/next']);
});
test('an exploration remains limited to five attempts and records off-origin redirects',async()=>{
 const result=await exploreSite({url:'https://example.com/',pause:async()=>{},fetchPage:async url=>url.endsWith('/other')?fakePage('https://elsewhere.com/'):fakePage(url,url.endsWith('.com/')?['https://example.com/other',...Array.from({length:6},(_,i)=>'https://example.com/'+i)]:[])});
 assert.equal(result.attempts,5);assert.equal(result.pages.length,4);assert.equal(result.failed.length,1);assert.ok(result.pending.length>0);
});
