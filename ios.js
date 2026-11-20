/* No Shutdown: a small Cisco IOS command simulator for practice.
   Covers the commands from a CCNA intro course: modes, basic device setup, passwords, banners, interfaces, switch
   management, SSH, login hardening, saving/erasing/reloading, the configuration register and flash backups. Commands
   accept IOS-style abbreviations (any unambiguous prefix), give IOS-style errors, and support "?" help and Tab.
   Works in the browser (window.IOS) and in Node (module.exports) so it can be unit-tested. */
(function(root){
'use strict';

/* ---------------- addresses ---------------- */
const ip2n=s=>{if(typeof s!=='string')return null;const m=s.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);if(!m)return null;const o=m.slice(1).map(Number);if(o.some(x=>x>255))return null;return ((o[0]<<24)>>>0)+(o[1]<<16)+(o[2]<<8)+o[3];};
const n2ip=n=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
const isMask=n=>{if(n==null)return false;const inv=(~n)>>>0;return ((inv+1)&inv)===0;};
const prefixOf=n=>{let c=0;for(let i=31;i>=0;i--){if((n>>>i)&1)c++;else break;}return c;};
const sameNet=(a,b,m)=>a!=null&&b!=null&&m!=null&&((a&m)>>>0)===((b&m)>>>0);
const netOf=(a,m)=>(a&m)>>>0;
const isIPv6=s=>/^[0-9a-f:]+(\/\d{1,3})?$/i.test(s)&&s.includes(':');

/* ---------------- devices ---------------- */
const IFTYPES=[['gigabitethernet','GigabitEthernet'],['fastethernet','FastEthernet'],['serial','Serial'],['vlan','Vlan'],['loopback','Loopback']];
function defaultIfaces(type,opts){
  const o={};
  if(type==='router'){(opts.gig||['0/0','0/1','0/2']).forEach(n=>o['GigabitEthernet'+n]={shutdown:true});['0/0/0','0/0/1'].forEach(n=>o['Serial'+n]={shutdown:true});}
  if(type==='switch'){for(let i=1;i<=24;i++)o['FastEthernet0/'+i]={shutdown:false};o['GigabitEthernet0/1']={shutdown:false};o['GigabitEthernet0/2']={shutdown:false};o['Vlan1']={shutdown:true};}
  return o;
}
function freshCfg(type,opts){
  return {hostname:type==='router'?'Router':'Switch',enableSecret:null,enablePassword:null,spe:false,domainLookup:true,banner:null,domain:null,
    rsaBits:0,sshVer:null,users:{},minLen:0,blockFor:null,configReg:'0x2102',defaultGw:null,
    lines:{con:{password:null,login:null,execTimeout:null},vty:{password:null,login:null,transport:'all',execTimeout:null}},
    ifaces:defaultIfaces(type,opts||{})};
}
const clone=o=>JSON.parse(JSON.stringify(o));
function newDevice(type,name,opts){
  opts=opts||{};
  if(type==='pc')return {type,name,ip:null,mask:null,gw:null,mode:'pc',log:[],history:[],session:[],pending:null};
  const cfg=freshCfg(type,opts);if(name)cfg.hostname=name;
  const d={type,name:name||cfg.hostname,cfg,startup:null,bootReg:'0x2102',flash:{},vlanDat:type==='switch',vtyMax:type==='router'?4:15,
    mode:'user',ctx:null,log:[],history:[],pending:null,seen:{},reloads:0,erased:false};
  if(type==='switch')d.flash['vlan.dat']=true;
  return d;
}
const prompt=d=>{
  if(d.type==='pc'){const s=d.session[d.session.length-1];return s?prompt({type:s.dev.type,cfg:s.dev.cfg,mode:s.mode}):'C:\\>';}
  const h=d.cfg.hostname;return {user:h+'>',priv:h+'#',config:h+'(config)#',if:h+'(config-if)#',line:h+'(config-line)#'}[d.mode];
};
function ifaceName(raw,dev){
  const m=String(raw).toLowerCase().replace(/\s+/g,'').match(/^([a-z]+)([\d/]+)$/);if(!m)return null;
  const hit=IFTYPES.filter(([k])=>k.startsWith(m[1]));if(hit.length!==1)return null;
  const name=hit[0][1]+m[2];
  if(hit[0][1]==='Vlan'){if(!/^\d+$/.test(m[2])||Number(m[2])<1||Number(m[2])>4094)return null;return name;}
  if(hit[0][1]==='Loopback')return /^\d+$/.test(m[2])?name:null;
  return dev&&dev.cfg.ifaces[name]?name:null;
}

/* ---------------- fake hashes for show running-config ---------------- */
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;}
function secret5(p){const a='./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';let h=hash(p),s='';for(let i=0;i<22;i++){s+=a[h%64];h=Math.imul(h^(i*2654435761),16777619)>>>0;}return '$1$'+s.slice(0,4)+'$'+s.slice(4);}
function type7(p){let h=hash(p),s=(h%16).toString(16).padStart(2,'0');for(const c of String(p)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;s+=(h&255).toString(16).toUpperCase().padStart(2,'0');}return s;}

/* ---------------- grammar ----------------
   Each mode has a list of commands: tokens are keywords (strings) or parameters ({p:...}). A keyword can be typed
   as any prefix that is unique among the keywords possible at that point, like IOS. */
const P={ip:{p:'ip',h:'A.B.C.D'},mask:{p:'ip',h:'A.B.C.D',d:'Subnet mask'},word:{p:'word',h:'WORD'},line:{p:'line',h:'LINE'},iface:{p:'iface',h:'interface',d:'Interface type and number, e.g. g0/0 or vlan 1'},
  hex:{p:'hex',h:'<0x0-0xFFFF>',d:'Configuration register value'},file:{p:'file',h:'flash:',d:'A file in flash, e.g. flash:backup.cfg'},ipv6:{p:'ipv6',h:'X:X:X:X::X/<0-128>',d:'IPv6 address/prefix'},ipv6a:{p:'ipv6',h:'X:X:X:X::X',d:'IPv6 address'},
  num:(lo,hi,d)=>({p:'num',lo,hi,h:`<${lo}-${hi}>`,d})};
const HELP={enable:'Turn on privileged commands',disable:'Turn off privileged commands',configure:'Enter configuration mode',terminal:'Configure from the terminal',exit:'Exit from the current mode',logout:'Exit from the EXEC',end:'Exit to privileged EXEC mode',
  show:'Show running system information','running-config':'Current operating configuration','startup-config':'Contents of startup configuration',version:'System hardware and software status',ip:'IP information / Global IP configuration subcommands',interface:'Select an interface to configure / IP interface status',brief:'Brief summary of IP status and configuration',flash:'Display information about flash: file system',
  copy:'Copy from one file to another',write:'Write running configuration to memory',memory:'Write to NV memory',erase:'Erase a filesystem',delete:'Delete a file',reload:'Halt and perform a cold restart',ping:'Send echo messages',do:'To run exec commands in config mode',
  hostname:'Set system\'s network name',no:'Negate a command or set its defaults','domain-lookup':'Enable IP Domain Name System hostname translation','domain-name':'Define the default domain name',domain:'IP DNS Resolver',name:'Define the default domain name',lookup:'Enable IP Domain Name System hostname translation',
  secret:'Assign the privileged level secret',password:'Assign the privileged level password / Set a password',service:'Modify use of network based services','password-encryption':'Encrypt system passwords',banner:'Define a login banner',motd:'Set Message of the Day banner',
  'default-gateway':'Specify default gateway (if not routing IP)',line:'Configure a terminal line',console:'Primary terminal line',vty:'Virtual terminal',crypto:'Encryption module',key:'Long term key operations',generate:'Generate new keys',rsa:'Generate RSA keys',
  ssh:'Configure ssh options / Open a secure shell client connection',username:'Establish User Name Authentication',security:'Infra Security CLI configuration',passwords:'Password security configuration','min-length':'Minimum length of passwords',
  login:'Enable password checking / Enhanced login configuration',local:'Local password checking','block-for':'Set quiet-mode active time period',attempts:'Set max number of fail attempts',within:'Watch period for fail attempts',
  'config-register':'Define the configuration register',address:'Set the IP address of an interface',shutdown:'Shutdown the selected interface',description:'Interface specific description',ipv6:'IPv6 interface subcommands','link-local':'Use link-local address',
  transport:'Define transport protocols for line',input:'Define which protocols to use when connecting to the terminal server',telnet:'TCP/IP Telnet protocol',all:'All protocols',none:'No protocols','exec-timeout':'Set the EXEC timeout',
  'general-keys':'Generate a general purpose RSA key pair',modulus:'Provide number of modulus bits on the command line',startup:'',running:''};
const G={
  user:[
    [['enable'],'enable'],[['exit'],'exit'],[['logout'],'exit'],[['ping',P.ip],'ping'],[['ping',P.ipv6a],'ping6'],[['show','version'],'show version'],[['show','ip','interface','brief'],'show ip int brief'],
    [['show','interfaces'],'show interfaces'],[['show','interfaces',P.iface],'show interfaces'],[['show','ip','route'],'show ip route'],[['show','ipv6','interface','brief'],'show ipv6 int brief'],[['show','ipv6','neighbors'],'show ipv6 neighbors'],
  ],
  priv:[
    [['configure','terminal'],'conf t'],[['disable'],'disable'],[['exit'],'exit'],[['logout'],'exit'],
    [['show','running-config'],'show run'],[['show','startup-config'],'show start'],[['show','version'],'show version'],[['show','ip','interface','brief'],'show ip int brief'],[['show','flash'],'show flash'],
    [['copy','running-config','startup-config'],'copy run start'],[['copy','running-config',P.file],'copy run flash'],[['copy','startup-config','running-config'],'copy start run'],[['copy',P.file,'running-config'],'copy flash run'],
    [['write','memory'],'copy run start'],[['write'],'copy run start'],
    [['erase','startup-config'],'erase start'],[['delete',P.file],'delete'],[['reload'],'reload'],[['ping',P.ip],'ping'],[['ping',P.ipv6a],'ping6'],
    [['show','interfaces'],'show interfaces'],[['show','interfaces',P.iface],'show interfaces'],[['show','ip','route'],'show ip route'],[['show','ipv6','interface','brief'],'show ipv6 int brief'],[['show','ipv6','neighbors'],'show ipv6 neighbors'],[['clear','ipv6','neighbors'],'clear ipv6 neighbors'],
  ],
  config:[
    [['hostname',P.word],'hostname'],[['no','hostname'],'no hostname'],
    [['no','ip','domain-lookup'],'no ip domain-lookup'],[['ip','domain-lookup'],'ip domain-lookup'],[['no','ip','domain','lookup'],'no ip domain-lookup'],[['ip','domain','lookup'],'ip domain-lookup'],
    [['ip','domain-name',P.word],'ip domain-name'],[['ip','domain','name',P.word],'ip domain-name'],
    [['enable','secret',P.line],'enable secret'],[['enable','password',P.line],'enable password'],[['no','enable','secret'],'no enable secret'],[['no','enable','password'],'no enable password'],
    [['service','password-encryption'],'service password-encryption'],[['no','service','password-encryption'],'no service password-encryption'],
    [['banner','motd',P.line],'banner motd'],[['no','banner','motd'],'no banner motd'],
    [['ip','default-gateway',P.ip],'ip default-gateway'],[['no','ip','default-gateway'],'no ip default-gateway'],[['ipv6','default-gateway',P.ipv6a],'ipv6 default-gateway'],[['ipv6','unicast-routing'],'ipv6 unicast-routing'],[['no','ipv6','unicast-routing'],'no ipv6 unicast-routing'],
    [['line','console',P.num(0,0,'First line number')],'line con'],[['line','vty',P.num(0,15,'First line number'),P.num(0,15,'Last line number')],'line vty'],
    [['interface',P.iface],'interface'],
    [['crypto','key','generate','rsa'],'crypto key'],[['crypto','key','generate','rsa','general-keys','modulus',P.num(360,4096,'size of the key modulus')],'crypto key mod'],
    [['ip','ssh','version',P.num(1,2,'Protocol version')],'ip ssh version'],
    [['username',P.word,'secret',P.line],'username secret'],[['username',P.word,'password',P.line],'username password'],
    [['security','passwords','min-length',P.num(0,16,'Minimum length of a password')],'min-length'],
    [['login','block-for',P.num(1,65535,'Quiet-mode time in seconds'),'attempts',P.num(1,65535,'Failed attempts'),'within',P.num(1,65535,'Watch period in seconds')],'block-for'],
    [['config-register',P.hex],'config-register'],
    [['end'],'end'],[['exit'],'exit'],[['do',P.line],'do'],
  ],
  if:[
    [['ip','address',P.ip,P.mask],'ip address'],[['no','ip','address'],'no ip address'],
    [['shutdown'],'shutdown'],[['no','shutdown'],'no shutdown'],
    [['description',P.line],'description'],[['no','description'],'no description'],
    [['ipv6','address',P.ipv6],'ipv6 address'],[['ipv6','address',P.ipv6a,'link-local'],'ipv6 link-local'],
    [['end'],'end'],[['exit'],'exit'],[['do',P.line],'do'],
  ],
  line:[
    [['password',P.line],'line password'],[['no','password'],'no line password'],
    [['login'],'login'],[['login','local'],'login local'],[['no','login'],'no login'],
    [['transport','input','ssh'],'transport ssh'],[['transport','input','telnet'],'transport telnet'],[['transport','input','telnet','ssh'],'transport all'],[['transport','input','ssh','telnet'],'transport all'],[['transport','input','all'],'transport all'],[['transport','input','none'],'transport none'],
    [['exec-timeout',P.num(0,35791,'Timeout in minutes')],'exec-timeout'],[['exec-timeout',P.num(0,35791,'Timeout in minutes'),P.num(0,2147483,'Timeout in seconds')],'exec-timeout'],
    [['end'],'end'],[['exit'],'exit'],[['do',P.line],'do'],
  ],
  pc:[
    [['ipconfig'],'ipconfig'],[['ping',P.ip],'ping'],[['ping','-n',P.num(1,1000,'Number of echo requests'),P.ip],'ping'],[['ping',P.ipv6a],'ping6'],[['ping','-n',P.num(1,1000,'Number of echo requests'),P.ipv6a],'ping6'],[['ssh','-l',P.word,P.ip],'ssh'],
  ],
};
const PCHELP={ipconfig:'Show this PC\'s IP settings',ping:'Send echo requests',ssh:'Secure shell to a device','-l':'Log in as this user'};

/* tokenizer: keeps each word's start position (for the ^ marker) and joins "gigabitethernet 0/0" into one word */
function tokenize(s){
  const w=[];const re=/\S+/g;let m;while((m=re.exec(s)))w.push({t:m[0],i:m.index});
  for(let k=0;k<w.length-1;k++){
    if(/^[a-z]+$/i.test(w[k].t)&&/^\d+(\/\d+)*$/.test(w[k+1].t)&&IFTYPES.some(([n])=>n.startsWith(w[k].t.toLowerCase()))&&k>0&&/^int/i.test(w[k-1].t)){w[k]={t:w[k].t+w[k+1].t,i:w[k].i};w.splice(k+1,1);}
  }
  return w;
}
function paramOK(tok,word,dev){
  const t=word;switch(tok.p){
    case 'ip':return ip2n(t)!=null;
    case 'word':return !/\s/.test(t);
    case 'num':return /^\d+$/.test(t)&&Number(t)>=tok.lo&&Number(t)<=tok.hi;
    case 'hex':return /^0x[0-9a-f]{1,4}$/i.test(t);
    case 'iface':return !!ifaceName(t,dev);
    case 'file':return /^(flash:\/?)?[\w.\-]+$/i.test(t)&&!/^(running-config|startup-config)$/i.test(t)&&!/^(r|ru|run|runn|runni|runnin|running|s|st|sta|star|start|startu|startup)(-.*)?$/i.test(t);
    case 'ipv6':return isIPv6(t);
  }
  return true;
}
/* match input against a mode's grammar. Returns {ok,id,args,cmd} or {err:'invalid'|'incomplete'|'ambiguous',at,word} */
function parse(mode,input,dev){
  const words=tokenize(input);if(!words.length)return {empty:true};
  let alive=(G[mode]||[]).map(([t,id])=>({t,id,ti:0,args:[]}));
  for(let k=0;k<words.length;k++){
    const w=words[k].t,lw=w.toLowerCase();
    const lits=new Set();alive.forEach(c=>{const tok=c.t[c.ti];if(typeof tok==='string'&&tok.startsWith(lw))lits.add(tok);});
    let next=[];
    if(lits.size){
      const exact=[...lits].find(l=>l===lw),pickL=exact||(lits.size===1?[...lits][0]:null);
      if(!pickL){
        // ambiguous between keywords, unless a parameter at this spot accepts the word
        const prm=alive.filter(c=>{const tok=c.t[c.ti];return tok&&typeof tok!=='string'&&paramOK(tok,w,dev);});
        if(!prm.length)return {err:'ambiguous',at:words[k].i,word:w,options:[...lits]};
        next=prm.map(c=>takeParam(c,words,k,input));
      }else next=alive.filter(c=>c.t[c.ti]===pickL).map(c=>({...c,ti:c.ti+1,args:c.args.slice()}));
    }else{
      next=alive.filter(c=>{const tok=c.t[c.ti];return tok&&typeof tok!=='string'&&(tok.p==='line'||paramOK(tok,w,dev));}).map(c=>takeParam(c,words,k,input));
    }
    if(!next.length)return {err:'invalid',at:words[k].i,word:w,expected:alive.map(c=>c.t[c.ti]).filter(Boolean)};
    alive=next;
    if(alive.every(c=>c.rest)){break;}
  }
  const done=alive.filter(c=>c.ti>=c.t.length);
  if(!done.length)return {err:'incomplete',at:input.length,expected:alive.map(c=>c.t[c.ti])};
  const c=done[0];return {ok:true,id:c.id,args:c.args,cmd:c.t};
}
function takeParam(c,words,k,input){
  const tok=c.t[c.ti];const n={...c,ti:c.ti+1,args:c.args.slice()};
  if(tok.p==='line'){n.args.push(input.slice(words[k].i).replace(/\s+$/,''));n.rest=true;n.ti=c.t.length;return n;}
  n.args.push(words[k].t);return n;
}
/* "?" help: what can come next (or which keywords start with the partial word) */
function help(mode,input,dev){
  const trailing=/\s$/.test(input)||input==='';
  const words=tokenize(input);const partial=trailing?'':(words.pop()||{t:''}).t.toLowerCase();
  let alive=(G[mode]||[]).map(([t,id])=>({t,id,ti:0,args:[]}));
  for(let k=0;k<words.length;k++){
    const r=parse(mode,words.slice(0,k+1).map(x=>x.t).join(' '),dev);
    const lw=words[k].t.toLowerCase();
    const lits=new Set();alive.forEach(c=>{const tok=c.t[c.ti];if(typeof tok==='string'&&tok.startsWith(lw))lits.add(tok);});
    if(lits.size){const exact=[...lits].find(l=>l===lw),pk=exact||(lits.size===1?[...lits][0]:null);if(!pk)return {err:'ambiguous',word:words[k].t};alive=alive.filter(c=>c.t[c.ti]===pk).map(c=>({...c,ti:c.ti+1}));}
    else{alive=alive.filter(c=>{const tok=c.t[c.ti];return tok&&typeof tok!=='string'&&(tok.p==='line'||paramOK(tok,words[k].t,dev));}).map(c=>({...c,ti:c.t[c.ti].p==='line'?c.t.length:c.ti+1}));}
    if(!alive.length)return {err:'invalid',at:words[k].i};
    void r;
  }
  const items=new Map();let cr=false;
  alive.forEach(c=>{const tok=c.t[c.ti];if(!tok){cr=true;return;}
    if(typeof tok==='string'){if(tok.startsWith(partial))items.set(tok,(mode==='pc'?PCHELP[tok]:HELP[tok])||'');}
    else if(!partial)items.set(tok.h,tok.d||({'A.B.C.D':'IP address',WORD:'A single word',LINE:'Text to the end of the line'}[tok.h]||''));});
  const list=[...items.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  if(cr&&!partial)list.push(['<cr>','']);
  return {list,partial};
}
function complete(mode,input,dev){
  const m=input.match(/^(.*?)(\S+)$/);if(!m)return input;
  const h=help(mode,m[1],dev);if(h.err)return input;
  const words=h.list.map(x=>x[0]).filter(w=>!/^[<A-Z]/.test(w)&&w.startsWith(m[2].toLowerCase()));
  return words.length===1?m[1]+words[0]+' ':input;
}

/* ---------------- running a command ---------------- */
const out=(d,t,c)=>{(d.out=d.out||[]).push({t,c:c||'out'});};
function caret(d,input,at){out(d,' '.repeat(prompt(d).length+at)+'^','err');out(d,"% Invalid input detected at '^' marker.",'err');}
const EXECNAMES=new Set(['show run','show start','show version','show ip int brief','show flash','show interfaces','show ip route','show ipv6 int brief','show ipv6 neighbors','clear ipv6 neighbors','ping6','copy run start','copy run flash','copy start run','copy flash run','erase start','delete','reload','ping','conf t']);
/* teaching notes for common mistakes (shown after the IOS error) */
function coach(d,input,mode){
  const s=input.trim().toLowerCase().replace(/\s+/g,' ');
  const tryMode=m=>{const r=parse(m,input,d);return r.ok?r:null;};
  if(mode==='user'&&(tryMode('priv')||/^conf/.test(s)))return 'That’s a privileged EXEC command. Type enable first (the prompt changes from > to #).';
  if((mode==='user'||mode==='priv')&&(tryMode('config')))return 'That’s a global configuration command. Type configure terminal first (conf t).';
  if((mode==='user'||mode==='priv'||mode==='config')&&tryMode('if')&&!tryMode('config'))return 'That’s an interface command. Select the interface first, for example interface g0/0'+(d.type==='switch'?' or interface vlan 1':'')+'.';
  if((mode==='user'||mode==='priv'||mode==='config')&&tryMode('line')&&!tryMode('config'))return 'That’s a line command. Select the line first: line console 0 or line vty 0 '+d.vtyMax+'.';
  if(mode!=='user'&&mode!=='priv'){const r=tryMode('priv');if(r&&EXECNAMES.has(r.id))return 'That’s a privileged EXEC command. From configuration mode put do in front (do '+s+'), or type end first.';}
  if(/^ip add\S* \d+\.\d+\.\d+\.\d+\/\d+/.test(s))return 'IOS wants the subnet mask in dotted decimal, like 255.255.255.0, not a /prefix.';
  if(/^ip add\S* \d+\.\d+\.\d+\.\d+ \/?\d{1,2}$/.test(s))return 'Write the mask in dotted decimal (255.255.255.0), not as a prefix length.';
  if(/^ip default gateway/.test(s))return 'It’s one word with a dash: ip default-gateway.';
  if(/^ip domain lookup/.test(s)||/^no ip domain lookup/.test(s))return 'It’s one word with a dash: ip domain-lookup.';
  if(/^line vty 0 (1[0-5]|[5-9])$/.test(s)&&d.type==='router')return 'This router has VTY lines 0 to 4: line vty 0 4. (Switches have 0 to 15.)';
  if(/^line con(sole)?$/.test(s))return 'Give the line number too: line console 0.';
  if(/^(int\S*|interface) f\S* ?\d/.test(s)&&d.type==='router')return 'This router’s LAN ports are GigabitEthernet (g0/0, g0/1).';
  if(/^(int\S*|interface) vlan ?1$/.test(s)&&d.type==='router')return 'VLAN 1 is the switch’s management interface. On a router, configure its physical ports (g0/0).';
  if(/^no shut down$/.test(s))return 'It’s one word: no shutdown.';
  if(/^copy$/.test(s))return 'Copy what to where? To save: copy running-config startup-config.';
  if(/^enable secret$/.test(s))return 'Put the password after it: enable secret class.';
  if(/^banner motd$/.test(s))return 'Give the banner between two matching characters: banner motd #Authorized users only#';
  return null;
}
function run(d,input,net){
  d.out=[];const raw=String(input==null?'':input);
  if(d.type==='pc')return runPC(d,raw,net);
  d.log.push({mode:d.mode,input:raw});
  if(d.pending){const p=d.pending;d.pending=null;p.fn(raw);return d.out;}
  if(/^\s*$/.test(raw))return d.out;
  if(/\?$/.test(raw)){helpOut(d,d.mode,raw.slice(0,-1));return d.out;}
  if(/^\^z$/i.test(raw.trim())||raw==='\x1a'){if(d.mode!=='user'&&d.mode!=='priv'){d.mode='priv';d.ctx=null;d.seen.end=true;}return d.out;}
  exec(d,raw,net,d.mode);
  (d.visited=d.visited||{})[d.mode]=true;
  return d.out;
}
function exec(d,raw,net,mode,isDo){
  const pm=raw.match(/^(.*?\S)\s*\|\s*(i|in|inc|incl|inclu|includ|include|e|ex|exc|excl|exclu|exclud|exclude|b|be|beg|begi|begin|s|se|sec|sect|secti|sectio|section)\s+(.+)$/i);
  if(pm){const r0=parse(mode,pm[1],d);if(r0.ok&&/^show/.test(r0.id)){const n=d.out.length;exec(d,pm[1],net,mode,isDo);const txt=d.out.slice(n).map(x=>x.t).join('\n').split('\n');d.out.length=n;
      const k=pm[2][0].toLowerCase(),re=new RegExp(pm[3].trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');let res;
      if(k==='i')res=txt.filter(l=>re.test(l));else if(k==='e')res=txt.filter(l=>!re.test(l));else if(k==='b'){const j=txt.findIndex(l=>re.test(l));res=j<0?[]:txt.slice(j);}
      else{res=[];let on=false;txt.forEach(l=>{if(/^\S/.test(l))on=re.test(l);if(on)res.push(l);});}
      out(d,res.join('\n'));return;}}
  const r=parse(mode,raw,d);
  if(r.ok){d.history.push(raw.trim());if(['config','if','line'].includes(mode)&&!['end','exit','do'].includes(r.id))d.dirty=true;doCmd(d,r,net,raw);return;}
  // global commands are accepted in interface and line modes (IOS drops you back to global config)
  if(mode==='if'||mode==='line'){const g=parse('config',raw,d);if(g.ok&&!['end','exit','do'].includes(g.id)){d.mode='config';d.ctx=null;d.dirty=true;d.history.push(raw.trim());doCmd(d,g,net,raw);return;}}
  if(r.empty)return;
  if(r.err==='ambiguous'){out(d,`% Ambiguous command:  "${raw.trim()}"`,'err');}
  else if(r.err==='incomplete')out(d,'% Incomplete command.','err');
  else caret(d,raw,r.at);
  const tip=coach(d,raw,mode);if(tip)out(d,tip,'coach');
  d.lastError={input:raw,err:r.err};
}
function helpOut(d,mode,before){
  d.refill=before;let h=help(mode,before,d);
  if((mode==='if'||mode==='line')&&before.trim()){const g=help('config',before,d);if(!g.err&&g.list.length&&(h.err||!h.list.length))h=g;}
  else if((mode==='if'||mode==='line')&&!before.trim()){const g=help('config',before,d);const seen=new Set(h.list.map(x=>x[0]));h={list:h.list.concat(g.list.filter(x=>!seen.has(x[0])&&x[0]!=='<cr>')).sort((a,b)=>a[0].localeCompare(b[0])),partial:''};}
  if(h.err==='ambiguous'){out(d,`% Ambiguous command: "${before.trim()}"`,'err');return;}
  if(h.err){caret(d,before,h.at||0);return;}
  if(!h.list.length){out(d,'% Unrecognized command','err');return;}
  if(h.partial)out(d,h.list.map(x=>x[0]).join('  '));
  else{const w=Math.max(...h.list.map(x=>x[0].length))+2;out(d,h.list.map(([k,v])=>'  '+k.padEnd(w)+v).join('\n'));}
}
function doCmd(d,r,net,raw){
  const c=d.cfg,a=r.args;d.seen[r.id]=(d.seen[r.id]||0)+1;
  const ifc=()=>c.ifaces[d.ctx];
  switch(r.id){
    case 'enable':{
      const pw=c.enableSecret!=null?c.enableSecret:c.enablePassword;
      if(pw!=null){d.pending={prompt:'Password:',mask:true,fn:v=>{if(v===pw){d.mode='priv';}else out(d,'% Access denied','err');}};return;}
      d.mode='priv';return;}
    case 'disable':d.mode='user';return;
    case 'exit':
      if(d.mode==='if'||d.mode==='line'){d.mode='config';d.ctx=null;return;}
      if(d.mode==='config'){d.mode='priv';return;}
      if(d.via){d.closed=true;return;}
      d.mode='user';out(d,'');sessionStart(d,true);return;
    case 'end':d.mode='priv';d.ctx=null;d.seen.endCmd=true;return;
    case 'conf t':out(d,'Enter configuration commands, one per line.  End with CNTL/Z.');d.mode='config';return;
    case 'do':{const m=d.mode;exec(d,a[0],net,'priv',true);d.mode=d.mode==='priv'&&m!=='priv'?m:d.mode;return;}
    case 'show run':out(d,'Building configuration...\n\nCurrent configuration : '+runningConfig(d).length+' bytes\n'+runningConfig(d));return;
    case 'show start':if(!d.startup){out(d,'startup-config is not present','err');return;}out(d,'Using '+configText(d,d.startup).length+' out of 262144 bytes\n'+configText(d,d.startup));return;
    case 'show version':out(d,showVersion(d));return;
    case 'show ip int brief':out(d,ipBrief(d,net));return;
    case 'show flash':out(d,'Directory of flash:/\n\n'+Object.keys(d.flash).map((f,i)=>`    ${i+1}  -rw-  ${f==='vlan.dat'?616:(d.flash[f].length||1000)}  <no date>  ${f}`).join('\n')+'\n\n64016384 bytes total');return;
    case 'copy run start':
      d.pending={prompt:'Destination filename [startup-config]?',fn:v=>{if(v.trim()&&!/^startup-config$/i.test(v.trim())){out(d,'%Error opening '+v.trim(),'err');return;}d.startup=clone(c);d.dirty=false;out(d,'Building configuration...\n[OK]');}};return;
    case 'copy run flash':{const f=a[0].replace(/^flash:\/?/i,'');d.pending={prompt:`Destination filename [${f}]?`,fn:v=>{const name=v.trim()||f;d.flash[name]=configText(d,c);d.flashCfg=d.flashCfg||{};d.flashCfg[name]=clone(c);out(d,'\n'+d.flash[name].length+' bytes copied in 0.416 secs');}};return;}
    case 'copy flash run':{const f=a[0].replace(/^flash:\/?/i,'');if(!d.flashCfg||!d.flashCfg[f]){out(d,`%Error opening flash:${f} (No such file or directory)`,'err');return;}
      d.pending={prompt:'Destination filename [running-config]?',fn:()=>{const s=d.flashCfg[f];Object.assign(c,clone(s));out(d,`${d.flash[f].length} bytes copied in 0.208 secs`);d.restored=f;}};return;}
    case 'copy start run':if(!d.startup){out(d,'%Error opening nvram:/startup-config (No such file or directory)','err');return;}d.pending={prompt:'Destination filename [running-config]?',fn:()=>{Object.assign(c,clone(d.startup));out(d,'[OK]');}};return;
    case 'erase start':d.pending={prompt:'Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]',fn:v=>{if(/^n/i.test(v.trim())){return;}d.startup=null;d.erased=true;d.dirty=true;out(d,'[OK]\nErase of nvram: complete');}};return;
    case 'delete':{const f=a[0].replace(/^flash:\/?/i,'');if(!d.flash[f]){out(d,`%Error deleting flash:/${f} (No such file or directory)`,'err');return;}
      d.pending={prompt:`Delete filename [${f}]?`,fn:v=>{const name=v.trim()||f;d.pending={prompt:`Delete flash:/${name}? [confirm]`,fn:w=>{if(/^n/i.test(w.trim()))return;delete d.flash[name];if(d.flashCfg)delete d.flashCfg[name];if(name==='vlan.dat')d.vlanDat=false;}};}};return;}
    case 'reload':{
      const go=()=>{d.pending={prompt:'Proceed with reload? [confirm]',fn:v=>{if(/^n/i.test(v.trim()))return;reload(d);}};};
      if(d.dirty){d.pending={prompt:'System configuration has been modified. Save? [yes/no]:',fn:v=>{const t=v.trim().toLowerCase();if(t.startsWith('y')){d.startup=clone(c);d.dirty=false;out(d,'Building configuration...\n[OK]');}else if(!t.startsWith('n')){out(d,'% Please answer \'yes\' or \'no\'.','err');return;}go();}};}else go();
      return;}
    case 'ping':out(d,pingText(d,a[0],net,'ios'));return;
    case 'ping6':{const ok=net&&net.ping6?net.ping6(d,a[0]):false;d.pings=d.pings||[];d.pings.push({ip:a[0].toLowerCase(),ok});
      out(d,`Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${a[0]}, timeout is 2 seconds:\n${ok?'!!!!!':'.....'}\nSuccess rate is ${ok?'100 percent (5/5), round-trip min/avg/max = 0/0/1 ms':'0 percent (0/5)'}`);return;}
    case 'show interfaces':{const want=a[0]?ifaceName(a[0],d):null;if(a[0]&&!want){caret(d,raw,raw.length-a[0].length);return;}
      out(d,Object.entries(c.ifaces).filter(([n])=>!want||n===want).map(([n,x])=>showIface(d,n,x,net)).join('\n'));return;}
    case 'show ip route':out(d,showRoute(d,net));return;
    case 'show ipv6 int brief':out(d,Object.entries(c.ifaces).map(([n,x])=>{const[st,pr]=ifStatus(d,n,x,net);const v6=(x.ipv6||[]);
      const ll=x.ll||(v6.length?eui64ll(macOf(d,n)):null);return `${n.padEnd(27)}[${st==='administratively down'?'administratively down':st}/${pr}]\n${ll?'    '+ll.toUpperCase()+'\n':''}${v6.map(v=>'    '+v.split('/')[0].toUpperCase()).join('\n')||'    unassigned'}`;}).join('\n'));return;
    case 'show ipv6 neighbors':{const t=d.nd6||[];out(d,'IPv6 Address                              Age Link-layer Addr State Interface'+(t.length?'\n'+t.map(e=>`${e.ip.toUpperCase().padEnd(42)}${'0'.padStart(3)} ${e.mac.padEnd(15)} REACH ${e.iface}`).join('\n'):''));return;}
    case 'clear ipv6 neighbors':d.nd6=[];d.cleared6=(d.cleared6||0)+1;return;
    case 'ipv6 unicast-routing':c.v6route=true;return;
    case 'no ipv6 unicast-routing':c.v6route=false;return;
    case 'hostname':c.hostname=a[0];return;
    case 'no hostname':c.hostname=d.type==='router'?'Router':'Switch';return;
    case 'no ip domain-lookup':c.domainLookup=false;return;
    case 'ip domain-lookup':c.domainLookup=true;return;
    case 'ip domain-name':c.domain=a[0];return;
    case 'enable secret':{const p=a[0].replace(/^(0|5|8|9)\s+/,'');if(c.minLen&&p.length<c.minLen){out(d,`% Password too short - must be at least ${c.minLen} characters. Password configuration failed`,'err');return;}c.enableSecret=p;return;}
    case 'enable password':{if(c.minLen&&a[0].length<c.minLen){out(d,`% Password too short - must be at least ${c.minLen} characters. Password configuration failed`,'err');return;}c.enablePassword=a[0];return;}
    case 'no enable secret':c.enableSecret=null;return;
    case 'no enable password':c.enablePassword=null;return;
    case 'service password-encryption':c.spe=true;return;
    case 'no service password-encryption':c.spe=false;return;
    case 'banner motd':{const t=a[0],del=t[0],rest=t.slice(1),end=rest.indexOf(del);
      if(end>=0){c.banner=rest.slice(0,end);return;}
      out(d,`Enter TEXT message.  End with the character '${del}'.`);const buf=[rest];
      const more=()=>{d.pending={prompt:'',raw:true,fn:v=>{const j=v.indexOf(del);if(j>=0){buf.push(v.slice(0,j));c.banner=buf.join('\n').replace(/^\n+/,'');return;}buf.push(v);more();}};};more();return;}
    case 'no banner motd':c.banner=null;return;
    case 'ip default-gateway':c.defaultGw=a[0];return;
    case 'no ip default-gateway':c.defaultGw=null;return;
    case 'ipv6 default-gateway':c.ipv6Gw=a[0];return;
    case 'line con':d.mode='line';d.ctx='con';return;
    case 'line vty':{const lo=Number(a[0]),hi=Number(a[1]);if(hi>d.vtyMax||lo>hi){caret(d,raw,raw.toLowerCase().lastIndexOf(a[1]));out(d,`This ${d.type} has VTY lines 0 to ${d.vtyMax}: line vty 0 ${d.vtyMax}.`,'coach');return;}d.mode='line';d.ctx='vty';d.vtyRange=[lo,hi];return;}
    case 'interface':{const n=ifaceName(a[0],d);if(!c.ifaces[n]){if(n&&n.startsWith('Vlan')){c.ifaces[n]={shutdown:true};}else{caret(d,raw,raw.length-a[0].length);return;}}d.mode='if';d.ctx=n;return;}
    case 'crypto key':case 'crypto key mod':{
      if(c.hostname==='Router'||c.hostname==='Switch'){out(d,'% Please define a hostname other than '+c.hostname+'.','err');return;}
      if(!c.domain){out(d,'% Please define a domain-name first.','err');return;}
      const finish=bits=>{c.rsaBits=bits;out(d,`% Generating ${bits} bit RSA keys, keys will be non-exportable...[OK]`);if(bits>=768)out(d,'*Mar 1 00:12:03.442: %SSH-5-ENABLED: SSH 1.99 has been enabled');};
      out(d,`The name for the keys will be: ${c.hostname}.${c.domain}`);
      if(r.id==='crypto key mod'){finish(Number(a[0]));return;}
      out(d,'Choose the size of the key modulus in the range of 360 to 4096 for your\n  General Purpose Keys. Choosing a key modulus greater than 512 may take\n  a few minutes.\n');
      d.pending={prompt:'How many bits in the modulus [512]:',fn:v=>{const t=v.trim()||'512';if(!/^\d+$/.test(t)||Number(t)<360||Number(t)>4096){out(d,'% You must enter a number between 360 and 4096.','err');return;}finish(Number(t));}};return;}
    case 'ip ssh version':if(a[0]==='2'&&c.rsaBits&&c.rsaBits<768){out(d,'Please create RSA keys of at least 768 bits to enable SSH v2.','err');return;}c.sshVer=Number(a[0]);return;
    case 'username secret':case 'username password':{const p=a[1].replace(/^(0|5|8|9)\s+/,'');if(c.minLen&&p.length<c.minLen){out(d,`% Password too short - must be at least ${c.minLen} characters. Password configuration failed`,'err');return;}c.users[a[0]]={pw:p,secret:r.id==='username secret'};return;}
    case 'min-length':c.minLen=Number(a[0]);return;
    case 'block-for':c.blockFor={time:Number(a[0]),attempts:Number(a[1]),within:Number(a[2])};return;
    case 'config-register':c.configReg='0x'+a[0].slice(2).toUpperCase().padStart(4,'0');return;
    case 'ip address':{const ip=ip2n(a[0]),m=ip2n(a[1]);
      if(!isMask(m)||m===0){out(d,'Bad mask 0x'+m.toString(16).toUpperCase()+' for address '+a[0],'err');return;}
      if(m!==0xFFFFFFFF&&m!==0xFFFFFFFE&&(((ip&~m)>>>0)===0||((ip|~m)>>>0)===0xFFFFFFFF)){out(d,`Bad mask /${prefixOf(m)} for address ${a[0]}`,'err');out(d,((ip&~m)>>>0)===0?'That’s the subnet (network) address. An interface needs a usable host address.':'That’s the broadcast address. An interface needs a usable host address.','coach');return;}
      const clash=Object.entries(c.ifaces).find(([n,x])=>n!==d.ctx&&x.ip&&sameNet(ip2n(x.ip),ip,ip2n(x.mask)));
      if(clash){out(d,`% ${netName(ip,m)} overlaps with ${clash[0]}`,'err');return;}
      ifc().ip=a[0];ifc().mask=a[1];return;}
    case 'no ip address':delete ifc().ip;delete ifc().mask;return;
    case 'shutdown':ifc().shutdown=true;out(d,`%LINK-5-CHANGED: Interface ${d.ctx}, changed state to administratively down`);return;
    case 'no shutdown':{const was=ifc().shutdown;ifc().shutdown=false;if(was){out(d,`%LINK-5-CHANGED: Interface ${d.ctx}, changed state to up`);out(d,`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${d.ctx}, changed state to up`);}return;}
    case 'description':ifc().desc=a[0];return;
    case 'no description':delete ifc().desc;return;
    case 'ipv6 address':(ifc().ipv6=ifc().ipv6||[]).push(a[0]);return;
    case 'ipv6 link-local':ifc().ll=a[0];return;
    case 'line password':{const L=c.lines[d.ctx];const p=a[0].replace(/^(0|7)\s+/,'');if(c.minLen&&p.length<c.minLen){out(d,`% Password too short - must be at least ${c.minLen} characters. Password configuration failed`,'err');return;}L.password=p;return;}
    case 'no line password':c.lines[d.ctx].password=null;return;
    case 'login':{const L=c.lines[d.ctx];L.login='line';if(!L.password)out(d,'% Login disabled on line, until \'password\' is set','err');return;}
    case 'login local':c.lines[d.ctx].login='local';return;
    case 'no login':c.lines[d.ctx].login=null;return;
    case 'transport ssh':if(d.ctx!=='vty'){caret(d,raw,0);return;}c.lines.vty.transport='ssh';return;
    case 'transport telnet':if(d.ctx!=='vty'){caret(d,raw,0);return;}c.lines.vty.transport='telnet';return;
    case 'transport all':if(d.ctx!=='vty'){caret(d,raw,0);return;}c.lines.vty.transport='all';return;
    case 'transport none':if(d.ctx!=='vty'){caret(d,raw,0);return;}c.lines.vty.transport='none';return;
    case 'exec-timeout':c.lines[d.ctx].execTimeout=[Number(a[0]),Number(a[1]||0)];return;
  }
}
const netName=(ip,m)=>n2ip(netOf(ip,m));
function reload(d){
  d.reloads++;d.mode='user';d.ctx=null;d.dirty=false;
  d.cfg=d.startup?clone(d.startup):freshCfg(d.type,{gig:Object.keys(d.cfg.ifaces).filter(n=>/^GigabitEthernet0\/\d$/.test(n)&&d.type==='router').map(n=>n.slice(15))});
  d.bootReg=d.cfg.configReg;
  out(d,'\nSystem Bootstrap, Version 15.1(4)M4\n\n...\n\nPress RETURN to get started!\n');
  if(!d.startup&&d.type==='router'){out(d,'         --- System Configuration Dialog ---\n\nWould you like to enter the initial configuration dialog? [yes/no]: no\n');}
  sessionStart(d,false);
}
function sessionStart(d,fromExit){
  if(d.cfg.banner!=null)out(d,d.cfg.banner);
  const L=d.cfg.lines.con;
  if(L.login==='line'&&L.password){out(d,'\nUser Access Verification\n');const ask=()=>{d.pending={prompt:'Password:',mask:true,fn:v=>{if(v==='')return ask();if(v!==L.password){out(d,'% Login invalid','err');ask();}}};};ask();}
  else if(L.login==='local'&&Object.keys(d.cfg.users).length){out(d,'\nUser Access Verification\n');const ask=()=>{d.pending={prompt:'Username:',fn:u=>{d.pending={prompt:'Password:',mask:true,fn:p=>{const x=d.cfg.users[u.trim()];if(!x||x.pw!==p){out(d,'% Login invalid\n','err');ask();}}};}};};ask();}
  void fromExit;
}

/* ---------------- show commands ---------------- */
function configText(d,c){
  const L=[];const pw=p=>c.spe?`7 ${type7(p)}`:p;
  L.push('!','version 15.1',c.spe?'service password-encryption':'no service password-encryption','!',`hostname ${c.hostname}`,'!');
  if(c.minLen)L.push(`security passwords min-length ${c.minLen}`);
  if(c.enableSecret!=null)L.push(`enable secret 5 ${secret5(c.enableSecret)}`);
  if(c.enablePassword!=null)L.push(`enable password ${pw(c.enablePassword)}`);
  L.push('!');
  Object.entries(c.users).forEach(([u,x])=>L.push(x.secret?`username ${u} secret 5 ${secret5(x.pw)}`:`username ${u} password ${pw(x.pw)}`));
  if(Object.keys(c.users).length)L.push('!');
  if(!c.domainLookup)L.push('no ip domain-lookup');
  if(c.domain)L.push(`ip domain-name ${c.domain}`);
  if(c.sshVer)L.push(`ip ssh version ${c.sshVer}`);
  if(c.v6route)L.push('ipv6 unicast-routing');
  if(c.blockFor)L.push(`login block-for ${c.blockFor.time} attempts ${c.blockFor.attempts} within ${c.blockFor.within}`);
  L.push('!');
  Object.entries(c.ifaces).forEach(([n,x])=>{L.push(`interface ${n}`);if(x.desc)L.push(` description ${x.desc}`);
    if(x.ip)L.push(` ip address ${x.ip} ${x.mask}`);else if(n.startsWith('Vlan')||d.type==='router')L.push(' no ip address');
    (x.ipv6||[]).forEach(v=>L.push(` ipv6 address ${v}`));if(x.ll)L.push(` ipv6 address ${x.ll} link-local`);
    if(x.shutdown)L.push(' shutdown');L.push('!');});
  if(c.defaultGw)L.push(`ip default-gateway ${c.defaultGw}`,'!');
  if(c.banner!=null)L.push(`banner motd ^C${c.banner}^C`,'!');
  [['con','line con 0'],['vty',`line vty 0 ${d.vtyMax}`]].forEach(([k,h])=>{const x=c.lines[k];L.push(h);
    if(x.execTimeout)L.push(` exec-timeout ${x.execTimeout[0]} ${x.execTimeout[1]}`);
    if(x.password)L.push(` password ${pw(x.password)}`);if(x.login)L.push(x.login==='local'?' login local':' login');
    if(k==='vty'&&x.transport!=='all')L.push(` transport input ${x.transport}`);L.push('!');});
  if(c.configReg!=='0x2102')L.splice(L.indexOf('!',5),0,`config-register ${c.configReg}`);
  L.push('end');return L.join('\n');
}
const runningConfig=d=>configText(d,d.cfg);
// a fixed, made-up MAC per interface (or one the task sets in d.macs), in Cisco's dotted form
function macOf(d,n){if(d.macs&&d.macs[n])return d.macs[n];const h=hash((d.name||'')+'/'+n),g=hash(n+'#'+(d.name||''));
  return `00${(h&0xff).toString(16).padStart(2,'0')}.${((h>>>8)&0xffff).toString(16).padStart(4,'0')}.${(g&0xffff).toString(16).padStart(4,'0')}`;}
function eui64ll(mac){const h=mac.replace(/\./g,'').toLowerCase();const b=parseInt(h.slice(0,2),16)^2;
  const x=[b.toString(16).padStart(2,'0')+h.slice(2,4),h.slice(4,6)+'ff','fe'+h.slice(6,8),h.slice(8,12)].map(g=>g.replace(/^0+(?=.)/,''));return 'fe80::'+x.join(':');}
const BW=n=>n.startsWith('Serial')?1544:n.startsWith('Gigabit')?1000000:n.startsWith('Fast')?100000:n.startsWith('Vlan')?100000:8000000;
function showIface(d,n,x,net){
  const [st,pr]=ifStatus(d,n,x,net),ser=n.startsWith('Serial'),mac=macOf(d,n),L=[`${n} is ${st}, line protocol is ${pr}${ser||st!=='up'?'':' (connected)'}`];
  L.push(ser?'  Hardware is HD64570':`  Hardware is ${n.startsWith('Gigabit')?'CN Gigabit Ethernet':n.startsWith('Vlan')?'CPU Interface':'Lance'}, address is ${mac} (bia ${mac})`);
  if(x.desc)L.push(`  Description: ${x.desc}`);
  if(x.ip)L.push(`  Internet address is ${x.ip}/${prefixOf(ip2n(x.mask))}`);
  L.push(`  MTU 1500 bytes, BW ${BW(n)} Kbit/sec, DLY ${ser?20000:n.startsWith('Gigabit')?10:100} usec,`,'     reliability 255/255, txload 1/255, rxload 1/255',
    `  Encapsulation ${ser?'HDLC':'ARPA'}, loopback not set${ser?'':''}`,ser?'  Keepalive set (10 sec)':'  Keepalive set (10 sec)',
    ser?'':`  ${n.startsWith('Gigabit')?'Full-duplex, 1000Mb/s':'Full-duplex, 100Mb/s'}, media type is RJ45`,
    '  Last input 00:00:08, output 00:00:05, output hang never','  Last clearing of "show interface" counters never',
    '  Input queue: 0/75/0 (size/max/drops); Total output drops: 0','  5 minute input rate 0 bits/sec, 0 packets/sec','  5 minute output rate 0 bits/sec, 0 packets/sec');
  return L.filter(Boolean).join('\n');
}
// the routing table: connected (C) and local (L) routes, plus OSPF (O) routes when the network runs dynamic routing
function routesOf(d,net){
  const R=[],up=ifacesUp(d,net),short=n=>n;
  up.forEach(f=>{R.push({c:'C',net:netOf(f.ip,f.mask),p:prefixOf(f.mask),ifc:short(f.name)});R.push({c:'L',net:f.ip,p:32,ifc:short(f.name)});});
  if(net&&net.routing){
    const routers=Object.values(net.devices).filter(x=>x.type==='router'),have=new Set(R.filter(r=>r.c==='C').map(r=>r.net+'/'+r.p));
    // breadth-first over router-to-router links: the first hop toward each router, and the cost to reach it
    const seen=new Map([[d,{hop:null,ifc:null,cost:0}]]),q=[d];
    while(q.length){const a=q.shift(),A=seen.get(a);
      routers.forEach(b=>{if(seen.has(b))return;const ai=ifacesUp(a,net).find(x=>ifacesUp(b,net).some(y=>sameNet(x.ip,y.ip,x.mask)));if(!ai)return;
        const bi=ifacesUp(b,net).find(y=>sameNet(ai.ip,y.ip,ai.mask)),cost=A.cost+(ai.name.startsWith('Serial')?64:1);
        seen.set(b,a===d?{hop:bi.ip,ifc:ai.name,cost}:{hop:A.hop,ifc:A.ifc,cost});q.push(b);});}
    seen.forEach((v,b)=>{if(b===d)return;ifacesUp(b,net).forEach(f=>{const k=netOf(f.ip,f.mask)+'/'+prefixOf(f.mask);if(have.has(k))return;have.add(k);
      R.push({c:'O',net:netOf(f.ip,f.mask),p:prefixOf(f.mask),hop:v.hop,ifc:v.ifc,cost:v.cost+(f.name.startsWith('Serial')?64:1)});});});
  }
  return R;
}
function showRoute(d,net){
  const R=routesOf(d,net);d.routeViews=(d.routeViews||0)+1;
  const head=`Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP
       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area
       * - candidate default, U - per-user static route, o - ODR
       P - periodic downloaded static route

Gateway of last resort is not set
`;
  const cls=n=>{const a=n>>>24;return a<128?8:a<192?16:24;},groups=new Map();
  R.forEach(r=>{const l=cls(r.net),k=n2ip(netOf(r.net,(0xFFFFFFFF<<(32-l))>>>0))+'/'+l;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);});
  const body=[...groups].sort((x,y)=>ip2n(x[0].split('/')[0])-ip2n(y[0].split('/')[0])).map(([k,rs])=>{
    rs.sort((x,y)=>x.net-y.net||x.p-y.p);const masks=new Set(rs.map(r=>r.p)).size;
    const h=`     ${k} is ${masks>1?'variably subnetted':'subnetted'}, ${rs.length} subnet${rs.length>1?'s':''}${masks>1?`, ${masks} masks`:''}`;
    return [h,...rs.map(r=>r.c==='O'?`O       ${n2ip(r.net)}/${r.p} [110/${r.cost}] via ${n2ip(r.hop)}, 00:0${(r.cost%5)+1}:${String(10+r.cost%40).padStart(2,'0')}, ${r.ifc}`
      :`${r.c}       ${n2ip(r.net)}/${r.p} is directly connected, ${r.ifc}`)].join('\n');}).join('\n');
  return head+(body?'\n'+body:'');
}
function showVersion(d){
  const r=d.cfg.configReg,b=d.bootReg;
  return `Cisco IOS Software, ${d.type==='router'?'C1900 Software (C1900-UNIVERSALK9-M)':'C2960 Software (C2960-LANBASEK9-M)'}, Version 15.1(4)M4, RELEASE SOFTWARE (fc2)\n\n${d.cfg.hostname} uptime is 12 minutes\nSystem image file is "flash:${d.type==='router'?'c1900-universalk9-mz.SPA.151-4.M4.bin':'c2960-lanbasek9-mz.150-2.SE4.bin'}"\n\n${d.type==='router'?'Cisco CISCO1941/K9 (revision 1.0) with 491520K/32768K bytes of memory.':'cisco WS-C2960-24TT-L (PowerPC405) processor with 65536K bytes of memory.'}\n\nConfiguration register is ${b}${r!==b?` (will be ${r} at next reload)`:''}`;
}
function ifStatus(d,n,x,net){
  if(x.shutdown)return ['administratively down','down'];
  if(n.startsWith('Vlan'))return ['up','up'];
  if(n.startsWith('Serial')||n.startsWith('Gigabit')&&d.type==='router'){const up=!net||linkUp(net,d,n);return up?['up','up']:['down','down'];}
  return ['up','up'];
}
function ipBrief(d,net){
  const rows=Object.entries(d.cfg.ifaces).filter(([n])=>d.type==='router'||!/FastEthernet0\/([3-9]|1\d|2[0-4])$/.test(n));
  const pad=(s,w)=>String(s).padEnd(w);
  return [pad('Interface',23)+pad('IP-Address',16)+'OK? Method Status                Protocol',...rows.map(([n,x])=>{const[s,p]=ifStatus(d,n,x,net);return pad(n,23)+pad(x.ip||'unassigned',16)+pad('YES',4)+pad(x.ip?'manual':'unset',7)+pad(s,22)+p;})].join('\n');
}

/* ---------------- a small network, for ping and SSH ---------------- */
function linkUp(net,d,n){const l=(net.links||[]).find(l=>(l[0]===d.name&&l[1]===n)||(l[2]===d.name&&l[3]===n));if(!l)return true;const o=l[0]===d.name?net.devices[l[2]]:net.devices[l[0]];if(!o||o.type==='pc')return true;const on=l[0]===d.name?l[3]:l[1];const x=o.cfg.ifaces[on];return x&&!x.shutdown;}
function ifacesUp(dv,net){
  if(dv.type==='pc')return dv.ip&&dv.mask?[{ip:ip2n(dv.ip),mask:ip2n(dv.mask),gw:ip2n(dv.gw)}]:[];
  if(dv.type==='switch'){const v=dv.cfg.ifaces.Vlan1;return v&&!v.shutdown&&v.ip?[{ip:ip2n(v.ip),mask:ip2n(v.mask),gw:ip2n(dv.cfg.defaultGw)}]:[];}
  return Object.entries(dv.cfg.ifaces).filter(([n,x])=>!x.shutdown&&x.ip&&(!net||linkUp(net,dv,n))).map(([n,x])=>({ip:ip2n(x.ip),mask:ip2n(x.mask),name:n}));
}
function owner(net,ip){for(const dv of Object.values(net.devices)){const f=ifacesUp(dv,net).find(x=>x.ip===ip);if(f)return {dv,f};}return null;}
function routersLinked(net,a,b){if(a===b)return true;const A=ifacesUp(a,net),B=ifacesUp(b,net);return A.some(x=>B.some(y=>sameNet(x.ip,y.ip,x.mask)));}
function gatewayRouter(net,host){const f=ifacesUp(host,net)[0];if(!f||f.gw==null||!sameNet(f.ip,f.gw,f.mask))return null;const o=owner(net,f.gw);return o&&o.dv.type==='router'?o.dv:null;}
function reach(net,src,ip){
  if(!net)return false;const t=owner(net,ip);if(!t)return false;if(t.dv===src)return true;
  const S=ifacesUp(src,net);if(!S.length)return false;
  if(S.some(x=>sameNet(x.ip,ip,x.mask)))return true;
  const fromR=src.type==='router'?src:gatewayRouter(net,src);if(!fromR)return false;
  const toR=t.dv.type==='router'?t.dv:gatewayRouter(net,t.dv);if(!toR)return false;
  if(src.type==='router'&&t.dv.type!=='router'&&!ifacesUp(fromR,net).some(x=>sameNet(x.ip,ip,x.mask))&&!routersLinked(net,fromR,toR))return false;
  return routersLinked(net,fromR,toR);
}
function pingText(d,ipStr,net,style,count){
  const ok=reach(net,d,ip2n(ipStr));d.pings=d.pings||[];d.pings.push({ip:ipStr,ok});
  if(style==='pc')return ok?`\nPinging ${ipStr} with 32 bytes of data:\n\n${[...Array(count||4)].map(()=>`Reply from ${ipStr}: bytes=32 time<1ms TTL=255`).join('\n')}\n\nPing statistics for ${ipStr}:\n    Packets: Sent = ${count||4}, Received = ${count||4}, Lost = 0 (0% loss),`
    :`\nPinging ${ipStr} with 32 bytes of data:\n\n${[...Array(count||4)].map(()=>'Request timed out.').join('\n')}\n\nPing statistics for ${ipStr}:\n    Packets: Sent = ${count||4}, Received = 0, Lost = ${count||4} (100% loss),`;
  return `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${ipStr}, timeout is 2 seconds:\n${ok?'!!!!!':'.....'}\nSuccess rate is ${ok?'100 percent (5/5), round-trip min/avg/max = 0/0/1 ms':'0 percent (0/5)'}`;
}
/* ---------------- PCs: command prompt with ipconfig, ping and ssh ---------------- */
function runPC(pc,raw,net){
  pc.out=[];
  const sess=pc.session[pc.session.length-1];
  if(sess){const d=sess.dev;const con={mode:d.mode,ctx:d.ctx,pending:d.pending,via:d.via};
    d.mode=sess.mode;d.ctx=sess.ctx;d.pending=sess.pending;d.via='ssh';
    const o=run(d,raw,net);pc.out=o.slice();
    sess.mode=d.mode;sess.ctx=d.ctx;sess.pending=d.pending;const closed=d.closed;d.closed=false;
    d.mode=con.mode;d.ctx=con.ctx;d.pending=con.pending;d.via=con.via;
    if(closed){pc.session.pop();pc.out.push({t:`\n[Connection to ${sess.ip} closed by foreign host]`,c:'out'});}
    return pc.out;}
  if(pc.pending){const p=pc.pending;pc.pending=null;p.fn(raw);return pc.out;}
  pc.log.push({input:raw});
  if(/^\s*$/.test(raw))return pc.out;
  if(/\?$/.test(raw)){const tmp={out:[],type:'pc',cfg:{},mode:'pc',session:[]};helpOut(tmp,'pc',raw.slice(0,-1));pc.out=tmp.out;pc.refill=tmp.refill;return pc.out;}
  const r=parse('pc',raw,pc);
  if(!r.ok){pc.out.push({t:'Invalid Command.',c:'err'});if(/^ping$/i.test(raw.trim()))pc.out.push({t:'Give an address: ping 192.168.1.1',c:'coach'});
    if(/^ssh/i.test(raw.trim()))pc.out.push({t:'The syntax is ssh -l username ip-address',c:'coach'});return pc.out;}
  pc.history.push(raw.trim());
  if(r.id==='ipconfig'&&pc.v6){pc.out.push({t:`\nFastEthernet0 Connection:(default port)\n\n   Connection-specific DNS Suffix..: \n   Link-local IPv6 Address.........: ${pc.v6.ll.toUpperCase()}\n   IPv6 Address....................: ${pc.v6.ip.toUpperCase()}\n   IPv4 Address....................: 0.0.0.0\n   Subnet Mask.....................: 0.0.0.0\n   Default Gateway.................: ${pc.v6.gw.toUpperCase()}\n                                     0.0.0.0\n`,c:'out'});return pc.out;}
  if(r.id==='ipconfig'){pc.out.push({t:`\nFastEthernet0 Connection:(default port)\n\n   IPv4 Address......................: ${pc.ip||'0.0.0.0'}\n   Subnet Mask.......................: ${pc.mask||'0.0.0.0'}\n   Default Gateway...................: ${pc.gw||'0.0.0.0'}\n`,c:'out'});return pc.out;}
  if(r.id==='ping'){pc.out.push({t:pingText(pc,r.args[r.args.length-1],net,'pc',r.args.length>1?Number(r.args[0]):4),c:'out'});return pc.out;}
  if(r.id==='ping6'){const dst=r.args[r.args.length-1],n=r.args.length>1?Number(r.args[0]):4,ok=net&&net.ping6?net.ping6(pc,dst):false;pc.pings=pc.pings||[];pc.pings.push({ip:dst.toLowerCase(),ok});
    pc.out.push({t:`\nPinging ${dst} with 32 bytes of data:\n\n${[...Array(n)].map(()=>ok?`Reply from ${dst.toUpperCase()}: bytes=32 time<1ms TTL=${ok==='remote'?127:128}`:'Request timed out.').join('\n')}\n\nPing statistics for ${dst.toUpperCase()}:\n    Packets: Sent = ${n}, Received = ${ok?n:0}, Lost = ${ok?0:n} (${ok?0:100}% loss),`,c:'out'});return pc.out;}
  if(r.id==='ssh'){
    const [user,ip]=r.args;const t=net&&owner(net,ip2n(ip));
    pc.sshTries=(pc.sshTries||0)+1;
    if(!t||!reach(net,pc,ip2n(ip))){pc.out.push({t:'\n% Connection timed out; remote host not responding',c:'err'});return pc.out;}
    const d=t.dv;if(d.type==='pc'){pc.out.push({t:'\n% Connection refused by remote host',c:'err'});return pc.out;}
    const c=d.cfg,v=c.lines.vty;
    if(!c.rsaBits||(v.transport!=='ssh'&&v.transport!=='all')){pc.out.push({t:'\n% Connection refused by remote host',c:'err'});return pc.out;}
    pc.pending={prompt:'Password:',mask:true,fn:pw=>{
      const u=c.users[user];
      if(v.login!=='local'||!u||u.pw!==pw){pc.out.push({t:'\n% Login invalid\n\n[Connection to '+ip+' closed by foreign host]',c:'err'});return;}
      pc.session.push({dev:d,ip,mode:'user',ctx:null,pending:null});pc.sshOK=(pc.sshOK||[]).concat([{ip,user}]);
      if(c.banner!=null)pc.out.push({t:c.banner,c:'out'});
      pc.out.push({t:'\n',c:'out'});}};
    return pc.out;}
  return pc.out;
}
const pendingPrompt=d=>{if(d.type==='pc'){const s=d.session[d.session.length-1];if(s)return s.pending;return d.pending?d.pending:null;}return d.pending;};
const activeDev=d=>d.type==='pc'&&d.session.length?d.session[d.session.length-1].dev:d;
const activeMode=d=>d.type==='pc'?(d.session.length?d.session[d.session.length-1].mode:'pc'):d.mode;

const IOS={ip2n,n2ip,isMask,prefixOf,sameNet,newDevice,prompt,parse,help,complete,run,runningConfig,configText,reach,ifaceName,tokenize,pendingPrompt,activeDev,activeMode,helpOut,G,ifacesUp,clone,macOf,eui64ll,routesOf,BW,sessionStart};
if(typeof module!=='undefined'&&module.exports)module.exports=IOS;else root.IOS=IOS;
})(typeof window!=='undefined'?window:globalThis);
