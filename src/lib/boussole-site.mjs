// Group observations, never claim that repeated checks prove a ranking problem.
export function summarizeSite(pages) {
  const groups = new Map();
  for (const page of pages) for (const check of page.checks) {
    if (!['action', 'suggestion', 'review'].includes(check.status)) continue;
    const key = `${check.id}|${check.status}`;
    if (!groups.has(key)) groups.set(key, {id:check.id, status:check.status, title:check.title, action:check.action, planEligible:check.planEligible, urls:[]});
    const group=groups.get(key);
    if (!group.urls.includes(page.url)) group.urls.push(page.url);
  }
  const rank={action:0,suggestion:1,review:2};
  const issues=[...groups.values()].sort((a,b)=>rank[a.status]-rank[b.status] || b.urls.length-a.urls.length || a.id.localeCompare(b.id));
  const duplicates=[];
  for (const id of ['SEO-TITLE','SEO-DESCRIPTION']) {
    const values=new Map();
    for(const page of pages) {
      const check=page.checks.find(c=>c.id===id);
      if(check?.status!=='ok')continue;
      const key=check.evidence.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr');
      if(!key)continue;
      if(!values.has(key))values.set(key,{id,text:check.evidence,urls:[]});
      values.get(key).urls.push(page.url);
    }
    duplicates.push(...[...values.values()].filter(g=>g.urls.length>1));
  }
  return {issues, priorities:issues.filter(g=>g.status!=='review' && g.planEligible!==false).slice(0,3),duplicates};
}

// An abort initiated by the visitor is not a timeout or a target-site diagnosis.
export function requestFailure(error, {stopped=false, url='', seconds=45}={}) {
  if(error?.name==='AbortError') return stopped
    ? 'Exploration arrêtée à votre demande. Les pages déjà analysées sont conservées.'
    : `Le serveur d’analyse n’a pas répondu en ${seconds} secondes${url ? ' pour '+url : ''}. Cette page n’a pas été analysée. Réessayez dans quelques instants.`;
  return error?.message || 'Le serveur d’analyse est momentanément indisponible. Réessayez dans quelques instants.';
}

export async function exploreSite({url, fetchPage, isStopped=()=>false, onUpdate=()=>{}, pause=()=>new Promise(resolve=>setTimeout(resolve,700))}) {
  const data={mode:'site',requestedUrl:url,generatedAt:new Date().toISOString(),pages:[],failed:[],pending:[url],stopped:false,attempts:0,running:true,summary:summarizeSite([])};
  const queue=[url],seen=new Set();let origin='';
  onUpdate(data);
  while(queue.length && data.attempts<5 && !isStopped()) {
    if(data.attempts)await pause();
    if(isStopped())break;
    const next=queue.shift();if(seen.has(next))continue;
    seen.add(next);data.attempts++;
    try {
      const page=await fetchPage(next,data);
      if(!origin)origin=new URL(page.url).origin;
      if(new URL(page.url).origin!==origin)throw new Error('La redirection mène à un autre site ; page exclue.');
      seen.add(page.url);
      if(!data.pages.some(p=>p.url===page.url))data.pages.push(page);
      for(const link of page.discoveredLinks||[])if(new URL(link).origin===origin&&!seen.has(link)&&!queue.includes(link)&&queue.length<80)queue.push(link);
    } catch(error) {
      data.failed.push({url:next,reason:requestFailure(error,{stopped:isStopped(),url:next})});
      if(!data.pages.length)break;
    }
    data.pending=[...queue];onUpdate(data);
  }
  data.pending=[...queue];data.stopped=isStopped();data.running=false;
  data.summary=summarizeSite(data.pages);onUpdate(data);return data;
}
