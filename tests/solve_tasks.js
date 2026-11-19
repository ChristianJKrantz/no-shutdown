// Solves every task with nothing but its own "Show me" steps, checking each goal ticks and nothing else breaks.
const I=require('../ios.js'),C=require('../content.js');
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m);if(!c)fails++;};
for(let round=0;round<25;round++){
  for(const T of C.TASKS){
    const t=T.build(T.id==='scenario'&&round%2?{lab:'10.20.30.0',hosts:'50',r1:'1',r2:'2'}:undefined);const net=t.net;
    const secret={};Object.values(net.devices).forEach(d=>{if(d.cfg)secret[d.cfg.hostname]=d.cfg.enableSecret;});
    t.goals.forEach((g,gi)=>{
      const d=net.devices[g.dev];
      if(g.where==='pcip'){const m=g.text.match(/: (\S+), mask (\S+), gateway (\S+)/);d.ip=m[1];d.mask=m[2];d.gw=m[3];return;}
      const steps=C.showMe(g,d);
      steps.forEach(c=>{I.run(d,c,net);const p=I.pendingPrompt(d);if(p&&/^Password/.test(p.prompt)&&c==='enable')I.run(d,secret[d.cfg.hostname]||'class',net);});
      while(I.pendingPrompt(d))I.run(d,'',net);
      if(!g.check(net)){ok(false,`${T.id} round ${round}: goal ${gi+1} “${g.text}” didn’t tick after ${JSON.stringify(steps)} (mode ${d.mode})`);}
    });
    const all=t.goals.every(g=>g.check(net));
    if(!all)ok(false,`${T.id} round ${round}: not every goal stays ticked at the end: ${t.goals.map((g,i)=>g.check(net)?'':i+1).filter(Boolean)}`);
  }
}
ok(fails===0,`every task (${C.TASKS.length}) solved by its Show me steps, 25 random rounds each`);
// drills: each answer and its shortcut are accepted by the parser
let bad=[];
for(let k=0;k<20;k++)C.DRILLS.forEach((dr,i)=>{const v=dr.gen?dr.gen():{};const dev=I.newDevice(dr.dev,dr.dev==='router'?'R1':dr.dev==='switch'?'S1':'PC1');
  [dr.answer,dr.short].filter(Boolean).forEach(a=>{const txt=typeof a==='function'?a(v):a;const r=I.parse(dr.mode,txt,dev);
    if(!r.ok||!dr.ids.includes(r.id)||(dr.check&&!dr.check(r.args,v)))bad.push(`${i}: ${txt} → ${JSON.stringify(r)}`);});});
ok(bad.length===0,`all ${C.DRILLS.length} drill answers and shortcuts are accepted ${bad.slice(0,5).join(' | ')}`);
console.log(fails||bad.length?'FAILED':'all passed');process.exit(fails||bad.length?1:0);
