/* No Shutdown: the page. Terminals, command drills, guided tasks, a sandbox and a cheat sheet on top of the IOS
   simulator in ios.js and the content in content.js. All text that comes from typing is shown with textContent. */
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
function el(tag,attrs,...kids){const e=document.createElement(tag);if(attrs)for(const[k,v]of Object.entries(attrs)){if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='html')e.innerHTML=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v);}
  kids.flat().forEach(k=>{if(k==null||k===false)return;e.append(k.nodeType?k:document.createTextNode(String(k)));});return e;}
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
    else if(e.key==='Tab'){e.preventDefault();key('tab');}
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
  ['drills','tasks','lab','sandbox','cheat'].forEach(k=>{$('#v-'+k).hidden=k!==v;});
  if(v==='drills')Drills.start();
  if(v==='tasks'){if(arg)Tasks.open(arg.id,arg.params);else Tasks.list();}
  if(v==='lab')Lab.start(arg&&arg.lab);
  if(v==='sandbox')Sandbox.start();
  if(v==='cheat')Cheat.render();
}
$$('#tabs .tab').forEach(b=>b.onclick=()=>{try{history.replaceState(null,'',location.pathname+(b.dataset.v==='drills'?'':'?tab='+b.dataset.v));}catch(e){}go(b.dataset.v);});

/* ---------------- drills ---------------- */
const Drills=(()=>{
  let group='All',queue=[],cur=null,missedNow=false,shown=false;
  const groups=['All',...new Set(CS.DRILLS.map(d=>d.g))];
  const root=$('#v-drills');
  function fill(){const pool=CS.DRILLS.map((d,i)=>i).filter(i=>group==='All'||CS.DRILLS[i].g===group);queue=queue.concat(shuffle(pool));}
  function nextItem(){
    if(!queue.length)fill();const i=queue.shift(),dr=CS.DRILLS[i],v=dr.gen?dr.gen():{};
    const dev=IOS.newDevice(dr.dev,dr.dev==='router'?pickName('R'):dr.dev==='switch'?pickName('S'):'PC1');
    if(dr.dev!=='pc'){dev.mode=dr.mode;dev.ctx=dr.ctx||null;if(dr.mode==='line')dev.vtyRange=[0,dev.vtyMax];}
    cur={i,dr,v,dev};missedNow=false;shown=false;render();
  }
  const pickName=p=>p==='R'?CS.pick(['R1','R2','Branch','HQ']):CS.pick(['S1','S2','Access1']);
  const txt=(x,v)=>typeof x==='function'?x(v):x;
  function render(){
    const {dr,v,dev}=cur;root.textContent='';
    const chips=el('div',{class:'groups',role:'group','aria-label':'Topics'},...groups.map(g=>el('button',{class:'chip'+(g===group?' on':''),type:'button',text:g,onclick:()=>{group=g;queue=[];nextItem();}})));
    const inp=el('input',{id:'din',autocomplete:'off',autocapitalize:'off',autocorrect:'off',spellcheck:'false','aria-label':'Your command',enterkeyhint:'go',placeholder:'type the command'});
    const fb=el('div',{class:'dfb',id:'dfb','aria-live':'polite'});
    const check=el('button',{class:'btn primary',type:'button',text:'Check'}),showB=el('button',{class:'btn',type:'button',text:'Show answer'}),skip=el('button',{class:'btn ghost',type:'button',text:'Skip'});
    root.append(el('div',{class:'dmeta'},el('span',{text:`${dr.g} · ${dr.dev==='pc'?'PC':dr.dev==='router'?'router':'switch'}`}),el('span',{text:`Streak ${S.drill.streak} · best ${S.drill.best}`})),chips,
      el('div',{class:'dpurpose',id:'dq',text:txt(dr.purpose,v)}),
      el('div',{class:'dbox'},el('span',{class:'tp',text:IOS.prompt(dev)}),inp),fb,el('div',{class:'dacts'},check,showB,skip),
      el('p',{class:'dim',style:'font-size:13px;margin-top:14px',text:'Any abbreviation IOS would accept counts (conf t, int g0/0, no shut…). Tab completes a word and ? lists what can come next.'}));
    const answer=()=>{
      const t=inp.value;if(!t.trim()){fb.textContent='Type the command first.';return;}
      if(fb.dataset.done){nextItem();return;}
      const r=IOS.parse(dr.mode==='pc'?'pc':dr.mode,t,dev);fb.textContent='';
      const right=r.ok&&dr.ids.includes(r.id)&&(!dr.check||dr.check(r.args,v));
      if(right){
        if(!missedNow&&!shown){S.drill.right++;S.drill.streak++;S.drill.best=Math.max(S.drill.best,S.drill.streak);}
        S.drill.tried+=missedNow||shown?0:1;store.set('ns_drill',S.drill);renderStats();
        const full=txt(dr.answer,v),sh=txt(dr.short,v);
        add(fb,el('div',{class:'ok',text:'✓ Correct'}),el('div',{class:'ans',text:full}),sh&&sh!==t.trim()&&sh!==full?el('div',{class:'dim',text:`Shortcut: ${sh}`}):null,dr.note?el('div',{class:'dim',text:dr.note}):null);
        fb.dataset.done='1';check.textContent='Next';inp.readOnly=true;check.focus();return;}
      if(!missedNow&&!shown){missedNow=true;S.drill.tried++;S.drill.streak=0;store.set('ns_drill',S.drill);renderStats();queue.splice(Math.min(3,queue.length),0,cur.i);}
      if(r.ok){const what=CS.IDNAME[r.id];fb.append(el('div',{class:'out',text:dr.ids.includes(r.id)?'Right command, but check the value'+(r.args.length>1?'s':'')+'.':`That’s a real command, but it would ${what||'do something else'}.`}));}
      else{const scratch=IOS.newDevice(dr.dev==='pc'?'pc':dr.dev,dev.name);if(scratch.type!=='pc'){scratch.mode=dev.mode;scratch.ctx=dev.ctx;}
        const o=IOS.run(scratch,t);const pre=el('div',{class:'out'});
        if(/^\s+\^$/.test((o[0]||{}).t||''))pre.append(el('div',{style:'color:var(--text)',text:IOS.prompt(dev)+t}));
        o.forEach(x=>pre.append(el('div',{class:x.c==='coach'?'coach':'',text:(x.c==='coach'?'💡 ':'')+x.t})));
        if(!o.length)pre.append(el('div',{text:'% Invalid input detected.'}));
        fb.append(pre);}
      inp.select();
    };
    check.onclick=answer;inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();answer();}else if(e.key==='Tab'){e.preventDefault();inp.value=IOS.complete(dr.mode==='pc'?'pc':dr.mode,inp.value,dev);}});
    check.addEventListener('keydown',e=>{if(e.key==='Enter'&&fb.dataset.done){e.preventDefault();nextItem();}});
    showB.onclick=()=>{if(!shown&&!missedNow){S.drill.tried++;S.drill.streak=0;store.set('ns_drill',S.drill);renderStats();queue.splice(Math.min(3,queue.length),0,cur.i);}shown=true;
      fb.textContent='';const sh=txt(dr.short,v);add(fb,el('div',{class:'ans',text:txt(dr.answer,v)}),sh?el('div',{class:'dim',text:`Shortcut: ${sh}`}):null,dr.note?el('div',{class:'dim',text:dr.note}):null,el('div',{class:'dim',text:'Type it in to move on.'}));inp.focus();};
    skip.onclick=nextItem;
    if(isDesktop())inp.focus({preventScroll:true});
  }
  return {start(){if(!cur)nextItem();else render();},get cur(){return cur;}};
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
    t=T.build(params);sess={start:Date.now(),showme:0,done:false,ok:new Set(),terms:{}};
    if(t.params)setURL(id,t.params);
    root.textContent='';
    const side=el('div',{class:'card tside'}),main=el('div',{class:'card tmain'});root.append(el('div',{class:'tview'},side,main));
    // side: intro, given values, table, goals
    add(side,el('div',{class:'row',style:'justify-content:space-between'},el('span',{class:'dim mono',style:'font-size:12px',text:T.level.toUpperCase()}),el('button',{class:'btn small ghost',type:'button',text:'← All tasks',onclick:()=>{setURL('');try{history.replaceState(null,'',location.pathname+'?tab=tasks');}catch(e){}list();}})),
      el('h2',{text:T.title}),el('p',{html:t.intro}),id==='scenario'?el('button',{class:'btn small',type:'button',text:'← Part 1: subnetting and the Addressing Table',onclick:()=>{const p=t.params||{};go('lab',{lab:{kind:'lab',base:p.lab,hosts:p.hosts,r1:p.r1,r2:p.r2}});}}):null);
    if(t.given)side.append(el('table',{class:'given'},...t.given.map(([k,v])=>el('tr',null,el('td',{text:k}),el('td',{class:'v',text:v})))));
    const tableEl=!t.table?null:(el('details',{open:!matchMedia('(max-width:900px)').matches},el('summary',{class:'dim mono',style:'cursor:pointer;font-size:12px',text:'ADDRESSING TABLE'}),el('div',{class:'tablewrap'},el('table',{class:'given'},el('tr',null,...(t.tableHead||['Device','Interface','IP address','Mask','Note']).map(h=>el('th',{text:h}))),...t.table.map(r=>el('tr',null,...r.map((c,i)=>el('td',{class:i>=2?'v':'',text:c}))))))));
    const ul=el('ul',{class:'goals',id:'goals'},...t.goals.map((g,i)=>el('li',{'data-i':i},el('i',{'aria-hidden':'true'}),el('span',null,g.text,t.tabs.length>1?el('span',{class:'dv',text:g.dev}):null))));
    const sm=el('div',{id:'showme'}),banner=el('div',{id:'banner'});
    side.append(el('h3',{text:'Goals'}),ul,banner,sm,el('div',{class:'row'},el('button',{class:'btn small',type:'button',id:'showBtn',text:'💡 Show me the next step',onclick:showMe}),el('button',{class:'btn small ghost',type:'button',text:'↺ Start over (new values)',onclick:()=>open(T.id,t.params)})));
    // main: device tabs and a terminal or PC panel for each
    const tabs=el('div',{class:'dtabs',role:'tablist'}),panes=el('div');
    t.tabs.forEach((name,i)=>{const d=t.net.devices[name];
      const pane=d.type==='pc'?PCPanel(d,t.net,recheck):Terminal(d,t.net,recheck);
      if(d.type!=='pc'){pane.print([{t:`${name} — ${d.type==='router'?'Cisco 1941 router':'Cisco 2960 switch'} console. Press Enter to start; type ? for help.`,c:'sys'}]);}
      sess.terms[name]=pane;pane.root.hidden=i>0;panes.append(pane.root);
      tabs.append(el('button',{type:'button',role:'tab','aria-selected':String(i===0),class:i===0?'on':'','data-dev':name,text:`${d.type==='router'?'🖧':d.type==='switch'?'⇄':'🖥'} ${name}`,onclick:()=>tabTo(name)}));});
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
    const all=t.goals.every(g=>{try{return g.check(t.net);}catch(e){return false;}});
    const nx=t.goals.find(g=>{try{return !g.check(t.net);}catch(e){return true;}}),ng=$('#nextgoal');
    if(ng){ng.textContent='';if(nx)ng.append(el('b',{text:'Next goal '}),el('span',{text:nx.text}),...(t.tabs.length>1?[el('span',{class:'dv',text:` · ${nx.dev}`})]:[]));else ng.append(el('b',{text:'All goals done ✓'}));}
    if(all&&!sess.done){sess.done=true;const stars=sess.showme===0?3:sess.showme<=2?2:1,mins=Math.max(1,Math.round((Date.now()-sess.start)/60000));
      const prev=S.tasks[T.id]||{};S.tasks[T.id]={done:true,stars:Math.max(stars,prev.stars||0)};store.set('ns_tasks',S.tasks);renderStats();
      const b=$('#banner');b.textContent='';b.append(el('div',{class:'done-banner'},el('b',{text:'Task complete! '}),el('span',{class:'stars',text:'★'.repeat(stars)+'☆'.repeat(3-stars)}),
        el('div',{class:'dim',text:`${sess.showme?`Used Show me ${sess.showme} time${sess.showme>1?'s':''}`:'No hints'} · about ${mins} min`}),
        el('div',{class:'row',style:'margin-top:8px'},el('button',{class:'btn small primary',type:'button',text:'Again with new values',onclick:()=>open(T.id,T.id==='scenario'?t.params:undefined)}),el('button',{class:'btn small',type:'button',text:'Next task →',onclick:()=>{const i=CS.TASKS.indexOf(T);const n=CS.TASKS[(i+1)%CS.TASKS.length];setURL(n.id);open(n.id);}}))));
      $('#showme').textContent='';}
    if(!all&&sess.done){/* undone after finishing: keep the banner; it was earned */}
  }
  function showMe(){
    const i=t.goals.findIndex(g=>{try{return !g.check(t.net);}catch(e){return true;}});if(i<0)return;
    const g=t.goals[i],d=t.net.devices[g.dev];sess.showme++;
    const box=$('#showme');box.textContent='';
    if(g.where==='pcip'){box.append(el('div',{class:'showme'},el('div',{text:`On ${g.dev}, open IP Configuration and fill in:`}),el('div',{class:'mono',text:g.text.replace(/^[^:]+:\s*/,'')})));tabTo(g.dev);if(sess.terms[g.dev].show)sess.terms[g.dev].show('ip');return;}
    const steps=CS.showMe(g,d.type==='pc'?d:d);
    const secretNote=steps.includes('enable')&&d.cfg&&(d.cfg.enableSecret||d.cfg.enablePassword)?' (it will ask for the enable secret)':'';
    box.append(el('div',{class:'showme'},el('div',{text:`On ${g.dev}, from ${IOS.prompt(d.type==='pc'?d:d)} type:`}),el('ol',null,...steps.map(s=>el('li',{text:s===''?'(press Enter to confirm)':s}))),secretNote?el('div',{class:'dim',text:secretNote}):null,
      g.where==='pc'?el('div',{class:'dim',text:'Use the PC’s Command Prompt.'}):null));
    tabTo(g.dev);if(sess.terms[g.dev].show)sess.terms[g.dev].show('cmd');
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
      tabs.append(el('button',{type:'button',role:'tab','aria-selected':String(i===0),class:i===0?'on':'',text:n,onclick:e=>{$$('button',tabs).forEach(b=>{b.classList.toggle('on',b===e.target);b.setAttribute('aria-selected',String(b===e.target));});Object.entries(terms).forEach(([m,q])=>{q.root.hidden=m!==n;});p.focus();}}));});
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


/* ---------------- Packet Tracer lab: Part 1 (subnetting + Addressing Table) here, Part 2 = the scenario task ---------------- */
const Lab=(()=>{
  const PARTS=LAB.LABPARTS;let q=null,pr=null,k=0,miss=[],first=0,justDone=-1,done=false,msg='',msgCls='',hintN=0;
  let part=store.get('ns_labpart','all');if(!PARTS[part])part='all';
  const root=()=>$('#v-lab'),ipStr=LAB.ipStr,oct=LAB.oct;
  const asParams=L=>({lab:ipStr(L.base),hosts:L.hosts,r1:L.r1,r2:L.r2});
  function setURL(){try{const u=new URL(location.href);u.search='';u.searchParams.set('tab','lab');if(pr)Object.entries(asParams(q.L)).forEach(([a,b])=>u.searchParams.set(a,b));history.replaceState(null,'',u.toString());}catch(e){}}
  function load(fixed){pr=fixed||null;q=LAB.genLab(fixed||null,part);k=0;miss=q.fields.map(()=>false);first=0;justDone=-1;done=false;msg='';hintN=0;setURL();render();}
  function start(fixed){if(fixed||!q)load(fixed);else render();}
  const ipCell=v=>`<span class="ipf">${ipStr(v)}</span><span class="ips">.${oct(v,3)}</span>`;
  // the tables fill in as you answer (same layout as the lab handout)
  function sheet(){
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
  function toPart2(){const p=asParams(q.L);go('tasks',{id:'scenario',params:p});try{const u=new URL(location.href);u.search='';u.searchParams.set('task','scenario');Object.entries(p).forEach(([a,b])=>u.searchParams.set(a,b));history.replaceState(null,'',u.toString());}catch(e){}}
  function check(){
    if(done)return;const f=q.fields[k],inp=$('#labIn'),raw=LAB.expand(f,inp.value);
    if(LAB.isBlank(raw)){msg='Type an answer first.';msgCls='coach';renderQ();return;}
    if(LAB.isRight(f,raw)){if(!miss[k])first++;justDone=k;k++;msg='';hintN=0;if(k>=q.fields.length){done=true;const L=q.L;S.labs=(S.labs||0)+1;store.set('ns_labs',S.labs);}render();return;}
    miss[k]=true;let d=null;try{d=q.diag(q.fields.map((g,j)=>j===k?raw:j<k?LAB.show(g):''))[k];}catch(e){}
    // a nudge, not the answer: the worked value stays hidden until “Show the answer”
    msg=(d?String(d):'That’s not it.').replace(/<b class="g mono">[^<]*<\/b>/g,'<b class="g mono">?</b>')+' <span class="dim">Try again, or use Hint.</span>';msgCls='bad';renderQ();
  }
  function own(){
    const box=$('#labOwn');if(!box.hidden){box.hidden=true;return;}box.hidden=false;box.textContent='';
    const fld=(lab,id,ph,mode)=>el('label',{},lab,el('input',{id,placeholder:ph,autocomplete:'off',spellcheck:'false',inputmode:mode}));
    const sel=(lab,id)=>el('label',{},lab,el('select',{id},...[1,2,3].map(v=>el('option',{value:v,text:v,selected:v===2}))));
    const m=el('div',{class:'own-msg',id:'labOwnMsg'});
    const goBtn=el('button',{class:'btn primary',type:'button',text:'Load lab',onclick:()=>{const r=LAB.labFrom($('#labNet').value,$('#labHosts').value,$('#labR1').value,$('#labR2').value);
      if(r.err){m.textContent=r.err;m.className='own-msg bad';return;}box.hidden=true;load(r);}});
    box.append(el('p',{class:'dim',text:'Set the /24, how many addresses each LAN needs, and how many LANs each router has.'}),
      el('div',{class:'own-row'},fld('Network','labNet','192.168.100.0','decimal'),fld('Addresses per LAN','labHosts','25','numeric'),sel('LANs on R1','labR1'),sel('LANs on R2','labR2'),goBtn,
        el('button',{class:'btn small ghost',type:'button',text:'Use the 11.7.5 lab',onclick:()=>{$('#labNet').value='192.168.100.0';$('#labHosts').value='25';$('#labR1').value='2';$('#labR2').value='2';goBtn.click();}})),m);
    $$('#labNet,#labHosts',box).forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();goBtn.click();}}));$('#labNet').focus();
  }
  function print(key){
    const area=$('#printArea');area.innerHTML=`<div class="pp-title"><h2>Packet Tracer: Subnetting Scenario</h2><div>Name ______________________ &nbsp; Date ____________</div></div>${LAB.printLabHTML(q,1,false)}${key?`<div class="pp-key"><div class="pp-title"><h2>Answer key</h2></div>${LAB.printLabHTML(q,1,true)}</div>`:''}`;
    document.body.classList.add('printing');const off=()=>{document.body.classList.remove('printing');area.textContent='';removeEventListener('afterprint',off);};addEventListener('afterprint',off);
    try{window.print();}catch(e){}if(!('onafterprint' in window))setTimeout(off,500);
  }
  function renderQ(){
    const box=$('#labQ');if(!box)return;box.textContent='';
    if(done){const n=q.fields.length;
      box.append(el('div',{class:'done-banner'},el('b',{text:`Part ${part==='all'?'1':'1 · '+PARTS[part]} done ✓`}),el('span',{text:` ${first} of ${n} right on the first try.`})),
        el('div',{class:'lab-sol',html:q.explain}),
        el('div',{class:'dacts'},el('button',{class:'btn primary',type:'button',text:'Part 2: configure the devices →',onclick:toPart2}),el('button',{class:'btn',type:'button',text:'New lab',onclick:()=>load(null)}),pr?el('button',{class:'btn ghost',type:'button',text:'Same network again',onclick:()=>load(pr)}):null));return;}
    const f=q.fields[k],n=q.fields.length;
    const inp=el('input',{id:'labIn','aria-label':f.label,autocomplete:'off',autocapitalize:'off',spellcheck:'false',inputmode:f.type==='ip'?'decimal':'numeric',enterkeyhint:'done',
      placeholder:f.type==='bits'?'8 bits':f.type==='ip'?(f.pre?'last octet':'a.b.c.d'):'number'});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
    const hs=LAB.hintsFor(q)[k]||[];
    box.append(el('div',{class:'dmeta'},el('span',{text:`Question ${k+1} of ${n} · ${f.where}`}),el('span',{text:`${first} first-try`})),
      el('div',{class:'lab-prog'},el('i',{style:`width:${Math.round(100*k/n)}%`})),
      el('div',{class:'dpurpose',text:f.label}),
      el('div',{class:'dbox'},f.pre?el('span',{class:'tp',text:f.pre}):null,inp),
      el('div',{class:'dfb lab-fb'},msg?el('div',{class:msgCls,html:msg}):null,
        hintN?el('ol',{class:'lab-hints'},...hs.slice(0,hintN).map(s=>el('li',{html:s.q+(s.tip?` <span class="dim">${s.tip}</span>`:'')}))):null),
      el('div',{class:'dacts'},el('button',{class:'btn primary',type:'button',text:'Check',onclick:check}),
        hintN<hs.length?el('button',{class:'btn',type:'button',text:hintN?'Next hint':'Hint',onclick:()=>{hintN++;miss[k]=true;renderQ();}}):null,
        miss[k]?el('button',{class:'btn ghost',type:'button',text:'Show the answer',onclick:()=>{const v=LAB.show(f);inp.value=f.pre&&v.startsWith(f.pre)?v.slice(f.pre.length):v;inp.focus();}}):null));
    const sh=$('#labSheet');if(sh)sh.innerHTML=sheet();
    if(isDesktop())inp.focus();
  }
  function render(){
    const r=root();r.textContent='';
    const seg=el('div',{class:'groups',role:'group','aria-label':'Lab part'},...Object.entries(PARTS).map(([key,name])=>el('button',{class:'chip'+(key===part?' on':''),type:'button',text:name,'aria-pressed':String(key===part),
      onclick:()=>{part=key;store.set('ns_labpart',part);load(pr||{kind:'lab',base:ipStr(q.L.base),hosts:q.L.hosts,r1:q.L.r1,r2:q.L.r2});}})),
      el('button',{class:'chip',type:'button',text:'Part 2: configure →',onclick:toPart2}));
    const pk=el('label',{class:'dim lab-key'},el('input',{type:'checkbox',id:'labKey'}),' with answer key');
    r.append(el('div',{class:'dmeta'},el('span',{text:'PACKET TRACER LAB · 11.7.5 SUBNETTING SCENARIO'}),
        el('span',{class:'row'},el('button',{class:'btn small',type:'button',text:'✎ Your own lab',onclick:own}),el('button',{class:'btn small',type:'button',text:'🖨 Print',onclick:()=>print($('#labKey').checked)}),pk,el('button',{class:'btn small ghost',type:'button',text:'New lab',onclick:()=>load(null)}))),
      el('div',{class:'own',id:'labOwn',hidden:true}),seg,
      el('div',{class:'lab-prompt',html:q.prompt}),
      el('div',{class:'lab-grid'},el('div',{id:'labQ',class:'lab-q'}),el('div',{id:'labSheet'})));
    renderQ();
  }
  return {start,load,get q(){return q;},get k(){return k;},check};
})();

/* ---------------- start: ?tab=… or ?task=…(&lab=…&hosts=…&r1=…&r2=…) ---------------- */
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
  if(task&&CS.TASKS.some(x=>x.id===task))go('tasks',{id:task,params:task==='scenario'?labParams(sp):undefined});
  else if(sp.has('lab')&&!task){const p=labParams(sp);go('lab',p?{lab:{kind:'lab',base:p.lab,hosts:p.hosts,r1:p.r1,r2:p.r2}}:undefined);}
  else go(['drills','tasks','lab','sandbox','cheat'].includes(tab)?tab:'drills');})();

/* ---------------- background code rain (decorative; pauses when hidden, still frame for reduced motion) ---------------- */
(function(){
  const cv=document.getElementById('rain');if(!cv||!cv.getContext)return;
  const ctx=cv.getContext('2d'),glyphs='01アイウエオカキクケコサシスセソタチツテト#>$0123456789ABCDEF./';
  let cols=[],fs=16,w=0,h=0,last=0,raf=0;const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)');
  function size(){const d=Math.min(window.devicePixelRatio||1,2);w=innerWidth;h=innerHeight;cv.width=w*d;cv.height=h*d;ctx.setTransform(d,0,0,d,0,0);fs=w<600?14:16;cols=Array.from({length:Math.ceil(w/fs)},()=>Math.random()*-h/fs);ctx.fillStyle='#010804';ctx.fillRect(0,0,w,h);}
  function frame(t){raf=requestAnimationFrame(frame);if(t-last<60)return;last=t;ctx.fillStyle='rgba(1,8,4,0.12)';ctx.fillRect(0,0,w,h);ctx.font=fs+'px "JetBrains Mono",monospace';
    for(let i=0;i<cols.length;i++){const y=cols[i]*fs;if(y>0){ctx.fillStyle='#b8ffd0';ctx.fillText(glyphs[(Math.random()*glyphs.length)|0],i*fs,y);ctx.fillStyle='#00ff66';ctx.fillText(glyphs[(Math.random()*glyphs.length)|0],i*fs,y-fs);}cols[i]+=1;if(y>h&&Math.random()>.975)cols[i]=Math.random()*-20;}}
  function still(){size();ctx.font=fs+'px "JetBrains Mono",monospace';for(let i=0;i<cols.length;i++){const n=(Math.random()*h/fs)|0;for(let k=0;k<n;k++){ctx.fillStyle=`rgba(0,255,102,${(k/n)*.5})`;ctx.fillText(glyphs[(Math.random()*glyphs.length)|0],i*fs,k*fs);}}}
  function start(){cancelAnimationFrame(raf);if(reduce&&reduce.matches){still();return;}size();raf=requestAnimationFrame(frame);}
  addEventListener('resize',()=>{clearTimeout(start.t);start.t=setTimeout(start,200);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else start();});
  start();
})();

window.NS={go,Tasks,Drills,Lab,S,IOS,CS,LAB};
})();
