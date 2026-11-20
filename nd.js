/* No Shutdown: the network for the Cisco Packet Tracer lab 9.3.4 "IPv6 Neighbor Discovery".
   PCA1 and PCA2 on SwitchA (2001:db8:acad:1::/64), RTA between the LANs, PCB1 on SwitchB (2001:db8:acad:2::/64).
   Pings run Neighbor Discovery the way the lab shows it: a host that doesn't know the next hop's MAC sends a Neighbor
   Solicitation (ICMPv6 135) to the solicited-node multicast group (ff02::1:ffXX:XXXX, MAC 3333.ffXX.XXXX), the owner
   answers with a Neighbor Advertisement (136), and both sides cache the result. In simulation mode every hop is
   recorded as an event with its inbound and outbound PDU, like Packet Tracer's Event List. */
(function(root){
'use strict';
const I=root.IOS||(typeof require!=='undefined'?require('./ios.js'):null);
// ---------- IPv6 helpers ----------
function expand(a){a=String(a).toLowerCase().split('/')[0];if(!/^[0-9a-f:]+$/.test(a)||!a.includes(':'))return null;
  const [h,t]=a.split('::');if(a.split('::').length>2)return null;const H=h?h.split(':'):[],T=t!=null&&t?t.split(':'):[];
  if(t==null&&H.length!==8)return null;const fill=8-H.length-T.length;if(fill<0||(t!=null&&fill<1&&a.includes('::')&&H.length+T.length===8))return null;
  const g=[...H,...Array(t!=null?fill:0).fill('0'),...T];if(g.length!==8||g.some(x=>!/^[0-9a-f]{1,4}$/.test(x)))return null;return g.map(x=>x.padStart(4,'0'));}
function compress(g){const s=g.map(x=>x.replace(/^0+(?=.)/,''));let bs=-1,bl=0;for(let i=0;i<8;){if(s[i]==='0'){let j=i;while(j<8&&s[j]==='0')j++;if(j-i>bl&&j-i>1){bs=i;bl=j-i;}i=j;}else i++;}
  if(bs<0)return s.join(':');return (s.slice(0,bs).join(':')+'::'+s.slice(bs+bl).join(':'));}
const norm=a=>{const g=expand(a);return g?compress(g):null;};
const same=(a,b)=>{const x=expand(a),y=expand(b);return !!x&&!!y&&x.join()===y.join();};
const on64=(a,b)=>{const x=expand(a),y=expand(b);return !!x&&!!y&&x.slice(0,4).join()===y.slice(0,4).join();};
const isLL=a=>{const g=expand(a);return !!g&&g[0].startsWith('fe8');};
function solicited(a){const g=expand(a);return compress(['ff02','0','0','0','0','1','ff'+g[6].slice(2),g[7]]);}
function mcastMac(a){const g=expand(a);return `3333.ff${g[6].slice(2)}.${g[7]}`;}
const U=a=>String(a).toUpperCase();
// ---------- the network ----------
// new prefixes, host addresses and MACs each time (fixed ones can be passed in for tests)
function plan(o){
  const rnd=n=>Math.floor(Math.random()*n),hx=(n)=>Array.from({length:n},()=>'0123456789abcdef'[rnd(16)]).join('');
  const site=(o&&o.site)||hx(4).replace(/^0+(?=.)/,''),a=(o&&o.a)||String(1+rnd(9)),b=(o&&o.b)||String(Number(a)%9+1+(Number(a)%9+1===Number(a)?1:0));
  const hid=()=>{let v;do{v=(16+rnd(240)).toString(16);}while(v==='1');return v;};
  let h1=(o&&o.h1)||hid(),h2=(o&&o.h2)||hid(),h3=(o&&o.h3)||hid();while(h2===h1)h2=hid();
  const oui=()=>['00d0','0060','0090','0030','000c','0050','00e0','0001'][rnd(8)]+'.'+hx(4)+'.'+hx(4);
  const rmac=(o&&o.rmac)||('0030.'+hx(4)+'.'+hx(3));
  return {site,a,b,h1,h2,h3,m1:(o&&o.m1)||oui(),m2:(o&&o.m2)||oui(),m3:(o&&o.m3)||oui(),r0:rmac+'1',r1:rmac+'2'};
}
function build(o){
  const P=plan(o),A=`2001:db8:${P.site}:${P.a}::`,B=`2001:db8:${P.site}:${P.b}::`;
  const RTA=I.newDevice('router','RTA',{gig:['0/0/0','0/0/1']});
  RTA.macs={'GigabitEthernet0/0/0':P.r0,'GigabitEthernet0/0/1':P.r1};
  const host=(name,ip,mac)=>{const d=I.newDevice('pc',name);d.v6={ip:norm(ip),mac,ll:I.eui64ll(mac),gw:'fe80::1'};d.nc={};return d;};
  const PCA1=host('PCA1',A+P.h1,P.m1),PCA2=host('PCA2',A+P.h2,P.m2),PCB1=host('PCB1',B+P.h3,P.m3);
  const net={devices:{RTA,PCA1,PCA2,PCB1},links:[]};
  const pre=['enable','configure terminal','hostname RTA','ipv6 unicast-routing','interface g0/0/0',`ipv6 address ${A}1/64`,'ipv6 address fe80::1 link-local','no shutdown',
    'interface g0/0/1',`ipv6 address ${B}1/64`,'ipv6 address fe80::1 link-local','no shutdown','end'];
  pre.forEach(c=>I.run(RTA,c,net));RTA.log=[];RTA.out=[];RTA.seen={};RTA.nd6=[];RTA.mode='user';
  const LAN={[A]:{sw:'SwitchA',ifc:'GigabitEthernet0/0/0',short:'Gig0/0/0',hosts:[PCA1,PCA2],pre:A},[B]:{sw:'SwitchB',ifc:'GigabitEthernet0/0/1',short:'Gig0/0/1',hosts:[PCB1],pre:B}};
  const lanOf=a=>{for(const [p,v] of Object.entries(LAN))if(on64(a,p+'1'))return v;return null;};
  const rIf=L=>({ip:norm(L.pre+'1'),ll:'fe80::1',mac:RTA.macs[L.ifc]});
  const M={sim:false,events:[],t:0};
  // the router's neighbor table (what show ipv6 neighbors prints)
  const rLearn=(ip,mac,L)=>{ip=norm(ip);const e=RTA.nd6.find(x=>same(x.ip,ip));if(e){e.mac=mac;e.iface=L.short;return;}RTA.nd6.push({ip,mac,iface:L.short});};
  const rKnows=(ip)=>RTA.nd6.find(x=>same(x.ip,ip));
  const ev=(last,at,type,inP,outP,note)=>{if(M.sim)M.events.push({n:M.events.length+1,time:(M.t+=0.001).toFixed(3),last,at,type,in:inP||null,out:outP||null,note:note||''});};
  const pdu=(ethSrc,ethDst,ipSrc,ipDst,type)=>({eth:ethSrc?{src:ethSrc,dst:ethDst}:null,ip:{src:U(norm(ipSrc)),dst:U(norm(ipDst))},icmp:{type,name:{128:'Echo Request',129:'Echo Reply',135:'Neighbor Solicitation',136:'Neighbor Advertisement'}[type]}});
  // a frame from a sender to the next hop on a LAN: Neighbor Discovery first if the sender doesn't know the MAC
  function resolve(L,from,fromName,srcIp,srcMac,target,isRouter){
    const cache=isRouter?null:from.nc;
    const known=isRouter?rKnows(target):cache[norm(target)];if(known)return isRouter?known.mac:known;
    const ns=pdu(srcMac,mcastMac(target),srcIp,solicited(target),135);
    ev(isRouter?'--':'--',fromName,'NDP',null,ns,`${fromName} doesn’t know the MAC address for ${U(norm(target))}, so it asks the solicited-node multicast group ${U(solicited(target))}.`);
    ev(fromName,L.sw,'NDP',ns,ns,'The switch floods the multicast frame out its other ports.');
    let owner=null;
    const members=[...L.hosts,'RTA'];
    members.forEach(m=>{const name=m==='RTA'?'RTA':m.name;if(name===fromName)return;
      const ownsIt=m==='RTA'?(same(target,rIf(L).ip)||same(target,'fe80::1')):same(target,m.v6.ip)||same(target,m.v6.ll);
      if(!ownsIt){ev(L.sw,name,'NDP',ns,null,`${name} isn’t ${U(norm(target))}, so it drops the solicitation (no Out Layers).`);return;}
      owner=m;
      const tMac=m==='RTA'?rIf(L).mac:m.v6.mac,tIp=m==='RTA'?(isLL(target)?'fe80::1':rIf(L).ip):m.v6.ip;
      const na=pdu(tMac,srcMac,isLL(target)?target:tIp,srcIp,136);
      if(m==='RTA')rLearn(srcIp,srcMac,L);else m.nc[norm(srcIp)]=srcMac; // the solicitation carries the sender’s MAC, so the target caches it
      ev(L.sw,name,'NDP',ns,na,`${name} owns ${U(norm(target))}: it answers with a Neighbor Advertisement straight to ${fromName}.`);
      ev(name,L.sw,'NDP',na,na,'');
      ev(L.sw,fromName,'NDP',na,null,`${fromName} now knows ${U(norm(target))} is at ${tMac}.`);});
    if(!owner)return null;
    const mac=owner==='RTA'?rIf(L).mac:owner.v6.mac;
    if(isRouter)rLearn(target,mac,L);else cache[norm(target)]=mac;
    return mac;
  }
  // one echo request and its reply; returns 'local', 'remote' or false
  function ping(src,dst){
    dst=norm(dst);if(!dst)return false;
    const isR=src===RTA;const srcName=isR?'RTA':src.name;
    const dL=lanOf(dst),dHost=dL&&dL.hosts.find(h=>same(h.v6.ip,dst));const toRouter=dL&&same(dst,rIf(dL).ip);
    if(!dL||(!dHost&&!toRouter))return false;
    if(isR){// the router pinging a host on one of its LANs
      const L=dL,r=rIf(L),req0=pdu(null,null,r.ip,dst,128);ev('--','RTA','ICMPv6',null,req0,'');
      const mac=resolve(L,null,'RTA',r.ip,r.mac,dst,true);if(!mac)return false;
      const req=pdu(r.mac,mac,r.ip,dst,128);ev('RTA',L.sw,'ICMPv6',req,req,'');
      const rep=pdu(dHost.v6.mac,r.mac,dst,r.ip,129);dHost.nc[norm(r.ll)]=dHost.nc[norm(r.ll)]||r.mac;
      ev(L.sw,dHost.name,'ICMPv6',req,rep,'');ev(dHost.name,L.sw,'ICMPv6',rep,rep,'');ev(L.sw,'RTA','ICMPv6',rep,null,'');return 'local';}
    const sL=lanOf(src.v6.ip),local=on64(src.v6.ip,dst);
    const req0=pdu(null,null,src.v6.ip,dst,128);
    ev('--',srcName,'ICMPv6',null,{...req0,eth:null},local?'The echo request is ready, but the destination MAC isn’t known yet.':'The destination is on another network, so the frame goes to the default gateway, whose MAC isn’t known yet.');
    if(local){
      const mac=resolve(sL,src,srcName,src.v6.ip,src.v6.mac,dst,false);if(!mac)return false;
      const req=pdu(src.v6.mac,mac,src.v6.ip,dst,128);ev(srcName,srcName,'ICMPv6',null,req,'Now PCA1 has every address it needs.');ev(srcName,sL.sw,'ICMPv6',req,req,'');
      const back=dHost.nc[norm(src.v6.ip)]||resolve(sL,dHost,dHost.name,dHost.v6.ip,dHost.v6.mac,src.v6.ip,false);
      const rep=pdu(dHost.v6.mac,back,dst,src.v6.ip,129);ev(sL.sw,dHost.name,'ICMPv6',req,rep,'');ev(dHost.name,sL.sw,'ICMPv6',rep,rep,'');ev(sL.sw,srcName,'ICMPv6',rep,null,'The echo reply arrives.');
      return 'local';}
    // remote: host → gateway (fe80::1) → router → far host, and the reply back the same way
    const gwMac=resolve(sL,src,srcName,src.v6.ip,src.v6.mac,src.v6.gw,false);if(!gwMac)return false;
    const r1=rIf(sL),r2=rIf(dL);
    const req=pdu(src.v6.mac,gwMac,src.v6.ip,dst,128);ev(srcName,srcName,'ICMPv6',null,req,'The destination MAC is the router’s, because the packet is going off the local network.');
    ev(srcName,sL.sw,'ICMPv6',req,req,'');
    if(!rKnows(src.v6.ip))rLearn(src.v6.ip,src.v6.mac,sL);
    const known=rKnows(dst);
    const fwd0={...pdu(r2.mac,known?known.mac:null,src.v6.ip,dst,128)};if(!known)fwd0.eth={src:r2.mac,dst:null};
    ev(sL.sw,'RTA','ICMPv6',req,known?pdu(r2.mac,known.mac,src.v6.ip,dst,128):{...pdu(null,null,src.v6.ip,dst,128),eth:{src:r2.mac,dst:null}},known?'':'RTA has a route to the far network, but doesn’t know the far host’s MAC: another round of Neighbor Discovery on that LAN.');
    const hMac=resolve(dL,null,'RTA',r2.ip,r2.mac,dst,true);if(!hMac)return false;
    const fwd=pdu(r2.mac,hMac,src.v6.ip,dst,128);ev('RTA',dL.sw,'ICMPv6',fwd,fwd,'');
    const hgw=dHost.nc[norm(dHost.v6.gw)];
    ev(dL.sw,dHost.name,'ICMPv6',fwd,hgw?pdu(dHost.v6.mac,hgw,dst,src.v6.ip,129):{...pdu(null,null,dst,src.v6.ip,129),eth:{src:dHost.v6.mac,dst:null}},hgw?'':`${dHost.name}’s reply has to go to its default gateway, and it doesn’t know that MAC yet: the destination MAC is missing.`);
    const back=resolve(dL,dHost,dHost.name,dHost.v6.ip,dHost.v6.mac,dHost.v6.gw,false);if(!back)return false;
    const rep=pdu(dHost.v6.mac,back,dst,src.v6.ip,129);if(!hgw)ev(dHost.name,dHost.name,'ICMPv6',null,rep,'Now the reply has every address.');
    ev(dHost.name,dL.sw,'ICMPv6',rep,rep,'');rLearn(dst,dHost.v6.mac,dL);
    const out=pdu(r1.mac,rKnows(src.v6.ip).mac,dst,src.v6.ip,129);ev(dL.sw,'RTA','ICMPv6',rep,out,'');ev('RTA',sL.sw,'ICMPv6',out,out,'');ev(sL.sw,srcName,'ICMPv6',out,null,'The echo reply arrives.');
    return 'remote';
  }
  net.ping6=(d,dst)=>{d.pings6=(d.pings6||[]).concat([norm(dst)]);const r=ping(d,dst);M.lastPing={src:d===RTA?'RTA':d.name,dst:norm(dst),ok:!!r,ndp:M.events.some(e=>e.type==='NDP')};return r;};
  M.reset=()=>{M.events=[];M.t=0;};
  M.clearAll=()=>{RTA.nd6=[];[PCA1,PCA2,PCB1].forEach(p=>{p.nc={};});};
  return {net,M,RTA,PCA1,PCA2,PCB1,LAN,P,A:norm(A+'1').replace(/1$/,''),B:norm(B+'1').replace(/1$/,'')};
}
const ND={build,expand,compress,norm,same,solicited,mcastMac};
if(typeof module!=='undefined'&&module.exports)module.exports=ND;else root.ND=ND;
})(typeof window!=='undefined'?window:globalThis);
