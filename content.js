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
const C={DRILLS,IDNAME,TASKS,CHEAT,scenario,pick,R,navTo,showMe};
if(typeof module!=='undefined'&&module.exports)module.exports=C;else root.CS=C;
})(typeof window!=='undefined'?window:globalThis);
