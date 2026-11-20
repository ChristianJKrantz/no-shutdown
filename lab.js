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


// typed answers: an IP field shows its first three octets, so a bare last octet (".33" or "33") is enough
function expand(f,raw){if(!f||!f.pre||raw==null)return raw;const m=String(raw).trim().match(/^\.?(\d{1,3})$/);return m?f.pre+m[1]:raw;}
function isRight(f,v){
  if(f.type==='bits')return String(v).replace(/[\s.]/g,'')===f.answer;
  if(f.type==='ip')return parseIP(v)===f.answer;
  const s=String(v).replace(/[,\s]/g,'');return /^\d+$/.test(s)&&Number(s)===f.answer;
}
const show=f=>f.type==='ip'?ipStr(f.answer):String(f.answer);
// the hint steps for each question: walk() lists steps in order, and a step with f closes question f
function hintsFor(q){const out=q.fields.map(()=>[]);let buf=[];q.walk().forEach(s=>{buf.push(s);if(s.f!=null){out[s.f]=buf;buf=[];}});return out;}
const api={LABPARTS,labFrom,genLab,printLabHTML,topoSVG,expand,isRight,show,hintsFor,ipStr,oct,parseIP,bin8,esc,isBlank};
if(typeof module!=='undefined')module.exports=api;else window.LAB=api;
})();
