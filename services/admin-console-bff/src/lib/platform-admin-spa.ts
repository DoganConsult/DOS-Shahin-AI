/* eslint-disable max-len */
// Self-contained Carbon-styled Platform Admin Workspace SPA, served as a
// single HTML document by admin-console-bff. Internal validation only.
// Uses IBM Carbon design tokens (--cds-*) consistent with the
// dos-marketing-home stylesheet (AGENTS.md note: Phase M3.1 closeout).

export const PLATFORM_ADMIN_SPA_HTML = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>DOS Master · Platform Admin Workspace</title>
<style>
  :root{
    --cds-background:#161616; --cds-layer:#262626; --cds-layer-accent:#393939;
    --cds-text-primary:#f4f4f4; --cds-text-secondary:#c6c6c6; --cds-text-helper:#a8a8a8;
    --cds-text-on-color:#ffffff; --cds-border-subtle:#393939; --cds-border-strong:#6f6f6f;
    --cds-link-primary:#78a9ff; --cds-support-success:#42be65; --cds-support-error:#fa4d56;
    --cds-support-warning:#f1c21b; --cds-button-primary:#0f62fe; --cds-button-primary-hover:#0353e9;
    --cds-spacing-03:.5rem; --cds-spacing-05:1rem; --cds-spacing-07:2rem;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;
    background:var(--cds-background);color:var(--cds-text-primary);min-height:100vh}
  a{color:var(--cds-link-primary);text-decoration:none}
  a:hover{text-decoration:underline}
  header.cds-header{display:flex;align-items:center;height:48px;background:#161616;
    border-bottom:1px solid var(--cds-border-subtle);padding:0 1rem;position:sticky;top:0;z-index:10}
  header.cds-header .brand{font-weight:600;font-size:14px;letter-spacing:.16px}
  header.cds-header .who{margin-inline-start:auto;font-size:12px;color:var(--cds-text-helper)}
  .layout{display:grid;grid-template-columns:240px 1fr;min-height:calc(100vh - 48px)}
  nav.side{background:var(--cds-layer);border-inline-end:1px solid var(--cds-border-subtle);padding:1rem 0}
  nav.side a{display:block;padding:.5rem 1rem;color:var(--cds-text-secondary);font-size:14px;border-inline-start:2px solid transparent}
  nav.side a:hover{background:var(--cds-layer-accent);color:var(--cds-text-primary);text-decoration:none}
  nav.side a.active{background:var(--cds-layer-accent);color:var(--cds-text-primary);border-inline-start-color:var(--cds-link-primary)}
  main{padding:2rem;max-width:1400px;width:100%}
  h1{font-size:28px;font-weight:300;margin:0 0 .5rem}
  h2{font-size:20px;font-weight:400;margin:1.5rem 0 .75rem;color:var(--cds-text-primary)}
  .sub{color:var(--cds-text-helper);font-size:14px;margin-bottom:1.5rem}
  .tile{background:var(--cds-layer);border:1px solid var(--cds-border-subtle);padding:1rem;margin-bottom:1rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem}
  .kpi{background:var(--cds-layer);padding:1rem;border-inline-start:3px solid var(--cds-link-primary)}
  .kpi .v{font-size:28px;font-weight:300}
  .kpi .l{font-size:12px;color:var(--cds-text-helper);text-transform:uppercase;letter-spacing:.32px}
  table{width:100%;border-collapse:collapse;background:var(--cds-layer);font-size:13px}
  th,td{text-align:start;padding:.5rem .75rem;border-bottom:1px solid var(--cds-border-subtle);font-weight:400}
  th{background:var(--cds-layer-accent);color:var(--cds-text-secondary);text-transform:uppercase;letter-spacing:.32px;font-size:11px}
  .badge{display:inline-block;padding:.125rem .5rem;font-size:11px;border-radius:0;font-weight:600}
  .b-pass{background:var(--cds-support-success);color:#000}
  .b-fail{background:var(--cds-support-error);color:#fff}
  .b-warn{background:var(--cds-support-warning);color:#000}
  .btn{background:var(--cds-button-primary);color:#fff;border:0;padding:.625rem 1rem;font-size:14px;cursor:pointer;font-family:inherit}
  .btn:hover{background:var(--cds-button-primary-hover)}
  .btn.ghost{background:transparent;border:1px solid var(--cds-border-strong);color:var(--cds-text-primary)}
  pre{background:#000;color:#42be65;padding:1rem;overflow:auto;font-size:12px;line-height:1.5;font-family:'IBM Plex Mono',monospace}
  .login{max-width:420px;margin:6rem auto;background:var(--cds-layer);padding:2rem;border:1px solid var(--cds-border-subtle)}
  .login h1{font-size:22px}
  .login input{width:100%;padding:.75rem;background:var(--cds-layer-accent);border:0;border-bottom:1px solid var(--cds-border-strong);
    color:var(--cds-text-primary);font-size:14px;margin-top:.5rem;font-family:inherit}
  .login input:focus{outline:2px solid var(--cds-link-primary);outline-offset:-2px}
  .login label{font-size:12px;color:var(--cds-text-helper);display:block}
  .login .err{color:var(--cds-support-error);font-size:13px;margin-top:1rem}
  .toolbar{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
  .ok{color:var(--cds-support-success)} .ko{color:var(--cds-support-error)}
  details{margin-top:1rem} summary{cursor:pointer;color:var(--cds-link-primary);font-size:13px}
  [dir="rtl"] nav.side a{border-inline-start:0;border-inline-end:2px solid transparent}
  [dir="rtl"] nav.side a.active{border-inline-end-color:var(--cds-link-primary)}
</style>
</head>
<body>
<div id="app"></div>
<script>
const API = '/api/admin/console';
const TOKEN_KEY = 'dos_master_admin_token';
const NAV = [
  ['#/dos-master',                'Overview'],
  ['#/dos-master/phase-1',        'Phase 1 (M1–M14)'],
  ['#/dos-master/ci-guards',      'CI Guards (23/23)'],
  ['#/dos-master/services',       'Services 4007–4015'],
  ['#/dos-master/cli',            'CLI Surface (29)'],
  ['#/dos-master/controlled-ddl', 'Controlled DDL'],
  ['#/dos-master/doctrine',       'Doctrine 11/11'],
  ['#/dos-master/ppd',            'PPD Engine R0–R5'],
  ['#/dos-master/compensation',   'Compensation'],
  ['#/dos-master/auto-evaluator', 'Auto-Evaluator'],
  ['#/dos-master/controlled-write','Writer Audit'],
  ['#/dos-master/rollout-ledger', 'Rollout Ledger'],
  ['#/dos-master/negative-proof', 'Negative Proof'],
  ['#/dos-master/evidence-pack',  'Evidence Pack'],
];

function el(t,a={},c=[]){const e=document.createElement(t);for(const k in a){if(k==='html')e.innerHTML=a[k];
  else if(k.startsWith('on'))e.addEventListener(k.slice(2),a[k]);else if(a[k]!=null)e.setAttribute(k,a[k]);}
  for(const x of c) e.append(typeof x==='string'?document.createTextNode(x):x);return e;}
function token(){return localStorage.getItem(TOKEN_KEY);}
async function api(p){const r=await fetch(API+p,{headers:{authorization:'Bearer '+token()}});
  if(!r.ok) throw Object.assign(new Error('http_'+r.status),{status:r.status});return r.json();}
async function login(email){const r=await fetch(API+'/auth/email-login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||('http_'+r.status));}
  const j=await r.json();localStorage.setItem(TOKEN_KEY,j.token);return j;}
function logout(){localStorage.removeItem(TOKEN_KEY);location.hash='#/login';render();}

function renderLogin(err){
  const root=document.getElementById('app');root.innerHTML='';
  const box=el('div',{class:'login'},[
    el('h1',{},['DOS Master · Platform Admin']),
    el('p',{class:'sub'},['Internal validation workspace. Sign in with your provisioned platform-admin email.']),
    el('label',{for:'em'},['Email']),
    el('input',{id:'em',type:'email',placeholder:'name@example.com',autofocus:true}),
    el('div',{style:'margin-top:1.5rem;display:flex;gap:.5rem'},[
      el('button',{class:'btn',onclick:async()=>{
        const e=document.getElementById('em').value.trim();
        try{await login(e);location.hash='#/dos-master';render();}
        catch(x){renderLogin(x.message);}
      }},['Sign in']),
    ]),
    err?el('div',{class:'err'},['Sign-in failed: '+err]):''
  ]);
  root.append(box);
}

function shell(content){
  const root=document.getElementById('app');root.innerHTML='';
  const head=el('header',{class:'cds-header'},[
    el('span',{class:'brand'},['DOS Master · Platform Admin Workspace']),
    el('span',{class:'who'},[window.__admin_email||'…']),
    el('button',{class:'btn ghost',style:'margin-inline-start:1rem',onclick:logout},['Sign out'])
  ]);
  const side=el('nav',{class:'side'},NAV.map(([h,n])=>{
    const a=el('a',{href:h},[n]);if(location.hash===h||(!location.hash&&h==='#/dos-master'))a.classList.add('active');return a;
  }));
  const main=el('main',{},[content]);
  root.append(head,el('div',{class:'layout'},[side,main]));
}

function badge(ok,t){return el('span',{class:'badge '+(ok?'b-pass':'b-fail')},[t||(ok?'PASS':'FAIL')]);}
function table(cols,rows){const t=el('table',{},[]);const h=el('tr',{},cols.map(c=>el('th',{},[c])));
  t.append(el('thead',{},[h]));const tb=el('tbody',{},rows.map(r=>el('tr',{},r.map(c=>el('td',{},[
    typeof c==='object'&&c instanceof Element?c:String(c==null?'':c)
  ])))));t.append(tb);return t;}

const PAGES = {
  async overview(){
    const m=await api('/dos-master/milestones');
    const closed=m.milestones.filter(x=>x.status==='CLOSED').length;
    return el('div',{},[
      el('h1',{},['DOS Master Phase 1']),
      el('p',{class:'sub'},['Single source of truth for the M1–M14 force-binding doctrine. All evidence below is queried live from shahin_grc.']),
      el('div',{class:'grid'},[
        kpi(closed+'/'+m.milestones.length,'Milestones CLOSED'),
        kpi(m.commits.length,'Recent commits'),
        kpi(m.git.clean?'CLEAN':'DIRTY','Git working tree',m.git.clean),
        kpi(m.git.head.slice(0,9),'HEAD'),
      ]),
      el('h2',{},['Recent commits']),
      table(['hash','subject'],m.commits.map(c=>[c.hash,c.subject])),
      el('div',{class:'toolbar',style:'margin-top:2rem'},[
        el('a',{class:'btn',href:'#/dos-master/evidence-pack'},['Open Evidence Pack']),
        el('a',{class:'btn ghost',href:'#/dos-master/phase-1'},['Phase 1 Detail']),
      ])
    ]);
  },
  async phase1(){
    const m=await api('/dos-master/milestones');
    return el('div',{},[
      el('h1',{},['Phase 1 — M1–M14']),
      table(['M','Title','Status','Evidence','Detail'],m.milestones.map(r=>[
        r.milestone,r.title,badge(r.status==='CLOSED',r.status),r.evidence_count,r.detail])),
    ]);
  },
  async ciGuards(){
    const r=await api('/dos-master/ci-guards');
    return el('div',{},[
      el('h1',{},['CI Guards']),
      el('div',{class:'grid'},[
        kpi(r.pass+'/'+r.total,'Guards PASS',r.fail===0),
        kpi(r.fail,'FAIL',r.fail===0),
      ]),
      el('h2',{},['Runner output (tail)']),
      el('pre',{},[r.output]),
    ]);
  },
  async services(){
    const r=await api('/dos-master/services');
    return el('div',{},[
      el('h1',{},['DOS Master Services (ports 4007–4015)']),
      table(['Service','Port','Trust zone','Status','Endpoints','PM2 name'],
        r.services.map(s=>[s.service_code,s.port,s.trust_zone,badge(s.status==='active',s.status),s.endpoints,s.pm2_name||'-'])),
    ]);
  },
  async cli(){
    const r=await api('/dos-master/cli');
    return el('div',{},[
      el('h1',{},['CLI Surface']),
      el('div',{class:'grid'},[kpi(r.count,'Commands',r.count>=29)]),
      table(['Command'],r.commands.map(c=>[c])),
    ]);
  },
  async controlledDdl(){
    const r=await api('/dos-master/controlled-ddl');
    return el('div',{},[
      el('h1',{},['Controlled DDL — trg_dos_master_only coverage']),
      el('div',{class:'grid'},[kpi(r.total,'Tables protected',r.total>=48)]),
      table(['Schema','Table'],r.tables.map(t=>[t.schema,t.table])),
    ]);
  },
  async doctrine(){
    const r=await api('/dos-master/doctrine');
    return el('div',{},[
      el('h1',{},['11-Article Doctrine']),
      el('div',{class:'grid'},[
        kpi(r.articles.length,'Articles seeded',r.articles.length>=11),
        kpi(r.acknowledgements.length,'Acknowledgements'),
      ]),
      el('h2',{},['Articles']),
      table(['No.','Title','Enforced by'],r.articles.map(a=>[a.article_no,a.title,a.enforced_by])),
      el('h2',{},['Acknowledgements']),
      table(['Article','Actor','Ack at'],r.acknowledgements.map(a=>[a.article_no,a.actor,a.ack_at])),
    ]);
  },
  async ppd(){
    const r=await api('/dos-master/ppd');
    return el('div',{},[
      el('h1',{},['PPD Ring Engine R0 → R5']),
      r.plan?el('p',{class:'sub'},['Plan: '+r.plan.title+' · status='+r.plan.status]):'',
      table(['Ring','Order','Status','Gates','Cohorts','Started','Ended'],
        (r.rings||[]).map(x=>[x.ring_code,x.ring_order,badge(['active','succeeded'].includes(x.status),x.status),x.gates,x.cohorts,x.started_at||'-',x.ended_at||'-'])),
      el('h2',{},['Health-gate adapters']),
      table(['Adapter'],(r.health_gate_adapters||[]).map(a=>[a])),
      el('h2',{},['Evaluations by decision']),
      table(['Decision','Count'],(r.evaluations_by_decision||[]).map(e=>[e.decision,e.n])),
      el('p',{},['Rollbacks: '+r.rollbacks])
    ]);
  },
  async compensation(){
    const r=await api('/dos-master/compensation');
    return el('div',{},[
      el('h1',{},['Compensation Orchestrator (Temporal-style)']),
      el('h2',{},['Registered handler kinds']),
      table(['Kind'],r.handler_kinds.map(k=>[k])),
      el('h2',{},['Recent chains']),
      table(['ID','Status','Steps','Created'],r.chains.map(c=>[c.id,badge(c.status==='compensated',c.status),c.step_count,c.created_at])),
      el('h2',{},['Steps by kind']),
      table(['Kind','Count'],r.steps_by_kind.map(s=>[s.step_kind,s.n])),
    ]);
  },
  async autoEvaluator(){
    const r=await api('/dos-master/auto-evaluator');
    return el('div',{},[
      el('h1',{},['Auto-Evaluator']),
      el('div',{class:'grid'},[
        kpi(r.poll_ms+' ms','Poll interval'),
        kpi(r.auto_rollback?'ON':'OFF','Auto-rollback',r.auto_rollback),
        kpi(r.signal_mode,'Signal mode'),
      ]),
      el('h2',{},['Real signal endpoints']),
      table(['Adapter','Endpoint'],Object.entries(r.real_signal_endpoints).map(([k,v])=>[k,v||'(unset)'])),
    ]);
  },
  async controlledWrite(){
    const r=await api('/dos-master/controlled-write');
    return el('div',{},[
      el('h1',{},['Controlled-write enforcement']),
      el('div',{class:'grid'},[
        kpi(r.totals.rows,'Audit rows'),
        kpi(r.totals.actors,'Distinct actors'),
        kpi(r.totals.tables,'Tables touched'),
      ]),
      el('h2',{},['Recent writes']),
      table(['Time','Actor','Target','Op'],r.recent.map(x=>[x.occurred_at,x.actor,x.target,x.op])),
    ]);
  },
  async rolloutLedger(){
    const r=await api('/dos-master/rollout-ledger');
    return el('div',{},[
      el('h1',{},['Rollout / invalidation ledger']),
      table(['Created','Scope','Scope key','Reason'],r.ledger.map(x=>[x.created_at,x.scope,x.scope_key,x.reason])),
    ]);
  },
  async negativeProof(){
    const r=await api('/dos-master/negative-proof');
    return el('div',{},[
      el('h1',{},['Negative Proof — Article 11']),
      el('p',{class:'sub'},['A direct write attempt to a controlled table without dos.actor=\\'dos-master\\' is rejected by trg_dos_master_only.']),
      el('div',{class:'grid'},[
        kpi(r.rejected?'REJECTED':'ACCEPTED','Result',r.rejected),
        kpi(r.sqlstate,'SQLSTATE',r.sqlstate==='42501'),
      ]),
      el('pre',{},[r.message]),
    ]);
  },
  async evidencePack(){
    return el('div',{},[
      el('h1',{},['Phase 1 Evidence Pack']),
      el('p',{class:'sub'},['One-click signed download of every Phase-1 acceptance artifact: commits, git status, CI guards, services, CLI, controlled DDL, doctrine, PPD, compensation, auto-evaluator, writer audit, rollout ledger, negative proof.']),
      el('div',{class:'toolbar'},[
        el('a',{class:'btn',href:API+'/dos-master/evidence-pack',target:'_blank',
          onclick:async(ev)=>{ev.preventDefault();const r=await fetch(API+'/dos-master/evidence-pack',{headers:{authorization:'Bearer '+token()}});
            const b=await r.blob();const u=URL.createObjectURL(b);const a=document.createElement('a');
            a.href=u;a.download='dos-master-phase-1-evidence-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(u);
          }},['Download evidence-pack JSON']),
      ]),
      el('p',{class:'sub'},['File contains every gate proof in a single signed-by-DB JSON document. SHA256 it before sign-off.'])
    ]);
  },
};

function kpi(v,l,ok){const k=el('div',{class:'kpi'},[]);
  k.append(el('div',{class:'v '+(ok===true?'ok':ok===false?'ko':'')},[String(v)]));
  k.append(el('div',{class:'l'},[l]));return k;}

const ROUTES = {
  '#/dos-master':                PAGES.overview,
  '#/dos-master/phase-1':        PAGES.phase1,
  '#/dos-master/ci-guards':      PAGES.ciGuards,
  '#/dos-master/services':       PAGES.services,
  '#/dos-master/cli':            PAGES.cli,
  '#/dos-master/controlled-ddl': PAGES.controlledDdl,
  '#/dos-master/doctrine':       PAGES.doctrine,
  '#/dos-master/ppd':            PAGES.ppd,
  '#/dos-master/compensation':   PAGES.compensation,
  '#/dos-master/auto-evaluator': PAGES.autoEvaluator,
  '#/dos-master/controlled-write':PAGES.controlledWrite,
  '#/dos-master/rollout-ledger': PAGES.rolloutLedger,
  '#/dos-master/negative-proof': PAGES.negativeProof,
  '#/dos-master/evidence-pack':  PAGES.evidencePack,
};

async function render(){
  if(!token()){renderLogin();return;}
  try{
    const who=await api('/auth/whoami');
    window.__admin_email=who.user.email;
    const h=location.hash||'#/dos-master';
    const fn=ROUTES[h]||PAGES.overview;
    const c=await fn();
    shell(c);
  }catch(e){
    if(e.status===401){logout();return;}
    shell(el('div',{},[el('h1',{},['Error']),el('pre',{},[String(e.message||e)])]));
  }
}
window.addEventListener('hashchange',render);
render();
</script>
</body></html>`;
