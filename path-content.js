/* No Shutdown learning path: the drill topics in teaching order. Each unit has a short lesson (a few screens with
   a sample console), a quick check, a drill session on that topic, and a checkpoint task that uses the commands on
   a simulated device. app.js draws it. */
(function(root){
'use strict';
const con=(...lines)=>`<div class="pl-con">${lines.map(l=>{const m=l.match(/^(\S+[>#])\s?(.*)$/);return m?`<div><span class="p">${m[1]}</span>${m[2]}</div>`:`<div class="o">${l}</div>`;}).join('')}</div>`;
const UNITS=[
 {id:'modes',name:'Getting around the modes',group:'Modes',n:6,task:'modes',
  learn:[
   `<p>IOS has layers of <b>modes</b>, and the prompt always tells you which one you're in. Each layer unlocks more commands.</p>${con('R1>','R1# ','R1(config)#','R1(config-if)#')}<p><b>&gt;</b> user EXEC (look only) · <b>#</b> privileged EXEC (everything, plus saving) · <b>(config)</b> global configuration · <b>(config-if)</b> one interface.</p>`,
   `<p>Going <b>down</b> a layer:</p>${con('R1> enable','R1# configure terminal','R1(config)# interface g0/0','R1(config-if)#')}<p>Going <b>up</b>: <span class="mono">exit</span> goes up one level, <span class="mono">end</span> (or Ctrl+Z) jumps straight to <b>R1#</b>, and <span class="mono">disable</span> drops back to <b>R1&gt;</b>.</p>`,
   `<p>Two habits that save time:</p><ul><li>Any unique start of a word works: <span class="mono">conf t</span>, <span class="mono">int g0/0</span>, <span class="mono">sh ip int br</span>.</li><li><span class="mono">show</span> commands are EXEC commands. From config mode, put <span class="mono">do</span> in front: <span class="mono">do show ip interface brief</span>.</li></ul>`],
  check:{q:'You are at R1(config-if)#. Which one command takes you to R1#?',o:['end','exit','disable'],a:0,why:'end jumps straight back to privileged EXEC. exit only goes up one level, to R1(config)#.'}},
 {id:'basic',name:'First-time setup',group:'Basic setup',n:5,
  learn:[
   `<p>Most first-time settings are typed in <b>global configuration</b> mode.</p>${con('Router(config)# hostname R1','R1(config)# no ip domain-lookup','R1(config)# banner motd #Authorized users only#')}<ul><li><span class="mono">hostname</span> changes the prompt right away.</li><li><span class="mono">no ip domain-lookup</span> stops a mistyped command from being treated as a host name to look up (and the long wait that comes with it).</li><li>The banner text sits between two matching delimiters, like <span class="mono">#</span>.</li></ul>`,
   `<p>A switch passes traffic at Layer 2, but you still manage it over the network. For that it needs an address on <b>VLAN 1</b> (coming up later) and a <b>default gateway</b> so replies can leave its own subnet:</p>${con('S1(config)# ip default-gateway 192.168.1.1')}<p>Note the dash: <span class="mono">ip default-gateway</span>.</p>`],
  check:{q:'Which prompt do you type hostname R1 at?',o:['Router(config)#','Router#','Router(config-if)#'],a:0,why:'hostname is a global configuration command.'}},
 {id:'pw',name:'Passwords',group:'Passwords',n:6,task:'basic-router',
  learn:[
   `<p>Protect <b>privileged EXEC</b> with <span class="mono">enable secret</span>. It's stored as a hash. The older <span class="mono">enable password</span> is stored in plain text, so don't use it.</p>${con('R1(config)# enable secret class')}`,
   `<p>Each way in is a <b>line</b>. Give it a password, and turn on <span class="mono">login</span> so it actually asks for it:</p>${con('R1(config)# line console 0','R1(config-line)# password cisco','R1(config-line)# login','R1(config-line)# exit','R1(config)# line vty 0 4')}<p>VTY lines are for telnet and SSH: <b>0 4</b> on a router, <b>0 15</b> on a switch.</p>`,
   `<p><span class="mono">service password-encryption</span> scrambles the plain-text line passwords in the config (type 7). It's weak, but it stops someone reading them over your shoulder.</p>`],
  check:{q:'You set a console password, but the console never asks for it. What is missing?',o:['login','enable secret','service password-encryption'],a:0,why:'A line only asks for its password once login is turned on.'}},
 {id:'ifaces',name:'Interfaces',group:'Interfaces',n:6,task:'router-ifaces',task2:'switch-mgmt',
  learn:[
   `<p>Select an interface, then configure it. Router interfaces start <b>shut down</b>, so they need <span class="mono">no shutdown</span>.</p>${con('R1(config)# interface g0/0','R1(config-if)# description LAN to S1','R1(config-if)# ip address 192.168.1.1 255.255.255.0','R1(config-if)# no shutdown')}<p>The mask is written out in dotted decimal. IOS won't take <span class="mono">/24</span> here.</p>`,
   `<p>A switch's management address goes on the virtual interface for <b>VLAN 1</b>, not on a port:</p>${con('S1(config)# interface vlan 1','S1(config-if)# ip address 192.168.1.2 255.255.255.0','S1(config-if)# no shutdown')}`,
   `<p>IPv6 takes the prefix length with a slash, and you can set an easy-to-read link-local address too:</p>${con('R1(config-if)# ipv6 address 2001:db8:acad:1::1/64','R1(config-if)# ipv6 address fe80::1 link-local')}`],
  check:{q:'A router interface has its IP address, but shows "administratively down". What is missing?',o:['no shutdown','ip default-gateway','login'],a:0,why:'Administratively down means the interface is shut down. no shutdown turns it on.'}},
 {id:'verify',name:'Checking your work',group:'Verify',n:5,
  learn:[
   `<p>Configure, then <b>verify</b>. Three commands answer most questions:</p><ul><li><span class="mono">show ip interface brief</span>: every interface, its address, and whether it's up/up.</li><li><span class="mono">show running-config</span>: everything configured right now.</li><li><span class="mono">ping</span>: can this device reach that address?</li></ul>`,
   `${con('R1# show ip interface brief','Interface          IP-Address    OK? Method Status                Protocol','GigabitEthernet0/0 192.168.1.1   YES manual up                    up','GigabitEthernet0/1 unassigned    YES unset  administratively down down')}<p><b>up/up</b> is working. <b>administratively down</b> needs <span class="mono">no shutdown</span>. <b>up/down</b> usually means a cable or the other end.</p>`],
  check:{q:'Which command lists every interface with its IP address and status in one table?',o:['show ip interface brief','show running-config','show version'],a:0,why:'show ip interface brief is the one-table summary.'}},
 {id:'save',name:'Saving and resetting',group:'Save & reset',n:6,task:'reset',task2:'backup',
  learn:[
   `<p>Your changes go into the <b>running-config</b>, which lives in RAM and is gone after a reload. The <b>startup-config</b> in NVRAM is what loads at boot. Save one to the other:</p>${con('R1# copy running-config startup-config')}<p>(<span class="mono">copy run start</span> for short.)</p>`,
   `<p>To wipe a device back to factory settings:</p>${con('S1# erase startup-config','S1# delete vlan.dat','S1# reload','System configuration has been modified. Save? [yes/no]: no')}<p>Answer <b>no</b> at the prompt, or you'll save the config you just erased right back. <span class="mono">vlan.dat</span> only exists on switches.</p>`,
   `<p>The <b>configuration register</b> decides how the router boots. <b>0x2102</b> is normal. <b>0x2142</b> skips the startup-config, which is used for password recovery.</p>${con('R1# show version','R1# configure terminal','R1(config)# config-register 0x2102')}`],
  check:{q:'You configured a router, reloaded it, and everything was gone. What did you skip?',o:['copy running-config startup-config','erase startup-config','reload'],a:0,why:'Without saving, the running-config in RAM is lost on reload.'}},
 {id:'ssh',name:'Secure remote access (SSH)',group:'SSH',n:6,task:'ssh',
  learn:[
   `<p>SSH encrypts remote sessions. Telnet sends everything, passwords included, in plain text. SSH needs a <b>hostname</b> (not the default) and a <b>domain name</b>, because the RSA keys are named after them:</p>${con('S1(config)# ip domain-name ccna.lab','S1(config)# crypto key generate rsa','How many bits in the modulus [512]: 1024','S1(config)# ip ssh version 2')}<p>SSH version 2 needs a key of at least 768 bits; use 1024 or more.</p>`,
   `<p>Then a local account, and the VTY lines set to SSH only, logging in with that account:</p>${con('S1(config)# username admin secret Str0ngPass!','S1(config)# line vty 0 15','S1(config-line)# transport input ssh','S1(config-line)# login local')}<p><span class="mono">login local</span> checks the <span class="mono">username</span> accounts instead of a line password.</p>`],
  check:{q:'crypto key generate rsa fails until you set what?',o:['A domain name (and a non-default hostname)','The enable secret','transport input ssh'],a:0,why:'The key pair is named hostname.domain, so both have to be set first.'}},
 {id:'harden',name:'Hardening logins',group:'Security',n:5,task:'harden',
  learn:[
   `<p>Three settings make guessing passwords much harder:</p>${con('R1(config)# security passwords min-length 8','R1(config)# login block-for 120 attempts 3 within 60','R1(config)# line vty 0 4','R1(config-line)# exec-timeout 5 0')}<ul><li>Passwords set from now on need at least 8 characters.</li><li>3 failed logins within 60 seconds block logins for 120 seconds.</li><li>An idle session logs out after 5 minutes, 0 seconds.</li></ul>`],
  check:{q:'What does exec-timeout 5 30 do?',o:['Logs out a session idle for 5 minutes 30 seconds','Blocks logins for 5 minutes after 30 failures','Waits 5 seconds between 30 login tries'],a:0,why:'exec-timeout takes minutes, then seconds, of idle time.'}}
];
root.NSPath={UNITS};
})(typeof window!=='undefined'?window:globalThis);
