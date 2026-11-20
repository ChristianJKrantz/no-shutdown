/* No Shutdown content: command drills, guided tasks and the cheat sheet. */
(function(root){
'use strict';
const I=root.IOS||(typeof require!=='undefined'?require('./ios.js'):null);
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const HOSTS=['R1','Branch-R1','HQ-Edge','Lab-R2','Core-R1'],SWS=['S1','Access-S1','Lab-SW2','Floor2-S1','S3'];
const WORDS=['class','cisco','Sw0rdFish','N3tAdmin','Pa55word','Lab-Secret','Gr33nLight','Matrix-99'];
const STRONG=['Str0ngPass!','N3tw0rk-Adm1n','L0ckItD0wn','Secur3Lab#1','Gr33nM4trix'];
const USERS=['admin','netops','christian','student','tech1'];
const DOMAINS=['ccna.lab','netlab.local','campus.edu','lab.local'];
const lanIP=(not)=>{let t;do t=R(1,254);while(not&&not.net===`192.168.${t}.0`);return {net:`192.168.${t}.0`,gw:`192.168.${t}.1`,sw:`192.168.${t}.2`,host:`192.168.${t}.${R(10,250)}`,mask:'255.255.255.0'};};

/* ---------------- drills: purpose → command ----------------
   Each drill names a job and a prompt; the answer is checked with the same parser the terminal uses, so any valid
   abbreviation counts. */
const DRILLS=[
  {g:'Modes',dev:'router',mode:'user',purpose:'Go from user EXEC to privileged EXEC mode.',ids:['enable'],answer:'enable',short:'en'},
  {g:'Modes',dev:'router',mode:'priv',purpose:'Enter global configuration mode.',ids:['conf t'],answer:'configure terminal',short:'conf t'},
  {g:'Modes',dev:'router',mode:'if',ctx:'GigabitEthernet0/0',purpose:'Go straight back to privileged EXEC mode from here.',ids:['end'],answer:'end'},
  {g:'Modes',dev:'switch',mode:'line',ctx:'con',purpose:'Go back up one level, to global configuration mode.',ids:['exit'],answer:'exit'},
  {g:'Modes',dev:'router',mode:'priv',purpose:'Drop back down to user EXEC mode.',ids:['disable'],answer:'disable'},
  {g:'Modes',dev:'router',mode:'config',purpose:'Show the interface summary without leaving configuration mode.',ids:['do'],check:a=>/^sh\S* ip int\S* br/i.test(a[0]),answer:'do show ip interface brief',short:'do sh ip int br'},
  {g:'Basic setup',dev:'router',mode:'config',gen:()=>({h:pick(HOSTS)}),purpose:v=>`Name this router ${v.h}.`,ids:['hostname'],check:(a,v)=>a[0]===v.h,answer:v=>`hostname ${v.h}`},
  {g:'Basic setup',dev:'switch',mode:'config',purpose:'Stop the switch from treating mistyped commands as hostnames to look up.',ids:['no ip domain-lookup'],answer:'no ip domain-lookup',short:'no ip domain-lookup'},
  {g:'Basic setup',dev:'switch',mode:'config',gen:()=>({t:pick(['Authorized users only','Authorized access only!','Unauthorized access is prohibited'])}),purpose:v=>`Set the message-of-the-day banner to “${v.t}”.`,ids:['banner motd'],check:(a,v)=>{const t=a[0],d=t[0],e=t.indexOf(d,1);return e>0&&t.slice(1,e).trim()===v.t;},answer:v=>`banner motd #${v.t}#`},
  {g:'Basic setup',dev:'switch',mode:'config',gen:()=>{const l=lanIP();return {gw:l.gw};},purpose:v=>`Give the switch its default gateway, ${v.gw}.`,ids:['ip default-gateway'],check:(a,v)=>a[0]===v.gw,answer:v=>`ip default-gateway ${v.gw}`},
  {g:'Passwords',dev:'router',mode:'config',gen:()=>({p:pick(WORDS)}),purpose:v=>`Protect privileged EXEC mode with the encrypted secret ${v.p}.`,ids:['enable secret'],check:(a,v)=>a[0]===v.p,answer:v=>`enable secret ${v.p}`},
  {g:'Passwords',dev:'router',mode:'config',purpose:'Encrypt every plain-text password in the configuration.',ids:['service password-encryption'],answer:'service password-encryption',short:'service password-encryption'},
  {g:'Passwords',dev:'router',mode:'config',purpose:'Start configuring the console line.',ids:['line con'],answer:'line console 0',short:'line con 0'},
  {g:'Passwords',dev:'router',mode:'config',purpose:'Start configuring all of this router’s virtual terminal (telnet/SSH) lines.',ids:['line vty'],check:a=>a[0]==='0'&&a[1]==='4',answer:'line vty 0 4'},
  {g:'Passwords',dev:'switch',mode:'config',purpose:'Start configuring all of this switch’s virtual terminal lines.',ids:['line vty'],check:a=>a[0]==='0'&&a[1]==='15',answer:'line vty 0 15'},
  {g:'Passwords',dev:'switch',mode:'line',ctx:'con',gen:()=>({p:pick(WORDS)}),purpose:v=>`Set this line’s password to ${v.p}.`,ids:['line password'],check:(a,v)=>a[0]===v.p,answer:v=>`password ${v.p}`,short:v=>`pass ${v.p}`},
  {g:'Passwords',dev:'switch',mode:'line',ctx:'con',purpose:'Make this line ask for its password.',ids:['login'],answer:'login'},
  {g:'Interfaces',dev:'router',mode:'config',gen:()=>({i:pick(['0/0','0/1'])}),purpose:v=>`Select GigabitEthernet ${v.i} to configure it.`,ids:['interface'],check:(a,v)=>I.ifaceName(a[0],{cfg:{ifaces:{['GigabitEthernet'+v.i]:{}}}})==='GigabitEthernet'+v.i,answer:v=>`interface g${v.i}`,short:v=>`int g${v.i}`},
  {g:'Interfaces',dev:'router',mode:'if',ctx:'GigabitEthernet0/0',gen:()=>({d:pick(['Bldg 1 Room 106','LAN to S1','Link to HQ'])}),purpose:v=>`Label this interface “${v.d}”.`,ids:['description'],check:(a,v)=>a[0]===v.d,answer:v=>`description ${v.d}`},
  {g:'Interfaces',dev:'router',mode:'if',ctx:'GigabitEthernet0/0',gen:()=>{const p=pick([24,25,26,27,28]),t=R(0,255),m=['255.255.255.0','255.255.255.128','255.255.255.192','255.255.255.224','255.255.255.240'][p-24];return {ip:`192.168.${t}.1`,m,p};},purpose:v=>`Give this interface the address ${v.ip}/${v.p}.`,ids:['ip address'],check:(a,v)=>a[0]===v.ip&&a[1]===v.m,answer:v=>`ip address ${v.ip} ${v.m}`,short:v=>`ip add ${v.ip} ${v.m}`,note:'IOS needs the mask in dotted decimal.'},
  {g:'Interfaces',dev:'router',mode:'if',ctx:'GigabitEthernet0/0',purpose:'Turn this interface on (router interfaces start shut down).',ids:['no shutdown'],answer:'no shutdown',short:'no shut'},
  {g:'Interfaces',dev:'switch',mode:'config',purpose:'Select the switch’s management interface.',ids:['interface'],check:a=>/vlan ?1$/i.test(a[0]),answer:'interface vlan 1',short:'int vlan 1'},
  {g:'Interfaces',dev:'router',mode:'if',ctx:'GigabitEthernet0/0',gen:()=>({n:R(1,9)}),purpose:v=>`Give this interface the IPv6 address 2001:db8:acad:${v.n}::1/64.`,ids:['ipv6 address'],check:(a,v)=>a[0].toLowerCase()===`2001:db8:acad:${v.n}::1/64`,answer:v=>`ipv6 address 2001:db8:acad:${v.n}::1/64`},
  {g:'Interfaces',dev:'router',mode:'if',ctx:'GigabitEthernet0/0',purpose:'Set this interface’s IPv6 link-local address to fe80::1.',ids:['ipv6 link-local'],check:a=>a[0].toLowerCase()==='fe80::1',answer:'ipv6 address fe80::1 link-local'},
  {g:'SSH',dev:'switch',mode:'config',gen:()=>({d:pick(DOMAINS)}),purpose:v=>`Set the domain name to ${v.d} (SSH keys need it).`,ids:['ip domain-name'],check:(a,v)=>a[0]===v.d,answer:v=>`ip domain-name ${v.d}`},
  {g:'SSH',dev:'switch',mode:'config',purpose:'Generate the RSA key pair that SSH uses.',ids:['crypto key','crypto key mod'],answer:'crypto key generate rsa',note:'Then answer 1024 when it asks for the modulus size.'},
  {g:'SSH',dev:'switch',mode:'config',purpose:'Use SSH version 2 only.',ids:['ip ssh version'],check:a=>a[0]==='2',answer:'ip ssh version 2'},
  {g:'SSH',dev:'switch',mode:'config',gen:()=>({u:pick(USERS),p:pick(STRONG)}),purpose:v=>`Create the local account ${v.u} with the encrypted password ${v.p}.`,ids:['username secret'],check:(a,v)=>a[0]===v.u&&a[1]===v.p,answer:v=>`username ${v.u} secret ${v.p}`},
  {g:'SSH',dev:'switch',mode:'line',ctx:'vty',purpose:'Allow only SSH (no telnet) on these lines.',ids:['transport ssh'],answer:'transport input ssh'},
  {g:'SSH',dev:'switch',mode:'line',ctx:'vty',purpose:'Make these lines log in with the local username accounts.',ids:['login local'],answer:'login local'},
  {g:'SSH',dev:'pc',mode:'pc',gen:()=>({u:pick(USERS),ip:lanIP().sw}),purpose:v=>`From the PC, open an SSH session to ${v.ip} as ${v.u}.`,ids:['ssh'],check:(a,v)=>a[0]===v.u&&a[1]===v.ip,answer:v=>`ssh -l ${v.u} ${v.ip}`},
  {g:'Security',dev:'router',mode:'config',purpose:'Require every new password to be at least 8 characters.',ids:['min-length'],check:a=>a[0]==='8',answer:'security passwords min-length 8'},
  {g:'Security',dev:'router',mode:'config',purpose:'Block logins for 120 seconds after 3 failed attempts within 60 seconds.',ids:['block-for'],check:a=>a.join(' ')==='120 3 60',answer:'login block-for 120 attempts 3 within 60'},
  {g:'Security',dev:'router',mode:'line',ctx:'vty',purpose:'Log idle sessions out after 5 minutes and 0 seconds.',ids:['exec-timeout'],check:a=>a[0]==='5'&&(a[1]||'0')==='0',answer:'exec-timeout 5 0'},
  {g:'Save & reset',dev:'router',mode:'priv',purpose:'Save the running configuration to NVRAM so it survives a reload.',ids:['copy run start'],answer:'copy running-config startup-config',short:'copy run start'},
  {g:'Save & reset',dev:'router',mode:'priv',purpose:'Erase the saved (startup) configuration.',ids:['erase start'],answer:'erase startup-config'},
  {g:'Save & reset',dev:'switch',mode:'priv',purpose:'Delete the switch’s VLAN database file.',ids:['delete'],check:a=>/^(flash:\/?)?vlan\.dat$/i.test(a[0]),answer:'delete vlan.dat',note:'Switches only.'},
  {g:'Save & reset',dev:'router',mode:'priv',purpose:'Restart the device.',ids:['reload'],answer:'reload'},
  {g:'Save & reset',dev:'router',mode:'priv',gen:()=>({f:pick(['backup.cfg','R1-config','lab-backup.txt'])}),purpose:v=>`Back up the running configuration to a file in flash called ${v.f}.`,ids:['copy run flash'],check:(a,v)=>a[0].replace(/^flash:\/?/i,'')===v.f,answer:v=>`copy running-config flash:${v.f}`},
  {g:'Save & reset',dev:'router',mode:'priv',gen:()=>({f:pick(['backup.cfg','R1-config','lab-backup.txt'])}),purpose:v=>`Load the backup flash:${v.f} into the running configuration.`,ids:['copy flash run'],check:(a,v)=>a[0].replace(/^flash:\/?/i,'')===v.f,answer:v=>`copy flash:${v.f} running-config`},
  {g:'Save & reset',dev:'router',mode:'priv',purpose:'Check the configuration register (it should be 0x2102).',ids:['show version'],answer:'show version',short:'sh ver'},
  {g:'Save & reset',dev:'router',mode:'config',purpose:'Set the configuration register so the router loads its saved config at boot.',ids:['config-register'],check:a=>/^0x0*2102$/i.test(a[0]),answer:'config-register 0x2102'},
  {g:'Verify',dev:'router',mode:'priv',purpose:'Show each interface’s IP address and up/down status.',ids:['show ip int brief'],answer:'show ip interface brief',short:'sh ip int br'},
  {g:'Verify',dev:'router',mode:'priv',purpose:'Show the configuration the router is running right now.',ids:['show run'],answer:'show running-config',short:'sh run'},
  {g:'Verify',dev:'router',mode:'priv',gen:()=>({ip:lanIP().host}),purpose:v=>`Test whether ${v.ip} answers.`,ids:['ping'],check:(a,v)=>a[0]===v.ip,answer:v=>`ping ${v.ip}`},
];
const IDNAME={'enable':'enter privileged EXEC mode','conf t':'enter global configuration mode','end':'go back to privileged EXEC','exit':'go up one level','disable':'go back to user EXEC','do':'run an EXEC command from config mode','hostname':'set the hostname','no ip domain-lookup':'turn off DNS lookup','ip domain-lookup':'turn DNS lookup on','banner motd':'set the MOTD banner','ip default-gateway':'set the default gateway','enable secret':'set the enable secret','enable password':'set the (weak, unencrypted) enable password','service password-encryption':'encrypt plain-text passwords','line con':'configure the console line','line vty':'configure the VTY lines','line password':'set the line password','login':'require the line password','login local':'log in with local accounts','interface':'select an interface','description':'label the interface','ip address':'set the interface IP address','no shutdown':'turn the interface on','shutdown':'turn the interface OFF','ipv6 address':'set an IPv6 address','ipv6 link-local':'set the IPv6 link-local address','ip domain-name':'set the domain name','crypto key':'generate RSA keys','crypto key mod':'generate RSA keys','ip ssh version':'set the SSH version','username secret':'create a local account','username password':'create a local account with a weak password','transport ssh':'allow only SSH','transport all':'allow SSH and telnet','transport telnet':'allow only telnet','min-length':'set the minimum password length','block-for':'block repeated failed logins','exec-timeout':'set the idle timeout','copy run start':'save the configuration','erase start':'erase the saved configuration','delete':'delete a file from flash','reload':'restart the device','copy run flash':'back up the config to flash','copy flash run':'load a config file from flash','copy start run':'load the saved config into the running config','show version':'show the version and configuration register','config-register':'set the configuration register','show ip int brief':'show the interface summary','show run':'show the running configuration','show start':'show the saved configuration','show flash':'list the files in flash','ping':'test a connection','ssh':'open an SSH session','ipconfig':'show the PC’s IP settings'};

/* ---------------- tasks: real configurations in a simulated network ---------------- */
const up=(d,n)=>{const x=d.cfg.ifaces[n];return x&&!x.shutdown;};
const has=(d,n,ip,m)=>{const x=d.cfg.ifaces[n];return x&&x.ip===ip&&x.mask===m;};
const saved=d=>d.startup&&JSON.stringify(d.startup)===JSON.stringify(d.cfg);
const pinged=(d,ip)=>(d.pings||[]).some(p=>p.ip===ip&&p.ok);
const lineOK=(L,pw)=>L.password===pw&&L.login==='line';
function preset(d,cmds,net){d.mode='user';cmds.forEach(c=>I.run(d,c,net));d.mode='user';d.ctx=null;d.log=[];d.history=[];d.seen={};d.visited={};d.pings=[];d.out=[];d.dirty=false;}
const preCfg=(d,cmds,net)=>preset(d,['enable','configure terminal',...cmds,'end'],net);
function pcSet(pc,ip,mask,gw){pc.ip=ip;pc.mask=mask;pc.gw=gw;}
const G1=(text,dev,where,cmds,check)=>({text,dev,where,cmds,check});

const TASKS=[
 {id:'modes',title:'Find your way around the modes',level:'Start here',skills:'enable · configure terminal · interface · end · exit · disable',
  build(){const r=I.newDevice('router','R1');const net={devices:{R1:r}};
   return {net,tabs:['R1'],intro:'IOS has layers of modes, and the prompt tells you where you are: <b>R1&gt;</b> user EXEC, <b>R1#</b> privileged EXEC, <b>R1(config)#</b> global configuration, <b>R1(config-if)#</b> interface configuration. Try <b>?</b> at any prompt to see what you can type.',
    goals:[G1('Get into privileged EXEC mode (R1#)','R1','user',['enable'],n=>!!n.devices.R1.visited&&!!n.devices.R1.visited.priv),
      G1('Enter global configuration mode (R1(config)#)','R1','priv',['configure terminal'],n=>!!(n.devices.R1.visited||{}).config),
      G1('Select interface GigabitEthernet0/0 (R1(config-if)#)','R1','config',['interface g0/0'],n=>!!(n.devices.R1.visited||{}).if),
      G1('Go up one level with exit','R1','if',['exit'],n=>(n.devices.R1.log||[]).some(l=>(l.mode==='if'||l.mode==='line')&&/^\s*exi?t?\s*$/i.test(l.input)&&l.input.trim().length>=2)),
      G1('Jump straight back to R1# with end','R1','config',['end'],n=>!!n.devices.R1.seen.endCmd),
      G1('Drop back to user EXEC (R1>) with disable','R1','priv',['disable'],n=>!!n.devices.R1.seen.disable&&n.devices.R1.mode==='user')]};}},
 {id:'basic-router',title:'Basic router setup',level:'Basics',skills:'hostname · passwords · banner · save',
  build(){const h=pick(HOSTS),en=pick(WORDS),con=pick(WORDS.filter(w=>w!==en)),vty=pick(WORDS.filter(w=>w!==en&&w!==con)),ban=pick(['Authorized users only','Authorized access only!']);
   const r=I.newDevice('router','Router');const net={devices:{Router:r}};const d=()=>net.devices.Router;
   return {net,tabs:['Router'],intro:`A new router just came out of the box. Give it the standard first-time setup.`,
    given:[['Hostname',h],['Enable secret',en],['Console password',con],['VTY password',vty],['Banner',ban]],
    goals:[G1(`Name it ${h}`,'Router','config',[`hostname ${h}`],()=>d().cfg.hostname===h),
      G1('Turn off DNS lookup, so typos aren’t looked up as hostnames','Router','config',['no ip domain-lookup'],()=>!d().cfg.domainLookup),
      G1(`Protect privileged EXEC with the secret ${en}`,'Router','config',[`enable secret ${en}`],()=>d().cfg.enableSecret===en),
      G1(`Console line: password ${con}, and require it`,'Router','line:con',['line console 0',`password ${con}`,'login'],()=>lineOK(d().cfg.lines.con,con)),
      G1(`VTY lines 0–4: password ${vty}, and require it`,'Router','line:vty',['line vty 0 4',`password ${vty}`,'login'],()=>lineOK(d().cfg.lines.vty,vty)),
      G1('Encrypt the plain-text passwords','Router','config',['service password-encryption'],()=>d().cfg.spe),
      G1(`Set the MOTD banner to “${ban}”`,'Router','config',[`banner motd #${ban}#`],()=>d().cfg.banner===ban),
      G1('Save it so it survives a reload','Router','priv',['copy running-config startup-config'],()=>saved(d()))]};}},
 {id:'switch-mgmt',title:'Switch management',level:'Basics',skills:'interface vlan 1 · ip default-gateway · vty 0 15',
  build(){const a=lanIP(),b=lanIP(a);const sw=pick(SWS.filter(x=>x!=='S3')),en=pick(WORDS),vty=pick(WORDS.filter(w=>w!==en));
   const r=I.newDevice('router','R1'),s=I.newDevice('switch','Switch'),pc1=I.newDevice('pc','PC1'),pc2=I.newDevice('pc','PC2');
   const net={devices:{R1:r,[sw]:s,PC1:pc1,PC2:pc2}};
   preCfg(r,['hostname R1','int g0/0',`ip address ${a.gw} ${a.mask}`,'no shutdown','int g0/1',`ip address ${b.gw} ${b.mask}`,'no shutdown'],net);
   pcSet(pc1,a.host,a.mask,a.gw);pcSet(pc2,b.host,b.mask,b.gw);
   const d=()=>net.devices[sw];
   return {net,tabs:[sw,'PC2'],intro:`This switch sits on the ${a.net}/24 LAN behind R1 (${a.gw}). PC2 is on R1’s other LAN, ${b.net}/24. Give the switch a management address so you can reach it remotely.`,
    given:[['Hostname',sw],['Enable secret',en],['VTY password',vty],['VLAN 1 address',`${a.sw} ${a.mask}`],['Default gateway',a.gw]],
    goals:[G1(`Name it ${sw}`,sw,'config',[`hostname ${sw}`],()=>d().cfg.hostname===sw),
      G1(`Enable secret ${en}`,sw,'config',[`enable secret ${en}`],()=>d().cfg.enableSecret===en),
      G1(`VTY lines 0–15: password ${vty}, and require it`,sw,'line:vty',['line vty 0 15',`password ${vty}`,'login'],()=>lineOK(d().cfg.lines.vty,vty)),
      G1(`Give VLAN 1 the address ${a.sw} ${a.mask}`,sw,'if:Vlan1',['interface vlan 1',`ip address ${a.sw} ${a.mask}`],()=>has(d(),'Vlan1',a.sw,a.mask)),
      G1('Turn VLAN 1 on',sw,'if:Vlan1',['interface vlan 1','no shutdown'],()=>up(d(),'Vlan1')),
      G1(`Set the default gateway to R1, ${a.gw}`,sw,'config',[`ip default-gateway ${a.gw}`],()=>d().cfg.defaultGw===a.gw),
      G1(`From PC2 on the other LAN, ping ${sw} (${a.sw}). It only answers once it has a default gateway.`,'PC2','pc',[`ping ${a.sw}`],()=>pinged(net.devices.PC2,a.sw)),
      G1('Save it',sw,'priv',['copy running-config startup-config'],()=>saved(d()))]};}},
 {id:'router-ifaces',title:'Router interfaces',level:'Basics',skills:'interface · description · ip address · no shutdown · show ip int brief',
  build(){const a=lanIP(),b=lanIP(a),w=R(0,63)*4,wan=`10.${R(0,255)}.${R(0,255)}.`;
   const r1=I.newDevice('router','R1'),r2=I.newDevice('router','R2'),pc1=I.newDevice('pc','PC1'),pc2=I.newDevice('pc','PC2');
   const net={devices:{R1:r1,R2:r2,PC1:pc1,PC2:pc2},links:[['R1','Serial0/0/0','R2','Serial0/0/0']]};
   preCfg(r2,['hostname R2','int s0/0/0',`ip address ${wan}${w+2} 255.255.255.252`,'no shutdown'],net);
   preCfg(r1,['hostname R1'],net);pcSet(pc1,a.host,a.mask,a.gw);pcSet(pc2,b.host,b.mask,b.gw);
   const d=()=>net.devices.R1;
   return {net,tabs:['R1','PC1'],intro:'R1’s interfaces are all shut down with no addresses. Address them from the table, turn them on, and check your work.',
    table:[['R1','G0/0',a.gw,a.mask,'LAN A'],['R1','G0/1',b.gw,b.mask,'LAN B'],['R1','S0/0/0',`${wan}${w+1}`,'255.255.255.252','Link to R2'],['R2','S0/0/0',`${wan}${w+2}`,'255.255.255.252','(done)'],['PC1','NIC',a.host,a.mask,`gateway ${a.gw}`],['PC2','NIC',b.host,b.mask,`gateway ${b.gw}`]],
    goals:[G1(`G0/0: description “LAN A”, ${a.gw} ${a.mask}, turned on`,'R1','if:GigabitEthernet0/0',['interface g0/0','description LAN A',`ip address ${a.gw} ${a.mask}`,'no shutdown'],()=>has(d(),'GigabitEthernet0/0',a.gw,a.mask)&&up(d(),'GigabitEthernet0/0')&&/lan a/i.test(d().cfg.ifaces['GigabitEthernet0/0'].desc||'')),
      G1(`G0/1: description “LAN B”, ${b.gw} ${b.mask}, turned on`,'R1','if:GigabitEthernet0/1',['interface g0/1','description LAN B',`ip address ${b.gw} ${b.mask}`,'no shutdown'],()=>has(d(),'GigabitEthernet0/1',b.gw,b.mask)&&up(d(),'GigabitEthernet0/1')&&/lan b/i.test(d().cfg.ifaces['GigabitEthernet0/1'].desc||'')),
      G1(`S0/0/0: ${wan}${w+1} 255.255.255.252, turned on`,'R1','if:Serial0/0/0',['interface s0/0/0',`ip address ${wan}${w+1} 255.255.255.252`,'no shutdown'],()=>has(d(),'Serial0/0/0',`${wan}${w+1}`,'255.255.255.252')&&up(d(),'Serial0/0/0')),
      G1('Check the interfaces with show ip interface brief','R1','priv',['show ip interface brief'],()=>(d().log||[]).some(l=>/^\s*(do\s+)?sh\S*\s+ip\s+int\S*\s+br/i.test(l.input))),
      G1(`Ping R2 across the serial link (${wan}${w+2})`,'R1','priv',[`ping ${wan}${w+2}`],()=>pinged(d(),`${wan}${w+2}`)),
      G1(`From PC1, ping PC2 (${b.host}) on the other LAN`,'PC1','pc',[`ping ${b.host}`],()=>pinged(net.devices.PC1,b.host))]};}},
 {id:'ssh',title:'Set up SSH',level:'Remote access',skills:'ip domain-name · crypto key · username · transport input ssh · login local',
  build(){const a=lanIP(),sw=pick(SWS),dom=pick(DOMAINS),u=pick(USERS),p=pick(STRONG),en=pick(WORDS);
   const s=I.newDevice('switch','Switch'),pc=I.newDevice('pc','PC1');const net={devices:{[sw]:s,PC1:pc}};
   preCfg(s,['int vlan 1',`ip address ${a.sw} ${a.mask}`,'no shutdown',`enable secret ${en}`],net);s.startup=null;pcSet(pc,a.host,a.mask,a.gw);
   const d=()=>net.devices[sw];
   return {net,tabs:[sw,'PC1'],intro:`Telnet sends passwords in clear text. Set up SSH on this switch (VLAN 1 is already ${a.sw}), then log in to it from PC1.`,
    given:[['Hostname',sw],['Domain name',dom],['RSA modulus','1024 bits'],['Username',u],['Password',p],['Enable secret (already set)',en]],
    goals:[G1(`Name it ${sw} (keys need a hostname other than Switch)`,sw,'config',[`hostname ${sw}`],()=>d().cfg.hostname===sw),
      G1(`Set the domain name to ${dom}`,sw,'config',[`ip domain-name ${dom}`],()=>d().cfg.domain===dom),
      G1('Generate 1024-bit RSA keys',sw,'config',['crypto key generate rsa','1024'],()=>d().cfg.rsaBits>=1024),
      G1('Use SSH version 2',sw,'config',['ip ssh version 2'],()=>d().cfg.sshVer===2),
      G1(`Create the account ${u} with the secret ${p}`,sw,'config',[`username ${u} secret ${p}`],()=>!!d().cfg.users[u]&&d().cfg.users[u].pw===p&&d().cfg.users[u].secret),
      G1('VTY lines 0–15: SSH only, logging in with local accounts',sw,'line:vty',['line vty 0 15','transport input ssh','login local'],()=>d().cfg.lines.vty.transport==='ssh'&&d().cfg.lines.vty.login==='local'),
      G1(`From PC1, log in with ssh -l ${u} ${a.sw}`,'PC1','pc',[`ssh -l ${u} ${a.sw}`,p],()=>(net.devices.PC1.sshOK||[]).some(x=>x.ip===a.sw&&x.user===u)),
      G1('Back on the switch console, save the configuration',sw,'priv',['copy running-config startup-config'],()=>saved(d()))]};}},
 {id:'harden',title:'Harden logins',level:'Security',skills:'security passwords min-length · login block-for · exec-timeout · service password-encryption',
  build(){const h=pick(HOSTS),en=pick(STRONG);const r=I.newDevice('router','R1');const net={devices:{[h]:r}};
   preCfg(r,[`hostname ${h}`,'enable secret class','line con 0','password cisco','login','line vty 0 4','password cisco','login'],net);
   const d=()=>net.devices[h];
   return {net,tabs:[h],intro:'This router works, but its logins are weak: short passwords, no lockout, and sessions that never time out. Tighten it up.',
    given:[['New enable secret (8+ characters)',en]],
    goals:[G1('Require passwords of at least 8 characters',h,'config',['security passwords min-length 8'],()=>d().cfg.minLen>=8),
      G1(`Replace the enable secret with ${en}`,h,'config',[`enable secret ${en}`],()=>d().cfg.enableSecret===en),
      G1('Block logins for 120 seconds after 3 failures within 60 seconds',h,'config',['login block-for 120 attempts 3 within 60'],()=>{const b=d().cfg.blockFor;return b&&b.time===120&&b.attempts===3&&b.within===60;}),
      G1('Console: log idle sessions out after 5 minutes',h,'line:con',['line console 0','exec-timeout 5 0'],()=>{const t=d().cfg.lines.con.execTimeout;return t&&t[0]===5&&t[1]===0;}),
      G1('VTY lines: log idle sessions out after 5 minutes',h,'line:vty',['line vty 0 4','exec-timeout 5 0'],()=>{const t=d().cfg.lines.vty.execTimeout;return t&&t[0]===5&&t[1]===0;}),
      G1('Encrypt the plain-text line passwords',h,'config',['service password-encryption'],()=>d().cfg.spe),
      G1('Save it',h,'priv',['copy running-config startup-config'],()=>saved(d()))]};}},
 {id:'reset',title:'Reset a switch to factory defaults',level:'Save & reset',skills:'erase startup-config · delete vlan.dat · reload',
  build(){const sw=pick(SWS);const s=I.newDevice('switch','Switch');const net={devices:{[sw]:s}};
   preCfg(s,[`hostname ${sw}`,'enable secret class','banner motd #Lab switch#','int vlan 1','ip address 192.168.1.2 255.255.255.0','no shutdown'],net);
   s.startup=I.clone(s.cfg);s.dirty=false;s.mode='user';
   const d=()=>net.devices[sw];
   return {net,tabs:[sw],intro:'Before a new lab, wipe this switch: the saved configuration and the VLAN database both have to go, then restart it. The enable secret is <b>class</b>.',
    goals:[G1('Erase the startup configuration',sw,'priv',['erase startup-config',''],()=>d().erased),
      G1('Delete the VLAN database (vlan.dat)',sw,'priv',['delete vlan.dat','',''],()=>!d().flash['vlan.dat']),
      G1('Reload without saving, and it comes back as “Switch” with no configuration',sw,'priv',['reload','no',''],()=>d().reloads>0&&d().cfg.hostname==='Switch'&&!d().cfg.enableSecret)]};}},
 {id:'register',title:'Fix the configuration register',level:'Save & reset',skills:'show version · config-register 0x2102',
  build(){const r=I.newDevice('router','R1');const net={devices:{R1:r}};
   preCfg(r,['hostname R1','config-register 0x2142','enable secret class'],net);r.startup=I.clone(r.cfg);r.bootReg='0x2142';r.dirty=false;
   const d=()=>net.devices.R1;
   return {net,tabs:['R1'],intro:'After a password recovery, this router was left set to ignore its saved configuration at boot (register 0x2142), so it boots blank every time. Check it and set it back to 0x2102. The enable secret is <b>class</b>.',
    goals:[G1('Look at the configuration register with show version','R1','priv',['show version'],()=>!!d().seen['show version']),
      G1('Set the configuration register to 0x2102','R1','config',['config-register 0x2102'],()=>d().cfg.configReg==='0x2102'),
      G1('Confirm with show version: “will be 0x2102 at next reload”','R1','priv',['show version'],()=>d().cfg.configReg==='0x2102'&&(d().log||[]).some((l,i,a)=>/^\s*(do\s+)?sh\S*\s+ver/i.test(l.input)&&a.slice(0,i).some(x=>/config-reg/i.test(x.input)))),
      G1('Save','R1','priv',['copy running-config startup-config'],()=>saved(d()))]};}},
 {id:'backup',title:'Back up and restore a configuration',level:'Save & reset',skills:'copy running-config flash: · copy flash: running-config',
  build(){const h=pick(HOSTS),f=pick(['backup.cfg',`${h}-config`,'lab-backup.txt']),bad=pick(['Oops-R1','Wrong-Name','Test-R9']);const r=I.newDevice('router','R1');const net={devices:{[h]:r}};
   preCfg(r,[`hostname ${h}`,'no ip domain-lookup','banner motd #Authorized users only#'],net);
   const d=()=>net.devices[h];
   return {net,tabs:[h],intro:`Make a backup in flash before you experiment, so you can roll back.`,given:[['Backup file name',f]],
    goals:[G1(`Back up the running configuration to flash:${f}`,h,'priv',[`copy running-config flash:${f}`,''],()=>!!(d().flashCfg||{})[f]),
      G1('List the files in flash to check the backup is there',h,'priv',['show flash'],()=>!!d().seen['show flash']&&!!(d().flashCfg||{})[f]),
      G1(`Make a “mistake”: rename the router ${bad}`,h,'config',[`hostname ${bad}`],()=>(d().log||[]).some(l=>new RegExp('^\\s*host\\S*\\s+'+bad+'\\s*$','i').test(l.input))),
      G1(`Restore the backup with copy flash:${f} running-config`,h,'priv',[`copy flash:${f} running-config`,''],()=>d().restored===f&&d().cfg.hostname===h)]};}},
 {id:'scenario',title:'Subnetting Scenario, Part 2',level:'Packet Tracer lab',skills:'configure R1’s LANs · switch VLAN 1 + gateway · PC settings · verify',
  build(p){return scenario(p);}},
 {id:'connect-router',title:'Connect a Router to a LAN',level:'Packet Tracer lab',skills:'show interfaces · show ip route · interfaces with descriptions · save · verify',
  build(){return connectRouter();}},
 {id:'subnet-ipv4',title:'Subnet an IPv4 Network, Part 2',level:'Packet Tracer lab',skills:'router secret, console, hostname, LANs, save · two switches · two PCs · test',
  build(p){return subnetTask(p);}},
 {id:'vlsm-scenario',title:'VLSM Design, Part 3',level:'Packet Tracer lab',skills:'R1 LANs with different masks · switch VLAN 1 + gateway · PC settings · verify',
  build(p){return vlsmScenario(p);}},
];

/* the Cisco "Subnetting Scenario" lab (11.7.5), Part 2: same addressing rules as Subnet Sprint's lab mode */
function scenario(p){
  const base=I.ip2n(p&&p.lab||'192.168.100.0'),hosts=Number(p&&p.hosts||25),r1n=Number(p&&p.r1||2),r2n=Number(p&&p.r2||2);
  const need=r1n+r2n+1,n=Math.ceil(Math.log2(need)),blk=2**(8-n),mask=I.n2ip((0xFFFFFF00|(256-blk))>>>0),ip=x=>I.n2ip(x>>>0);
  const lans=[];let s=0;[['R1',r1n],['R2',r2n]].forEach(([rt,c])=>{for(let g=0;g<c;g++){s++;lans.push({rt,ifc:`GigabitEthernet0/${g}`,short:`G0/${g}`,sw:`S${s}`,pc:`PC${s}`,net:base+(s-1)*blk});}});
  const wanNet=base+(s)*blk;
  const devs={R1:I.newDevice('router','R1',{gig:['0/0','0/1','0/2']}),R2:I.newDevice('router','R2',{gig:['0/0','0/1','0/2']})};
  lans.forEach(l=>{devs[l.sw]=I.newDevice('switch',l.sw);devs[l.pc]=I.newDevice('pc',l.pc);});
  const net={devices:devs,links:[['R1','Serial0/0/0','R2','Serial0/0/0']]};
  const sw3=lans.filter(l=>l.rt==='R2')[0],pc4=lans.filter(l=>l.rt==='R2').slice(-1)[0];
  // everything except R1's LAN ports, the chosen switch and the chosen PC is already configured (like the .pka)
  preCfg(devs.R1,['hostname R1','int s0/0/0',`ip address ${ip(wanNet+1)} ${mask}`,'no shutdown'],net);
  preCfg(devs.R2,['hostname R2',...lans.filter(l=>l.rt==='R2').flatMap(l=>[`int ${l.short.toLowerCase()}`,`ip address ${ip(l.net+1)} ${mask}`,'no shutdown']),'int s0/0/0',`ip address ${ip(wanNet+blk-2)} ${mask}`,'no shutdown'],net);
  lans.forEach(l=>{if(l!==sw3)preCfg(devs[l.sw],[`hostname ${l.sw}`,'int vlan 1',`ip address ${ip(l.net+2)} ${mask}`,'no shutdown',`ip default-gateway ${ip(l.net+1)}`],net);else preCfg(devs[l.sw],[`hostname ${l.sw}`],net);
    if(l!==pc4)pcSet(devs[l.pc],ip(l.net+blk-2),mask,ip(l.net+1));});
  const r1l=lans.filter(l=>l.rt==='R1'),d=x=>net.devices[x];
  const table=[];
  ['R1','R2'].forEach(rt=>{lans.filter(l=>l.rt===rt).forEach(l=>table.push([rt,l.short,ip(l.net+1),mask,'N/A']));table.push([rt,'S0/0/0',ip(rt==='R1'?wanNet+1:wanNet+blk-2),mask,'N/A']);});
  lans.forEach(l=>table.push([l.sw,'VLAN 1',ip(l.net+2),mask,ip(l.net+1)]));lans.forEach(l=>table.push([l.pc,'NIC',ip(l.net+blk-2),mask,ip(l.net+1)]));
  const goals=[];
  r1l.forEach(l=>goals.push(G1(`R1 ${l.short}: ${ip(l.net+1)} ${mask}, turned on`,'R1',`if:${l.ifc}`,[`interface ${l.short.toLowerCase()}`,`ip address ${ip(l.net+1)} ${mask}`,'no shutdown'],()=>has(d('R1'),l.ifc,ip(l.net+1),mask)&&up(d('R1'),l.ifc))));
  goals.push(G1(`${sw3.sw} VLAN 1: ${ip(sw3.net+2)} ${mask}, turned on`,sw3.sw,'if:Vlan1',['interface vlan 1',`ip address ${ip(sw3.net+2)} ${mask}`,'no shutdown'],()=>has(d(sw3.sw),'Vlan1',ip(sw3.net+2),mask)&&up(d(sw3.sw),'Vlan1')));
  goals.push(G1(`${sw3.sw} default gateway: ${ip(sw3.net+1)}`,sw3.sw,'config',[`ip default-gateway ${ip(sw3.net+1)}`],()=>d(sw3.sw).cfg.defaultGw===ip(sw3.net+1)));
  goals.push(G1(`${pc4.pc}: ${ip(pc4.net+blk-2)}, mask ${mask}, gateway ${ip(pc4.net+1)}`,pc4.pc,'pcip',[],()=>{const x=d(pc4.pc);return x.ip===ip(pc4.net+blk-2)&&x.mask===mask&&x.gw===ip(pc4.net+1);}));
  goals.push(G1(`Verify: from ${pc4.pc}, ping R1 ${r1l[0].short} (${ip(r1l[0].net+1)})`,pc4.pc,'pc',[`ping ${ip(r1l[0].net+1)}`],()=>pinged(d(pc4.pc),ip(r1l[0].net+1))));
  goals.push(G1(`Verify: from ${sw3.sw}, ping ${r1l[0].pc} (${ip(r1l[0].net+blk-2)})`,sw3.sw,'priv',[`ping ${ip(r1l[0].net+blk-2)}`],()=>pinged(d(sw3.sw),ip(r1l[0].net+blk-2))));
  goals.push(G1(`Verify: from R1, ping ${pc4.pc} (${ip(pc4.net+blk-2)})`,'R1','priv',[`ping ${ip(pc4.net+blk-2)}`],()=>pinged(d('R1'),ip(pc4.net+blk-2))));
  return {net,tabs:['R1',sw3.sw,pc4.pc],intro:`Part 2 of the Cisco “Subnetting Scenario” lab on ${ip(base)}/24 (${hosts} addresses per LAN). Most of the network is already configured, and dynamic routing between R1 and R2 is running. Finish the addressing from the Addressing Table and check you can reach everything. <span class="dim">Part 1 (the subnetting) is in Subnet Sprint.</span>`,
    table:table.map(t=>[t[0],t[1],t[2],t[3],t[4]]),tableHead:['Device','Interface','IP address','Subnet mask','Default gateway'],goals,
    params:{lab:ip(base),hosts,r1:r1n,r2:r2n}};
}

const CHEAT=[
 ['Modes and moving around',[
  ['Router> enable','en','Privileged EXEC mode (#)'],['Router# configure terminal','conf t','Global configuration mode'],['Router(config)# interface g0/0','int g0/0','Interface configuration'],
  ['Router(config)# line console 0','line con 0','Console line configuration'],['… exit','','Up one level'],['… end','Ctrl+Z','Straight back to Router#'],['Router# disable','','Back to Router>'],
  ['Router(config)# do show ip interface brief','do sh ip int br','Run an EXEC command from any config mode'],['any prompt: ?','','List what you can type next'],['partial word + Tab','','Complete the word']]],
 ['Basic setup',[
  ['Router(config)# hostname R1','','Name the device'],['Router(config)# no ip domain-lookup','','Typos aren’t treated as hostnames'],['Router(config)# banner motd #Authorized users only#','','Message of the day (any matching delimiter)'],
  ['Switch(config)# ip default-gateway 192.168.1.1','','A switch’s gateway (switches only)'],['Switch(config)# ipv6 default-gateway 2001:db8::1','','IPv6 gateway on a switch']]],
 ['Passwords',[
  ['Router(config)# enable secret class','','Encrypted privileged-mode password'],['Router(config)# service password-encryption','','Encrypt plain-text passwords (type 7)'],
  ['Router(config)# line console 0 → password cisco → login','line con 0 · pass · login','Console password'],['Router(config)# line vty 0 4 → password cisco → login','','Telnet/SSH password: routers vty 0 4, switches vty 0 15']]],
 ['Interfaces',[
  ['Router(config-if)# description Bldg 1 Room 106','desc','Label the interface'],['Router(config-if)# ip address 192.168.1.1 255.255.255.0','ip add','Mask in dotted decimal, not /24'],
  ['Router(config-if)# no shutdown','no shut','Router interfaces are OFF by default; switch ports are ON'],['Router(config-if)# ipv6 address 2001:db8:acad:1::1/64','',''],['Router(config-if)# ipv6 address fe80::1 link-local','','Link-local address'],
  ['Switch(config)# interface vlan 1 → ip address … → no shutdown','int vlan 1','A switch’s management address']]],
 ['SSH',[
  ['Switch(config)# hostname S1','','Keys need a hostname other than Switch/Router'],['Switch(config)# ip domain-name lab.local','','…and a domain name'],['Switch(config)# crypto key generate rsa','','Answer 1024 for the modulus'],
  ['Switch(config)# ip ssh version 2','',''],['Switch(config)# username admin secret Str0ngPass','','Local account'],['Switch(config)# line vty 0 15 → transport input ssh → login local','','SSH only, local accounts'],['PC> ssh -l admin 192.168.1.2','','Log in from a PC']]],
 ['Security',[
  ['Router(config)# security passwords min-length 8','',''],['Router(config)# login block-for 120 attempts 3 within 60','','Quiet period after failed logins'],['Router(config-line)# exec-timeout 5 0','','Log out idle sessions (minutes seconds)'],['Router(config-line)# transport input ssh','','Require SSH']]],
 ['Save, reset and files',[
  ['Router# copy running-config startup-config','copy run start','Save to NVRAM'],['Router# show version','sh ver','Configuration register should be 0x2102'],['Router(config)# config-register 0x2102','','Load startup-config at boot'],
  ['Switch# erase startup-config','','Erase the saved config'],['Switch# delete vlan.dat','','Switches only: VLAN database'],['Switch# reload','','Restart (say no to saving if you’re resetting)'],
  ['Router# copy running-config flash:backup.cfg','','Back up to flash'],['Router# copy flash:backup.cfg running-config','','Restore from flash']]],
 ['Verify',[
  ['Router# show running-config','sh run','Current configuration'],['Router# show ip interface brief','sh ip int br','Addresses and up/down status'],['Router# show running-config | include hostname','','Filter output'],['Router# ping 192.168.1.10','','Test a connection']]],
];

/* the commands to reach where a goal starts, from the device's current mode */
function navTo(d,where){
  if(d.type==='pc'||where==='pc'||where==='pcip')return [];
  const m=d.mode,inCfg=['config','if','line'].includes(m);
  if(where==='user')return m==='user'?[]:m==='priv'?['disable']:['end','disable'];
  if(where==='priv')return m==='priv'?[]:m==='user'?['enable']:['end'];
  if(where==='config')return inCfg?(m==='config'?[]:['exit']):m==='priv'?['configure terminal']:['enable','configure terminal'];
  // interface and line goals start with the command that selects them, which works from any configuration mode
  const [k,ctx]=where.split(':');if((k==='if'&&m==='if'&&d.ctx===ctx)||(k==='line'&&m==='line'&&d.ctx===ctx))return null;
  return inCfg?[]:m==='priv'?['configure terminal']:['enable','configure terminal'];
}
function showMe(goal,d){const nav=navTo(d,goal.where);if(nav===null)return goal.cmds.slice(1);return nav.concat(goal.cmds);}

// 11.9.3 VLSM Design and Implementation, Part 3: same topology, but each LAN has its own mask and the link is a /30
function vlsmScenario(p){
  const base=I.ip2n(p&&p.vlsm||'192.168.72.0'),hs=String(p&&p.hosts||'50,25,12,6').split(',').map(Number),ip=x=>I.n2ip(x>>>0);
  const hb=H=>{let h=2;while(2**h-2<H)h++;return h;},mk=h=>I.n2ip(((0xFFFFFFFF<<h)>>>0));
  const lans=[['R1','0/0'],['R1','0/1'],['R2','0/0'],['R2','0/1']].map(([rt,g],i)=>{const h=hb(hs[i]);return {i,rt,ifc:`GigabitEthernet${g}`,short:`G${g}`,sw:`S${i+1}`,pc:`PC${i+1}`,H:hs[i],blk:2**h,mask:mk(h),p:32-h};});
  const wan={blk:4,mask:mk(2),p:30};let at=base;
  [...lans.slice().sort((a,b)=>b.H-a.H||a.i-b.i),wan].forEach(l=>{l.net=at;at+=l.blk;});
  const first=l=>ip(l.net+1),last=l=>ip(l.net+l.blk-2);
  const devs={R1:I.newDevice('router','R1',{gig:['0/0','0/1','0/2']}),R2:I.newDevice('router','R2',{gig:['0/0','0/1','0/2']})};
  lans.forEach(l=>{devs[l.sw]=I.newDevice('switch',l.sw);devs[l.pc]=I.newDevice('pc',l.pc);});
  const net={devices:devs,links:[['R1','Serial0/0/0','R2','Serial0/0/0']]};
  const r1l=lans.filter(l=>l.rt==='R1'),r2l=lans.filter(l=>l.rt==='R2'),sw3=r2l[0],pc4=r2l[1],d=x=>net.devices[x];
  preCfg(devs.R1,['hostname R1','int s0/0/0',`ip address ${first(wan)} ${wan.mask}`,'no shutdown'],net);
  preCfg(devs.R2,['hostname R2',...r2l.flatMap(l=>[`int ${l.short.toLowerCase()}`,`ip address ${first(l)} ${l.mask}`,'no shutdown']),'int s0/0/0',`ip address ${last(wan)} ${wan.mask}`,'no shutdown'],net);
  lans.forEach(l=>{if(l!==sw3)preCfg(devs[l.sw],[`hostname ${l.sw}`,'int vlan 1',`ip address ${ip(l.net+2)} ${l.mask}`,'no shutdown',`ip default-gateway ${first(l)}`],net);else preCfg(devs[l.sw],[`hostname ${l.sw}`],net);
    if(l!==pc4)pcSet(devs[l.pc],last(l),l.mask,first(l));});
  const table=[];
  ['R1','R2'].forEach(rt=>{lans.filter(l=>l.rt===rt).forEach(l=>table.push([rt,l.short,first(l),l.mask,'N/A']));table.push([rt,'S0/0/0',rt==='R1'?first(wan):last(wan),wan.mask,'N/A']);});
  lans.forEach(l=>table.push([l.sw,'VLAN 1',ip(l.net+2),l.mask,first(l)]));lans.forEach(l=>table.push([l.pc,'NIC',last(l),l.mask,first(l)]));
  const goals=[];
  r1l.forEach(l=>goals.push(G1(`R1 ${l.short}: ${first(l)} ${l.mask} (/${l.p}), turned on`,'R1',`if:${l.ifc}`,[`interface ${l.short.toLowerCase()}`,`ip address ${first(l)} ${l.mask}`,'no shutdown'],()=>has(d('R1'),l.ifc,first(l),l.mask)&&up(d('R1'),l.ifc))));
  goals.push(G1(`${sw3.sw} VLAN 1: ${ip(sw3.net+2)} ${sw3.mask}, turned on`,sw3.sw,'if:Vlan1',['interface vlan 1',`ip address ${ip(sw3.net+2)} ${sw3.mask}`,'no shutdown'],()=>has(d(sw3.sw),'Vlan1',ip(sw3.net+2),sw3.mask)&&up(d(sw3.sw),'Vlan1')));
  goals.push(G1(`${sw3.sw} default gateway: ${first(sw3)}`,sw3.sw,'config',[`ip default-gateway ${first(sw3)}`],()=>d(sw3.sw).cfg.defaultGw===first(sw3)));
  goals.push(G1(`${pc4.pc}: ${last(pc4)}, mask ${pc4.mask}, gateway ${first(pc4)}`,pc4.pc,'pcip',[],()=>{const x=d(pc4.pc);return x.ip===last(pc4)&&x.mask===pc4.mask&&x.gw===first(pc4);}));
  goals.push(G1(`Verify: from ${pc4.pc}, ping R1 ${r1l[0].short} (${first(r1l[0])})`,pc4.pc,'pc',[`ping ${first(r1l[0])}`],()=>pinged(d(pc4.pc),first(r1l[0]))));
  goals.push(G1(`Verify: from ${pc4.pc}, ping ${r1l[1].pc} (${last(r1l[1])})`,pc4.pc,'pc',[`ping ${last(r1l[1])}`],()=>pinged(d(pc4.pc),last(r1l[1]))));
  goals.push(G1(`Verify: from R1, ping ${sw3.sw} (${ip(sw3.net+2)})`,'R1','priv',[`ping ${ip(sw3.net+2)}`],()=>pinged(d('R1'),ip(sw3.net+2))));
  return {net,tabs:['R1',sw3.sw,pc4.pc],intro:`Part 3 of the Cisco “VLSM Design and Implementation” lab on ${ip(base)}/24 (LANs of ${hs.join(', ')} hosts). Every subnet has its own mask, so check each one against the Addressing Table. Most of the network is already configured and routing between R1 and R2 is running. Finish the addressing and check you can reach everything.`,
    table,tableHead:['Device','Interface','IP address','Subnet mask','Default gateway'],goals,params:{vlsm:ip(base),hosts:hs.join(',')}};
}

// 11.5.5 Subnet an IPv4 Network, Part 2: configure CustomerRouter (secret, console, hostname, two LANs, save),
// both LAN switches and both PCs from the Addressing Table, then test with ping
function subnetTask(p){
  const base=I.ip2n(p&&p.subnet||'192.168.0.0'),hs=String(p&&p.hosts||'50,40').split(',').map(Number),spare=Number(p&&p.spare||2),ip=x=>I.n2ip(x>>>0);
  const need=2+spare;let n=1;while(2**n<need)n++;const blk=2**(8-n),mask=I.n2ip(((0xFFFFFFFF<<(8-n))>>>0)),pfx=24+n;
  const lans=[{name:'LAN-A',sw:'LAN-A Switch',pc:'PC-A',ifc:'GigabitEthernet0/0',short:'G0/0',net:base},{name:'LAN-B',sw:'LAN-B Switch',pc:'PC-B',ifc:'GigabitEthernet0/1',short:'G0/1',net:base+blk}];
  const first=l=>ip(l.net+1),swip=l=>ip(l.net+2),last=l=>ip(l.net+blk-2);
  const R=I.newDevice('router','CustomerRouter',{gig:['0/0','0/1']});R.cfg.hostname='Router';
  const devs={CustomerRouter:R};lans.forEach(l=>{devs[l.sw]=I.newDevice('switch',l.sw);devs[l.sw].cfg.hostname='Switch';devs[l.pc]=I.newDevice('pc',l.pc);});
  const net={devices:devs,links:[]},d=x=>net.devices[x];
  const table=[...lans.map(l=>['CustomerRouter',l.short,first(l),mask,'N/A']),['CustomerRouter','S0/1/0','209.165.201.2','255.255.255.252','N/A'],
    ...lans.map(l=>[l.sw,'VLAN 1',swip(l),mask,first(l)]),...lans.map(l=>[l.pc,'NIC',last(l),mask,first(l)])];
  const goals=[
    G1('CustomerRouter: enable secret Class123','CustomerRouter','config',['enable secret Class123'],()=>R.cfg.enableSecret==='Class123'),
    G1('CustomerRouter: console password Cisco123, required at login','CustomerRouter','line:con',['line console 0','password Cisco123','login'],()=>R.cfg.lines.con.password==='Cisco123'&&R.cfg.lines.con.login==='line'),
    G1('Name the router CustomerRouter','CustomerRouter','config',['hostname CustomerRouter'],()=>R.cfg.hostname==='CustomerRouter'),
    ...lans.map(l=>G1(`CustomerRouter ${l.short} (${l.name}): ${first(l)} ${mask}, turned on`,'CustomerRouter',`if:${l.ifc}`,[`interface ${l.short.toLowerCase()}`,`ip address ${first(l)} ${mask}`,'no shutdown'],()=>has(R,l.ifc,first(l),mask)&&up(R,l.ifc))),
    G1('Save the running configuration to the startup configuration','CustomerRouter','priv',['copy running-config startup-config',''],()=>{const st=R.startup;return !!st&&st.hostname==='CustomerRouter'&&st.enableSecret==='Class123'&&lans.every(l=>st.ifaces[l.ifc]&&st.ifaces[l.ifc].ip===first(l)&&!st.ifaces[l.ifc].shutdown);}),
    ...lans.flatMap(l=>[G1(`${l.sw} VLAN 1: ${swip(l)} ${mask}, turned on`,l.sw,'if:Vlan1',['interface vlan 1',`ip address ${swip(l)} ${mask}`,'no shutdown'],()=>has(d(l.sw),'Vlan1',swip(l),mask)&&up(d(l.sw),'Vlan1')),
      G1(`${l.sw} default gateway: ${first(l)}`,l.sw,'config',[`ip default-gateway ${first(l)}`],()=>d(l.sw).cfg.defaultGw===first(l))]),
    ...lans.map(l=>G1(`${l.pc}: ${last(l)}, mask ${mask}, gateway ${first(l)}`,l.pc,'pcip',[],()=>{const x=d(l.pc);return x.ip===last(l)&&x.mask===mask&&x.gw===first(l);})),
    ...lans.map(l=>G1(`Test: from ${l.pc}, ping its default gateway (${first(l)})`,l.pc,'pc',[`ping ${first(l)}`],()=>pinged(d(l.pc),first(l)))),
    G1(`Test: from PC-A, ping PC-B (${last(lans[1])})`,'PC-A','pc',[`ping ${last(lans[1])}`],()=>pinged(d('PC-A'),last(lans[1]))),
  ];
  return {net,tabs:['CustomerRouter',...lans.map(l=>l.sw),...lans.map(l=>l.pc)],
    intro:`Parts 2 and 3 of the Cisco “Subnet an IPv4 Network” lab: ${ip(base)}/24 cut into /${pfx} subnets (LAN-A ${hs[0]} hosts, LAN-B ${hs[1]}, ${spare} spare). Configure the router’s basic settings and LANs, the two switches and the two PCs from the Addressing Table, save, then test with ping. The ISP side is already set up.`,
    given:[['Enable secret','Class123'],['Console password','Cisco123'],['Hostname','CustomerRouter']],
    table,tableHead:['Device','Interface','IP address','Subnet mask','Default gateway'],goals,params:{subnet:ip(base),hosts:hs.join(','),spare}};
}

// 10.3.4 Connect a Router to a LAN: read show output, address and describe four router interfaces, save, verify.
// The handout's fixed addresses; R1 and R2 already run OSPF over their serial link, so routes appear as LANs come up.
function connectRouter(){
  const ip=I.n2ip;
  const R1=I.newDevice('router','R1',{gig:['0/0','0/1']}),R2=I.newDevice('router','R2',{gig:['0/0','0/1']});
  const pcs=[['PC1','192.168.10.10','192.168.10.1'],['PC2','192.168.11.10','192.168.11.1'],['PC3','10.1.1.10','10.1.1.1'],['PC4','10.1.2.10','10.1.2.1']];
  const devs={R1,R2};pcs.forEach(([n,a,g])=>{devs[n]=I.newDevice('pc',n);pcSet(devs[n],a,'255.255.255.0',g);});
  const net={devices:devs,links:[['R1','Serial0/0/0','R2','Serial0/0/0']],routing:true};
  [[R1,'209.165.200.225'],[R2,'209.165.200.226']].forEach(([r,a])=>preCfg(r,[`hostname ${r.name}`,'enable secret class','line console 0','password cisco','login','exit','int s0/0/0',`ip address ${a} 255.255.255.252`,'no shutdown'],net));
  // like the .pka: the consoles start at the login prompt (password cisco)
  [R1,R2].forEach(r=>{r.mode='user';r.out=[];I.sessionStart(r);r.out=[];});
  const LANS=[[R1,'GigabitEthernet0/0','G0/0','192.168.10.1','S1'],[R1,'GigabitEthernet0/1','G0/1','192.168.11.1','S2'],[R2,'GigabitEthernet0/0','G0/0','10.1.1.1','S3'],[R2,'GigabitEthernet0/1','G0/1','10.1.2.1','S4']];
  const goals=[
    ...LANS.map(([r,n,sh,a,sw])=>G1(`${r.name} ${sh}: ${a} 255.255.255.0, turned on, with a description (like “LAN connection to ${sw}”)`,r.name,`if:${n}`,[`interface ${sh.toLowerCase()}`,`ip address ${a} 255.255.255.0`,'no shutdown',`description LAN connection to ${sw}`],
      ()=>has(r,n,a,'255.255.255.0')&&up(r,n)&&!!(r.cfg.ifaces[n].desc||'').trim())),
    ...[R1,R2].map(r=>G1(`Save ${r.name}’s configuration to NVRAM`,r.name,'priv',['copy running-config startup-config',''],()=>{const st=r.startup;return !!st&&LANS.filter(x=>x[0]===r).every(([,n,,a])=>st.ifaces[n]&&st.ifaces[n].ip===a&&!st.ifaces[n].shutdown&&st.ifaces[n].desc);})),
    G1('Test: from PC1, ping PC4 (10.1.2.10)','PC1','pc',['ping 10.1.2.10'],()=>pinged(devs.PC1,'10.1.2.10')),
    G1('Test: from R2, ping PC2 (192.168.11.10)','R2','priv',['ping 192.168.11.10'],()=>pinged(R2,'192.168.11.10')),
  ];
  // the handout's questions, checked against the devices as they are when you answer
  const cmd=(id,ifc)=>v=>{const t=String(v).trim().replace(/^R\d[>#]\s*/i,'');const r=I.parse('priv',t,R1);return !!(r&&r.ok&&r.id===id&&(ifc?r.args[0]&&I.ifaceName(r.args[0],R1)===ifc:!r.args.length));};
  const num=f=>v=>/^\s*\d+\s*$/.test(String(v))&&Number(v)===f();
  const norm=v=>String(v).trim().toLowerCase().replace(/\s+/g,' ');
  const Cn=r=>I.routesOf(r,net).filter(x=>x.c==='C').length,On=r=>I.routesOf(r,net).filter(x=>x.c==='O').length;
  const upN=r=>Object.entries(r.cfg.ifaces).filter(([n,x])=>x.ip&&!x.shutdown).length;
  const macOK=v=>String(v).toLowerCase().replace(/[^0-9a-f]/g,'')===I.macOf(R1,'GigabitEthernet0/0').replace(/\./g,'');
  const questions=[
    {text:'Which command displays the statistics for all interfaces configured on a router?',check:cmd('show interfaces'),answer:'show interfaces'},
    {text:'Which command displays the information about the Serial 0/0/0 interface only?',check:cmd('show interfaces','Serial0/0/0'),answer:'show interfaces serial 0/0/0'},
    {text:'What is the IP address configured on R1’s Serial 0/0/0?',check:v=>/^\s*209\.165\.200\.225(\s*\/\s*30)?\s*$/.test(v),answer:'209.165.200.225/30',how:'show interfaces serial 0/0/0, the “Internet address is” line'},
    {text:'What is the bandwidth on the Serial 0/0/0 interface?',check:v=>/^\s*1\s*,?\s*544\s*(k|kb|kbit|kbps|kbit\/sec)?\s*$/i.test(v),answer:'1544 Kbit/sec',how:'the BW value in show interfaces serial 0/0/0'},
    {text:'What is the MAC address of R1’s GigabitEthernet 0/0 interface?',check:macOK,answer:I.macOf(R1,'GigabitEthernet0/0'),how:'show interfaces gigabitethernet 0/0, “address is …”'},
    {text:'What is the bandwidth (BW) of the GigabitEthernet 0/0 interface?',check:v=>/^\s*1\s*,?\s*000\s*,?\s*000\s*(k|kb|kbit|kbps|kbit\/sec)?\s*$/i.test(v)||/^\s*1\s*(g|gb|gbps|gbit)\s*$/i.test(v),answer:'1000000 Kbit/sec',how:'the BW value in show interfaces gigabitethernet 0/0'},
    {text:'Which command displays a brief summary of the interfaces, their status, and their IP addresses?',check:cmd('show ip int brief'),answer:'show ip interface brief'},
    {text:'How many serial interfaces does each router have?',check:num(()=>Object.keys(R1.cfg.ifaces).filter(n=>n.startsWith('Serial')).length),answer:'2',how:'count the Serial lines in show ip interface brief'},
    {text:'How many Ethernet interfaces does each router have?',check:num(()=>Object.keys(R1.cfg.ifaces).filter(n=>n.startsWith('Gigabit')).length),answer:'2',how:'count the GigabitEthernet lines in show ip interface brief'},
    {text:'What command displays the contents of the routing table?',check:cmd('show ip route'),answer:'show ip route'},
    {text:'How many connected routes (code C) does R1 have right now?',check:num(()=>Cn(R1)),get answer(){return String(Cn(R1));},how:'count the C lines in show ip route on R1'},
    {text:'How does a router handle a packet for a network that isn’t in its routing table?',options:['It floods it out every interface','It sends it back to the source','It drops the packet','It broadcasts an ARP request for it'],check:v=>v==='It drops the packet',answer:'It drops the packet (no route and no default route)'},
    {text:'After configuring: how many interfaces on R1 have an IP address and are up/up?',check:num(()=>upN(R1)),get answer(){return String(upN(R1));},how:'show ip interface brief on R1'},
    {text:'What part of the interface configuration is NOT shown by show ip interface brief?',check:v=>/mask|prefix|description/i.test(v),answer:'The subnet mask (and the description)'},
    {text:'Which command can you use to verify that part?',check:v=>cmd('show run')(v)||cmd('show interfaces')(v)||/^\s*sh\w*\s+(run|interfaces?)\b/i.test(String(v).trim().replace(/^R\d[>#]\s*/i,'')),answer:'show running-config, or show interfaces'},
    {text:'After configuring: how many connected (C) routes does each router have?',check:num(()=>Cn(R1)),get answer(){return String(Cn(R1));},how:'show ip route, count the C lines'},
    {text:'After configuring: how many OSPF (O) routes does each router have?',check:num(()=>On(R1)),get answer(){return String(On(R1));},how:'show ip route, count the O lines'},
    {text:'How many LANs and WANs are in the topology altogether?',check:num(()=>5),answer:'5 (4 LANs and 1 WAN)'},
  ];
  return {net,tabs:['R1','R2','PC1'],
    intro:'The Cisco Packet Tracer lab 10.3.4. Use show commands to read R1 and R2, then address and describe their four LAN interfaces from the Addressing Table, save, and check that every network shows up in the routing tables. The serial link and OSPF are already set up; the switches aren’t configured, so you can’t ping them.',
    given:[['Console password','cisco'],['Enable secret','class']],
    table:[['R1','G0/0','192.168.10.1','255.255.255.0','N/A'],['R1','G0/1','192.168.11.1','255.255.255.0','N/A'],['R1','S0/0/0 (DCE)','209.165.200.225','255.255.255.252','N/A'],
      ['R2','G0/0','10.1.1.1','255.255.255.0','N/A'],['R2','G0/1','10.1.2.1','255.255.255.0','N/A'],['R2','S0/0/0','209.165.200.226','255.255.255.252','N/A'],
      ...pcs.map(([n,a,g])=>[n,'NIC',a,'255.255.255.0',g])],tableHead:['Device','Interface','IP address','Subnet mask','Default gateway'],goals,questions};
}
const C={DRILLS,IDNAME,TASKS,CHEAT,scenario,vlsmScenario,subnetTask,connectRouter,pick,R,navTo,showMe};
if(typeof module!=='undefined'&&module.exports)module.exports=C;else root.CS=C;
})(typeof window!=='undefined'?window:globalThis);
