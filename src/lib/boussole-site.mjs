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
