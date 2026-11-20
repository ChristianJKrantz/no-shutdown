/* No Shutdown: the Cisco "Subnetting Scenario" Packet Tracer lab, Part 1 (moved here from Subnet Sprint).
   Subnet a /24 for a two-router topology (Step 1), assign the subnets to the links (Step 2) and fill in the
   Addressing Table by its rules (Step 3). Each question has its own feedback for common mistakes, step-by-step
   hints and a worked answer. Part 2 is the "scenario" task in content.js, opened with the same network.
   Everything returned as HTML escapes what the user typed (esc) and otherwise holds only numbers and fixed text. */
(function(){
'use strict';
const oct=(n,i)=>(n>>>(24-8*i))&255;
const ipStr=n=>[0,1,2,3].map(i=>oct(n,i)).join('.');
const bin8=v=>v.toString(2).padStart(8,'0');
function parseIP(s){const m=String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);if(!m)return null;const o=m.slice(1).map(Number);if(o.some(x=>x>255))return null;return((o[0]<<24)|(o[1]<<16)|(o[2]<<8)|o[3])>>>0;}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const T=(tag,html)=>html;
const M=s=>`<span class="mono">${s}</span>`;
const G=s=>`<b class="g mono">${s}</b>`;
const toNum=v=>{const s=String(v).replace(/[,\s]/g,'');return /^\d+$/.test(s)?Number(s):null;};
const isBlank=v=>v==null||String(v).trim()==='';
const isBits8=raw=>/^[01]{8}$/.test(String(raw).replace(/\s/g,''));
const IPFMT='Four numbers from 0 to 255, separated by dots.';
const P3=a=>ipStr(a).replace(/\d+$/,'');
function badEntry(v,kind){
  if(isBlank(v))return 'You left this blank.';
  if(kind==='ip')return `${M(esc(String(v).trim()))} isn’t a valid IPv4 address. It needs four numbers from 0 to 255 separated by dots.`;
  return `${M(esc(String(v).trim()))} isn’t a whole number.`;
}
const LABPARTS={all:'All of Part 1',subnet:'Step 1: subnetting',table:'Steps 2–3: Addressing Table'};
function labFrom(netRaw,hostsRaw,r1Raw,r2Raw){
  const b=parseIP(String(netRaw||'').trim().replace(/\/24$/,''));
  if(b==null||oct(b,3)!==0)return {err:'The network must be a /24 that ends in .0, like 192.168.100.0.'};
  const a=oct(b,0);if(a===0||a===127||a>=224)return {err:'Use a normal unicast network (first octet 1–223, not 127).'};
  const h=String(hostsRaw||'').trim();if(!/^\d{1,3}$/.test(h)||Number(h)<2)return {err:'Hosts per LAN must be a whole number of at least 2, like 25.'};
  const r1=Number(r1Raw),r2=Number(r2Raw);if(![1,2,3].includes(r1)||![1,2,3].includes(r2))return {err:'Each router can have 1 to 3 LANs.'};
  const need=r1+r2+1,n=Math.ceil(Math.log2(need)),per=2**(8-n)-2;
  if(Number(h)>per)return {err:`${need} subnets means borrowing ${n} bits, which leaves ${per} usable hosts per subnet. That’s fewer than ${h}, so this network can’t fit. Use fewer hosts or fewer LANs.`};
  return {kind:'lab',base:ipStr(b),hosts:Number(h),r1,r2};
}
function labScenario(fixed){
  let base,hosts,r1,r2;
  if(fixed){base=parseIP(fixed.base);hosts=fixed.hosts;r1=fixed.r1;r2=fixed.r2;}
  else{r1=pick([1,2,2,2,3]);r2=pick([1,2,2,2,3]);
    const r=Math.random();base=parseIP(r<.6?`192.168.${R(0,255)}.0`:r<.8?`10.${R(0,255)}.${R(0,255)}.0`:`172.${R(16,31)}.${R(0,255)}.0`);}
  const need=r1+r2+1,n=Math.ceil(Math.log2(need)),blk=2**(8-n),nsub=2**n,per=blk-2;
  if(!fixed)hosts=Math.random()<.2?per:R(Math.max(2,2**(7-n)-1),per);
  const mask=parseIP('255.255.255.'+(256-blk));
  const subs=[...Array(nsub)].map((_,k)=>{const net=(base+k*blk)>>>0;return {k,net,first:net+1,last:net+blk-2,bc:net+blk-1};});
  const links=[];let s=0;
  [['R1',r1],['R2',r2]].forEach(([rt,c])=>{for(let g=0;g<c;g++){s++;links.push({type:'lan',rt,ifc:`G0/${g}`,sw:`S${s}`,pc:`PC${s}`,desc:`the LAN on ${rt} G0/${g}`});}});
  links.push({type:'wan',rt:'R1',ifc:'S0/0/0',desc:'the WAN link between R1 and R2'});
  links.forEach((l,j)=>{l.j=j;l.sub=subs[j];});
  const lans=links.filter(l=>l.type==='lan'),wan=links[links.length-1];
  const rows=[];
  ['R1','R2'].forEach(rt=>{lans.filter(l=>l.rt===rt).forEach(l=>rows.push({dev:rt,ifc:l.ifc,role:'rlan',link:l,ip:l.sub.first}));
    rows.push({dev:rt,ifc:'S0/0/0',role:rt==='R1'?'r1wan':'r2wan',link:wan,ip:rt==='R1'?wan.sub.first:wan.sub.last});});
  lans.forEach(l=>rows.push({dev:l.sw,ifc:'VLAN 1',role:'sw',link:l,ip:l.sub.first+1,gw:l.sub.first}));
  lans.forEach(l=>rows.push({dev:l.pc,ifc:'NIC',role:'pc',link:l,ip:l.sub.last,gw:l.sub.first}));
  // Part 2 (like the lab: one router's LANs, a switch and a PC on the other router)
  let cr,swL,pcL;
  if(fixed){cr='R1';const o=lans.filter(l=>l.rt==='R2');swL=o[0];pcL=o[o.length-1];}
  else{cr=pick(['R1','R2']);const o=lans.filter(l=>l.rt!==cr);swL=pick(o);pcL=pick(o);}
  return {base,hosts,r1,r2,need,n,blk,nsub,per,mask,subs,links,lans,wan,rows,cr,swL,pcL};
}
function topoSVG(L){
  const xs=(c,cx)=>[...Array(c)].map((_,i)=>cx+(i-(c-1)/2)*104);
  const R={R1:170,R2:470},parts=[];
  parts.push(`<line class="tl wan" x1="${R.R1}" y1="38" x2="${R.R2}" y2="38"/><text class="tt" x="${R.R1+34}" y="30">S0/0/0</text><text class="tt" x="${R.R2-34}" y="30" text-anchor="end">S0/0/0</text>`);
  L.lans.forEach(l=>{const i=L.lans.filter(m=>m.rt===l.rt).indexOf(l),x=xs(L.lans.filter(m=>m.rt===l.rt).length,R[l.rt])[i];
    parts.push(`<line class="tl" x1="${R[l.rt]}" y1="38" x2="${x}" y2="122"/><line class="tl" x1="${x}" y1="122" x2="${x}" y2="190"/>
      <text class="tt" x="${(R[l.rt]+x)/2+(x<R[l.rt]?-6:x>R[l.rt]?6:6)}" y="84" text-anchor="${x<R[l.rt]?'end':'start'}">${l.ifc}</text>
      <rect class="tsw" x="${x-26}" y="110" width="52" height="24" rx="4"/><text class="tn" x="${x}" y="126" text-anchor="middle">${l.sw}</text>
      <rect class="tpc" x="${x-24}" y="180" width="48" height="26" rx="3"/><text class="tn" x="${x}" y="197" text-anchor="middle">${l.pc}</text>`);});
  ['R1','R2'].forEach(r=>parts.push(`<circle class="trt" cx="${R[r]}" cy="38" r="22"/><text class="tn" x="${R[r]}" y="43" text-anchor="middle">${r}</text>`));
  return `<svg class="topo" viewBox="0 0 640 216" role="img" aria-label="Topology: R1 and R2 joined by a serial link; ${L.lans.map(l=>`${l.rt} ${l.ifc} to switch ${l.sw} and ${l.pc}`).join('; ')}">${parts.join('')}</svg>`;
}
function genLab(fixed,part){
  part=LABPARTS[part]?part:'all';
  const L=labScenario(fixed),{base,n,blk,nsub,per,mask,subs,links,rows}=L,P=a=>ipStr(a).replace(/\d+$/,'');
  const inc=k=>part==='all'||part===k;
  const fields=[],add=f=>fields.push(f);
  if(inc('subnet')){
    const w1='Step 1 · Subnet the network';
    add({key:'need',type:'num',label:'a. Based on the topology, how many subnets are needed?',where:w1,answer:L.need});
    add({key:'bits',type:'num',label:'b. How many bits must be borrowed to support that many subnets?',where:w1,answer:n});
    add({key:'made',type:'num',label:'c. How many subnets does this create?',where:w1,answer:nsub});
    add({key:'hper',type:'num',label:'d. How many usable hosts does this create per subnet?',where:w1,answer:per});
    for(let k=2;k<L.need;k++){
      add({key:'enet',k,type:'ip',pre:P(subs[k].net),label:`e. Subnet ${k} network address`,where:'Step 1e · Binary value of the subnets',answer:subs[k].net});
      add({key:'ebits',k,type:'bits',label:`e. Subnet ${k} last octet in binary`,where:'Step 1e · Binary value of the subnets',answer:bin8(oct(subs[k].net,3))});}
    add({key:'mbits',type:'bits',label:'f. New subnet mask, 4th octet in binary',where:'Step 1f · The new subnet mask',answer:bin8(oct(mask,3))});
    add({key:'mdec',type:'ip',pre:'255.255.255.',label:'f. New subnet mask in decimal',where:'Step 1f · The new subnet mask',answer:mask});
    subs.forEach(s=>{const w=`Step 1g · Subnet table · Subnet ${s.k}`;
      add({key:'gnet',k:s.k,type:'ip',pre:P(s.net),label:`Subnet ${s.k} subnet address`,where:w,answer:s.net});
      add({key:'gfirst',k:s.k,type:'ip',pre:P(s.first),label:`Subnet ${s.k} first usable host`,where:w,answer:s.first});
      add({key:'glast',k:s.k,type:'ip',pre:P(s.last),label:`Subnet ${s.k} last usable host`,where:w,answer:s.last});
      add({key:'gbc',k:s.k,type:'ip',pre:P(s.bc),label:`Subnet ${s.k} broadcast address`,where:w,answer:s.bc});});
  }
  if(inc('table')){
    links.forEach(l=>add({key:'asg',l,type:'ip',pre:P(l.sub.net),label:`Assign Subnet ${l.j} to ${l.desc}: its subnet address`,where:'Step 2 · Assign the subnets',answer:l.sub.net}));
    rows.forEach((r,i)=>{const w=`Step 3 · Addressing Table · ${r.dev}${r.role==='sw'||r.role==='pc'?'':' '+r.ifc}`;
      add({key:'aip',r,type:'ip',pre:P(r.ip),label:`${r.dev} ${r.ifc} IP address`,where:w,answer:r.ip});
      if(i===0)add({key:'amask',r,type:'ip',pre:'255.255.255.',label:'Subnet mask (the same for every device here)',where:w,answer:mask});
      if(r.gw!=null)add({key:'agw',r,type:'ip',pre:P(r.gw),label:`${r.dev} default gateway`,where:w,answer:r.gw});});
  }
  // ---------- feedback ----------
  const subOf=u=>{const d=(u-base)>>>0;return d<256?Math.floor(d/blk):-1;};
  const posName=u=>{const k=subOf(u);if(k<0)return null;const s=subs[k];
    return u===s.net?'the subnet (network) address':u===s.bc?'the broadcast address':u===s.first?'the first usable address':u===s.first+1?'the second usable address':u===s.last?'the last usable address':'a host address';};
  const typo=(u,want)=>{const bad=[0,1,2].filter(k=>oct(u,k)!==oct(want,k));if(!bad.length)return null;
    return T('copy_octets',`Check for a typo: ${bad.map(k=>`octet ${k+1} should be ${oct(want,k)}, not ${oct(u,k)}`).join(', and ')}. Every address here starts ${M(P(want))}.`);};
  const RULE={rlan:'Routers take the first usable address on their LANs',r1wan:'R1 takes the first usable address on the WAN link',r2wan:'R2 takes the last usable address on the WAN link (R1 already has the first)',sw:'Switches take the second usable address (the router has the first)',pc:'PCs take the last usable address'};
  const maskHow=`${n} borrowed bits = ${n} 1s in the 4th octet: ${[128,64,32,16,8,4,2,1].slice(0,n).join(' + ')} = ${G(256-blk)}, so the mask is ${G(ipStr(mask))}.`;
  function dNum(f,v){
    const u=toNum(v);if(u===f.answer)return null;if(u==null)return 'Type a whole number.';
    switch(f.key){
      case 'need':{const lanN=L.lans.length;
        const how=`Each LAN (router port → switch → PC) is one subnet, and the R1–R2 link is one more: ${lanN} + 1 = ${G(L.need)}.`;
        if(u===lanN)return T('lab_count',`You counted the LANs, but the serial link between R1 and R2 needs its own subnet too. ${how}`);
        if(u===lanN+2)return T('lab_count',`The R1–R2 link is a single subnet, even though it has two ends. ${how}`);
        if(u===lanN*3+2||u===lanN*2+2)return T('lab_count',`Count networks, not devices. ${how}`);
        return T('lab_count',how);}
      case 'bits':{const how=`Find the smallest n where 2<sup>n</sup> ≥ ${L.need}: n = ${G(n)} (2<sup>n</sup> = ${G(nsub)}).`;
        if(u===L.need)return T('lab_borrow',`That’s the number of subnets. Borrowed bits are the power of 2 that covers it. ${how}`);
        if(u>0&&u<8&&2**u<L.need)return T('lab_borrow',`${u} bit${u===1?'':'s'} only make${u===1?'s':''} 2<sup>${u}</sup> = ${2**u} subnets, fewer than ${L.need}. ${how}`);
        if(u>n&&u<8&&2**(8-u)-2<L.hosts)return T('lab_borrow',`Borrowing ${u} bits leaves 2<sup>${8-u}</sup> − 2 = ${2**(8-u)-2} hosts per subnet, fewer than the ${L.hosts} each LAN needs. You borrowed too many. ${how}`);
        if(u>n&&u<8)return T('lab_borrow',`${u} bits work, but borrow as few as you can so each subnet keeps more host addresses. ${how}`);
        return T('lab_borrow',how);}
      case 'made':{const how=`Borrowing ${n} bits creates 2<sup>${n}</sup> = ${G(nsub)} subnets.`;
        if(u===L.need)return T('lab_borrow',`That’s how many you need. Borrowing creates a full power of 2, even if some are left over. ${how}`);
        if(u===nsub-2)return T('lab_borrow',`No − 2 for subnets, only for hosts. ${how}`);
        return T('lab_borrow',how);}
      case 'hper':{const h=8-n,how=`Host bits = 8 − ${n} borrowed = ${G(h)}, so usable hosts = 2<sup>h</sup> − 2 = ${G(per)}.`;
        if(u===blk)return T('minus2',`2<sup>h</sup> counts every address, but the subnet address and broadcast can’t go to hosts: subtract 2. ${how}`);
        if(u===nsub-2||u===nsub)return T('lab_borrow',`That uses the borrowed bits. Hosts come from the bits that are left over. ${how}`);
        return T('lab_borrow',how);}
    }
    return null;
  }
  function dBits(f,v){
    const t=String(v||'').replace(/[\s.]/g,'');if(t===f.answer)return null;
    if(!/^[01]{8}$/.test(t))return 'Type exactly 8 bits (ones and zeros).';
    if(f.key==='mbits'){const ones=(t.match(/1/g)||[]).length;
      if(!/^1*0*$/.test(t))return T('vlsm_mask',`A mask octet is all its 1s on the left, then 0s. ${maskHow}`);
      return T('vlsm_mask',`The borrowed bits are the 1s: ${G(n)} of them, then ${G(8-n)} 0s. You have ${ones}.`);}
    const o=oct(subs[f.k].net,3);
    if(parseInt(t,2)===f.k)return T('lab_borrow',`That’s ${f.k} in binary in the lowest bits. The subnet number sits in the <b>borrowed</b> bits, the leftmost ${n}, so convert the address’s last octet (.${o}) instead.`);
    return T('bin_convert',`Convert subnet ${f.k}’s last octet .${o} to binary: ${G(f.answer)}.`);
  }
  function dIP(f,v){
    const u=parseIP(v);if(u===f.answer)return null;
    if(f.key==='mdec'||f.key==='amask'){if(u==null)return badEntry(v,'ip')+' '+maskHow;
      if(oct(u,0)!==255||oct(u,1)!==255||oct(u,2)!==255)return T('vlsm_mask',`The first three octets stay 255; you only borrow from the 4th. ${maskHow}`);
      if(oct(u,3)===blk)return T('vlsm_mask',`${blk} is the block size, not the mask. ${maskHow}`);
      return T('vlsm_mask',maskHow);}
    if(u==null)return badEntry(v,'ip');
    {const ty=typo(u,f.answer);if(ty)return ty;}
    const pn=posName(u),k=subOf(u);
    switch(f.key){
      case 'enet':case 'gnet':{const how=`Subnets go up by the block size: 256 ÷ ${nsub} = ${blk}. Subnet ${f.k} = ${f.k} × ${blk} = .${G(oct(f.answer,3))}.`;
        if(oct(u,3)===f.k)return T('lab_borrow',`That’s the subnet number. Write its address. ${how}`);
        if(k>=0&&u===subs[k].net&&k!==f.k)return T('chart_rows',`That’s subnet ${k}’s address. ${how}`);
        return T('chart_rows',how);}
      case 'gfirst':return T('off_by_one',`First usable = subnet address + 1 = ${G(ipStr(f.answer))}.${u===subs[f.k].net?' The subnet address itself can’t go to a host.':''}`);
      case 'glast':return T('off_by_one',`Last usable = broadcast − 1 = ${G(ipStr(f.answer))}.${u===subs[f.k].bc?' The broadcast can’t go to a host.':''}`);
      case 'gbc':{const how=`Broadcast = the next subnet’s address − 1 = ${G(ipStr(f.answer))}.`;
        if(u===subs[f.k].bc+1)return T('off_by_one',`That’s where the next subnet starts. ${how}`);
        return T('off_by_one',how);}
      case 'asg':{const how=`Subnet ${f.l.j}’s address is in your subnet table: ${G(ipStr(f.answer))}.`;
        if(k>=0&&u===subs[k].net)return T('lab_assign',`That’s subnet ${k}. The instructions put subnet ${f.l.j} on ${f.l.desc}. ${how}`);
        if(k===f.l.j)return T('lab_assign',`That’s ${pn} of subnet ${f.l.j}. Step 2 asks for the subnet address. ${how}`);
        return T('lab_assign',how);}
      case 'aip':{const r=f.r,s=r.link.sub,rule=`${RULE[r.role]}: ${G(ipStr(f.answer))}.`;
        if(k!==r.link.j)return T('lab_assign',`${ipStr(u)} is in ${k>=0?`subnet ${k}`:'a different network'}, but ${r.dev}${r.role==='pc'||r.role==='sw'?'':' '+r.ifc} is on ${r.link.desc}, subnet ${r.link.j} (${ipStr(s.net)}). ${rule}`);
        if(r.role==='r2wan'&&u===s.first)return T('lab_assign',`R1 already has the first usable address on this link, so they’d clash. ${rule}`);
        if(u===s.net||u===s.bc)return T('lab_assign',`That’s ${pn}, which no device can use. ${rule}`);
        return T('lab_assign',`That’s ${pn} of subnet ${r.link.j}. ${rule}`);}
      case 'agw':{const r=f.r,s=r.link.sub,how=`The default gateway is the router’s interface on the same LAN, ${r.link.rt} ${r.link.ifc}: ${G(ipStr(f.answer))}.`;
        if(u===r.ip)return T('lab_assign',`A device can’t be its own gateway. ${how}`);
        if(r.role==='pc'&&u===s.first+1)return T('lab_assign',`That’s the switch. A switch only connects the LAN; the gateway is the router. ${how}`);
        if(u===s.net)return T('lab_assign',`That’s the subnet address, not a device. ${how}`);
        if(k!==r.link.j)return T('lab_assign',`The gateway has to be on ${r.dev}’s own subnet. ${how}`);
        return T('lab_assign',how);}
    }
    return null;
  }
  const diag=x=>fields.map((f,i)=>{const v=x[i];
    if(f.type==='num')return dNum(f,v);if(f.type==='bits')return dBits(f,v);return dIP(f,v);});
  // ---------- hints ----------
  const walk=()=>{const st=[];
    fields.forEach((f,i)=>{const fin=o=>st.push(Object.assign({f:i,tip:''},o));
      const ipBad=(want,msg)=>u=>u==null?IPFMT:msg;
      switch(f.key){
        case 'need':st.push({q:'Count the LANs in the topology. Each router port that leads to a switch and PC is one LAN. LANs = ?',kind:'num',ans:L.lans.length,tip:'',bad:()=>'Count the router ports with a switch hanging off them.'});
          fin({q:'Every LAN needs a subnet, and so does the serial link between R1 and R2. Subnets needed = ?',kind:'num',ans:L.need,bad:()=>'LANs + 1 for the R1–R2 link.'});break;
        case 'bits':fin({q:`Find the smallest n where 2<sup>n</sup> ≥ ${L.need}. n = ?`,kind:'num',ans:n,tip:'Powers of 2: 2, 4, 8, 16. Borrow as few bits as you can, so each subnet keeps more host addresses.',bad:u=>u==null?'Enter a number.':2**u<L.need?`2<sup>${u}</sup> = ${2**u}, not enough.`:'That works, but a smaller n also covers it.'});break;
        case 'made':fin({q:`Borrowing ${n} bits makes 2<sup>${n}</sup> subnets. 2<sup>${n}</sup> = ?`,kind:'num',ans:nsub,bad:()=>`Multiply 2 by itself ${n} times.`});break;
        case 'hper':st.push({q:`Host bits are what’s left of the last octet: 8 − ${n} = ?`,kind:'num',ans:8-n,tip:'',bad:()=>`8 − ${n}.`});
          fin({q:`Usable hosts = 2<sup>h</sup> − 2 (the subnet address and broadcast can’t be used). = ?`,kind:'num',ans:per,bad:u=>u===blk?'Now subtract 2.':`2<sup>${8-n}</sup> − 2.`});break;
        case 'enet':if(f.k===2)st.push({q:`Block size: 256 ÷ ${nsub} subnets = ?`,kind:'num',ans:blk,tip:'The block size is also 2<sup>host bits</sup>, and 256 − the mask’s last octet.',bad:()=>`256 ÷ ${nsub}.`});
          fin({q:`Subnet ${f.k} = ${f.k} × the block size (${blk}). Write its network address.`,kind:'ip',ans:f.answer,bad:ipBad(f.answer,`${f.k} × ${blk}.`)});break;
        case 'ebits':fin({q:`Write the last octet (.${oct(subs[f.k].net,3)}) in binary, 8 bits.`,kind:'bits8',ans:f.answer,tip:'Only the borrowed bits (the leftmost) change from subnet to subnet; the host bits stay 0.',bad:(u,raw)=>isBits8(raw)?'Use the place values 128 64 32 16 8 4 2 1.':'Type exactly 8 ones and zeros.'});break;
        case 'mbits':fin({q:`The ${n} borrowed bits become 1s in the mask and the host bits stay 0s. Type the 4th octet’s 8 bits.`,kind:'bits8',ans:f.answer,bad:()=>`${n} 1s, then ${8-n} 0s.`});break;
        case 'mdec':fin({q:'Add the place values above the 1s for the 4th octet. Write the full mask.',kind:'ip',ans:mask,tip:'The mask ladder: 1 one = 128, 2 = 192, 3 = 224, 4 = 240, 5 = 248, 6 = 252.',bad:ipBad(mask,'Add the place values of the 1s.')});break;
        case 'gnet':fin({q:f.k===0?'Subnet 0 starts at the network you were given.':`Subnet ${f.k} = subnet ${f.k-1} + the block size (${blk}). Write its address.`,kind:'ip',ans:f.answer,bad:ipBad(f.answer,'Add the block size to the previous subnet.')});break;
        case 'gfirst':fin({q:'First usable = subnet address + 1.',kind:'ip',ans:f.answer,bad:ipBad(f.answer,'Add 1 to the subnet address.')});break;
        case 'glast':st.push({q:`Broadcast = the next subnet’s address − 1. Subnet ${f.k}’s broadcast = ?`,kind:'ip',ans:subs[f.k].bc,tip:'',bad:ipBad(0,'The next subnet starts at this one + the block size; subtract 1.')});
          fin({q:'Last usable = broadcast − 1.',kind:'ip',ans:f.answer,bad:ipBad(f.answer,'Subtract 1 from the broadcast.')});break;
        case 'gbc':fin({q:'Broadcast = the next subnet’s address − 1.',kind:'ip',ans:f.answer,bad:ipBad(f.answer,'One before the next subnet.')});break;
        case 'asg':fin({q:`Find subnet ${f.l.j} in your subnet table and write its subnet address.`,kind:'ip',ans:f.answer,bad:ipBad(f.answer,`Subnet ${f.l.j} = ${f.l.j} × ${blk}.`)});break;
        case 'aip':{const r=f.r,s=r.link.sub;st.push({q:`${r.dev}${r.role==='pc'||r.role==='sw'?'':' '+r.ifc} is on ${r.link.desc}. Which subnet number is that (from Step 2)?`,kind:'num',ans:r.link.j,tip:'',bad:()=>`Step 2 assigned the subnets in this order: ${links.map(l=>`${l.j} → ${l.desc.replace('the ','')}`).join(', ')}.`});
          fin({q:`${RULE[r.role]}. Subnet ${r.link.j} runs from ${ipStr(s.net)} to ${ipStr(s.bc)}. Write the address.`,kind:'ip',ans:f.answer,bad:ipBad(f.answer,`${RULE[r.role]}.`)});break;}
        case 'amask':fin({q:'Every subnet uses the new mask from Step 1f. Write it.',kind:'ip',ans:mask,bad:ipBad(mask,`${n} borrowed bits: 255.255.255.${256-blk}.`)});break;
        case 'agw':fin({q:`A device’s default gateway is the router interface on its LAN: ${f.r.link.rt} ${f.r.link.ifc}. Write that interface’s address.`,kind:'ip',ans:f.answer,tip:'Routers don’t get a default gateway in the table (write N/A); switches and PCs use their router’s LAN address.',bad:ipBad(f.answer,'The router takes the first usable address on the LAN.')});break;
      }});
    return st;};
  // ---------- worked answers ----------
  const subTable=`<table class="sol chartsol"><tr><th>Subnet</th><th>Subnet address</th><th>First usable</th><th>Last usable</th><th>Broadcast</th></tr>${subs.map(s=>`<tr><td>${s.k}</td><td class="mono">${ipStr(s.net)}</td><td class="mono">${ipStr(s.first)}</td><td class="mono">${ipStr(s.last)}</td><td class="mono">${ipStr(s.bc)}</td></tr>`).join('')}</table>`;
  const addrTable=(rs)=>`<table class="sol chartsol"><tr><th>Device</th><th>Interface</th><th>IP address</th><th>Subnet mask</th><th>Default gateway</th></tr>${rs.map(r=>`<tr><td>${r.dev}</td><td>${r.ifc}</td><td class="mono">${ipStr(r.ip)}</td><td class="mono">${ipStr(mask)}</td><td class="mono">${r.gw!=null?ipStr(r.gw):'N/A'}</td></tr>`).join('')}</table>`;
  const explain=[
    inc('subnet')?`<p><b>Step 1.</b> ${L.lans.length} LANs + 1 WAN link = <b>${L.need}</b> subnets → borrow <b>${n}</b> bits (2<sup>${n}</sup> = ${nsub} ≥ ${L.need}) → <b>${nsub}</b> subnets of <b>${per}</b> usable hosts (2<sup>${8-n}</sup> − 2), which covers the ${L.hosts} each LAN needs. Mask <span class="mono">${bin8(256-blk)}</span> = <b class="mono">${ipStr(mask)}</b>, block size ${blk}.</p>${subTable}`:'',
    inc('table')?`<p><b>Steps 2–3.</b> ${links.map(l=>`Subnet ${l.j} → ${l.desc.replace('the ','')}`).join('; ')}. Routers take the first usable address on each LAN, R1 the first and R2 the last on the WAN link, switches the second usable, and PCs the last usable.</p>${addrTable(rows)}`:'',
    ''].join('');
  const scen=`You’re given <b class="big">${ipStr(base)}/24</b> to subnet for this network. Each LAN needs at least <b>${L.hosts}</b> addresses for its end devices, switch and router, and the link between R1 and R2 needs an address for each end.`;
  const given=part==='table'?'<p class="dim">Step 1 is done for you: your subnet table is below.</p>':'';
  const p2='';
  return {mode:'lab',layout:'lab',flowOnly:true,part,L,fields,title:`Packet Tracer lab${part!=='all'?` · ${LABPARTS[part]}`:''}`,
    prompt:`${scen}${topoSVG(L)}${given}${p2}`,mini:`${ipStr(base)}/24 · each LAN needs ${L.hosts} addresses`,
    diag,walk,explain,subTable,addrTable,
    hint:'Subnets needed = LANs + the WAN link → borrow the fewest bits n with 2ⁿ ≥ that → block size 256 ÷ 2ⁿ. Routers get the first usable address, switches the second, PCs the last; R2 takes the last on the WAN link.'};
}
function printLabHTML(q,num,key){
  const L=q.L,v=x=>key?ipStr(x):'',blank=x=>key?`<b>${x}</b>`:'<span class="pp-line"></span>';
  const bitsRow=(o,show)=>[...bin8(o)].map(b=>`<td>${show?b:''}</td>`).join('');
  const used=[L.cr,L.swL.sw,L.pcL.pc],crl=L.lans.filter(l=>l.rt===L.cr);
  return `<section class="pp pp-lab"><div class="pp-head"><b>Lab ${num}</b><span class="pp-given">${ipStr(L.base)}/24</span></div>
    <p class="pp-intro">Subnet ${ipStr(L.base)}/24 for the network below. Each LAN needs at least ${L.hosts} addresses for its end devices, switch and router; the R1–R2 link needs an address for each end.</p>
    ${topoSVG(L)}
    <h4>Addressing Table</h4><table class="pp-chart pp-addr"><tr><th>Device</th><th>Interface</th><th>IP address</th><th>Subnet mask</th><th>Default gateway</th></tr>${L.rows.map(r=>`<tr><td>${r.dev}</td><td>${r.ifc}</td><td>${v(r.ip)}</td><td>${v(L.mask)}</td><td>${key?(r.gw!=null?ipStr(r.gw):'N/A'):''}</td></tr>`).join('')}</table>
    <h4>Part 1 · Step 1: Subnet the network</h4>
    <ol class="pp-qs" type="a"><li>Based on the topology, how many subnets are needed? ${blank(L.need)}</li><li>How many bits must be borrowed? ${blank(L.n)}</li><li>How many subnets does this create? ${blank(L.nsub)}</li><li>How many usable hosts per subnet? ${blank(L.per)}</li>
    <li>Binary value of the first ${L.need} subnets (the first two are done):<table class="pp-chart pp-vgrid"><tr><th>Subnet</th><th>Network address</th>${[7,6,5,4,3,2,1,0].map(b=>`<th>Bit ${b}</th>`).join('')}</tr>${L.subs.slice(0,L.need).map(s=>`<tr><td>${s.k}</td><td>${P3(L.base)}${key||s.k<2?oct(s.net,3):''}</td>${bitsRow(oct(s.net,3),key||s.k<2)}</tr>`).join('')}</table></li>
    <li>New subnet mask:<table class="pp-chart pp-vgrid"><tr><th colspan="3">First three octets</th>${[7,6,5,4,3,2,1,0].map(b=>`<th>Bit ${b}</th>`).join('')}</tr><tr><td colspan="3">11111111.11111111.11111111</td>${bitsRow(256-L.blk,key)}</tr></table> Decimal: 255.255.255.${key?`<b>${256-L.blk}</b>`:'<span class="pp-line short"></span>'}</li>
    <li>Subnet table:<table class="pp-chart pp-addr"><tr><th>Subnet</th><th>Subnet address</th><th>First usable host</th><th>Last usable host</th><th>Broadcast</th></tr>${L.subs.map(s=>`<tr><td>${s.k}</td><td>${v(s.net)}</td><td>${v(s.first)}</td><td>${v(s.last)}</td><td>${v(s.bc)}</td></tr>`).join('')}</table></li></ol>
    <h4>Step 2: Assign the subnets</h4><ol class="pp-qs" type="a">${L.links.map(l=>`<li>Subnet ${l.j} → ${l.desc.replace('the ','')}: ${blank(ipStr(l.sub.net))}</li>`).join('')}</ol>
    <p class="pp-note">Step 3 rules: routers get the first usable address on their LANs and R1 the first on the WAN link; R2 gets the last usable on the WAN link; switches the second usable; PCs the last usable. Routers have no default gateway (N/A).</p>
    <p class="pp-note">Part 2: configure R1’s LAN interfaces, ${L.lans.filter(l=>l.rt==='R2')[0].sw}’s VLAN 1 and default gateway, and ${L.lans.filter(l=>l.rt==='R2').slice(-1)[0].pc}’s IP settings, then verify with ping.</p></section>`;
}


/* ---------------- 11.9.3 VLSM Design and Implementation ----------------
   Same topology as 11.7.5 (R1 and R2, two LANs each, a serial WAN link), but every LAN gets the smallest subnet
   that fits its own host count, biggest LAN first, and the WAN link a /30. Part 1 sizes the subnets, Part 2
   documents the subnet table and the Addressing Table (each interface with its own subnet's mask). Part 3, the
   configuration, is the "vlsm-scenario" task in content.js. */
const VLSMPARTS={all:'Parts 1–2',size:'Part 1: size the subnets',design:'Part 2: subnet table & addressing'};
const hostBits=H=>{let h=2;while(2**h-2<H)h++;return h;};
const maskOf=p=>p?(0xFFFFFFFF<<(32-p))>>>0:0;
const LANS4=[['R1','G0/0'],['R1','G0/1'],['R2','G0/0'],['R2','G0/1']];
function vlsmPlan(base,hosts){
  const lans=LANS4.map(([rt,ifc],i)=>{const H=hosts[i],h=hostBits(H);return {type:'lan',i,rt,ifc,sw:`S${i+1}`,pc:`PC${i+1}`,H,h,blk:2**h,p:32-h,mask:maskOf(32-h),desc:`${rt} ${ifc} LAN`};});
  const wan={type:'wan',rt:'R1',ifc:'S0/0/0',H:2,h:2,blk:4,p:30,mask:maskOf(30),desc:'R1–R2 WAN link'};
  const links=[...lans.slice().sort((a,b)=>b.H-a.H||a.i-b.i),wan];let at=base;
  links.forEach((l,r)=>{l.rank=r;l.net=at>>>0;l.first=l.net+1;l.last=l.net+l.blk-2;l.bc=l.net+l.blk-1;at+=l.blk;});
  const rows=[];
  ['R1','R2'].forEach(rt=>{lans.filter(l=>l.rt===rt).forEach(l=>rows.push({dev:rt,ifc:l.ifc,role:'rlan',link:l,ip:l.first}));
    rows.push({dev:rt,ifc:'S0/0/0',role:rt==='R1'?'r1wan':'r2wan',link:wan,ip:rt==='R1'?wan.first:wan.last});});
  lans.forEach(l=>rows.push({dev:l.sw,ifc:'VLAN 1',role:'sw',link:l,ip:l.first+1,gw:l.first}));
  lans.forEach(l=>rows.push({dev:l.pc,ifc:'NIC',role:'pc',link:l,ip:l.last,gw:l.first}));
  return {kind:'vlsm',base,hosts:hosts.slice(),lans,wan,links,rows,need:5,used:at-base,r1:2,r2:2};
}
const vlsmFits=hs=>hs.reduce((a,H)=>a+2**hostBits(H),0)+4<=256;
function vlsmFrom(netRaw,hostsRaw){
  const b=parseIP(String(netRaw||'').trim().replace(/\/24$/,''));
  if(b==null||oct(b,3)!==0)return {err:'The network must be a /24 that ends in .0, like 192.168.72.0.'};
  const a=oct(b,0);if(a===0||a===127||a>=224)return {err:'Use a normal unicast network (first octet 1–223, not 127).'};
  const hs=(Array.isArray(hostsRaw)?hostsRaw:String(hostsRaw||'').split(/[\s,]+/).filter(Boolean)).map(x=>String(x).trim());
  if(hs.length!==4||hs.some(x=>!/^\d{1,3}$/.test(x)||Number(x)<2))return {err:'Give each of the four LANs a whole number of hosts, at least 2.'};
  const H=hs.map(Number);
  if(!vlsmFits(H)){const need=H.reduce((s,x)=>s+2**hostBits(x),0)+4;return {err:`Those LANs need blocks of ${H.map(x=>2**hostBits(x)).join(' + ')} addresses, plus 4 for the WAN link: ${need}. A /24 only has 256. Use fewer hosts.`};}
  return {kind:'vlsm',base:ipStr(b),hosts:H};
}
function vlsmRandom(){
  for(;;){const hb=[...Array(4)].map(()=>R(3,7));if(hb.filter(h=>h===7).length>1)continue;
    const H=hb.map(h=>{const lo=2**(h-1)-1,hi=2**h-2,r=Math.random();return r<.25?hi:r<.45?lo:R(lo,hi);});
    if(new Set(H).size<4||!vlsmFits(H))continue;
    const r=Math.random();return {kind:'vlsm',base:r<.6?`192.168.${R(0,255)}.0`:r<.8?`10.${R(0,255)}.${R(0,255)}.0`:`172.${R(16,31)}.${R(0,255)}.0`,hosts:H};}
}
const cidr=(n,p)=>`${ipStr(n)}/${p}`;
function parseCIDR(v){const m=String(v||'').trim().match(/^(\S+?)\s*\/\s*(\d{1,2})$/);if(!m)return null;const ip=parseIP(m[1]),p=Number(m[2]);return ip==null||p>32?null:{ip,p};}
function genVlsmLab(fixed,part){
  part=VLSMPARTS[part]?part:'all';const fx=fixed||vlsmRandom();
  const L=vlsmPlan(parseIP(fx.base),fx.hosts),{base,lans,wan,links,rows}=L,P=a=>ipStr(a).replace(/\d+$/,'');
  const inc=k=>part==='all'||part===k,fields=[],add=f=>fields.push(f);
  const sorted=links.slice(0,4);
  if(inc('size')){
    add({key:'need',type:'num',label:'How many subnets are needed in the network topology?',where:'Part 1 · Step 1 · Subnets needed',answer:5});
    lans.forEach(l=>{const w=`Part 1 · Step 2 · ${l.desc} (${l.H} hosts)`;
      add({key:'vmask',l,type:'ip',pre:'255.255.255.',label:`Which subnet mask will accommodate the ${l.H} host addresses the ${l.desc} needs?`,where:w,answer:l.mask});
      add({key:'vuse',l,type:'num',label:'How many usable host addresses will this subnet support?',where:w,answer:l.blk-2});});
    add({key:'wmask',l:wan,type:'ip',pre:'255.255.255.',label:'Which subnet mask will accommodate the connection between R1 and R2?',where:'Part 1 · Step 2 · The R1–R2 link',answer:wan.mask});
  }
  if(inc('design')){
    links.forEach(l=>{const w=`Part 2 · Subnet Table · ${l.rank+1}. ${l.desc}`;
      add({key:'tnet',l,type:'cidr',pre:P(l.net),label:`${l.desc} (${l.type==='wan'?'2 hosts, the R1–R2 link':l.H+' hosts'}): network address/CIDR`,where:w,answer:{ip:l.net,p:l.p}});
      add({key:'tfirst',l,type:'ip',pre:P(l.first),label:`${l.desc}: first usable host address`,where:w,answer:l.first});
      add({key:'tbc',l,type:'ip',pre:P(l.bc),label:`${l.desc}: broadcast address`,where:w,answer:l.bc});});
    rows.forEach(r=>{const w=`Part 2 · Addressing Table · ${r.dev}${r.role==='sw'||r.role==='pc'?'':' '+r.ifc}`;
      add({key:'aip',r,type:'ip',pre:P(r.ip),label:`${r.dev} ${r.ifc} IP address`,where:w,answer:r.ip});
      if(r.dev==='R1'||r.dev==='R2')add({key:'amask',r,type:'ip',pre:'255.255.255.',label:`${r.dev} ${r.ifc} subnet mask`,where:w,answer:r.link.mask});
      if(r.gw!=null)add({key:'agw',r,type:'ip',pre:P(r.gw),label:`${r.dev} default gateway`,where:w,answer:r.gw});});
  }
  // ---------- feedback ----------
  const linkOf=u=>links.find(l=>u>=l.net&&u<=l.bc)||null;
  const posName=(u,l)=>u===l.net?'the network address':u===l.bc?'the broadcast address':u===l.first?'the first usable address':u===l.first+1?'the second usable address':u===l.last?'the last usable address':'a host address';
  const typo=(u,want)=>{const bad=[0,1,2].filter(k=>oct(u,k)!==oct(want,k));if(!bad.length)return null;
    return `Check for a typo: ${bad.map(k=>`octet ${k+1} should be ${oct(want,k)}, not ${oct(u,k)}`).join(', and ')}. Every address here starts ${M(P(want))}.`;};
  const RULE={rlan:'Routers take the first usable address on their LANs',r1wan:'R1 takes the first usable address on the WAN link',r2wan:'R2 takes the last usable address on the WAN link (R1 already has the first)',sw:'Switches take the second usable address (the router has the first)',pc:'PCs take the last usable address'};
  const sizeHow=l=>l.type==='wan'?`A point-to-point link needs 2 addresses. 2 host bits give 2<sup>2</sup> − 2 = 2 usable, so it’s a /30: ${G(ipStr(l.mask))}.`
    :`The smallest h with 2<sup>h</sup> − 2 ≥ ${l.H} is h = ${G(l.h)} (2<sup>${l.h}</sup> − 2 = ${G(l.blk-2)}). That’s a /${l.p}, mask ${G(ipStr(l.mask))}.`;
  const maskName=o=>{const p=[0,128,192,224,240,248,252,254,255].indexOf(o);return p>=0?`/${24+p}`:null;};
  function dMask(f,v){
    const l=f.l,u=parseIP(v),how=sizeHow(l);if(u===l.mask)return null;
    if(u==null){if(/^\s*\/\d+\s*$/.test(String(v))||/\/\d+/.test(String(v)))return `Write the mask in dotted decimal, like 255.255.255.224, not as a /prefix. ${how}`;return badEntry(v,'ip')+' '+how;}
    if(oct(u,0)!==255||oct(u,1)!==255||oct(u,2)!==255)return `Each subnet is carved out of a /24, so the first three octets stay 255. ${how}`;
    const o=oct(u,3),nm=maskName(o);if(!nm)return `${o} can’t be a mask octet (they’re 128, 192, 224, 240, 248, 252 or 254). ${how}`;
    const uh=8-[0,128,192,224,240,248,252,254,255].indexOf(o);
    if(o===l.blk||o===l.blk-2||o===l.H)return `That’s ${o===l.blk?'the block size':'a host count'}, not a mask. The mask octet is 256 − the block size. ${how}`;
    if(l.type==='wan'){if(uh<2)return `A /31 or /32 leaves no usable host addresses in this course’s rules (2<sup>h</sup> − 2). ${how}`;return `That fits, but it wastes addresses. Point-to-point links use the smallest subnet that holds 2 hosts. ${how}`;}
    if(uh<l.h&&2**uh>=l.H)return `${nm} gives 2<sup>${uh}</sup> = ${2**uh} addresses, but the network and broadcast take 2, so only ${2**uh-2} hosts fit, fewer than ${l.H}. ${how}`;
    if(uh<l.h)return `${nm} only holds 2<sup>${uh}</sup> − 2 = ${Math.max(0,2**uh-2)} hosts, fewer than ${l.H}. ${how}`;
    return `${nm} fits ${l.H} hosts, but it’s bigger than needed. VLSM gives each LAN the <b>smallest</b> subnet that fits, so no addresses are wasted. ${how}`;
  }
  function dNum(f,v){
    const u=toNum(v);if(u===f.answer)return null;if(u==null)return 'Type a whole number.';
    if(f.key==='need'){const how=`Each of the 4 LANs is one subnet, and the R1–R2 link is one more: 4 + 1 = ${G(5)}.`;
      if(u===4)return `You counted the LANs, but the serial link between R1 and R2 needs its own subnet too. ${how}`;
      if(u===6)return `The R1–R2 link is a single subnet, even though it has two ends. ${how}`;
      return `Count networks, not devices. ${how}`;}
    const l=f.l,how=`${l.h} host bits: 2<sup>${l.h}</sup> − 2 = ${G(l.blk-2)} usable addresses.`;
    if(u===l.blk)return `2<sup>${l.h}</sup> = ${l.blk} counts every address, but the network and broadcast addresses can’t go to hosts: subtract 2. ${how}`;
    if(u===l.H)return `${l.H} is what the LAN needs. The question asks what the subnet supports, which is usually a bit more. ${how}`;
    return how;
  }
  function dCidr(f,v){
    const l=f.l,c=parseCIDR(v),want=`${G(cidr(l.net,l.p))}`;if(c&&c.ip===l.net&&c.p===l.p)return null;
    const prev=links[l.rank-1];
    const how=l.rank===0?`The biggest LAN goes first, at the start of the /24: ${want}.`
      :`It starts right after ${prev.desc} ends: ${ipStr(prev.bc)} + 1 = ${want} (the /${l.p} comes from its mask${l.type==='wan'?', /30 for the link':''}).`;
    if(!c){const ip=parseIP(v);if(ip!=null)return `Add the prefix length after a slash, like ${M(ipStr(ip)+'/'+l.p)}. ${how}`;return `Write it as an address, a slash and the prefix length, like ${M('192.168.1.0/26')}. ${how}`;}
    const ty=typo(c.ip,l.net);if(ty)return ty;
    if(c.ip===l.net)return `The address is right. The prefix should match this subnet’s mask, ${ipStr(l.mask)} = /${l.p}. ${how}`;
    const other=links.find(x=>x.net===c.ip&&x!==l);
    if(l.rank>0&&c.ip===sorted[0].net)return `That’s where the first subnet starts. VLSM lays the subnets out one after another, biggest first. ${how}`;
    if(other)return `That’s ${other.desc}’s network. The subnets go biggest first: ${links.map(x=>x.desc.replace(' LAN','')).join(', ')}. ${how}`;
    if(prev&&c.ip===prev.bc)return `That’s ${prev.desc}’s broadcast address. Add 1. ${how}`;
    if(prev&&c.ip===prev.net+l.blk)return `Each subnet starts where the previous one ends, so add the <b>previous</b> subnet’s block size (${prev.blk}), not this one’s. ${how}`;
    return how;
  }
  function dIP(f,v){
    if(f.key==='vmask'||f.key==='wmask')return dMask(f,v);
    const u=parseIP(v);if(u===f.answer)return null;
    if(f.key==='amask'){const l=f.r.link,how=`${f.r.dev} ${f.r.ifc} is on the ${l.desc}, a /${l.p}: ${G(ipStr(l.mask))}.`;
      if(u==null)return badEntry(v,'ip')+' '+how;const o=links.find(x=>x.mask===u);
      if(o)return `${ipStr(u)} is the ${o.desc}’s mask. With VLSM each interface uses the mask of its own subnet. ${how}`;return how;}
    if(u==null)return badEntry(v,'ip');
    {const ty=typo(u,f.answer);if(ty)return ty;}
    const k=linkOf(u);
    switch(f.key){
      case 'tfirst':return `First usable = network address + 1 = ${G(ipStr(f.answer))}.${u===f.l.net?' The network address itself can’t go to a host.':''}`;
      case 'tbc':{const how=`Broadcast = network + this subnet’s block size (${f.l.blk}) − 1 = ${G(ipStr(f.answer))}.`;
        if(u===f.l.bc+1)return `That’s where the next subnet starts. ${how}`;
        if(k&&k!==f.l)return `That’s inside the ${k.desc}. ${how}`;return how;}
      case 'aip':{const r=f.r,l=r.link,rule=`${RULE[r.role]}: ${G(ipStr(f.answer))}.`;
        if(k!==l)return `${ipStr(u)} is ${k?`in the ${k.desc}`:'outside every subnet'}, but ${r.dev}${r.role==='pc'||r.role==='sw'?'':' '+r.ifc} is on the ${l.desc} (${cidr(l.net,l.p)}). ${rule}`;
        if(r.role==='r2wan'&&u===l.first)return `R1 already has the first usable address on this link, so they’d clash. ${rule}`;
        if(u===l.net||u===l.bc)return `That’s ${posName(u,l)}, which no device can use. ${rule}`;
        return `That’s ${posName(u,l)} of the ${l.desc}. ${rule}`;}
      case 'agw':{const r=f.r,l=r.link,how=`The default gateway is the router’s interface on the same LAN, ${l.rt} ${l.ifc}: ${G(ipStr(f.answer))}.`;
        if(u===r.ip)return `A device can’t be its own gateway. ${how}`;
        if(r.role==='pc'&&u===l.first+1)return `That’s the switch. A switch only connects the LAN; the gateway is the router. ${how}`;
        if(k!==l)return `The gateway has to be on ${r.dev}’s own subnet. ${how}`;return how;}
    }
    return null;
  }
  const diag=x=>fields.map((f,i)=>{const v=x[i];if(f.type==='num')return dNum(f,v);if(f.type==='cidr')return dCidr(f,v);return dIP(f,v);});
  // ---------- hints ----------
  const walk=()=>{const st=[];
    fields.forEach((f,i)=>{const fin=o=>st.push(Object.assign({f:i,tip:''},o));
      switch(f.key){
        case 'need':st.push({q:'Count the LANs: each router port that leads to a switch and PC is one LAN. LANs = ?',tip:''});
          fin({q:'Every LAN needs a subnet, and so does the serial link between R1 and R2. Subnets needed = ?'});break;
        case 'vmask':st.push({q:`Find the smallest h (host bits) where 2<sup>h</sup> − 2 ≥ ${f.l.H}. Try 2<sup>${f.l.h-1}</sup> − 2 = ${2**(f.l.h-1)-2}: is that enough?`,tip:'2<sup>h</sup> − 2: 6, 14, 30, 62, 126.'});
          fin({q:`h = ${f.l.h}, so the prefix is 32 − ${f.l.h} = /${f.l.p}. Write the mask: the last octet is 256 − 2<sup>${f.l.h}</sup>.`,tip:'Mask ladder: /25 = 128, /26 = 192, /27 = 224, /28 = 240, /29 = 248, /30 = 252.'});break;
        case 'vuse':fin({q:`Usable hosts = 2<sup>${f.l.h}</sup> − 2 (no network or broadcast).`});break;
        case 'wmask':fin({q:'The R1–R2 link only needs 2 addresses, one per router. Which prefix gives exactly 2 usable?',tip:'2 host bits: 2<sup>2</sup> − 2 = 2, so /30.'});break;
        case 'tnet':if(f.l.rank===0)st.push({q:`Order the subnets biggest first: ${links.map(x=>`${x.desc} (${x.type==='wan'?2:x.H})`).join(', ')}.`,tip:''});
          fin({q:f.l.rank===0?`The biggest LAN starts at the beginning of the /24. Write it with its prefix, /${f.l.p}.`:`Start right after the ${links[f.l.rank-1].desc}: its broadcast + 1. Add this subnet’s prefix, /${f.l.p}.`});break;
        case 'tfirst':fin({q:'First usable = network address + 1.'});break;
        case 'tbc':fin({q:`Broadcast = network + the block size (2<sup>${f.l.h}</sup> = ${f.l.blk}) − 1.`});break;
        case 'aip':{const r=f.r,l=r.link;st.push({q:`${r.dev}${r.role==='pc'||r.role==='sw'?'':' '+r.ifc} is on the ${l.desc}. Find it in your subnet table: ${cidr(l.net,l.p)}.`,tip:''});
          fin({q:`${RULE[r.role]}. The ${l.desc} runs from ${ipStr(l.net)} to ${ipStr(l.bc)}. Write the address.`});break;}
        case 'amask':fin({q:`Each interface takes its own subnet’s mask. The ${f.r.link.desc} is a /${f.r.link.p}.`});break;
        case 'agw':fin({q:`A device’s default gateway is the router interface on its LAN: ${f.r.link.rt} ${f.r.link.ifc}. Write that interface’s address.`,tip:'Routers don’t get a default gateway in the table (N/A).'});break;
      }});
    return st;};
  // ---------- worked answers, tables, printout ----------
  const sizeTable=`<table class="sol chartsol"><tr><th>Subnet</th><th>Hosts needed</th><th>Host bits</th><th>Mask</th><th>Usable</th></tr>${[...lans,wan].map(l=>`<tr><td>${l.desc}</td><td>${l.type==='wan'?2:l.H}</td><td>${l.h}</td><td class="mono">${ipStr(l.mask)} (/${l.p})</td><td>${l.blk-2}</td></tr>`).join('')}</table>`;
  const subTable=`<table class="sol chartsol"><tr><th>Subnet</th><th>Hosts</th><th>Network/CIDR</th><th>First usable</th><th>Broadcast</th></tr>${links.map(l=>`<tr><td>${l.desc}</td><td>${l.type==='wan'?2:l.H}</td><td class="mono">${cidr(l.net,l.p)}</td><td class="mono">${ipStr(l.first)}</td><td class="mono">${ipStr(l.bc)}</td></tr>`).join('')}</table>`;
  const addrTable=rs=>`<table class="sol chartsol"><tr><th>Device</th><th>Interface</th><th>IP address</th><th>Subnet mask</th><th>Default gateway</th></tr>${rs.map(r=>`<tr><td>${r.dev}</td><td>${r.ifc}</td><td class="mono">${ipStr(r.ip)}</td><td class="mono">${ipStr(r.link.mask)}</td><td class="mono">${r.gw!=null?ipStr(r.gw):'N/A'}</td></tr>`).join('')}</table>`;
  const explain=[
    inc('size')?`<p><b>Part 1.</b> 4 LANs + the R1–R2 link = <b>5</b> subnets. Each one gets the smallest block that fits its hosts (2<sup>h</sup> − 2 ≥ hosts), and the link gets a /30.</p>${sizeTable}`:'',
    inc('design')?`<p><b>Part 2.</b> Biggest first, each subnet starting right after the last one’s broadcast. Routers take the first usable address on each LAN, R1 the first and R2 the last on the link, switches the second usable, and PCs the last usable. Each interface uses its own subnet’s mask.</p>${subTable}${addrTable(rows)}`:''].join('');
  const req=`<ul class="lab-req">${lans.map(l=>`<li>The <b>${l.desc}</b> will require <b>${l.H}</b> host IP addresses</li>`).join('')}</ul>`;
  const scen=`Design a VLSM addressing scheme for <b class="big">${ipStr(base)}/24</b>. ${req}`;
  const given=part==='design'?`<details class="fs-ref" open><summary>Part 1, done for you</summary><div class="tablewrap">${sizeTable}</div></details>`:'';
  // the tables beside the questions, filling in as they're answered
  function sheet(ctx){
    const {end,cur,miss,justDone,ipCell}=ctx,cls=j=>`${miss[j]?' miss':''}${j===justDone?' pop':''}`,done=j=>j<end;
    const val=j=>{const g=fields[j];return g.type==='ip'?ipCell(g.answer):g.type==='cidr'?`${ipCell(g.answer.ip)}<span class="dim">/${g.answer.p}</span>`:String(g.answer);};
    const cell=j=>j==null?'':done(j)?`<span class="fs-cv${cls(j)}">${val(j)}</span>`:j===cur?'<span class="fs-cur">?</span>':'';
    const find=(key,pred)=>{const j=fields.findIndex(g=>g.key===key&&pred(g));return j<0?null:j;};
    const key=(fields[cur<0?fields.length-1:cur]||{}).key,out=[];
    if(inc('size')&&['need','vmask','vuse','wmask'].includes(key)){
      const nj=find('need',()=>true);
      out.push(`<div class="fs-sec">Part 1 · Sizing</div>${nj!=null&&done(nj)?`<div class="fs-row"><span>Subnets needed</span><b class="mono">5</b></div>`:''}<div class="tablewrap"><table class="fs-chart"><tr><th>Subnet</th><th>Hosts</th><th>Mask</th><th>Usable</th></tr>${[...lans,wan].map(l=>`<tr><td class="fs-rl">${l.desc.replace(' LAN','')}</td><td>${l.type==='wan'?2:l.H}</td><td>${cell(find(l.type==='wan'?'wmask':'vmask',g=>g.l===l))}</td><td>${l.type==='wan'?(done(find('wmask',()=>true)??1e9)?'<span class="fs-cv">2</span>':''):cell(find('vuse',g=>g.l===l))}</td></tr>`).join('')}</table></div>`);
    } else {
      if(part==='design')out.push(given);
      const shown=links.filter(l=>{const j=find('tnet',g=>g.l===l);return j!=null&&j<=Math.max(end-1,cur);});
      if(shown.length)out.push(`<div class="fs-sec">Subnet Table</div><div class="tablewrap"><table class="fs-chart"><tr><th>Subnet</th><th>Network/CIDR</th><th>First usable</th><th>Broadcast</th></tr>${shown.map(l=>`<tr><td class="fs-rl">${l.desc.replace(' LAN','')}</td><td>${cell(find('tnet',g=>g.l===l))}</td><td>${cell(find('tfirst',g=>g.l===l))}</td><td>${cell(find('tbc',g=>g.l===l))}</td></tr>`).join('')}</table></div>`);
      const rs=rows.filter(r=>{const j=find('aip',g=>g.r===r);return j!=null&&j<=Math.max(end-1,cur);});
      if(rs.length)out.push(`<div class="fs-sec">Addressing Table</div><div class="tablewrap"><table class="fs-chart"><tr><th>Device</th><th>Interface</th><th>IP</th><th>Mask</th><th>Gateway</th></tr>${rs.map(r=>{const mj=find('amask',g=>g.r===r),gj=find('agw',g=>g.r===r),aj=find('aip',g=>g.r===r);
        const m=mj!=null?cell(mj):done(aj)?`<span class="fs-cv">${ipCell(r.link.mask)}</span>`:'';
        return `<tr><td class="fs-rl">${r.dev}</td><td>${r.ifc}</td><td>${cell(aj)}</td><td>${m}</td><td>${gj!=null?cell(gj):'<span class="dim">N/A</span>'}</td></tr>`;}).join('')}</table></div>`);
    }
    return out.length?`<div class="fsheet">${out.join('')}</div>`:'';
  }
  return {kind:'vlsm',part,L,fields,title:`11.9.3 VLSM Design${part!=='all'?` · ${VLSMPARTS[part]}`:''}`,prompt:`${scen}${topoSVG(L)}`,
    mini:`${ipStr(base)}/24 · LANs of ${lans.map(l=>l.H).join(', ')}`,diag,walk,explain,sheet,subTable,addrTable,sizeTable,
    params:{vlsm:ipStr(base),hosts:lans.map(l=>l.H).join(',')}};
}
function printVlsmHTML(q,num,key){
  const L=q.L,v=x=>key?ipStr(x):'',blank=x=>key?`<b>${x}</b>`:'<span class="pp-line"></span>';
  return `<section class="pp pp-lab"><div class="pp-head"><b>Lab ${num}</b><span class="pp-given">${ipStr(L.base)}/24</span></div>
    <p class="pp-intro">Design a VLSM addressing scheme for ${ipStr(L.base)}/24. ${L.lans.map(l=>`The ${l.desc} will require ${l.H} host IP addresses.`).join(' ')}</p>
    ${topoSVG(L)}
    <h4>Part 1 · Step 1: Determine the number of subnets</h4><ol class="pp-qs" type="a"><li>How many subnets are needed? ${blank(5)}</li></ol>
    <h4>Step 2: Determine the subnet mask for each subnet</h4><ol class="pp-qs" type="a">${L.lans.map(l=>`<li>${l.desc} (${l.H} hosts): mask ${blank(ipStr(l.mask))} &nbsp; usable hosts ${blank(l.blk-2)}</li>`).join('')}<li>R1–R2 link: mask ${blank(ipStr(L.wan.mask))}</li></ol>
    <h4>Part 2 · Subnet Table (biggest first)</h4><table class="pp-chart pp-addr"><tr><th>Subnet description</th><th>Hosts needed</th><th>Network address/CIDR</th><th>First usable host</th><th>Broadcast address</th></tr>${L.links.map(l=>`<tr><td>${key?l.desc:''}</td><td>${key?(l.type==='wan'?2:l.H):''}</td><td>${key?cidr(l.net,l.p):''}</td><td>${v(l.first)}</td><td>${v(l.bc)}</td></tr>`).join('')}</table>
    <h4>Addressing Table</h4><table class="pp-chart pp-addr"><tr><th>Device</th><th>Interface</th><th>IP address</th><th>Subnet mask</th><th>Default gateway</th></tr>${L.rows.map(r=>`<tr><td>${r.dev}</td><td>${r.ifc}</td><td>${v(r.ip)}</td><td>${v(r.link.mask)}</td><td>${key?(r.gw!=null?ipStr(r.gw):'N/A'):''}</td></tr>`).join('')}</table>
    <p class="pp-note">Rules: R1 takes the first usable address on its LANs and the WAN link; R2 the first on its LANs and the last on the WAN link; switches the second usable; PCs the last usable.</p>
    <p class="pp-note">Part 3: configure R1’s LAN interfaces, S3’s VLAN 1 and default gateway, and PC4’s IP settings, then verify with ping.</p></section>`;
}

/* ---------------- 11.5.5 Subnet an IPv4 Network ----------------
   One router (CustomerRouter) with two LANs. Subnet a /24 with ONE mask that fits the largest LAN and leaves spare
   subnets for growth: compare the masks /25–/30, pick the one that meets both, list the subnets, then fill in the
   Addressing Table. Part 2 (configure and test) is the "subnet-ipv4" task in content.js. */
const SUBPARTS={all:'Part 1',design:'Step 1: subnetting scheme',table:'Step 2: Addressing Table'};
const ONES=['The network portion','The host portion','The broadcast address','The default gateway'];
const MASKS=[25,26,27,28,29,30];
function subPlan(base,a,b,spare){
  const need=2+spare;let n=1;while(2**n<need)n++;const p=24+n,blk=2**(8-n),mask=maskOf(p);
  const subs=[...Array(2**n)].map((_,k)=>{const net=(base+k*blk)>>>0;return {k,net,first:net+1,last:net+blk-2,bc:net+blk-1};});
  const lans=[{name:'LAN-A',H:a,ifc:'G0/0',sw:'LAN-A Switch',pc:'PC-A',sub:subs[0]},{name:'LAN-B',H:b,ifc:'G0/1',sw:'LAN-B Switch',pc:'PC-B',sub:subs[1]}];
  const rows=[];lans.forEach(l=>rows.push({dev:'CustomerRouter',ifc:l.ifc,role:'rlan',link:l,ip:l.sub.first}));
  lans.forEach(l=>rows.push({dev:l.sw,ifc:'VLAN 1',role:'sw',link:l,ip:l.sub.first+1,gw:l.sub.first}));
  lans.forEach(l=>rows.push({dev:l.pc,ifc:'NIC',role:'pc',link:l,ip:l.sub.last,gw:l.sub.first}));
  const fitsH=MASKS.filter(q=>2**(32-q)-2>=a),fitsS=MASKS.filter(q=>2**(q-24)>=need);
  return {kind:'sub',base,a,b,spare,need,n,p,blk,mask,subs,lans,rows,fitsH,fitsS};
}
// exactly one mask meets both needs: the most hosts it can give still covers LAN-A, and it just makes enough subnets
function subFits(a,b,spare){if(!(a>=2&&b>=2&&spare>=1&&a>=b))return false;const need=2+spare;let n=1;while(2**n<need)n++;const p=24+n;return p<=30&&2**(32-p)-2>=a&&(p===30||2**(32-p-1)-2<a);}
function subFrom(netRaw,aRaw,bRaw,spareRaw){
  const b0=parseIP(String(netRaw||'').trim().replace(/\/24$/,''));
  if(b0==null||oct(b0,3)!==0)return {err:'The network must be a /24 that ends in .0, like 192.168.0.0.'};
  const f=oct(b0,0);if(f===0||f===127||f>=224)return {err:'Use a normal unicast network (first octet 1–223, not 127).'};
  const [a,b,s]=[aRaw,bRaw,spareRaw].map(x=>String(x||'').trim());
  if(![a,b,s].every(x=>/^\d{1,3}$/.test(x)))return {err:'Hosts for LAN-A and LAN-B, and the spare subnets, must be whole numbers.'};
  const A=Number(a),B=Number(b),S=Number(s);
  if(A<2||B<2)return {err:'Each LAN needs at least 2 hosts.'};if(B>A)return {err:'LAN-A is the larger LAN: give it at least as many hosts as LAN-B.'};
  if(S<1||S>14)return {err:'Spare subnets: 1 to 14.'};
  const need=2+S;let n=1;while(2**n<need)n++;const p=24+n,per=2**(32-p)-2;
  if(p>30||per<A)return {err:`${need} subnets means a /${p}, which gives ${Math.max(0,per)} hosts per subnet: not enough for ${A}. Use fewer hosts or fewer spare subnets.`};
  if(!subFits(A,B,S))return {err:`More than one mask would fit (a /${p} works, but so does a longer prefix, since ${A} hosts would also fit a /${p+1}). Like the handout, the lab needs exactly one mask: use more hosts on LAN-A, or more spare subnets.`};
  return {kind:'sub',base:ipStr(b0),a:A,b:B,spare:S};
}
function subRandom(){
  for(;;){const n=R(2,3),need=R(2**(n-1)+1,2**n),spare=need-2,p=24+n,hi=2**(32-p)-2,lo=2**(32-p-1)-1,a=R(lo,hi),b=R(Math.max(2,Math.floor(a*.5)),a-1);
    if(subFits(a,b,spare)){const r=Math.random();return {kind:'sub',base:r<.6?`192.168.${R(0,255)}.0`:`10.${R(0,255)}.${R(0,255)}.0`,a,b,spare};}}
}
const multiSet=v=>new Set(String(v||'').split(/[,\s]+/).map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/^\//,'')));
function genSubLab(fixed,part){
  part=SUBPARTS[part]?part:'all';const fx=fixed&&fixed.base?fixed:subRandom();
  const L=subPlan(parseIP(fx.base),fx.a,fx.b,fx.spare),{base,need,n,p,blk,mask,subs,lans,rows}=L,P=a=>ipStr(a).replace(/\d+$/,'');
  const inc=k=>part==='all'||part===k,fields=[],add=f=>fields.push(f);
  if(inc('design')){
    const w='Step 1 · The requirements';
    add({key:'big',type:'num',label:'How many host addresses are needed in the largest required subnet?',where:w,answer:L.a});
    add({key:'need',type:'num',label:'What is the minimum number of subnets required?',where:w,answer:need});
    add({key:'bin24',type:'bin32',label:`The network you’re subnetting is ${ipStr(base)}/24. What is the /24 subnet mask in binary?`,where:'Step 1 · The mask in binary',answer:'11111111.11111111.11111111.00000000'});
    add({key:'ones',type:'choice',options:ONES,label:'In the network mask, what do the ones represent?',where:'Step 1 · The mask in binary',answer:ONES[0]});
    add({key:'zeros',type:'choice',options:ONES,label:'In the network mask, what do the zeros represent?',where:'Step 1 · The mask in binary',answer:ONES[1]});
    MASKS.forEach(q=>{const w=`Step 1 · The possible masks · /${q}`;
      add({key:'tdec',q,type:'ip',pre:'255.255.255.',label:`(/${q}) ${'1'.repeat(24).replace(/(.{8})(?=.)/g,'$1.')}.${'1'.repeat(q-24)}${'0'.repeat(32-q)}: dotted decimal mask`,where:w,answer:maskOf(q)});
      add({key:'tsub',q,type:'num',label:`/${q}: number of subnets?`,where:w,answer:2**(q-24)});
      add({key:'thost',q,type:'num',label:`/${q}: number of hosts per subnet?`,where:w,answer:2**(32-q)-2});});
    const opts=MASKS.map(q=>`/${q}`);
    add({key:'mhost',type:'multi',options:opts,label:`Which subnet masks meet the required minimum of ${L.a} host addresses?`,where:'Step 1 · Choose the mask',answer:L.fitsH.map(q=>'/'+q)});
    add({key:'msub',type:'multi',options:opts,label:`Which subnet masks meet the minimum of ${need} subnets?`,where:'Step 1 · Choose the mask',answer:L.fitsS.map(q=>'/'+q)});
    add({key:'mboth',type:'choice',options:opts,label:'Which subnet mask meets both requirements?',where:'Step 1 · Choose the mask',answer:'/'+p});
    subs.forEach(s=>add({key:'snet',k:s.k,type:'ip',pre:P(s.net),label:`Subnet ${s.k+1} address (/${p}, ${ipStr(mask)})`,where:'Step 1 · List the subnets',answer:s.net}));
  }
  if(inc('table')){
    rows.forEach((r,i)=>{const w=`Step 2 · Addressing Table · ${r.dev}${r.role==='rlan'?' '+r.ifc:''}`;
      add({key:'aip',r,type:'ip',pre:P(r.ip),label:`${r.dev} ${r.ifc} IP address`,where:w,answer:r.ip});
      if(i===0)add({key:'amask',r,type:'ip',pre:'255.255.255.',label:'Subnet mask (the same on every device)',where:w,answer:mask});
      if(r.gw!=null)add({key:'agw',r,type:'ip',pre:P(r.gw),label:`${r.dev} default gateway`,where:w,answer:r.gw});});
  }
  // ---------- feedback ----------
  const RULE={rlan:'The router takes the first host address on each LAN',sw:'The switch takes the second host address',pc:'The PC takes the last host address'};
  const typo=(u,want)=>{const bad=[0,1,2].filter(k=>oct(u,k)!==oct(want,k));if(!bad.length)return null;return `Check for a typo: ${bad.map(k=>`octet ${k+1} should be ${oct(want,k)}, not ${oct(u,k)}`).join(', and ')}. Every address here starts ${M(P(want))}.`;};
  const subOf=u=>{const d=(u-base)>>>0;return d<256?Math.floor(d/blk):-1;};
  function dNum(f,v){const u=toNum(v);if(u===f.answer)return null;if(u==null)return 'Type a whole number.';
    switch(f.key){
      case 'big':return u===L.b?`That’s LAN-B. The largest required subnet is LAN-A: ${G(L.a)} hosts.`:`LAN-A is the largest LAN: ${G(L.a)} hosts.`;
      case 'need':{const how=`LAN-A, LAN-B and ${L.spare} spare subnet${L.spare>1?'s':''} for growth: 2 + ${L.spare} = ${G(need)}.`;
        if(u===2)return `Those are the LANs you need now. The scenario also asks for spare subnets for future expansion. ${how}`;
        if(u===L.spare)return `Add the two LANs you need now. ${how}`;
        if(u===2**n)return `That’s how many subnets the mask makes. The question asks for the minimum you need. ${how}`;return how;}
      case 'tsub':{const k=f.q-24,how=`/${f.q} borrows ${k} bit${k>1?'s':''} past the /24: 2<sup>${k}</sup> = ${G(2**k)} subnets.`;
        if(u===2**k-2)return `No − 2 for subnets, only for hosts. ${how}`;if(u===2**(32-f.q)||u===2**(32-f.q)-2)return `That’s from the host bits. Subnets come from the borrowed bits. ${how}`;if(u===k)return `${k} is the number of borrowed bits. ${how}`;return how;}
      case 'thost':{const h=32-f.q,how=`/${f.q} leaves ${h} host bits: 2<sup>${h}</sup> − 2 = ${G(2**h-2)}.`;
        if(u===2**h)return `Subtract 2 for the network and broadcast addresses. ${how}`;if(u===2**(f.q-24))return `That’s the number of subnets. Hosts come from the bits left over. ${how}`;return how;}
    }return null;}
  function dIP(f,v){const u=parseIP(v);if(u===f.answer)return null;
    if(f.key==='tdec'||f.key==='amask'){const q=f.key==='amask'?p:f.q,how=`/${q} = ${q-24} ones in the 4th octet: ${[128,64,32,16,8,4,2,1].slice(0,q-24).join(' + ')} = ${G(256-2**(32-q))}, so ${G(ipStr(maskOf(q)))}.`;
      if(u==null)return badEntry(v,'ip')+' '+how;if(f.key==='amask'&&maskOf(32-0)&&MASKS.some(m=>maskOf(m)===u))return `That’s the /${MASKS.find(m=>maskOf(m)===u)} mask. Every device here uses the mask you chose: /${p}. ${how}`;
      if(oct(u,3)===2**(32-q))return `${oct(u,3)} is the block size, not the mask. ${how}`;return how;}
    if(u==null)return badEntry(v,'ip');{const ty=typo(u,f.answer);if(ty)return ty;}
    const k=subOf(u);
    if(f.key==='snet'){const how=`The block size is 256 − ${256-blk} = ${blk}, so subnet ${f.k+1} starts at ${f.k} × ${blk} = .${G(oct(f.answer,3))}.`;
      if(f.k===0&&u!==base)return `The first subnet starts at the network you were given. ${how}`;if(oct(u,3)===f.k+1||oct(u,3)===f.k)return `That’s the subnet number. Write its address. ${how}`;return how;}
    if(f.key==='aip'){const r=f.r,s=r.link.sub,rule=`${RULE[r.role]}: ${G(ipStr(f.answer))}.`;
      if(k!==s.k)return `${ipStr(u)} is in subnet ${k+1}, but ${r.dev} is on ${r.link.name}, which gets subnet ${s.k+1} (${ipStr(s.net)}). ${rule}`;
      if(u===s.net||u===s.bc)return `That’s the ${u===s.net?'subnet':'broadcast'} address, which no device can use. ${rule}`;return rule;}
    if(f.key==='agw'){const r=f.r,s=r.link.sub,how=`The default gateway is CustomerRouter’s interface on ${r.link.name}, ${r.link.ifc}: ${G(ipStr(f.answer))}.`;
      if(u===r.ip)return `A device can’t be its own gateway. ${how}`;if(r.role==='pc'&&u===s.first+1)return `That’s the switch. The gateway is the router. ${how}`;return how;}
    return null;}
  function dBin(f,v){const t=String(v||'').replace(/[\s.]/g,'');if(t===f.answer.replace(/\./g,''))return null;const how=`/24 = 24 ones, then 8 zeros: ${G(f.answer)}.`;
    if(!/^[01]+$/.test(t))return `Use only 1s and 0s (dots between the octets are optional). ${how}`;if(t.length!==32)return `That’s ${t.length} bits. A mask is 32: four groups of 8. ${how}`;
    if(t==='0'.repeat(24)+'1'.repeat(8))return `That’s backwards: the 1s come first. ${how}`;return how;}
  function dChoice(f,v){if(v===f.answer)return null;
    if(f.key==='ones')return v===ONES[1]?'That’s the zeros. The ones mark the <b>network</b> portion: the bits every device on the network shares.':'The ones mark the <b>network</b> portion of the address.';
    if(f.key==='zeros')return v===ONES[0]?'That’s the ones. The zeros mark the <b>host</b> portion: the bits that are different for each device.':'The zeros mark the <b>host</b> portion of the address.';
    if(f.key==='mboth'){const q=Number(String(v).replace('/',''));const how=`Only ${G('/'+p)} is in both lists: it fits ${L.a} hosts and makes ${2**n} ≥ ${need} subnets.`;
      if(L.fitsH.includes(q))return `/${q} fits the hosts, but makes only ${2**(q-24)} subnets. ${how}`;if(L.fitsS.includes(q))return `/${q} makes enough subnets, but only ${2**(32-q)-2} hosts each. ${how}`;return how;}
    return null;}
  function dMulti(f,v){const S=multiSet(v),want=new Set(f.answer.map(x=>x.slice(1)));if(S.size===want.size&&[...S].every(x=>want.has(x)))return null;
    const extra=[...S].filter(x=>!want.has(x)),miss=[...want].filter(x=>!S.has(x));
    const how=f.key==='mhost'?`A mask fits if 2<sup>host bits</sup> − 2 ≥ ${L.a}: check the hosts column of your table.`:`A mask fits if 2<sup>borrowed bits</sup> ≥ ${need}: check the subnets column of your table.`;
    if(!S.size)return `Pick every mask that works. ${how}`;
    if(extra.length)return `${extra.map(x=>'/'+x).join(', ')} ${extra.length>1?'don’t':'doesn’t'} work: ${extra.map(x=>f.key==='mhost'?`/${x} gives ${2**(32-x)-2} hosts`:`/${x} makes ${2**(x-24)} subnets`).join('; ')}. ${how}`;
    return `You missed ${miss.length>1?'some masks':'a mask'} that work${miss.length>1?'':'s'}. Every mask that meets the requirement counts. ${how}`;}
  const diag=x=>fields.map((f,i)=>{const v=x[i];if(f.type==='num')return dNum(f,v);if(f.type==='bin32')return dBin(f,v);if(f.type==='choice')return dChoice(f,v);if(f.type==='multi')return dMulti(f,v);return dIP(f,v);});
  // ---------- hints ----------
  const walk=()=>{const st=[];fields.forEach((f,i)=>{const fin=o=>st.push(Object.assign({f:i,tip:''},o));
    switch(f.key){
      case 'big':fin({q:`Compare the LANs: LAN-A needs ${L.a} hosts, LAN-B ${L.b}. Which is larger?`});break;
      case 'need':fin({q:'Count the LANs you need now, then add the spare subnets the scenario asks for.'});break;
      case 'bin24':fin({q:'/24 means 24 ones, then the rest zeros. Write all 32 bits in four groups of 8.'});break;
      case 'ones':case 'zeros':fin({q:'A mask splits an address in two: the bits the whole network shares, and the bits each device uses.'});break;
      case 'tdec':fin({q:`Add the place values of the 1s in the 4th octet (128, 64, 32, 16, 8, 4, 2, 1).`,tip:'Mask ladder: /25 = 128, /26 = 192, /27 = 224, /28 = 240, /29 = 248, /30 = 252.'});break;
      case 'tsub':fin({q:`Borrowed bits = ${f.q} − 24. Subnets = 2<sup>borrowed bits</sup>.`});break;
      case 'thost':fin({q:`Host bits = 32 − ${f.q}. Hosts = 2<sup>host bits</sup> − 2.`});break;
      case 'mhost':fin({q:`Look down your hosts column: pick every mask with at least ${L.a}.`});break;
      case 'msub':fin({q:`Look down your subnets column: pick every mask with at least ${need}.`});break;
      case 'mboth':fin({q:'Which mask is in both of your answers above?'});break;
      case 'snet':fin({q:f.k===0?'The first subnet starts at the network you were given.':`Each subnet starts ${blk} after the last one (256 − ${256-blk}).`});break;
      case 'aip':fin({q:`${f.r.dev} is on ${f.r.link.name}, subnet ${f.r.link.sub.k+1} (${ipStr(f.r.link.sub.net)} to ${ipStr(f.r.link.sub.bc)}). ${RULE[f.r.role]}.`});break;
      case 'amask':fin({q:`Every device uses the mask you chose in Step 1: /${p}.`});break;
      case 'agw':fin({q:`The gateway is CustomerRouter’s ${f.r.link.ifc}, the first host address on ${f.r.link.name}.`});break;
    }});return st;};
  // ---------- tables, worked answers ----------
  const maskTable=`<table class="sol chartsol"><tr><th>Prefix</th><th>Mask</th><th>Subnets</th><th>Hosts each</th><th>Fits ${L.a} hosts?</th><th>≥ ${need} subnets?</th></tr>${MASKS.map(q=>`<tr><td>/${q}</td><td class="mono">${ipStr(maskOf(q))}</td><td>${2**(q-24)}</td><td>${2**(32-q)-2}</td><td>${L.fitsH.includes(q)?'✓':''}</td><td>${L.fitsS.includes(q)?'✓':''}</td></tr>`).join('')}</table>`;
  const subTable=`<table class="sol chartsol"><tr><th>Subnet</th><th>Address</th><th>Prefix</th><th>Mask</th></tr>${subs.map(s=>`<tr><td>${s.k+1}</td><td class="mono">${ipStr(s.net)}</td><td>/${p}</td><td class="mono">${ipStr(mask)}</td></tr>`).join('')}</table>`;
  const addrTable=rs=>`<table class="sol chartsol"><tr><th>Device</th><th>Interface</th><th>IP address</th><th>Subnet mask</th><th>Default gateway</th></tr>${rs.map(r=>`<tr><td>${r.dev}</td><td>${r.ifc}</td><td class="mono">${ipStr(r.ip)}</td><td class="mono">${ipStr(mask)}</td><td class="mono">${r.gw!=null?ipStr(r.gw):'N/A'}</td></tr>`).join('')}</table>`;
  const explain=[inc('design')?`<p><b>Step 1.</b> Largest LAN: <b>${L.a}</b> hosts. Subnets: 2 LANs + ${L.spare} spare = <b>${need}</b>. Only <b>/${p}</b> (${ipStr(mask)}) meets both.</p>${maskTable}${subTable}`:'',
    inc('table')?`<p><b>Step 2.</b> LAN-A gets the first subnet and LAN-B the second. The router takes the first host address, the switch the second, the PC the last.</p>${addrTable(rows)}`:''].join('');
  const scen=`You’re installing a network for a customer. Subnet <b class="big">${ipStr(base)}/24</b> with one mask for every subnet:<ul class="lab-req"><li><b>LAN-A</b> needs at least <b>${L.a}</b> host addresses</li><li><b>LAN-B</b> needs at least <b>${L.b}</b> host addresses</li><li>at least <b>${L.spare}</b> more subnet${L.spare>1?'s':''}, unused, for future expansion</li></ul>`;
  const topo=`<svg class="topo" viewBox="0 0 640 170" role="img" aria-label="Topology: CustomerRouter G0/0 to LAN-A Switch and PC-A, G0/1 to LAN-B Switch and PC-B, S0/1/0 to the ISP">
    <line class="tl wan" x1="320" y1="34" x2="560" y2="34"/><text class="tt" x="350" y="26">S0/1/0</text><rect class="tpc" x="540" y="20" width="80" height="28" rx="4"/><text class="tn" x="580" y="39" text-anchor="middle">ISP</text>
    <line class="tl" x1="320" y1="34" x2="170" y2="100"/><line class="tl" x1="320" y1="34" x2="470" y2="100"/>
    <text class="tt" x="236" y="60" text-anchor="end">G0/0</text><text class="tt" x="404" y="60">G0/1</text>
    <rect class="tsw" x="110" y="88" width="120" height="24" rx="4"/><text class="tn" x="170" y="104" text-anchor="middle">LAN-A Switch</text>
    <rect class="tsw" x="410" y="88" width="120" height="24" rx="4"/><text class="tn" x="470" y="104" text-anchor="middle">LAN-B Switch</text>
    <line class="tl" x1="170" y1="112" x2="170" y2="138"/><line class="tl" x1="470" y1="112" x2="470" y2="138"/>
    <rect class="tpc" x="140" y="138" width="60" height="26" rx="3"/><text class="tn" x="170" y="155" text-anchor="middle">PC-A</text>
    <rect class="tpc" x="440" y="138" width="60" height="26" rx="3"/><text class="tn" x="470" y="155" text-anchor="middle">PC-B</text>
    <circle class="trt" cx="320" cy="34" r="20"/><text class="tn" x="320" y="38" text-anchor="middle">R</text><text class="tn" x="294" y="20" text-anchor="end">CustomerRouter</text></svg>`;
  const given=part==='table'?`<details class="fs-ref" open><summary>Step 1, done for you</summary><div class="tablewrap">${subTable}</div></details>`:'';
  function sheet(ctx){
    const {end,cur,miss,justDone,ipCell}=ctx,done=j=>j<end,cls=j=>`${miss[j]?' miss':''}${j===justDone?' pop':''}`;
    const val=j=>{const g=fields[j];return g.type==='ip'?ipCell(g.answer):g.type==='multi'?g.answer.join(', '):String(g.answer);};
    const cell=j=>j==null?'':done(j)?`<span class="fs-cv${cls(j)}">${val(j)}</span>`:j===cur?'<span class="fs-cur">?</span>':'';
    const find=(key,pred)=>{const j=fields.findIndex(g=>g.key===key&&(!pred||pred(g)));return j<0?null:j;};
    const key=(fields[cur<0?fields.length-1:cur]||{}).key,out=[];
    if(inc('design')&&!['aip','amask','agw'].includes(key)){
      const top=['big','need','bin24','ones','zeros'].map(k=>find(k)).filter(j=>j!=null&&done(j));
      if(top.length)out.push(`<div class="fs-sec">Requirements</div>${top.map(j=>`<div class="fs-row${cls(j)}"><span>${{big:'Largest subnet',need:'Subnets needed',bin24:'/24 in binary',ones:'Ones',zeros:'Zeros'}[fields[j].key]}</span><b class="mono">${val(j)}</b></div>`).join('')}`);
      const t0=find('tdec');if(t0!=null&&t0<=Math.max(end-1,cur))out.push(`<div class="fs-sec">Possible masks</div><div class="tablewrap"><table class="fs-chart"><tr><th>Prefix</th><th>Mask</th><th>Subnets</th><th>Hosts</th></tr>${MASKS.map(q=>`<tr><td class="fs-rl">/${q}</td><td>${cell(find('tdec',g=>g.q===q))}</td><td>${cell(find('tsub',g=>g.q===q))}</td><td>${cell(find('thost',g=>g.q===q))}</td></tr>`).join('')}</table></div>`);
      const m=['mhost','msub','mboth'].map(k=>find(k)).filter(j=>j!=null&&j<=Math.max(end-1,cur));
      if(m.length)out.push(m.map(j=>`<div class="fs-row"><span>${{mhost:'Fit the hosts',msub:'Enough subnets',mboth:'Meets both'}[fields[j].key]}</span><b class="mono">${cell(j)}</b></div>`).join(''));
      const s0=find('snet');if(s0!=null&&s0<=Math.max(end-1,cur))out.push(`<div class="fs-sec">Subnets</div><div class="tablewrap"><table class="fs-chart"><tr><th>#</th><th>Address</th><th>Prefix</th></tr>${subs.map(s=>{const j=find('snet',g=>g.k===s.k);return j>Math.max(end-1,cur)?'':`<tr><td class="fs-rl">${s.k+1}</td><td>${cell(j)}</td><td>/${p}</td></tr>`;}).join('')}</table></div>`);
    } else {
      if(part==='table')out.push(given);
      const rs=rows.filter(r=>{const j=find('aip',g=>g.r===r);return j!=null&&j<=Math.max(end-1,cur);}),mj=find('amask');
      if(rs.length)out.push(`<div class="fs-sec">Addressing Table</div><div class="tablewrap"><table class="fs-chart"><tr><th>Device</th><th>Interface</th><th>IP</th><th>Mask</th><th>Gateway</th></tr>${rs.map(r=>{const gj=find('agw',g=>g.r===r);
        return `<tr><td class="fs-rl">${r.dev}</td><td>${r.ifc}</td><td>${cell(find('aip',g=>g.r===r))}</td><td>${mj!=null&&done(mj)?`<span class="fs-cv">${ipCell(mask)}</span>`:mj===cur?'<span class="fs-cur">?</span>':''}</td><td>${gj!=null?cell(gj):'<span class="dim">N/A</span>'}</td></tr>`;}).join('')}</table></div>`);
    }
    return out.length?`<div class="fsheet">${out.join('')}</div>`:'';
  }
  return {kind:'sub',part,L,fields,title:`11.5.5 Subnet an IPv4 Network${part!=='all'?` · ${SUBPARTS[part]}`:''}`,prompt:`${scen}${topo}`,
    diag,walk,explain,sheet,subTable,addrTable,maskTable,params:{subnet:ipStr(base),hosts:`${L.a},${L.b}`,spare:L.spare}};
}
function printSubHTML(q,num,key){
  const L=q.L,v=x=>key?ipStr(x):'',blank=x=>key?`<b>${x}</b>`:'<span class="pp-line"></span>';
  return `<section class="pp pp-lab"><div class="pp-head"><b>Lab ${num}</b><span class="pp-given">${ipStr(L.base)}/24</span></div>
    <p class="pp-intro">Subnet ${ipStr(L.base)}/24 with one mask: LAN-A needs at least ${L.a} hosts, LAN-B at least ${L.b}, plus at least ${L.spare} unused subnet${L.spare>1?'s':''} for future expansion.</p>
    <h4>Part 1 · Step 1: Subnetting scheme</h4><ol class="pp-qs" type="a"><li>Host addresses needed in the largest subnet: ${blank(L.a)}</li><li>Minimum number of subnets: ${blank(L.need)}</li>
    <li>/24 mask in binary: ${blank('11111111.11111111.11111111.00000000')}</li><li>The ones represent: ${blank('the network portion')} &nbsp; the zeros: ${blank('the host portion')}</li></ol>
    <table class="pp-chart pp-addr"><tr><th>Prefix</th><th>Dotted decimal</th><th>Subnets</th><th>Hosts</th></tr>${MASKS.map(m=>`<tr><td>/${m}</td><td>${key?ipStr(maskOf(m)):''}</td><td>${key?2**(m-24):''}</td><td>${key?2**(32-m)-2:''}</td></tr>`).join('')}</table>
    <ol class="pp-qs" type="a" start="5"><li>Masks that meet the hosts: ${blank(L.fitsH.map(x=>'/'+x).join(', '))}</li><li>Masks that meet the subnets: ${blank(L.fitsS.map(x=>'/'+x).join(', '))}</li><li>The mask that meets both: ${blank('/'+L.p)}</li></ol>
    <table class="pp-chart pp-addr"><tr><th>Subnet address</th><th>Prefix</th><th>Subnet mask</th></tr>${L.subs.map(s=>`<tr><td>${v(s.net)}</td><td>${key?'/'+L.p:''}</td><td>${v(L.mask)}</td></tr>`).join('')}</table>
    <h4>Step 2: Addressing Table</h4><table class="pp-chart pp-addr"><tr><th>Device</th><th>Interface</th><th>IP address</th><th>Subnet mask</th><th>Default gateway</th></tr>${L.rows.map(r=>`<tr><td>${r.dev}</td><td>${r.ifc}</td><td>${v(r.ip)}</td><td>${v(L.mask)}</td><td>${key?(r.gw!=null?ipStr(r.gw):'N/A'):''}</td></tr>`).join('')}</table>
    <p class="pp-note">Rules: LAN-A gets the first subnet, LAN-B the second. The router takes the first host address, the switch the second, the PC the last.</p>
    <p class="pp-note">Part 2: on CustomerRouter set the enable secret Class123, console password Cisco123 and hostname, address and enable G0/0 and G0/1, and save. Address both switches’ VLAN 1 with a default gateway, and both PCs. Part 3: ping each PC’s gateway, then PC-A to PC-B.</p></section>`;
}

// typed answers: an IP field shows its first three octets, so a bare last octet (".33" or "33") is enough
function expand(f,raw){if(!f||!f.pre||raw==null)return raw;
  if(f.type==='cidr'){const m=String(raw).trim().match(/^\.?(\d{1,3})(\s*\/\s*\d{1,2})?$/);return m?f.pre+m[1]+(m[2]||''):raw;}
  const m=String(raw).trim().match(/^\.?(\d{1,3})$/);return m?f.pre+m[1]:raw;}
function isRight(f,v){
  if(f.type==='bits')return String(v).replace(/[\s.]/g,'')===f.answer;
  if(f.type==='ip')return parseIP(v)===f.answer;
  if(f.type==='cidr'){const c=parseCIDR(v);return !!c&&c.ip===f.answer.ip&&c.p===f.answer.p;}
  if(f.type==='bin32')return String(v).replace(/[\s.]/g,'')===f.answer.replace(/\./g,'');
  if(f.type==='choice')return String(v)===f.answer;
  if(f.type==='multi'){const S=multiSet(v),W=new Set(f.answer.map(x=>x.replace(/^\//,'')));return S.size===W.size&&[...S].every(x=>W.has(x));}
  const s=String(v).replace(/[,\s]/g,'');return /^\d+$/.test(s)&&Number(s)===f.answer;
}
const show=f=>f.type==='ip'?ipStr(f.answer):f.type==='cidr'?cidr(f.answer.ip,f.answer.p):f.type==='multi'?f.answer.join(', '):String(f.answer);
// the hint steps for each question: walk() lists steps in order, and a step with f closes question f
function hintsFor(q){const out=q.fields.map(()=>[]);let buf=[];q.walk().forEach(s=>{buf.push(s);if(s.f!=null){out[s.f]=buf;buf=[];}});return out;}
const api={LABPARTS,VLSMPARTS,SUBPARTS,genSubLab,subFrom,printSubHTML,subPlan,labFrom,vlsmFrom,genLab,genVlsmLab,printLabHTML,printVlsmHTML,vlsmPlan,hostBits,topoSVG,expand,isRight,show,hintsFor,ipStr,oct,parseIP,bin8,esc,isBlank};
if(typeof module!=='undefined')module.exports=api;else window.LAB=api;
})();
