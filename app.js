/* No Shutdown: the page. Terminals, command drills, guided tasks, a sandbox and a cheat sheet on top of the IOS
   simulator in ios.js and the content in content.js. All text that comes from typing is shown with textContent. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
function el(tag,attrs,...kids){const e=document.createElement(tag);if(attrs)for(const[k,v]of Object.entries(attrs)){if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='html')e.innerHTML=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v);}
  kids.flat().forEach(k=>{if(k==null||k===false)return;e.append(k.nodeType?k:document.createTextNode(String(k)));});return e;}

/* icons as inline SVG, so they look the same on every phone and computer (some symbol characters show as empty boxes) */
const ICONS={
  router:'<circle cx="12" cy="12" r="9"/><path d="M12 5.5v4M10.3 7.2 12 5.5l1.7 1.7M12 18.5v-4M10.3 16.8 12 18.5l1.7-1.7M5.5 12h4M7.2 10.3 5.5 12l1.7 1.7M18.5 12h-4M16.8 10.3l1.7 1.7-1.7 1.7"/>',
  switch:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M7 10h10M15 8l2 2-2 2M17 14H7M9 12l-2 2 2 2"/>',
  pc:'<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/>',
  print:'<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>'};
function ico(name){const s=el('span',{class:'ico','aria-hidden':'true',html:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`});return s;}
const devIco=d=>ico(d.type==='router'?'router':d.type==='switch'?'switch':'pc');

const escH=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const add=(p,...kids)=>kids.forEach(k=>{if(k!=null&&k!==false)p.append(k);});
const isDesktop=()=>window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/* ---------------- stats ---------------- */
const S={drill:store.get('ns_drill',{right:0,tried:0,streak:0,best:0}),tasks:store.get('ns_tasks',{}),labs:store.get('ns_labs',0)};
function renderStats(){$('#sStreak').textContent=S.drill.streak;$('#sAcc').textContent=S.drill.tried?Math.round(100*S.drill.right/S.drill.tried)+'%':'–';
  $('#sTasks').textContent=`${Object.values(S.tasks).filter(t=>t.done).length}/${CS.TASKS.length}`;}

/* ---------------- a terminal attached to one device ---------------- */
function Terminal(dev,net,onRun){
  const outEl=el('div',{class:'tout',role:'log','aria-live':'polite','aria-label':`${dev.name||'device'} console output`});
  const pEl=el('span',{class:'tp'}),inp=el('input',{type:'text',autocomplete:'off',autocapitalize:'off',autocorrect:'off',spellcheck:'false','aria-label':'Command',enterkeyhint:'send'});
  const keys=el('div',{class:'tkeys'},...[['Tab','tab'],['?','help'],['↑','up'],['↓','down'],['Ctrl+Z','end']].map(([t,k])=>el('button',{type:'button','data-k':k,text:t})));
  const root=el('div',{class:'term'},outEl,el('div',{class:'tin'},pEl,inp),keys);
  const hist=[];let hi=0;
  const line=(t,c)=>{const d=el('div',{class:c||'out'});d.textContent=t;outEl.append(d);};
  function print(lines){lines.forEach(x=>line(x.t,x.c));while(outEl.childNodes.length>500)outEl.firstChild.remove();outEl.scrollTop=outEl.scrollHeight;}
  function pending(){return IOS.pendingPrompt(dev);}
  function refresh(){const p=pending();pEl.textContent=p?p.prompt:IOS.prompt(dev);inp.type=p&&p.mask?'password':'text';}
  function echo(text){const d=el('div',{class:'cmd'});d.append(el('span',{class:'p',text:pEl.textContent}),document.createTextNode(text));outEl.append(d);}
  function submit(text,isHelp){
    const p=pending();echo(p&&p.mask?'':text);
    if(!p&&text.trim()&&!isHelp){hist.push(text);}hi=hist.length;
    const res=IOS.run(dev,text,net);print(res);
    const holder=dev.type==='pc'&&!dev.session.length?dev:IOS.activeDev(dev);
    inp.value=isHelp&&holder.refill!=null?holder.refill:'';delete holder.refill;if(dev.refill!=null)delete dev.refill;
    refresh();outEl.scrollTop=outEl.scrollHeight;if(onRun)onRun(text,res);
  }
  const mode=()=>dev.type==='pc'?IOS.activeMode(dev):dev.mode;
  function key(k){
    if(k==='tab'){if(pending())return;const before=inp.value;const m=mode();inp.value=IOS.complete(m,before,IOS.activeDev(dev));}
    else if(k==='help'){if(pending())return;submit(inp.value+'?',true);}
    else if(k==='up'){if(hi>0){hi--;inp.value=hist[hi];}}
    else if(k==='down'){if(hi<hist.length-1){hi++;inp.value=hist[hi];}else{hi=hist.length;inp.value='';}}
    else if(k==='end'){submit('^Z');}
    inp.focus();
  }
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();submit(inp.value);}
    else if(e.key==='Tab'&&!e.shiftKey&&!pending()){
      const completed=IOS.complete(mode(),inp.value,IOS.activeDev(dev));
      if(completed!==inp.value){e.preventDefault();inp.value=completed;}
    }
    else if(e.key==='?'&&!pending()){e.preventDefault();key('help');}
    else if(e.key==='ArrowUp'){e.preventDefault();key('up');}
    else if(e.key==='ArrowDown'){e.preventDefault();key('down');}
    else if((e.key==='z'||e.key==='Z')&&e.ctrlKey){e.preventDefault();key('end');}
  });
  // some phone keyboards don't send a usable keydown for "?"
  inp.addEventListener('input',()=>{if(!pending()&&inp.value.endsWith('?')){const v=inp.value.slice(0,-1);inp.value=v;submit(v+'?',true);}});
  keys.addEventListener('click',e=>{const b=e.target.closest('button');if(b)key(b.dataset.k);});
  outEl.addEventListener('click',()=>{if(!window.getSelection().toString())inp.focus();});
  refresh();
  return {root,print,refresh,focus:()=>inp.focus({preventScroll:true}),input:inp,submit,line};
}
/* a PC: IP Configuration form plus a command prompt */
function PCPanel(pc,net,onChange){
  const term=Terminal(pc,net,onChange);
  const f=k=>el('input',{id:`${pc.name}-${k}`,inputmode:'decimal',autocomplete:'off',spellcheck:'false',value:pc[k]||'',placeholder:k==='mask'?'255.255.255.0':'0.0.0.0'});
  const ip=f('ip'),mask=f('mask'),gw=f('gw');
  const form=el('div',{class:'ipform'},el('label',{for:ip.id,text:'IPv4 Address'}),ip,el('label',{for:mask.id,text:'Subnet Mask'}),mask,el('label',{for:gw.id,text:'Default Gateway'}),gw,
    el('div',{class:'dim',style:'grid-column:1/-1;font-size:13px',text:'Changes apply as you type, like Packet Tracer’s Desktop › IP Configuration.'}));
  const sync=()=>{const v=x=>{const t=x.value.trim();return IOS.ip2n(t)!=null?t:null;};pc.ip=v(ip);pc.mask=IOS.isMask(IOS.ip2n(mask.value.trim()))?mask.value.trim():null;pc.gw=v(gw);if(onChange)onChange();};
  [ip,mask,gw].forEach(x=>x.addEventListener('input',sync));
  const bIP=el('button',{class:'on',type:'button',text:'IP Configuration'}),bCmd=el('button',{type:'button',text:'Command Prompt'});
  const show=w=>{form.hidden=w!=='ip';term.root.hidden=w!=='cmd';bIP.classList.toggle('on',w==='ip');bCmd.classList.toggle('on',w==='cmd');if(w==='cmd')term.focus();};
  bIP.onclick=()=>show('ip');bCmd.onclick=()=>show('cmd');
  const root=el('div',{class:'pcpanel'},el('div',{class:'dtabs pct'},bIP,bCmd),form,term.root);
  show(pc.ip?'cmd':'ip');
  return {root,term,show,focus:()=>{if(!form.hidden)ip.focus();else term.focus();}};
}

/* ---------------- views ---------------- */
let view=null;
function go(v,arg){
  view=v;$$('#tabs .tab').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  ['path','drills','tasks','lab','sandbox','cheat'].forEach(k=>{$('#v-'+k).hidden=k!==v;});
  document.body.classList.toggle('pl-focus',false);
  if(v!=='drills'&&Drills.inSession)Drills.endSession();
  if(v==='path')Path.map();
  if(v==='drills')Drills.start();
  if(v==='tasks'){if(arg)Tasks.open(arg.id,arg.params);else Tasks.list();}
  if(v==='lab')Lab.start(arg&&arg.lab);
  if(v==='sandbox')Sandbox.start();
  if(v==='cheat')Cheat.render();
}
$$('#tabs .tab').forEach(b=>b.onclick=()=>{try{history.replaceState(null,'',location.pathname+(b.dataset.v==='path'?'':'?tab='+b.dataset.v));}catch(e){}store.set('ns_tab',b.dataset.v);if(b.dataset.v==='drills'&&Drills.inSession)Drills.endSession();go(b.dataset.v);});

/* ---------------- drills ---------------- */
const Drills=(()=>{
  let group='All',queue=[],cur=null,missedNow=false,shown=false,sess=null;
  const reviewGroup='Missed commands';
  const saved=store.get('ns_command_review',[]);
  const missed=new Set(Array.isArray(saved)?saved.filter(k=>typeof k==='string'):[]);
  const commandKey=d=>[d.g,d.dev,d.mode,d.ids.join(','),String(d.purpose)].join('|');
  function remember(d,needsReview){
    const key=commandKey(d);
    if(needsReview)missed.add(key);else missed.delete(key);
    store.set('ns_command_review',[...missed]);
    if(sess&&cur&&!cur.reported){cur.reported=true;if(!cur.retry)sess.onResult(!needsReview);}
  }
  // a missed drill comes back: a few questions later in free practice, at the end of a path session
  function requeue(){if(sess){if(sess.extra<3){sess.q.push({i:cur.i,retry:true});sess.extra++;}}else queue.splice(Math.min(3,queue.length),0,cur.i);}
  const groups=['All',reviewGroup,...new Set(CS.DRILLS.map(d=>d.g))];
  const root=$('#v-drills');
  function fill(){const pool=CS.DRILLS.map((d,i)=>i).filter(i=>group==='All'||(group===reviewGroup?missed.has(commandKey(CS.DRILLS[i])):CS.DRILLS[i].g===group));queue=queue.concat(shuffle(pool));}
  function nextItem(){
    if(sess){if(!sess.q.length){const s=sess;sess=null;cur=null;s.onDone();return;}
      const it=sess.q.shift(),dr=CS.DRILLS[it.i],v=dr.gen?dr.gen():{};
      const dev=IOS.newDevice(dr.dev,dr.dev==='router'?pickName('R'):dr.dev==='switch'?pickName('S'):'PC1');
      if(dr.dev!=='pc'){dev.mode=dr.mode;dev.ctx=dr.ctx||null;if(dr.mode==='line')dev.vtyRange=[0,dev.vtyMax];}
      cur={i:it.i,dr,v,dev,retry:!!it.retry};missedNow=false;shown=false;render();return;}
    if(group===reviewGroup)queue=queue.filter(i=>missed.has(commandKey(CS.DRILLS[i])));
    if(!queue.length)fill();
    if(!queue.length){
      root.replaceChildren(el('h2',{text:'Missed commands'}),el('p',{text:'Your review queue is clear. Commands you miss in Drills will appear here.'}),el('button',{type:'button',class:'btn primary',text:'Back to all commands',onclick:()=>{group='All';nextItem();}}));
      cur=null;return;
    }
    const i=queue.shift(),dr=CS.DRILLS[i],v=dr.gen?dr.gen():{};
    const dev=IOS.newDevice(dr.dev,dr.dev==='router'?pickName('R'):dr.dev==='switch'?pickName('S'):'PC1');
    if(dr.dev!=='pc'){dev.mode=dr.mode;dev.ctx=dr.ctx||null;if(dr.mode==='line')dev.vtyRange=[0,dev.vtyMax];}
    cur={i,dr,v,dev};missedNow=false;shown=false;render();
  }
  const pickName=p=>p==='R'?CS.pick(['R1','R2','Branch','HQ']):CS.pick(['S1','S2','Access1']);
  const txt=(x,v)=>typeof x==='function'?x(v):x;
  function render(){
    const {dr,v,dev}=cur;root.textContent='';
    const picker=el('select',{id:'drillTopic',onchange:e=>{group=e.target.value;queue=[];nextItem();}},...groups.map(g=>el('option',{value:g,text:g===reviewGroup?g+' ('+missed.size+')':g})));
    picker.value=group;
    const chips=el('div',{class:'drill-picker'},el('label',{for:'drillTopic',text:'Practice topic'}),picker);
    const updateReviewCount=()=>{picker.options[groups.indexOf(reviewGroup)].textContent=reviewGroup+' ('+missed.size+')';};
    const inp=el('input',{id:'din',autocomplete:'off',autocapitalize:'off',autocorrect:'off',spellcheck:'false','aria-label':'Your command',enterkeyhint:'go',placeholder:'type the command'});
    const fb=el('div',{class:'dfb',id:'dfb','aria-live':'polite'});
    const check=el('button',{class:'btn primary',type:'button',text:'Check'}),showB=el('button',{class:'btn',type:'button',text:'Hint'}),skip=el('button',{class:'btn ghost',type:'button',text:'Skip'});
    root.append(sess?sess.strip(cur):el('div',{class:'dmeta'},el('span',{text:`${dr.g} · ${dr.dev==='pc'?'PC':dr.dev==='router'?'router':'switch'}`}),el('span',{text:`Streak ${S.drill.streak} · best ${S.drill.best}`})),sess?'':chips,
      el('div',{class:'dpurpose',id:'dq',text:txt(dr.purpose,v)}),
      el('div',{class:'dbox'},el('span',{class:'tp',text:IOS.prompt(dev)}),inp),fb,el('div',{class:'dacts'},check,showB,skip),
      el('p',{class:'dim',style:'font-size:13px;margin-top:14px',text:'Any abbreviation IOS would accept counts (conf t, int g0/0, no shut…). Tab completes a partial command. When there is nothing to complete, Tab moves to the next control.'}));
    const answer=()=>{
      const t=inp.value;if(!t.trim()){fb.textContent='Type the command first.';return;}
      if(fb.dataset.done){nextItem();return;}
      const r=IOS.parse(dr.mode==='pc'?'pc':dr.mode,t,dev);fb.textContent='';
      const right=r.ok&&dr.ids.includes(r.id)&&(!dr.check||dr.check(r.args,v));
      if(right){
        if(!missedNow&&!shown){remember(dr,false);updateReviewCount();S.drill.right++;S.drill.streak++;S.drill.best=Math.max(S.drill.best,S.drill.streak);}
        S.drill.tried+=missedNow||shown?0:1;store.set('ns_drill',S.drill);renderStats();
        const full=txt(dr.answer,v),sh=txt(dr.short,v);
        add(fb,el('div',{class:'ok',text:'✓ Correct'}),el('div',{class:'ans',text:full}),sh&&sh!==t.trim()&&sh!==full?el('div',{class:'dim',text:`Shortcut: ${sh}`}):null,dr.note?el('div',{class:'dim',text:dr.note}):null);
        fb.dataset.done='1';showB.disabled=true;check.textContent='Next';inp.readOnly=true;check.focus();return;}
      if(!missedNow&&!shown){remember(dr,true);updateReviewCount();missedNow=true;S.drill.tried++;S.drill.streak=0;store.set('ns_drill',S.drill);renderStats();requeue();}
      if(r.ok){const what=CS.IDNAME[r.id];fb.append(el('div',{class:'out',text:dr.ids.includes(r.id)?'Right command, but check the value'+(r.args.length>1?'s':'')+'.':`That’s a real command, but it would ${what||'do something else'}.`}));}
      else{const scratch=IOS.newDevice(dr.dev==='pc'?'pc':dr.dev,dev.name);if(scratch.type!=='pc'){scratch.mode=dev.mode;scratch.ctx=dev.ctx;}
        const o=IOS.run(scratch,t);const pre=el('div',{class:'out'});
        if(/^\s+\^$/.test((o[0]||{}).t||''))pre.append(el('div',{style:'color:var(--text)',text:IOS.prompt(dev)+t}));
        o.forEach(x=>pre.append(el('div',{class:x.c==='coach'?'coach':'',text:(x.c==='coach'?'💡 ':'')+x.t})));
        if(!o.length)pre.append(el('div',{text:'% Invalid input detected.'}));
        fb.append(pre);}
      inp.select();
    };
    check.onclick=answer;inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();answer();}else if(e.key==='Tab'&&!e.shiftKey&&!inp.readOnly){const completed=IOS.complete(dr.mode==='pc'?'pc':dr.mode,inp.value,dev);if(completed!==inp.value){e.preventDefault();inp.value=completed;}}});
    check.addEventListener('keydown',e=>{if(e.key==='Enter'&&fb.dataset.done){e.preventDefault();nextItem();}});
    // first a hint: the command's shape with the values as <placeholders> (the values that change between drills),
    // then the full answer. Either one means the drill comes back later and scores nothing now.
    const shape=()=>{const a=txt(dr.answer,v).split(' ');if(!dr.gen)return null;const others=[0,1,2,3].map(()=>{const w=dr.gen();return txt(dr.answer,w).split(' ');}).filter(o=>o.length===a.length);
      if(a[0]==='description')return 'description <text>';if(a[0]==='banner')return 'banner motd #<message>#';
      const out=a.map((tok,i)=>others.some(o=>o[i]!==tok)?(/^\d+\.\d+\.\d+\.\d+$/.test(tok)?(/^255\./.test(tok)?'<mask>':'<address>'):/^flash:/.test(tok)?'flash:<file name>':/:.*\//.test(tok)?'<IPv6 address>/<prefix>':'<value>'):tok).join(' ');return out===a.join(' ')?null:out;};
    let hinted=false;
    showB.onclick=()=>{if(!hinted&&!shown){const sp=shape();hinted=true;showB.textContent='Show answer';
        if(sp){if(!missedNow){remember(dr,true);updateReviewCount();missedNow=true;S.drill.tried++;S.drill.streak=0;store.set('ns_drill',S.drill);renderStats();requeue();}
          fb.textContent='';add(fb,el('div',{class:'out',text:'The command looks like this. The values come from the task above.'}),el('div',{class:'ans',text:sp}));inp.focus();return;}}
      if(!shown&&!missedNow){remember(dr,true);updateReviewCount();S.drill.tried++;S.drill.streak=0;store.set('ns_drill',S.drill);renderStats();requeue();}shown=true;
      fb.textContent='';const sh=txt(dr.short,v);add(fb,el('div',{class:'ans',text:txt(dr.answer,v)}),sh?el('div',{class:'dim',text:`Shortcut: ${sh}`}):null,dr.note?el('div',{class:'dim',text:dr.note}):null,el('div',{class:'dim',text:'Type it in to move on.'}));inp.focus();};
    skip.onclick=nextItem;
    if(isDesktop())inp.focus({preventScroll:true});
  }
  return {start(){if(sess)return;if(!cur)nextItem();else render();},get cur(){return cur;},
    // the learning path runs a session: these drills, each missed one asked again at the end
    session(o){sess={q:o.idx.map(i=>({i})),extra:0,onResult:o.onResult,onDone:o.onDone,strip:o.strip};cur=null;nextItem();},
    endSession(){sess=null;cur=null;},get inSession(){return !!sess;}};
})();

/* ---------------- tasks ---------------- */
const Tasks=(()=>{
  const root=$('#v-tasks');let T=null,t=null,sess=null;
  function list(){
    T=null;root.textContent='';
    const grid=el('div',{class:'tlist'},...CS.TASKS.map(x=>{const p=S.tasks[x.id];
      return el('button',{class:'tcard',type:'button','data-id':x.id,onclick:()=>{setURL(x.id);open(x.id);}},el('span',{class:'lvl',text:x.level}),el('b',{text:x.title}),el('small',{text:x.skills}),p&&p.done?el('span',{class:'done',text:`✓ Done ${'★'.repeat(p.stars||1)}${'☆'.repeat(3-(p.stars||1))}`}):null);}));
    root.append(el('div',{class:'card'},el('h2',{text:'Tasks'}),el('p',{class:'dim',text:'Real configurations on simulated routers, switches and PCs. Goals tick off as soon as the device is configured right, in any order. New names, passwords and addresses every time.'}),grid));
  }
  function setURL(id,params){try{const u=new URL(location.href);u.search='';u.searchParams.set('task',id);if(params)Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));history.replaceState(null,'',u.toString());}catch(e){}}
  function open(id,params){
    T=CS.TASKS.find(x=>x.id===id);if(!T){list();return;}
    t=T.build(params);sess={start:Date.now(),showme:0,help:{words:0,syntax:0,exact:0},lvl:{},done:false,ok:new Set(),terms:{},qst:{ok:new Set(),helped:new Set(),tries:{},hint:{}}};sess.qok=sess.qst.ok;
    if(t.params)setURL(id,t.params);
    root.textContent='';
    const side=el('div',{class:'card tside'}),main=el('div',{class:'card tmain'});root.append(el('div',{class:'tview'},side,main));
    // side: intro, given values, table, goals
    add(side,el('div',{class:'row',style:'justify-content:space-between'},el('span',{class:'dim mono',style:'font-size:12px',text:T.level.toUpperCase()}),el('button',{class:'btn small ghost',type:'button',text:'← All tasks',onclick:()=>{setURL('');try{history.replaceState(null,'',location.pathname+'?tab=tasks');}catch(e){}list();}})),
      el('h2',{text:T.title}),el('p',{html:t.intro}),id==='scenario'?el('button',{class:'btn small',type:'button',text:'← Part 1: subnetting and the Addressing Table',onclick:()=>{const p=t.params||{};go('lab',{lab:{kind:'lab',base:p.lab,hosts:p.hosts,r1:p.r1,r2:p.r2}});}})
        :id==='subnet-ipv4'?el('button',{class:'btn small',type:'button',text:'← Part 1: the subnetting scheme and the Addressing Table',onclick:()=>{const p=t.params||{};const h=String(p.hosts||'').split(',').map(Number);go('lab',{lab:{kind:'sub',base:p.subnet,a:h[0],b:h[1],spare:p.spare}});}})
        :id==='vlsm-scenario'?el('button',{class:'btn small',type:'button',text:'← Parts 1–2: VLSM design and the Addressing Table',onclick:()=>{const p=t.params||{};go('lab',{lab:{kind:'vlsm',base:p.vlsm,hosts:String(p.hosts||'').split(',').map(Number)}});}}):null);
    if(t.given)side.append(el('table',{class:'given'},...t.given.map(([k,v])=>el('tr',null,el('td',{text:k}),el('td',{class:'v',text:v})))));
    const tableEl=!t.table?null:(el('details',{open:!matchMedia('(max-width:900px)').matches},el('summary',{class:'dim mono',style:'cursor:pointer;font-size:12px',text:'ADDRESSING TABLE'}),el('div',{class:'tablewrap'},el('table',{class:'given'},el('tr',null,...(t.tableHead||['Device','Interface','IP address','Mask','Note']).map(h=>el('th',{text:h}))),...t.table.map(r=>el('tr',null,...r.map((c,i)=>el('td',{class:i>=2?'v':'',text:c}))))))));
    const ul=el('ul',{class:'goals',id:'goals'},...t.goals.map((g,i)=>el('li',{'data-i':i},el('i',{'aria-hidden':'true'}),el('span',null,g.text,t.tabs.length>1?el('span',{class:'dv',text:g.dev}):null))));
    const sm=el('div',{id:'showme'}),banner=el('div',{id:'banner'});
    // questions from the handout, checked against the devices as they are now
    const qs=!t.questions?null:el('ol',{class:'tquestions',id:'tquestions'},...t.questions.map((q,i)=>TeachQ({text:q.text,options:q.options,check:v=>q.check(v,t.net),get answer(){return q.answer;},look:q.look||(q.how?`Use ${q.how}.`:null),why:q.why},i,sess.qst,()=>{sess.qok=sess.qst.ok;recheck();})));
    side.append(el('h3',{text:'Goals'}),ul,...(qs?[el('h3',{text:'Questions'}),qs]:[]),banner,sm,el('div',{class:'row'},el('button',{class:'btn small',type:'button',id:'showBtn',text:'💡 Help with the next step',onclick:()=>showMe(1)}),el('button',{class:'btn small ghost',type:'button',text:'↺ Start over (new values)',onclick:()=>open(T.id,t.params)})));
    // main: device tabs and a terminal or PC panel for each
    const tabs=el('div',{class:'dtabs',role:'tablist'}),panes=el('div');
    t.tabs.forEach((name,i)=>{const d=t.net.devices[name];
      const pane=d.type==='pc'?PCPanel(d,t.net,recheck):Terminal(d,t.net,recheck);
      if(d.type!=='pc'){pane.print([{t:`${name} — ${d.type==='router'?'Cisco 1941 router':'Cisco 2960 switch'} console. Press Enter to start; type ? for help.`,c:'sys'}]);}
      sess.terms[name]=pane;pane.root.hidden=i>0;panes.append(pane.root);
      tabs.append(el('button',{type:'button',role:'tab','aria-selected':String(i===0),class:i===0?'on':'','data-dev':name,onclick:()=>tabTo(name)},devIco(d),name));});
    main.append(el('div',{class:'nextgoal',id:'nextgoal','aria-live':'polite'}),tabs,panes);if(tableEl){tableEl.classList.add('ttable');main.append(tableEl);}
    recheck(true);
    const first=sess.terms[t.tabs[0]];if(isDesktop())first.focus();
  }
  function tabTo(name){$$('.tmain .dtabs[role=tablist] button').forEach(b=>{b.classList.toggle('on',b.dataset.dev===name);b.setAttribute('aria-selected',String(b.dataset.dev===name));});Object.entries(sess.terms).forEach(([n,p])=>{p.root.hidden=n!==name;});const p=sess.terms[name];if(p.focus)p.focus();}
  function recheck(initial){
    if(!t)return;const lis=$$('#goals li');
    t.goals.forEach((g,i)=>{let ok=false;try{ok=!!g.check(t.net);}catch(e){}const li=lis[i];if(!li)return;
      if(ok&&!li.classList.contains('ok')&&initial!==true){li.classList.add('pop');setTimeout(()=>li.classList.remove('pop'),500);}
      li.classList.toggle('ok',ok);if(ok)sess.ok.add(i);});
    const all=t.goals.every(g=>{try{return g.check(t.net);}catch(e){return false;}})&&(!t.questions||sess.qok.size===t.questions.length);
    const nx=t.goals.find(g=>{try{return !g.check(t.net);}catch(e){return true;}}),ng=$('#nextgoal');
    if(ng){ng.textContent='';if(nx)ng.append(el('b',{text:'Next goal '}),el('span',{text:nx.text}),...(t.tabs.length>1?[el('span',{class:'dv',text:` · ${nx.dev}`})]:[]));else if(t.questions&&sess.qok.size<t.questions.length)ng.append(el('b',{text:'Next '}),el('span',{text:`answer the questions (${t.questions.length-sess.qok.size} left)`}));else ng.append(el('b',{text:'All goals done ✓'}));}
    if(all&&!sess.done){sess.done=true;const stars=sess.showme===0?3:sess.showme<=4?2:1,mins=Math.max(1,Math.round((Date.now()-sess.start)/60000));
      const prev=S.tasks[T.id]||{};S.tasks[T.id]={done:true,stars:Math.max(stars,prev.stars||0)};store.set('ns_tasks',S.tasks);renderStats();
      const b=$('#banner');b.textContent='';b.append(el('div',{class:'done-banner'},el('b',{text:'Task complete! '}),el('span',{class:'stars',text:'★'.repeat(stars)+'☆'.repeat(3-stars)}),
        el('div',{class:'dim',text:`${sess.showme?'Help used: '+[[sess.help.words,'nudge'],[sess.help.syntax,'syntax'],[sess.help.exact,'exact command']].filter(([n])=>n).map(([n,w])=>`${n} ${w}${n>1&&w!=='syntax'?'s':''}`).join(', '):'No help used'} · about ${mins} min`}),
        el('div',{class:'row',style:'margin-top:8px'},el('button',{class:'btn small primary',type:'button',text:'Again with new values',onclick:()=>open(T.id,T.id==='scenario'?t.params:undefined)}),el('button',{class:'btn small',type:'button',text:'Next task →',onclick:()=>{const i=CS.TASKS.indexOf(T);const n=CS.TASKS[(i+1)%CS.TASKS.length];setURL(n.id);open(n.id);}}))));
      $('#showme').textContent='';}
    if(!all&&sess.done){/* undone after finishing: keep the banner; it was earned */}
  }
  // Help comes in three levels per goal: what to do in words, then the command syntax with placeholders, then the exact
  // commands. Each level costs a little toward the stars. Questions get their hints instead of their answers.
  function showMe(want){
    const i=t.goals.findIndex(g=>{try{return !g.check(t.net);}catch(e){return true;}});const box=$('#showme');box.textContent='';
    if(i<0){if(!t.questions)return;const j=t.questions.findIndex((q,k)=>!sess.qst.ok.has(k));if(j<0)return;
      const li=$(`#tquestions li[data-q="${j}"]`);const hb=li&&$$('button',li).find(b=>b.textContent==='Hint'&&!b.hidden);
      if(hb){hb.click();sess.showme++;sess.help.words++;}
      box.append(el('div',{class:'showme'},el('div',{text:hb?`Question ${j+1}: a hint is open under it.`:`Question ${j+1}: you’ve seen every hint. Try an answer; after two tries you can unlock it.`})));
      if(li)li.scrollIntoView({block:'center',behavior:'smooth'});return;}
    const g=t.goals[i],d=t.net.devices[g.dev];
    const cur=sess.lvl[i]||0,lv=Math.min(3,Math.max(cur+1,want||1));
    if(lv>cur){sess.showme+=lv===3?2:1;sess.help[lv===1?'words':lv===2?'syntax':'exact']++;sess.lvl[i]=lv;}
    tabTo(g.dev);
    if(g.where==='pcip'){const parts=g.text.replace(/^[^:]+:\s*/,'');
      box.append(el('div',{class:'showme'},el('div',{text:`On ${g.dev}, open Desktop › IP Configuration and fill in the address, mask and gateway${sess.lvl[i]>=2?':':' from the Addressing Table.'}`}),sess.lvl[i]>=2?el('div',{class:'mono',text:parts}):null,
        sess.lvl[i]<2?el('div',{class:'dim',text:'A PC’s gateway is its router’s address on the PC’s own LAN.'}):null,sess.lvl[i]<2?el('button',{class:'btn small ghost',type:'button',text:'Show the values',onclick:()=>showMe(2)}):null));
      if(sess.terms[g.dev].show)sess.terms[g.dev].show('ip');return;}
    const H=CS.helpSteps(g,d,t);
    const secretNote=H.exact.includes('enable')&&d.cfg&&(d.cfg.enableSecret||d.cfg.enablePassword)?' (it will ask for the enable secret)':'';
    const L=sess.lvl[i];
    const body=L===1?el('ol',{class:'help-words'},...H.words.map(w=>el('li',{html:w})))
      :el('ol',null,...(L===2?H.syntax:H.exact).map(x=>el('li',{class:'mono',text:x===''?'(press Enter to confirm)':x})));
    box.append(el('div',{class:'showme'},
      el('div',{text:L===1?`On ${g.dev}, starting from ${IOS.prompt(d)}:`:L===2?`On ${g.dev}, from ${IOS.prompt(d)}, the commands look like this (fill in the <values>):`:`On ${g.dev}, from ${IOS.prompt(d)} type:`}),body,
      L===1?el('div',{class:'dim',text:'Not sure of a command’s name? Type the start of it and ? at the prompt.'}):null,
      L===2?el('div',{class:'dim',text:'The values are in the goal, the given table or the Addressing Table.'}):null,
      L===3&&secretNote?el('div',{class:'dim',text:secretNote}):null,
      g.where==='pc'?el('div',{class:'dim',text:'Use the PC’s Command Prompt.'}):null,
      L<3?el('div',{class:'row'},el('button',{class:'btn small ghost',type:'button',text:L===1?'Show the syntax':'Show the exact commands',onclick:()=>showMe(L+1)})):null));
    if(sess.terms[g.dev].show)sess.terms[g.dev].show('cmd');
  }
  return {list,open,get t(){return t;},get sess(){return sess;}};
})();

/* ---------------- sandbox ---------------- */
const Sandbox=(()=>{
  const root=$('#v-sandbox');let built=false;
  function build(){
    root.textContent='';built=true;
    const r=IOS.newDevice('router','Router'),s=IOS.newDevice('switch','Switch'),pc=IOS.newDevice('pc','PC1');
    const net={devices:{Router:r,Switch:s,PC1:pc}};const terms={Router:Terminal(r,net),Switch:Terminal(s,net),PC1:PCPanel(pc,net)};
    const tabs=el('div',{class:'dtabs',role:'tablist','aria-label':'Devices'});const panes=el('div');
    Object.entries(terms).forEach(([n,p],i)=>{p.root.hidden=i>0;panes.append(p.root);if(n!=='PC1')p.print([{t:`${n}: a factory-fresh ${n==='Router'?'Cisco 1941 router':'Cisco 2960 switch'}. Router G0/0 — Switch — PC1 are cabled together.`,c:'sys'}]);
      tabs.append(el('button',{type:'button',role:'tab','aria-selected':String(i===0),class:i===0?'on':'',onclick:e=>{const t=e.currentTarget;$$('button',tabs).forEach(b=>{b.classList.toggle('on',b===t);b.setAttribute('aria-selected',String(b===t));});Object.entries(terms).forEach(([m,q])=>{q.root.hidden=m!==n;});p.focus();}},devIco(net.devices[n]),n));});
    root.append(el('div',{class:'row',style:'justify-content:space-between'},el('h2',{text:'Sandbox'}),el('button',{class:'btn small ghost',type:'button',text:'↺ Reset everything',onclick:build})),
      el('p',{class:'dim',text:'No goals, no score: a router, a switch and a PC to try anything on. ? shows what you can type at any prompt.'}),tabs,panes);
    if(isDesktop())terms.Router.focus();
  }
  return {start(){if(!built)build();}};
})();

/* ---------------- cheat sheet ---------------- */
const Cheat={done:false,render(){
  if(this.done)return;this.done=true;const root=$('#v-cheat');
  root.append(el('h2',{text:'Cheat sheet'}),
    el('div',{class:'modes','aria-label':'IOS modes'},el('span',null,el('b',{text:'R1>'}),' user EXEC'),el('em',{text:'enable →'}),el('span',null,el('b',{text:'R1#'}),' privileged EXEC'),el('em',{text:'conf t →'}),el('span',null,el('b',{text:'R1(config)#'}),' global config'),el('em',{text:'interface / line →'}),el('span',null,el('b',{text:'R1(config-if)#'}),' / ',el('b',{text:'(config-line)#'}))),
    el('p',{class:'dim',text:'exit goes up one level; end (or Ctrl+Z) goes straight back to R1#. Any unique abbreviation works: conf t, int g0/0, no shut, copy run start.'}));
  CS.CHEAT.forEach(([title,rows])=>root.append(el('h3',{text:title}),el('table',null,...rows.map(r=>el('tr',null,el('td',{text:r[0]}),el('td',{text:r[1]}),el('td',{class:'dim',text:r[2]}))))));
}};

/* ---------------- install (PWA) ---------------- */
let deferred=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').hidden=false;});
$('#installBtn').onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice.catch(()=>{});deferred=null;$('#installBtn').hidden=true;}};
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});




/* A question that teaches before it tells. Hint shows where to look, then the idea behind it. A wrong answer opens the
   next hint by itself. The answer only unlocks after two wrong tries or both hints, comes with the reasoning, and still
   has to be entered; it then counts as "with help", not "on your own". q: {text, options?, check(v), answer, look?, why?} */
function TeachQ(q,num,st,onRight){
  // st: {ok:Set, helped:Set, tries:{}, hint:{}} shared per question list; num is the question's index
  const fb=el('div',{class:'tq-fb'}),hints=el('div',{class:'tq-hints'});let val='';
  const H=[q.look&&['Where to look',q.look],q.why&&['Think about it',q.why]].filter(Boolean);
  const inp=q.options?null:el('input',{type:'text','aria-label':q.text,autocomplete:'off',spellcheck:'false',autocapitalize:'off',placeholder:'your answer'});
  const picks=q.options?el('div',{class:'groups lab-picks'},...q.options.map(o=>el('button',{class:'chip',type:'button',text:o,onclick:e=>{val=o;$$('button',picks).forEach(b=>b.classList.toggle('on',b===e.currentTarget));}}))):null;
  const hintBtn=el('button',{class:'btn small',type:'button',text:'Hint',onclick:()=>{st.hint[num]=Math.min(H.length,(st.hint[num]||0)+1);paint();}});
  const showBtn=el('button',{class:'btn small ghost',type:'button',text:'Show the answer',onclick:()=>{st.helped.add(num);st.shown=st.shown||new Set();st.shown.add(num);fb.textContent='';fb.className='tq-fb';if(inp){inp.value='';}paint();if(inp)inp.focus();}});
  const li=el('li',{value:String(num+1),'data-q':String(num)},el('span',{class:'tq-t',text:q.text}),el('div',{class:'row'},inp,picks,el('button',{class:'btn small',type:'button',text:'Check',onclick:ask}),hintBtn,showBtn),hints,fb);
  function unlocked(){return (st.tries[num]||0)>=2||((st.hint[num]||0)>=H.length&&(st.tries[num]||0)>=1)||!H.length&&(st.tries[num]||0)>=1;}
  function paint(){
    const h=st.hint[num]||0;hints.textContent='';
    H.slice(0,h).forEach(([k,t])=>hints.append(el('div',{class:'tq-hint'},el('b',{text:k+': '}),el('span',{html:t}))));
    if(st.shown&&st.shown.has(num)&&!st.ok.has(num))hints.append(el('div',{class:'tq-hint ans'},el('b',{text:'Answer: '}),el('span',{text:q.answer}),q.why&&h<H.length?el('div',{class:'dim',html:q.why}):null,el('div',{class:'dim',text:inp?'Type it in to finish this one.':'Pick it to finish this one.'})));
    hintBtn.hidden=st.ok.has(num)||h>=H.length;showBtn.hidden=st.ok.has(num)||!unlocked()||(st.shown&&st.shown.has(num));
    li.className=st.ok.has(num)?(st.helped.has(num)?'ok helped':'ok'):'';
  }
  function ask(){const v=inp?inp.value:val;if(!String(v).trim()){fb.textContent=inp?'Type an answer first.':'Pick an answer first.';fb.className='tq-fb coach';return;}
    let ok=false;try{ok=!!q.check(v);}catch(e){}
    if(ok){st.ok.add(num);fb.textContent=st.helped.has(num)?'✓ Right (with help)':'✓ Right, on your own';fb.className='tq-fb good';paint();if(onRight)onRight();return;}
    st.tries[num]=(st.tries[num]||0)+1;
    if((st.hint[num]||0)<H.length)st.hint[num]=(st.hint[num]||0)+1;
    fb.textContent=unlocked()&&!(st.shown&&st.shown.has(num))?'Not quite. Read the hints; if you’re still stuck, the answer is unlocked.':'Not quite. Here’s a hint.';fb.className='tq-fb bad';paint();}
  if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ask();}});
  if(st.ok.has(num)){fb.textContent=st.helped.has(num)?'✓ Right (with help)':'✓ Right, on your own';fb.className='tq-fb good';}
  paint();return li;
}

/* ---------------- 9.3.4 IPv6 Neighbor Discovery: simulation mode, event list, PDU details, questions ---------------- */
const NDLab=(()=>{
  let x=null,sim=true,sel=-1,qst=null,terms={},root=null,cur='PCA1',counted=false;const fresh=()=>({ok:new Set(),helped:new Set(),tries:{},hint:{}});qst=fresh();
  const macN=v=>String(v||'').toLowerCase().replace(/[^0-9a-f]/g,'');
  const ipQ=want=>v=>ND.same(String(v).trim(),want);
  const macQ=want=>v=>macN(v)===macN(want);
  const numQ=f=>v=>/^\s*\d+\s*$/.test(String(v))&&Number(v)===f();
  const pick=(opts,right)=>{const o=opts.slice();let h=0;for(const c of right)h=(h*31+c.charCodeAt(0))>>>0;for(let i=o.length-1;i>0;i--){h=(h*1103515245+12345)>>>0;const j=h%(i+1);[o[i],o[j]]=[o[j],o[i]];}return {options:o,check:v=>v===right,answer:right};};
  function questions(){
    const A=x.PCA1.v6,B=x.PCA2.v6,C=x.PCB1.v6,g0=x.RTA.macs['GigabitEthernet0/0/0'],g1=x.RTA.macs['GigabitEthernet0/0/1'],U=v=>String(v).toUpperCase();
    const ev='the event list (click an event to open its PDU)';
    return [
      {part:`Part 1: a host on the same LAN. In Simulation mode, from PCA1: <code>ping -n 1 ${B.ip}</code>`},
      {text:'Why are NDP events in the list at all?',...pick(['PCA1 doesn’t know PCA2’s MAC address yet','PCA1 doesn’t know PCA2’s IPv6 address','The switch needs a route to PCA2','IPv6 sends every ping twice'],'PCA1 doesn’t know PCA2’s MAC address yet'),
        look:'Open event 1. Which Layer 2 addresses does PCA1’s echo request have?',why:'To put a frame on Ethernet, PCA1 needs the destination’s <b>MAC</b> address. It typed PCA2’s IPv6 address, so that part is known. NDP is IPv6’s way of asking “who has this address?” (it replaces IPv4’s ARP).'},
      {text:'The first event is ICMPv6. What message type number does it show?',check:v=>/^\s*128\b/.test(v)||/echo request/i.test(v),answer:'128 (Echo Request)',
        look:'Event 1, Out Layers, the ICMPv6 line.',why:'A ping is an ICMPv6 <b>Echo Request</b>; the reply is an Echo Reply. Their type numbers are next to each other.'},
      {text:'In PCA1’s first NDP event, what is the destination IPv6 address?',check:ipQ(ND.solicited(B.ip)),answer:U(ND.solicited(B.ip))+' (PCA2’s solicited-node multicast group)',
        look:'The first NDP event at PCA1, Out Layers, Layer 3 Dest.',why:'PCA1 can’t send to PCA2 directly yet, so it sends to a multicast group that only hosts whose address ends the same way join: <code>FF02::1:FF</code> + the last 6 hex digits of the target address.'},
      {text:'…and what Layer 2 destination address does that frame use?',check:macQ(ND.mcastMac(B.ip)),answer:ND.mcastMac(B.ip)+' (a multicast MAC: 3333 + the group’s last 32 bits)',
        look:'Same event, Layer 2 Dest.',why:'IPv6 multicast maps to a MAC that starts with <code>3333</code> followed by the last 32 bits of the multicast address. Compare it with the destination IPv6 address you just found.'},
      {text:'At SwitchA, do the In and Out Layer 2 addresses differ?',...pick(['No, the switch forwards the frame unchanged','Yes, the switch puts in its own MAC','Yes, it changes the destination to broadcast'],'No, the switch forwards the frame unchanged'),
        look:'The NDP event at SwitchA: compare In Layers with Out Layers.',why:'A switch is a Layer 2 device: it chooses which ports to send a frame out of, but doesn’t rewrite the frame.'},
      {text:'PCA2’s Neighbor Advertisement: what is the Ethernet destination MAC?',check:macQ(A.mac),answer:A.mac+' (PCA1)',
        look:'The NDP event at PCA2: its Out Layers are the advertisement it sends back.',why:'The solicitation carried PCA1’s MAC, so PCA2 can answer PCA1 directly (unicast) instead of multicasting.'},
      {text:'…the Ethernet source MAC?',check:macQ(B.mac),answer:B.mac+' (PCA2)',look:'Same event, Layer 2 Src.',why:'This is the whole point of the exchange: the advertisement’s source MAC is the answer PCA1 was asking for.'},
      {text:'…the IPv6 source address?',check:ipQ(B.ip),answer:U(B.ip),look:'Same event, Layer 3 Src.',why:'PCA2 answers from the address PCA1 asked about.'},
      {text:'…the IPv6 destination address?',check:ipQ(A.ip),answer:U(A.ip),look:'Same event, Layer 3 Dest.',why:'It goes back to whoever sent the solicitation.'},
      {text:'Why does RTA’s NDP event have no Out Layers?',...pick(['RTA isn’t the address being looked up, so it drops the solicitation','RTA is shut down','RTA forwards it to the other LAN','SwitchA blocks it'],'RTA isn’t the address being looked up, so it drops the solicitation'),
        look:'Find the NDP event where At Device is RTA and open it.',why:'Every device on the LAN receives the flooded frame, but only the owner of the target address answers. Routers also never forward link-local multicast to another network.'},
      {text:'After the advertisement, does PCA1 have everything it needs to send to PCA2?',...pick(['Yes: PCA2’s MAC address','No: it still needs PCA2’s IPv6 address','No: it needs the router’s MAC'],'Yes: PCA2’s MAC address'),
        look:'The next ICMPv6 event at PCA1: are both Layer 2 addresses filled in now?',why:'It already had both IPv6 addresses; NDP supplied the missing destination MAC. PCA2 is on the same LAN, so the router isn’t involved.'},
      {text:'What is the ICMPv6 Echo Reply message type number?',check:v=>/^\s*129\b/.test(v)||/echo reply/i.test(v),answer:'129 (Echo Reply)',look:'An ICMPv6 event at PCA2, Out Layers.',why:'It’s one more than the Echo Request.'},
      {text:'Reset the simulation and ping PCA2 again. Why are there no NDP events this time?',...pick(['PCA1 already has PCA2’s MAC in its neighbor cache','Neighbor Discovery only runs once a day','The switch answered for PCA2','Simulation mode hides them'],'PCA1 already has PCA2’s MAC in its neighbor cache'),
        look:'Click Reset Simulation, ping again, and count the NDP events.',why:'Devices remember what NDP taught them (the neighbor cache), just like an ARP cache in IPv4.'},
      {part:`Part 2: a host on another LAN. On RTA: <code>clear ipv6 neighbors</code>. Reset the simulation, then from PCA1: <code>ping -n 1 ${C.ip}</code>`},
      {text:'When RTA’s Neighbor Advertisement reaches PCA1, what is its source IPv6 address?',check:ipQ('fe80::1'),answer:'FE80::1 (RTA’s link-local address, PCA1’s default gateway)',
        look:'The NDP event at PCA1 after RTA answers, In Layers, Layer 3 Src. Compare it with PCA1’s default gateway in the Addressing Table.',why:'PCB1 is on another network, so PCA1 isn’t looking for PCB1’s MAC. It looks for its <b>default gateway</b>, which is a link-local address.'},
      {text:'PCA1’s echo request to PCB1: what destination MAC address does it use?',check:macQ(g0),answer:g0+' (RTA’s G0/0/0)',
        look:'The ICMPv6 event at PCA1 that has both Layer 2 addresses.',why:'The IPv6 destination stays PCB1 all the way, but each Ethernet frame only goes one hop. The first hop is the router’s interface on PCA1’s LAN.'},
      {text:'PCB1’s first outbound ICMPv6 (its echo reply): what’s missing from its Layer 2 information?',...pick(['The destination MAC address','The source MAC address','The destination IPv6 address','The source IPv6 address'],'The destination MAC address'),
        look:'The ICMPv6 event at PCB1, Out Layers.',why:'PCB1 learned RTA’s address from the solicitation’s IPv6 source, but its reply goes to its <b>gateway</b> (FE80::1), and it doesn’t have that MAC yet. So it runs NDP too.'},
      {text:'Reset and ping PCB1 again. Are there any NDP events?',...pick(['No','Yes'],'No'),look:'Reset Simulation, ping again, look at the Type column.',why:'Every device on the path now has what it needs in its neighbor cache.'},
      {text:'In that second run, whose MAC is the destination of PCB1’s echo reply?',...pick(['RTA’s G0/0/1 interface','PCA1','SwitchB','PCA2'],'RTA’s G0/0/1 interface'),
        look:`Open PCB1’s ICMPv6 event and compare the Layer 2 Dest with the routers’ MACs (on RTA: show interfaces).`,why:'Same rule as before, in the other direction: off-network traffic goes to the gateway’s MAC.'},
      {text:'Why does PCB1 use the router’s MAC for its reply?',...pick(['PCA1 is on another network, so the frame goes to the default gateway','The router pretends to be PCA1','PCB1 doesn’t know PCA1’s IPv6 address','Every frame goes to the router'],'PCA1 is on another network, so the frame goes to the default gateway'),
        look:'Compare the first 64 bits (the prefix) of PCB1’s and PCA1’s addresses.',why:'Different prefix means different network. Hosts only send straight to MACs on their own link; everything else goes through the gateway.'},
      {text:'On RTA, run show ipv6 neighbors. How many addresses are listed?',check:numQ(()=>x.RTA.nd6.length),get answer(){return String(x.RTA.nd6.length);},
        look:'RTA’s tab: <code>enable</code>, then <code>show ipv6 neighbors</code>. Count the rows.',why:'A router learns a neighbor when it solicits it or gets solicited by it. Think about which hosts RTA actually exchanged NDP with.'},
      {text:'Now ping PCA2 from RTA. Is there an entry for PCA2 in the table?',check:v=>v==='Yes'&&x.RTA.nd6.some(e=>ND.same(e.ip,B.ip)),options:['Yes','No'],answer:'Yes (after RTA pings it)',
        look:`On RTA: <code>ping ${B.ip}</code>, then <code>show ipv6 neighbors</code> again.`,why:'Before the ping, PCA2 had never talked to RTA. The ping made RTA run NDP for PCA2.'},
      {part:'Reflection'},
      {text:'When does a device need IPv6 Neighbor Discovery?',...pick(['When it needs the MAC address for an IPv6 address on its own link','Every time it sends any packet','Only when it talks to the internet','Only when it boots'],'When it needs the MAC address for an IPv6 address on its own link'),
        look:'Think back to the second pings, which had no NDP.',why:'NDP only runs when the cache doesn’t already have the next hop’s MAC, and only for addresses on the same link.'},
      {text:'How does a router keep Neighbor Discovery traffic down?',...pick(['It doesn’t forward the link-local multicasts, so ND stays on each LAN','It answers for every host','It caches every MAC in the network','It turns ND off on its interfaces'],'It doesn’t forward the link-local multicasts, so ND stays on each LAN'),
        look:'Did PCA1’s solicitation ever show up on SwitchB’s LAN?',why:'FF02:: addresses are link-local scope: a router never forwards them.'},
      {text:'How does IPv6 keep ND from bothering every host?',...pick(['Solicited-node multicast: only hosts whose address ends the same way listen','It broadcasts to everyone, but quietly','It asks the switch first','It uses ARP instead'],'Solicited-node multicast: only hosts whose address ends the same way listen'),
        look:'Look again at the destination address of a Neighbor Solicitation.',why:'IPv6 has no broadcast. The solicited-node group is built from the last 24 bits of the target address, so almost no other host is listening.'},
      {text:'How is ND different when the destination is on another LAN?',...pick(['The host finds the gateway’s MAC, and the router does ND on the far LAN','The host finds the far host’s MAC directly','Nothing changes','The router skips ND'],'The host finds the gateway’s MAC, and the router does ND on the far LAN'),
        look:'Compare Part 1’s event list with Part 2’s.',why:'Each hop resolves only its own next hop: PCA1 finds RTA, RTA finds PCB1, and PCB1 finds RTA for the reply.'},
    ];
  }
  const topo=`<svg class="topo" viewBox="0 0 640 150" role="img" aria-label="Topology: PCA1 and PCA2 on SwitchA, to RTA G0/0/0; RTA G0/0/1 to SwitchB and PCB1">
    <line class="tl" x1="90" y1="40" x2="200" y2="75"/><line class="tl" x1="90" y1="110" x2="200" y2="75"/><line class="tl" x1="240" y1="75" x2="300" y2="75"/><line class="tl" x1="340" y1="75" x2="420" y2="75"/><line class="tl" x1="460" y1="75" x2="540" y2="75"/>
    <rect class="tpc" x="40" y="26" width="60" height="26" rx="3"/><text class="tn" x="70" y="43" text-anchor="middle">PCA1</text>
    <rect class="tpc" x="40" y="98" width="60" height="26" rx="3"/><text class="tn" x="70" y="115" text-anchor="middle">PCA2</text>
    <rect class="tsw" x="180" y="63" width="70" height="24" rx="4"/><text class="tn" x="215" y="79" text-anchor="middle">SwitchA</text>
    <circle class="trt" cx="320" cy="75" r="22"/><text class="tn" x="320" y="80" text-anchor="middle">RTA</text>
    <text class="tt" x="292" y="56" text-anchor="end">G0/0/0</text><text class="tt" x="348" y="56">G0/0/1</text>
    <rect class="tsw" x="405" y="63" width="70" height="24" rx="4"/><text class="tn" x="440" y="79" text-anchor="middle">SwitchB</text>
    <rect class="tpc" x="540" y="62" width="60" height="26" rx="3"/><text class="tn" x="570" y="79" text-anchor="middle">PCB1</text></svg>`;
  function pduBox(e){
    const lay=(p,head)=>{if(!p)return el('div',{class:'nd-lay'},el('b',{text:head}),el('div',{class:'dim',text:'(none)'}));
      const eth=p.eth;return el('div',{class:'nd-lay'},el('b',{text:head}),
        el('div',null,el('span',{class:'k',text:'Layer 3 · IPv6 '}),el('span',{class:'mono',text:`Src: ${p.ip.src}  Dest: ${p.ip.dst}`})),
        el('div',null,el('span',{class:'k',text:`ICMPv6 · `}),el('span',{class:'mono',text:`Type ${p.icmp.type} (${p.icmp.name})`})),
        el('div',null,el('span',{class:'k',text:'Layer 2 · Ethernet II '}),eth&&eth.dst?el('span',{class:'mono',text:`Src: ${eth.src}  Dest: ${eth.dst}`}):el('span',{class:'mono warn',text:eth?`Src: ${eth.src}  Dest: (not known yet)`:'(no Layer 2 addresses yet)'})));};
    return el('div',{class:'nd-pdu'},el('div',{class:'nd-pdu-h',text:`Event ${e.n} · at ${e.at} · ${e.type}`}),e.note?el('p',{class:'dim',text:e.note}):null,lay(e.in,'In Layers'),lay(e.out,'Out Layers'));
  }
  function renderSim(){
    const box=$('#ndSim');if(!box)return;box.textContent='';const E=x.M.events;
    box.append(el('div',{class:'row nd-ctl'},el('div',{class:'groups',role:'group','aria-label':'Mode'},...['Realtime','Simulation'].map(m=>el('button',{class:'chip'+((m==='Simulation')===sim?' on':''),type:'button',text:m,'aria-pressed':String((m==='Simulation')===sim),onclick:()=>{sim=m==='Simulation';x.M.sim=sim;renderSim();}}))),
      el('button',{class:'btn small',type:'button',text:'↺ Reset Simulation',onclick:()=>{x.M.reset();sel=-1;renderSim();}}),el('span',{class:'dim',text:'Filters: ICMPv6, NDP'})));
    if(!sim){box.append(el('p',{class:'dim',text:'Realtime mode: pings happen instantly and nothing is recorded. Switch to Simulation to capture events.'}));return;}
    if(!E.length){box.append(el('p',{class:'dim',text:'No events yet. From PCA1’s command prompt, ping an address from the Addressing Table with ping -n 1.'}));return;}
    const tb=el('table',{class:'given nd-ev'},el('tr',null,...['#','Last Device','At Device','Type'].map(h=>el('th',{text:h}))),...E.map((e,i)=>el('tr',{class:(i===sel?'on ':'')+(e.type==='NDP'?'ndp':'icmp'),tabindex:'0',onclick:()=>{sel=i;renderSim();},onkeydown:ev=>{if(ev.key==='Enter'){sel=i;renderSim();}}},
      el('td',{text:String(e.n)}),el('td',{text:e.last}),el('td',{text:e.at}),el('td',null,el('span',{class:'nd-type',text:e.type})))));
    box.append(el('div',{class:'tablewrap nd-list'},tb),sel>=0&&E[sel]?pduBox(E[sel]):el('p',{class:'dim',text:'Click an event to see its PDU.'}));
  }
  function render(r){
    root=r;if(!x){x=ND.build();x.M.sim=sim;}
    const QS=questions();let qi=0;
    const list=el('ol',{class:'tquestions nd-q'});
    QS.forEach(q=>{if(q.part){list.append(el('li',{class:'nd-part',html:q.part}));return;}list.append(TeachQ(q,qi++,qst,done));});
    const total=qi;
    function done(){const b=$('#ndBanner');if(!b)return;b.textContent='';const own=[...qst.ok].filter(i=>!qst.helped.has(i)).length;
      if(qst.ok.size===total){b.append(el('div',{class:'done-banner'},el('b',{text:'Lab complete ✓ '}),el('span',{text:`${own} of ${total} on your own.`}),own<total?el('div',{class:'dim',text:'Start over runs the lab on new addresses: try the ones you needed help with again.'}):null));if(!counted){counted=true;S.labs=(S.labs||0)+1;store.set('ns_labs',S.labs);}}
      else b.append(el('div',{class:'dim',text:`${qst.ok.size} of ${total} answered · ${own} on your own`}));}
    const tabs=el('div',{class:'dtabs',role:'tablist','aria-label':'Devices'}),panes=el('div');
    ['PCA1','RTA','PCB1'].forEach(n=>{const d=x.net.devices[n];const t=terms[n]||(terms[n]=Terminal(d,x.net,()=>renderSim()));
      if(!t.started){t.print([{t:n==='RTA'?'RTA — Cisco ISR 4321 router console. Try show ipv6 neighbors, clear ipv6 neighbors, ping. Press Enter to start.':`${n} — Desktop › Command Prompt. Try ipconfig, or ping -n 1 followed by an address from the Addressing Table.`,c:'sys'}]);t.started=true;}
      t.root.hidden=n!==cur;panes.append(t.root);
      tabs.append(el('button',{type:'button',role:'tab','aria-selected':String(n===cur),class:n===cur?'on':'','data-dev':n,onclick:()=>{cur=n;$$('button',tabs).forEach(b=>{b.classList.toggle('on',b.dataset.dev===n);b.setAttribute('aria-selected',String(b.dataset.dev===n));});Object.entries(terms).forEach(([k,p])=>{p.root.hidden=k!==n;});terms[n].focus();}},devIco(d),n));});
    const addr=el('table',{class:'given'},el('tr',null,...['Device','Interface','IPv6 Address / Prefix','Default Gateway'].map(h=>el('th',{text:h}))),
      ...[['RTA','G0/0/0',x.A+'1/64','N/A'],['RTA','G0/0/1',x.B+'1/64','N/A'],['PCA1','NIC',x.PCA1.v6.ip+'/64','fe80::1'],['PCA2','NIC',x.PCA2.v6.ip+'/64','fe80::1'],['PCB1','NIC',x.PCB1.v6.ip+'/64','fe80::1']].map(row=>el('tr',null,...row.map((c,i)=>el('td',{class:i>=2?'v':'',text:c})))));
    r.append(el('div',{class:'dmeta'},el('span',{text:'PACKET TRACER LAB · 9.3.4 IPV6 NEIGHBOR DISCOVERY'}),el('button',{class:'btn small ghost',type:'button',text:'↺ Start over',onclick:()=>{x=null;terms={};qst=fresh();sel=-1;cur='PCA1';counted=false;Lab.start({kind:'nd'});}})),
      el('div',{class:'lab-prompt',html:`Watch how IPv6 finds a MAC address. In <b>Simulation</b> mode, every frame a ping causes shows up in the event list: click one to see its addresses. Neighbor Discovery (NDP) replaces IPv4’s ARP.${topo}`}),
      el('details',{class:'ttable',open:!matchMedia('(max-width:900px)').matches},el('summary',{class:'dim mono',style:'cursor:pointer;font-size:12px',text:'ADDRESSING TABLE'}),el('div',{class:'tablewrap'},addr)),
      el('div',{class:'lab-grid nd-grid'},el('div',{class:'lab-q'},tabs,panes),el('div',{class:'lab-q',id:'ndSim'})),
      el('h3',{text:'Questions'}),list,el('div',{id:'ndBanner'}));
    renderSim();done();
  }
  return {render,get x(){return x;},get sim(){return sim;},reset(){x=null;terms={};qst=fresh();sel=-1;}};
})();

/* ---------------- Packet Tracer lab: Part 1 (subnetting + Addressing Table) here, Part 2 = the scenario task ---------------- */
const Lab=(()=>{
  // two labs: 11.7.5 Subnetting Scenario (kind 'lab') and 11.9.3 VLSM Design (kind 'vlsm'), each with its own parts
  const KINDS={lab:{name:'11.7.5 Subnetting Scenario',parts:LAB.LABPARTS,task:'scenario',cfg:'Part 2'},vlsm:{name:'11.9.3 VLSM Design',parts:LAB.VLSMPARTS,task:'vlsm-scenario',cfg:'Part 3'},sub:{name:'11.5.5 Subnet an IPv4 Network',parts:LAB.SUBPARTS,task:'subnet-ipv4',cfg:'Part 2'},nd:{name:'9.3.4 IPv6 Neighbor Discovery',parts:{all:'All'},special:true}};
  let q=null,pr=null,k=0,miss=[],first=0,justDone=-1,done=false,msg='',msgCls='',hintN=0,keep=null,tries=[],shown=[];
  let kind=store.get('ns_labkind','lab');if(!KINDS[kind])kind='lab';
  const parts=Object.assign({lab:store.get('ns_labpart','all'),vlsm:'all',sub:'all'},store.get('ns_labparts',{}));let part;
  const setKind=kd=>{kind=kd;part=parts[kind];if(!KINDS[kind].parts[part])part='all';};setKind(kind);
  const root=()=>$('#v-lab'),ipStr=LAB.ipStr,oct=LAB.oct;
  const asParams=L=>kind==='vlsm'?{vlsm:ipStr(L.base),hosts:L.hosts.join(',')}:kind==='sub'?{subnet:ipStr(L.base),hosts:`${L.a},${L.b}`,spare:L.spare}:{lab:ipStr(L.base),hosts:L.hosts,r1:L.r1,r2:L.r2};
  const fixedOf=L=>kind==='vlsm'?{kind:'vlsm',base:ipStr(L.base),hosts:L.hosts.slice()}:kind==='sub'?{kind:'sub',base:ipStr(L.base),a:L.a,b:L.b,spare:L.spare}:{kind:'lab',base:ipStr(L.base),hosts:L.hosts,r1:L.r1,r2:L.r2};
  function setURL(){try{const u=new URL(location.href);u.search='';u.searchParams.set('tab','lab');if(pr)Object.entries(asParams(q.L)).forEach(([a,b])=>u.searchParams.set(a,b));history.replaceState(null,'',u.toString());}catch(e){}}
  function load(fixed){if(kind==='nd'&&!(fixed&&fixed.kind&&fixed.kind!=='nd')){render();return;}if(fixed&&fixed.kind&&KINDS[fixed.kind]&&fixed.kind!==kind){setKind(fixed.kind);store.set('ns_labkind',kind);}if(fixed&&!fixed.base)fixed=null;pr=fixed||null;q=kind==='vlsm'?LAB.genVlsmLab(fixed||null,part):kind==='sub'?LAB.genSubLab(fixed||null,part):LAB.genLab(fixed||null,part);k=0;miss=q.fields.map(()=>false);tries=q.fields.map(()=>0);shown=q.fields.map(()=>false);first=0;justDone=-1;done=false;msg='';hintN=0;setURL();render();}
  function start(fixed){if(fixed&&fixed.kind==='nd'){setKind('nd');store.set('ns_labkind','nd');render();return;}if(kind==='nd'&&!(fixed&&fixed.kind)){render();return;}if(fixed||!q)load(fixed);else render();}
  const ipCell=v=>`<span class="ipf">${ipStr(v)}</span><span class="ips">.${oct(v,3)}</span>`;
  // the tables fill in as you answer (same layout as the lab handout)
  function sheet(){
    if(q.sheet)return q.sheet({end:done?q.fields.length:k,cur:done?-1:k,miss,justDone,ipCell});
    const n=q.fields.length,cur=done?-1:k,end=done?n:k,f=q.fields[cur<0?n-1:cur],L=q.L,key=f.key;
    const cls=j=>`${miss[j]?' miss':''}${j===justDone?' pop':''}`;
    const val=j=>{const g=q.fields[j];return g.type==='ip'?ipCell(g.answer):g.answer;};
    const S1=['need','bits','made','hper','enet','ebits','mbits','mdec'];
    const sec=S1.includes(key)?'s1':key[0]==='g'?'g':'t';
    const idx=pred=>q.fields.map((g,j)=>[g,j]).filter(([g])=>pred(g));
    const cell=j=>j<end?`<span class="fs-cv${cls(j)}">${val(j)}</span>`:j===cur?'<span class="fs-cur">?</span>':'';
    if(sec==='s1'){const rows=idx(g=>S1.includes(g.key)).filter(([,j])=>j<end);if(!rows.length)return '';
      return `<div class="fsheet"><div class="fs-sec">Step 1 so far</div>${rows.map(([g,j])=>`<div class="fs-row${cls(j)}"><span>${g.label}</span><b class="mono">${val(j)}</b></div>`).join('')}</div>`;}
    if(sec==='g'){const js=kk=>idx(g=>g.k===kk&&g.key[0]==='g').map(([,j])=>j);
      const rows=L.subs.map(s=>{const a=js(s.k);if(!a.length||a[0]>Math.max(end-1,cur))return '';return `<tr><td class="fs-rl">${s.k}</td>${a.map(j=>`<td>${cell(j)}</td>`).join('')}</tr>`;}).join('');
      return `<div class="fsheet"><div class="fs-sec">Subnet table</div><div class="tablewrap"><table class="fs-chart"><tr><th>#</th><th>Subnet address</th><th>First usable</th><th>Last usable</th><th>Broadcast</th></tr>${rows}</table></div></div>`;}
    const ref=part!=='subnet'?`<details class="fs-ref"${key==='asg'?' open':''}><summary>Subnet table${part==='table'?' (Step 1, done for you)':' (from Step 1)'}</summary><div class="tablewrap">${q.subTable}</div></details>`:'';
    const asg=idx(g=>g.key==='asg').filter(([,j])=>j<=Math.max(end-1,cur));
    const A=idx(g=>['aip','amask','agw'].includes(g.key)),mj=(A.find(([g])=>g.key==='amask')||[])[1];
    const rows=L.rows.map(r=>{const ip=A.find(([g])=>g.key==='aip'&&g.r===r),gw=A.find(([g])=>g.key==='agw'&&g.r===r);if(!ip||ip[1]>Math.max(end-1,cur))return '';
      return `<tr><td class="fs-rl">${r.dev}</td><td>${r.ifc}</td><td>${cell(ip[1])}</td><td>${mj!=null&&mj<end?`<span class="fs-cv">${ipCell(L.mask)}</span>`:mj===cur?'<span class="fs-cur">?</span>':''}</td><td>${gw?cell(gw[1]):'<span class="dim">N/A</span>'}</td></tr>`;}).join('');
    return `<div class="fsheet">${ref}${asg.length?`<div class="fs-sec">Step 2 · Subnet assignments</div><div class="tablewrap"><table class="fs-chart"><tr><th>#</th><th>Link</th><th>Subnet address</th></tr>${asg.map(([g,j])=>`<tr><td class="fs-rl">${g.l.j}</td><td>${g.l.desc.replace('the ','').replace('WAN link between R1 and R2','R1–R2 WAN link')}</td><td>${cell(j)}</td></tr>`).join('')}</table></div>`:''}
      ${rows?`<div class="fs-sec">Step 3 · Addressing Table</div><div class="tablewrap"><table class="fs-chart"><tr><th>Device</th><th>Interface</th><th>IP</th><th>Mask</th><th>Gateway</th></tr>${rows}</table></div>`:''}</div>`;
  }
  function toPart2(){const p=asParams(q.L),id=KINDS[kind].task;go('tasks',{id,params:p});try{const u=new URL(location.href);u.search='';u.searchParams.set('task',id);Object.entries(p).forEach(([a,b])=>u.searchParams.set(a,b));history.replaceState(null,'',u.toString());}catch(e){}}
  function check(){
    if(done)return;const f=q.fields[k],inp=$('#labIn'),raw=LAB.expand(f,inp.value);
    if(LAB.isBlank(raw)){msg='Type an answer first.';msgCls='coach';renderQ();return;}
    if(LAB.isRight(f,raw)){if(!miss[k])first++;justDone=k;k++;msg='';hintN=0;if(k>=q.fields.length){done=true;const L=q.L;S.labs=(S.labs||0)+1;store.set('ns_labs',S.labs);}render();return;}
    miss[k]=true;tries[k]++;if(!hintN&&(LAB.hintsFor(q)[k]||[]).length)hintN=1;keep={k,v:inp.value};let d=null;try{d=q.diag(q.fields.map((g,j)=>j===k?raw:j<k?LAB.show(g):''))[k];}catch(e){}
    // a nudge, not the answer: the worked value stays hidden until “Show the answer”
    msg=(d?String(d):'That’s not it.').replace(/<b class="g mono">[^<]*<\/b>/g,'<b class="g mono">?</b>')+` <span class="dim">${tries[k]>=2?'Work through the hints; the answer is unlocked if you’re still stuck.':'A hint is open below. Try again.'}</span>`;msgCls='bad';renderQ();
  }
  function own(){
    const box=$('#labOwn');if(!box.hidden){box.hidden=true;return;}box.hidden=false;box.textContent='';
    const fld=(lab,id,ph,mode)=>el('label',{},lab,el('input',{id,placeholder:ph,autocomplete:'off',spellcheck:'false',inputmode:mode}));
    const sel=(lab,id)=>el('label',{},lab,el('select',{id},...[1,2,3].map(v=>el('option',{value:v,text:v,selected:v===2}))));
    const m=el('div',{class:'own-msg',id:'labOwnMsg'});
    if(kind==='sub'){
      const go3=el('button',{class:'btn primary',type:'button',text:'Load lab',onclick:()=>{const r=LAB.subFrom($('#labNet').value,$('#labA').value,$('#labB').value,$('#labS').value);
        if(r.err){m.textContent=r.err;m.className='own-msg bad';return;}box.hidden=true;load(r);}});
      box.append(el('p',{class:'dim',text:'Set the /24, the hosts LAN-A and LAN-B need, and how many spare subnets to leave for growth. Exactly one mask has to meet both, like the handout.'}),
        el('div',{class:'own-row'},fld('Network','labNet','192.168.0.0','decimal'),fld('LAN-A hosts','labA','50','numeric'),fld('LAN-B hosts','labB','40','numeric'),fld('Spare subnets','labS','2','numeric'),go3),m);
      $$('input',box).forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go3.click();}}));$('#labNet').focus();return;}
    if(kind==='vlsm'){
      const go2=el('button',{class:'btn primary',type:'button',text:'Load lab',onclick:()=>{const r=LAB.vlsmFrom($('#labNet').value,[0,1,2,3].map(i=>$('#labH'+i).value));
        if(r.err){m.textContent=r.err;m.className='own-msg bad';return;}box.hidden=true;load(r);}});
      box.append(el('p',{class:'dim',text:'Set the /24 and how many host addresses each LAN needs. The subnets are laid out biggest first, then a /30 for the R1–R2 link.'}),
        el('div',{class:'own-row'},fld('Network','labNet','192.168.72.0','decimal'),...['R1 G0/0','R1 G0/1','R2 G0/0','R2 G0/1'].map((n,i)=>fld(n+' LAN','labH'+i,String([50,25,12,6][i]),'numeric')),go2),m);
      $$('input',box).forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go2.click();}}));$('#labNet').focus();return;}
    const goBtn=el('button',{class:'btn primary',type:'button',text:'Load lab',onclick:()=>{const r=LAB.labFrom($('#labNet').value,$('#labHosts').value,$('#labR1').value,$('#labR2').value);
      if(r.err){m.textContent=r.err;m.className='own-msg bad';return;}box.hidden=true;load(r);}});
    box.append(el('p',{class:'dim',text:'Set the /24, how many addresses each LAN needs, and how many LANs each router has.'}),
      el('div',{class:'own-row'},fld('Network','labNet','192.168.100.0','decimal'),fld('Addresses per LAN','labHosts','25','numeric'),sel('LANs on R1','labR1'),sel('LANs on R2','labR2'),goBtn,
        el('button',{class:'btn small ghost',type:'button',text:'Use the 11.7.5 lab',onclick:()=>{$('#labNet').value='192.168.100.0';$('#labHosts').value='25';$('#labR1').value='2';$('#labR2').value='2';goBtn.click();}})),m);
    $$('#labNet,#labHosts',box).forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();goBtn.click();}}));$('#labNet').focus();
  }
  function print(key){
    const PRINT=kind==='vlsm'?LAB.printVlsmHTML:kind==='sub'?LAB.printSubHTML:LAB.printLabHTML;
    const area=$('#printArea');area.innerHTML=`<div class="pp-title"><h2>Packet Tracer: ${kind==='vlsm'?'VLSM Design and Implementation':kind==='sub'?'Subnet an IPv4 Network':'Subnetting Scenario'}</h2><div>Name ______________________ &nbsp; Date ____________</div></div>${PRINT(q,1,false)}${key?`<div class="pp-key"><div class="pp-title"><h2>Answer key</h2></div>${PRINT(q,1,true)}</div>`:''}`;
    document.body.classList.add('printing');const off=()=>{document.body.classList.remove('printing');area.textContent='';removeEventListener('afterprint',off);};addEventListener('afterprint',off);
    try{window.print();}catch(e){}if(!('onafterprint' in window))setTimeout(off,500);
  }
  function renderQ(){
    const box=$('#labQ');if(!box)return;box.textContent='';
    if(done){const n=q.fields.length;
      box.append(el('div',{class:'done-banner'},el('b',{text:`${part==='all'?(kind==='vlsm'?'Parts 1–2':'Part 1'):KINDS[kind].parts[part]} done ✓`}),el('span',{text:` ${first} of ${n} right on the first try.`}),
        (()=>{const W=[...new Set(q.fields.filter((f,j)=>shown[j]).map(f=>f.label))];return W.length?el('div',{class:'dim',text:`You needed the answer for: ${W.slice(0,6).join(' · ')}${W.length>6?' …':''}. New lab gives you a different network to try those again.`}):null;})()),
        el('div',{class:'lab-sol',html:q.explain}),
        el('div',{class:'dacts'},el('button',{class:'btn primary',type:'button',text:`${KINDS[kind].cfg}: configure the devices →`,onclick:toPart2}),el('button',{class:'btn',type:'button',text:'New lab',onclick:()=>load(null)}),pr?el('button',{class:'btn ghost',type:'button',text:'Same network again',onclick:()=>load(pr)}):null));return;}
    const f=q.fields[k],n=q.fields.length;
    const inp=el('input',{id:'labIn','aria-label':f.label,autocomplete:'off',autocapitalize:'off',spellcheck:'false',inputmode:f.type==='cidr'?'text':f.type==='ip'?'decimal':'numeric',enterkeyhint:'done',
      placeholder:f.type==='bits'?'8 bits':f.type==='cidr'?'octet/prefix, like 64/27':f.type==='ip'?(f.pre?'last octet':'a.b.c.d'):'number'});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    const hs=LAB.hintsFor(q)[k]||[];
    // pick-one and pick-all answers are chips that write into the (hidden) answer box
    let picks=null;
    if(f.type==='choice'||f.type==='multi'){inp.type='hidden';
      const sync=()=>{const S=f.type==='multi'?new Set(inp.value.split(/,\s*/).filter(Boolean)):new Set([inp.value]);$$('button',picks).forEach(b=>{const on=S.has(b.dataset.v);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});};
      picks=el('div',{class:'groups lab-picks',role:'group','aria-label':f.label},...f.options.map(o=>el('button',{class:'chip',type:'button',text:o,'data-v':o,'aria-pressed':'false',onclick:()=>{
        if(f.type==='choice')inp.value=o;else{const S=new Set(inp.value.split(/,\s*/).filter(Boolean));S.has(o)?S.delete(o):S.add(o);inp.value=f.options.filter(x=>S.has(x)).join(', ');}sync();}})));
      inp.sync=sync;if(keep&&keep.k===k){inp.value=keep.v;sync();}}
    if(f.type==='bin32')inp.placeholder='32 bits, dots optional';
    box.append(el('div',{class:'dmeta'},el('span',{text:`Question ${k+1} of ${n} · ${f.where}`}),el('span',{text:`${first} first-try`})),
      el('div',{class:'lab-prog'},el('i',{style:`width:${Math.round(100*k/n)}%`})),
      el('div',{class:'dpurpose',text:f.label}),
      el('div',{class:'dbox'+(picks?' picks':'')},f.pre?el('span',{class:'tp',text:f.pre}):null,inp,picks),
      el('div',{class:'dfb lab-fb'},msg?el('div',{class:msgCls,html:msg}):null,
        hintN?el('ol',{class:'lab-hints'},...hs.slice(0,hintN).map(s=>el('li',{html:s.q+(s.tip?` <span class="dim">${s.tip}</span>`:'')}))):null),
      el('div',{class:'dacts'},el('button',{class:'btn primary',type:'button',text:'Check',onclick:check}),
        hintN<hs.length?el('button',{class:'btn',type:'button',text:hintN?'Next hint':'Hint',onclick:()=>{hintN++;miss[k]=true;renderQ();}}):null,
        !shown[k]&&(tries[k]>=2||(hintN>=hs.length&&tries[k]>=1))?el('button',{class:'btn ghost',type:'button',text:'Show the answer',onclick:()=>{shown[k]=true;hintN=hs.length;msg=`Answer: <b class="g mono">${escH(LAB.show(f))}</b> <span class="dim">The steps above show how to get it. Type it in to go on; it won’t count as first try.</span>`;msgCls='coach';renderQ();}}):null));
    const sh=$('#labSheet');if(sh)sh.innerHTML=sheet();
    if(isDesktop()&&!picks)inp.focus();
  }
  function render(){
    const r=root();r.textContent='';
    const which=el('div',{class:'groups labkind',role:'group','aria-label':'Which lab'},...Object.entries(KINDS).map(([kd,K])=>el('button',{class:'chip'+(kd===kind?' on':''),type:'button',text:K.name,'aria-pressed':String(kd===kind),
      onclick:()=>{if(kd===kind)return;setKind(kd);store.set('ns_labkind',kind);if(kd==='nd'){render();return;}load(null);}})));
    const settings=el('details',{class:'lab-fold lab-settings'},el('summary',{text:'Change lab · '+KINDS[kind].name}),which);
    if(kind==='nd'){r.append(settings);try{const u=new URL(location.href);u.search='';u.searchParams.set('tab','lab');u.searchParams.set('lab','nd');history.replaceState(null,'',u.toString());}catch(e){}NDLab.render(r);return;}
    const seg=el('div',{class:'groups',role:'group','aria-label':'Lab part'},...Object.entries(KINDS[kind].parts).map(([key,name])=>el('button',{class:'chip'+(key===part?' on':''),type:'button',text:name,'aria-pressed':String(key===part),
      onclick:()=>{part=key;parts[kind]=part;store.set('ns_labparts',parts);load(pr||fixedOf(q.L));}})),
      el('button',{class:'chip',type:'button',text:`${KINDS[kind].cfg}: configure →`,onclick:toPart2}));
    const pk=el('label',{class:'dim lab-key'},el('input',{type:'checkbox',id:'labKey'}),' with answer key');
    settings.append(seg);
    r.append(settings,el('details',{class:'lab-fold lab-tools'},el('summary',{text:'Print, customize or start over'}),
        el('span',{class:'row'},el('button',{class:'btn small',type:'button',onclick:own},ico('edit'),'Your own lab'),el('button',{class:'btn small',type:'button',onclick:()=>print($('#labKey').checked)},ico('print'),'Print'),pk,el('button',{class:'btn small ghost',type:'button',text:'New lab',onclick:()=>load(null)})),
      el('div',{class:'own',id:'labOwn',hidden:true})),
      el('h2',{class:'lab-title',text:KINDS[kind].name}),
      el('details',{class:'lab-fold lab-brief',open:isDesktop()},el('summary',{text:'Scenario and topology'}),el('div',{class:'lab-prompt',html:q.prompt})),
      el('div',{class:'lab-grid'},el('div',{id:'labQ',class:'lab-q'}),el('details',{class:'lab-fold lab-tables',open:isDesktop()},el('summary',{text:'Addressing tables'}),el('div',{id:'labSheet'}))));
    renderQ();
  }
  return {start,load,get q(){return q;},get k(){return k;},get kind(){return kind;},check};
})();

/* ---------------- learning path ----------------
   The drill topics in teaching order (path-content.js). Each unit: a short lesson, a quick check, then a drill
   session. 80% right on the first try (no hint, no answer shown) adds a signal bar and unlocks the next unit, and
   each bar waits longer before the unit is due for review (1, 3, 7, 16, 35 days). After the drills, the unit's
   checkpoint task puts the commands to work on a simulated device. */
const Path=(()=>{
  const UNITS=(window.NSPath&&NSPath.UNITS)||[],DAY=864e5,WAIT=[0,1,3,7,16,35],MAXL=5;
  const VIEWS=['path','drills','tasks','lab','sandbox','cheat'];
  const root=$('#v-path');let view='map';
  function load(){const raw=store.get('ns_path',null),p={u:{},days:[]};
    if(raw&&typeof raw==='object'){const u=raw.u&&typeof raw.u==='object'?raw.u:{};
      UNITS.forEach(x=>{const r=u[x.id];if(r&&typeof r==='object'){const l=Math.floor(Number(r.l)),d=Number(r.d);p.u[x.id]={l:l>=0&&l<=MAXL?l:0,d:Number.isFinite(d)?d:0,s:r.s===true};}});
      if(Array.isArray(raw.days))p.days=raw.days.filter(d=>typeof d==='string'&&/^\d{4}-\d\d-\d\d$/.test(d)).slice(-60);}
    return p;}
  let P=load();
  const save=()=>store.set('ns_path',P);
  const U=id=>P.u[id]||(P.u[id]={l:0,d:0,s:false});
  const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function dayStreak(){const set=new Set(P.days),d=new Date();if(!set.has(ymd(d)))d.setDate(d.getDate()-1);let n=0;while(set.has(ymd(d))){n++;d.setDate(d.getDate()-1);}return n;}
  const unlocked=i=>i===0||U(UNITS[i-1].id).l>=1;
  const isDue=x=>{const u=U(x.id);return u.l>=1&&u.d<=Date.now();};
  const taskDone=id=>!!(id&&S.tasks[id]&&S.tasks[id].done);
  const tasksOf=x=>[x.task,x.task2].filter(Boolean);
  const checkpoint=x=>tasksOf(x).find(t=>!taskDone(t));
  const taskTitle=id=>(CS.TASKS.find(t=>t.id===id)||{}).title||id;
  function recommend(){
    const due=UNITS.filter(isDue).sort((a,b)=>U(a.id).d-U(b.id).d);
    if(due.length>2)return {x:due[0],why:'review'};
    for(let i=0;i<UNITS.length;i++){const x=UNITS[i];if(!unlocked(i))break;
      if(U(x.id).l===0)return {x,why:'new'};
      const t=checkpoint(x);if(t)return {x,why:'task',task:t};}
    if(due.length)return {x:due[0],why:'review'};
    const weakest=UNITS.slice().sort((a,b)=>U(a.id).l-U(b.id).l||U(a.id).d-U(b.id).d)[0];
    return weakest?{x:weakest,why:'grow'}:null;
  }
  function bars(l){const s=el('span',{class:'pl-bars',role:'img','aria-label':`Signal ${l} of ${MAXL}`});for(let i=1;i<=MAXL;i++)s.append(el('i',{class:i<=l?'on':'',style:`height:${4+i*3}px`}));return s;}
  function dueText(x){const u=U(x.id);if(!u.l)return '';const d=Math.ceil((u.d-Date.now())/DAY);return d<=0?'Review due':d===1?'Review tomorrow':`Review in ${d} days`;}
  const num=i=>String(i+1).padStart(2,'0');
  const focus=on=>document.body.classList.toggle('pl-focus',on);
  const show=v=>VIEWS.forEach(k=>{$('#v-'+k).hidden=k!==v;});
  function back(){return el('button',{type:'button',class:'pl-back',id:'plBack',text:'← Path',onclick:()=>map()});}
  function map(){
    view='map';focus(false);if(Drills.inSession)Drills.endSession();show('path');root.textContent='';
    const r=recommend();if(!r)return;
    const verb=r.why==='new'?'Learn':r.why==='review'?'Review':r.why==='task'?'Checkpoint':'Practice';
    const label=r.why==='task'?taskTitle(r.task):r.x.name;
    const streak=dayStreak();
    root.append(el('div',{class:'pl-head'},el('div',null,el('div',{class:'pl-kicker',text:'Your path'}),el('h2',{text:`${UNITS.filter(x=>U(x.id).l>=1).length} of ${UNITS.length} units started`})),
      el('div',{class:'pl-streak',title:'Days in a row with a finished session'},el('b',{text:String(streak)}),el('small',{text:streak===1?'day in a row':'days in a row'}))));
    root.append(el('button',{type:'button',class:'btn primary pl-start',id:'plStart',onclick:()=>r.why==='task'?openTask(r.task):open(r.x)},el('small',{text:`${verb} · ${num(UNITS.indexOf(r.x))}`}),el('span',{text:label+' →'})));
    const ol=el('ol',{class:'pl-map'});
    UNITS.forEach((x,i)=>{const u=U(x.id),op=unlocked(i),due=isDue(x),cp=tasksOf(x);
      const sub=!op?'Finish the unit above to unlock':u.l?dueText(x):x===r.x?'Start here':'New';
      const li=el('li',{class:['pl-node',op?'':'locked',x===r.x?'next':'',due?'due':''].join(' ')});
      li.append(el('button',{type:'button','data-u':x.id,disabled:!op,'aria-label':x.name+(op?'':', locked'),onclick:()=>open(x,true)},
        el('span',{class:'pl-num',text:num(i)}),el('span',{class:'pl-txt'},el('b',{text:x.name}),el('small',{text:sub})),op?bars(u.l):el('span',{class:'pl-lock','aria-hidden':'true',text:'🔒'})));
      if(op&&u.l>=1&&cp.length)li.append(el('div',{class:'pl-cps'},...cp.map(t=>el('button',{type:'button',class:'pl-cp'+(taskDone(t)?' done':''),'data-task':t,onclick:()=>openTask(t)},el('span',{'aria-hidden':'true',text:taskDone(t)?'✓':'▸'}),document.createTextNode(' Checkpoint: '+taskTitle(t))))));
      ol.append(li);});
    root.append(ol,
      el('p',{class:'pl-note',text:'Each unit starts with a short lesson. A drill session with 80% right on the first try adds a bar and unlocks the next unit, and the unit comes back for review later so it sticks. A checkpoint task then puts the commands to work on a simulated device.'}),
      el('div',{class:'pl-free'},el('div',{class:'pl-kicker',text:'After the path'}),el('p',{class:'dim',text:'The Packet Tracer labs (subnetting, VLSM, connecting a router, IPv6 Neighbor Discovery) use everything above.'}),
        el('button',{type:'button',class:'btn',id:'plLabs',text:'Open the Packet Tracer labs',onclick:()=>{setTab('lab');go('lab');}})));
  }
  function setTab(v){try{history.replaceState(null,'',location.pathname+(v==='path'?'':'?tab='+v));}catch(e){}}
  function openTask(id){go('tasks',{id});try{const u=new URL(location.href);u.search='';u.searchParams.set('task',id);history.replaceState(null,'',u.toString());}catch(e){}}
  function open(x,fromMap){const u=U(x.id);if(!u.s||(fromMap&&u.l===0))return lesson(x,0);if(fromMap)return unit(x);session(x);}
  function unit(x){view='unit';focus(true);root.textContent='';const u=U(x.id),i=UNITS.indexOf(x);
    root.append(back(),el('div',{class:'pl-kicker',text:`Unit ${num(i)} · ${x.group}`}),el('h2',{text:x.name}),el('div',{class:'pl-unitbars'},bars(u.l),el('span',{text:`${u.l} of ${MAXL}${dueText(x)?' · '+dueText(x):''}`})),
      el('div',{class:'pl-actions'},el('button',{type:'button',class:'btn primary',id:'plGo',text:`Drill · ${x.n} commands`,onclick:()=>session(x)}),el('button',{type:'button',class:'btn',id:'plLesson',text:'Read the lesson again',onclick:()=>lesson(x,0)}),
        ...tasksOf(x).map(t=>el('button',{type:'button',class:'btn',text:(taskDone(t)?'✓ ':'')+'Checkpoint: '+taskTitle(t),onclick:()=>openTask(t)}))));}
  function lesson(x,step){
    view='learn';focus(true);root.textContent='';const n=x.learn.length,i=UNITS.indexOf(x),onCheck=step>=n;
    const dots=el('div',{class:'pl-steps','aria-hidden':'true'});for(let k=0;k<=n;k++)dots.append(el('i',{class:k<step?'done':k===step?'on':''}));
    const body=el('div',{class:'pl-body'}),acts=el('div',{class:'pl-actions'});
    root.append(back(),el('div',{class:'pl-kicker',text:`Unit ${num(i)} · Lesson`}),el('h2',{text:x.name}),dots,body,acts);
    if(step>0)acts.append(el('button',{type:'button',class:'btn',id:'plPrev',text:'Back',onclick:()=>lesson(x,step-1)}));
    if(!onCheck){body.innerHTML=x.learn[step];const nb=el('button',{type:'button',class:'btn primary',id:'plNext',text:step===n-1?'Quick check →':'Next →',onclick:()=>lesson(x,step+1)});acts.append(nb);if(isDesktop())nb.focus({preventScroll:true});}
    else{const why=el('div',{class:'pl-why',id:'plWhy',role:'status'}),nb=el('button',{type:'button',class:'btn primary',id:'plNext',hidden:true,text:'Start the drills →',onclick:()=>session(x)});acts.append(nb);
      let tries=0;const opts=shuffle(x.check.o.map((t,k)=>[t,k])).map(([t,k])=>el('button',{type:'button',class:'btn pl-opt','data-k':String(k),text:t,onclick:e=>{const b=e.currentTarget;if(b.disabled)return;tries++;
        if(k===x.check.a){opts.forEach(o=>o.disabled=true);b.classList.add('ok');why.className='pl-why good';why.textContent=(tries===1?'Right. ':'There it is. ')+x.check.why;U(x.id).s=true;save();nb.hidden=false;nb.focus({preventScroll:true});}
        else{b.disabled=true;b.classList.add('no');why.className='pl-why bad';why.textContent=tries>=2?x.check.why+' Pick it to go on.':'Not that one. Look back at the lesson and try again.';}}}));
      body.append(el('div',{class:'pl-kicker',text:'Quick check'}),el('p',{class:'pl-q',text:x.check.q}),el('div',{class:'pl-opts'},...opts),why);}
    root.scrollIntoView({block:'start'});
  }
  function session(x){
    const pool=CS.DRILLS.map((d,i)=>i).filter(i=>CS.DRILLS[i].g===x.group);let idx=[];while(idx.length<x.n)idx=idx.concat(shuffle(pool));idx=idx.slice(0,x.n);
    const st={right:0,scored:0,served:0};view='run';
    $$('#tabs .tab').forEach(b=>b.classList.toggle('on',b.dataset.v==='path'));show('drills');focus(true);
    Drills.session({idx,
      onResult(first){st.scored++;if(first)st.right++;},
      onDone(){done(x,st);},
      strip(c){if(!c.retry)st.served++;
        return el('div',{class:'pl-run'},el('button',{type:'button',class:'pl-back',id:'plQuit','aria-label':'End this session',text:'✕',onclick:()=>{Drills.endSession();map();}}),
          el('div',{class:'pl-runtxt'},el('b',{text:x.name}),el('small',{text:c.retry?'Fixing one you missed':`Command ${st.served} of ${x.n}`})),
          el('div',{class:'pl-prog','aria-hidden':'true'},el('i',{style:`width:${Math.round(100*st.scored/x.n)}%`})),bars(U(x.id).l));}});
    $('#v-drills').scrollIntoView({block:'start'});
  }
  function done(x,st){
    const u=U(x.id),before=u.l,pct=st.scored?st.right/st.scored:0;let msg;
    if(pct>=0.8){u.l=Math.min(MAXL,u.l+1);u.d=Date.now()+WAIT[u.l]*DAY;msg=u.l>before?'Signal up!':'Full signal. Keep it there.';}
    else if(pct>=0.5){u.d=Date.now()+DAY;msg='Getting there. One more session should do it.';}
    else{u.l=Math.max(0,u.l-1);u.d=Date.now();msg='This one needs another pass. Reread the lesson, then try again.';}
    u.s=true;const t=ymd(new Date());if(!P.days.includes(t))P.days.push(t);P.days=P.days.slice(-60);save();
    view='done';show('path');focus(true);root.textContent='';
    const i=UNITS.indexOf(x),nx=UNITS[i+1],cp=checkpoint(x),acts=el('div',{class:'pl-actions'});
    if(pct>=0.8&&cp)acts.append(el('button',{type:'button',class:'btn primary',id:'plCont',text:`Checkpoint: ${taskTitle(cp)} →`,onclick:()=>openTask(cp)}));
    else acts.append(el('button',{type:'button',class:'btn primary',id:'plCont',text:'Continue →',onclick:()=>{const r=recommend();if(r.why==='task')openTask(r.task);else open(r.x);}}));
    acts.append(pct<0.5?el('button',{type:'button',class:'btn',id:'plRe',text:'Reread the lesson',onclick:()=>lesson(x,0)}):el('button',{type:'button',class:'btn',id:'plAgain',text:'Drill again',onclick:()=>session(x)}),el('button',{type:'button',class:'btn ghost',id:'plMap',text:'Path',onclick:()=>map()}));
    root.append(el('div',{class:'pl-done'},el('div',{class:'pl-kicker',text:'Session complete'}),el('h2',{text:msg}),
      el('div',{class:'pl-score'},el('b',{text:`${st.right}/${st.scored}`}),el('span',{text:' right on the first try'})),
      el('div',{class:'pl-unitbars'},bars(before),el('span',{'aria-hidden':'true',text:'→'}),bars(u.l),el('span',{text:`${x.name} · ${dueText(x)}`})),
      before===0&&u.l>=1&&nx?el('p',{class:'pl-unlock',text:`Unlocked: ${nx.name}`}):null,
      pct>=0.8&&cp?el('p',{class:'dim',text:'Now put the commands together on a device. The checkpoint’s goals tick off as you configure it.'}):null,acts));
    $('#plCont').focus({preventScroll:true});root.scrollIntoView({block:'start'});
  }
  return {map,get view(){return view;},get progress(){return P;},UNITS,reset(){P={u:{},days:[]};save();}};
})();

/* ---------------- start: ?tab=… or ?task=…(&lab=…&hosts=…&r1=…&r2=…) ---------------- */
function subParams(sp){const h=String(sp.get('hosts')||'').slice(0,20).split(',');const r=LAB.subFrom(String(sp.get('subnet')||'').slice(0,40),h[0],h[1],String(sp.get('spare')||'').slice(0,4));return r.err?undefined:{subnet:r.base,hosts:`${r.a},${r.b}`,spare:r.spare};}
function vlsmParams(sp){const r=LAB.vlsmFrom(String(sp.get('vlsm')||'').slice(0,40),String(sp.get('hosts')||'').slice(0,40));return r.err?undefined:{vlsm:r.base,hosts:r.hosts.join(',')};}
function labParams(sp){
  const lab=sp.get('lab'),hosts=sp.get('hosts'),r1=sp.get('r1'),r2=sp.get('r2');if(!lab)return undefined;
  const b=IOS.ip2n(lab||'');if(b==null||(b&255)!==0||(b>>>24)===0||(b>>>24)===127||(b>>>24)>=224)return undefined;
  if(!/^\d{1,3}$/.test(hosts||'')||!/^[123]$/.test(r1||'')||!/^[123]$/.test(r2||''))return undefined;
  const need=Number(r1)+Number(r2)+1,n=Math.ceil(Math.log2(need));if(Number(hosts)<2||Number(hosts)>2**(8-n)-2)return undefined;
  return {lab,hosts:Number(hosts),r1:Number(r1),r2:Number(r2)};
}
renderStats();
(()=>{let sp;try{sp=new URLSearchParams(location.search);}catch(e){sp=new URLSearchParams('');}
  const task=sp.get('task'),tab=sp.get('tab');
  if(task&&CS.TASKS.some(x=>x.id===task))go('tasks',{id:task,params:task==='scenario'?labParams(sp):task==='vlsm-scenario'?vlsmParams(sp):task==='subnet-ipv4'?subParams(sp):task==='connect-router'&&sp.has('a')?{a:sp.get('a'),b:sp.get('b'),c:sp.get('c'),w:sp.get('w')}:undefined});
  else if(sp.has('subnet')&&!task){const p=subParams(sp);go('lab',{lab:p?{kind:'sub',base:p.subnet,a:Number(p.hosts.split(',')[0]),b:Number(p.hosts.split(',')[1]),spare:p.spare}:{kind:'sub'}});}
  else if(sp.has('vlsm')&&!task){const p=vlsmParams(sp);go('lab',{lab:p?{kind:'vlsm',base:p.vlsm,hosts:p.hosts.split(',').map(Number)}:{kind:'vlsm'}});}
  else if(sp.get('lab')==='nd'&&!task){go('lab',{lab:{kind:'nd'}});}
  else if(sp.has('lab')&&!task){const p=labParams(sp);go('lab',p?{lab:{kind:'lab',base:p.lab,hosts:p.hosts,r1:p.r1,r2:p.r2}}:undefined);}
  else{const TABS=['path','drills','tasks','lab','sandbox','cheat'],last=store.get('ns_tab',null),dflt=window.NS_DEFAULT_TAB;/* tests written before the path set NS_DEFAULT_TAB */
    go(TABS.includes(tab)?tab:TABS.includes(last)?last:TABS.includes(dflt)?dflt:'path');}})();

window.NS={go,Path,Tasks,Drills,Lab,NDLab,S,IOS,CS,LAB,ND};
})();
