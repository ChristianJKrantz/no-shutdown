"""Packet Tracer lab (11.7.5 Subnetting Scenario), moved here from Subnet Sprint. Part 1: the class lab's answers,
hundreds of random networks, feedback for common mistakes, hints, the part picker, your own lab and lab links,
printing and phones. Part 2: the hand-off to the scenario task with the same network, and back.
python3 tests/test_lab.py  (needs Playwright; the print check also needs PyMuPDF)"""
import os, sys, re
from playwright.sync_api import sync_playwright
URL=os.environ.get('NS_URL','file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'..','index.html')))
CLASS='?lab=192.168.100.0&hosts=25&r1=2&r2=2'
fails=[]
def ok(c,msg):
    print(('  ✓ ' if c else '  ✗ ')+msg)
    if not c: fails.append(msg)
def answers(pg): return pg.evaluate("NS.Lab.q.fields.map(f=>NS.LAB.show(f))")
def labels(pg): return pg.evaluate("NS.Lab.q.fields.map(f=>f.label)")
def short(a): return a.split('.')[-1] if re.match(r'^\d+\.\d+\.\d+\.\d+$',a) else a
def answer(pg,a): pg.fill('#labIn',a); pg.press('#labIn','Enter'); pg.wait_for_timeout(10)
def upto(pg,label):
    for a,l in zip(answers(pg),labels(pg)):
        if l==label: return
        answer(pg,short(a))
    raise Exception('no field '+label)
def msg(pg): return pg.inner_text('.lab-fb')
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1300,'height':1000}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.goto(URL+CLASS); pg.wait_for_timeout(400)
    print('The class lab (11.7.5: 192.168.100.0/24, 25 hosts per LAN)')
    ok(pg.is_visible('#v-lab') and pg.locator('.tab.on').inner_text()=='Packet Tracer lab','a lab link opens the Packet Tracer lab tab')
    A=dict(zip(labels(pg),answers(pg)))
    ok([A[k] for k in ['a. Based on the topology, how many subnets are needed?','b. How many bits must be borrowed to support that many subnets?','c. How many subnets does this create?','d. How many usable hosts does this create per subnet?']]==['5','3','8','30'],'Step 1 a–d: 5 subnets, 3 bits, 8 subnets, 30 hosts')
    ok([A[f'e. Subnet {k} last octet in binary'] for k in (2,3,4)]==['01000000','01100000','10000000'] and A['f. New subnet mask in decimal']=='255.255.255.224','binary subnet values and the /27 mask')
    ok([(A[f'Subnet {k} subnet address'],A[f'Subnet {k} last usable host'],A[f'Subnet {k} broadcast address']) for k in (0,4,7)]==[('192.168.100.0','192.168.100.30','192.168.100.31'),('192.168.100.128','192.168.100.158','192.168.100.159'),('192.168.100.224','192.168.100.254','192.168.100.255')],'subnet table rows (0, 4 and 7 spot-checked) match')
    exp={'R1 G0/0':'.1','R1 G0/1':'.33','R1 S0/0/0':'.129','R2 G0/0':'.65','R2 G0/1':'.97','R2 S0/0/0':'.158','S1 VLAN 1':'.2','S2 VLAN 1':'.34','S3 VLAN 1':'.66','S4 VLAN 1':'.98','PC1 NIC':'.30','PC2 NIC':'.62','PC3 NIC':'.94','PC4 NIC':'.126'}
    ok(all(A[f'{k} IP address']=='192.168.100'+v for k,v in exp.items()),'Addressing Table IPs match the filled-in lab')
    ok([A[f'{d} default gateway'] for d in ('S1','S3','PC2','PC4')]==['192.168.100.1','192.168.100.65','192.168.100.33','192.168.100.97'],'switch and PC gateways match')
    ok(len(labels(pg))==72,'Part 1 has 72 questions')
    ok(pg.locator('.lab-prompt svg.topo').count()==1 and pg.locator('.lab-prompt svg.topo text').filter(has_text='PC4').count()==1,'the topology diagram is drawn')
    print('Random networks')
    bad=pg.evaluate("""(()=>{const out=[];for(let i=0;i<300;i++){const q=NS.LAB.genLab(null,'all'),L=q.L;
      if(L.need!==L.lans.length+1)out.push('need');if(2**L.n<L.need||2**(L.n-1)>=L.need)out.push('bits');
      if(L.hosts>L.per||L.hosts<2)out.push('hosts');
      const seen=new Set();L.rows.forEach(r=>{if(seen.has(r.ip))out.push('dup');seen.add(r.ip);const s=r.link.sub;
        if(r.ip<=s.net||r.ip>=s.bc)out.push('range');
        if(r.role==='sw'&&r.ip!==s.first+1)out.push('sw');if(r.role==='pc'&&r.ip!==s.last)out.push('pc');if(r.role==='r2wan'&&r.ip!==s.last)out.push('wan');
        if(r.gw!=null&&r.gw!==s.first)out.push('gw');});
      if(L.subs.some((s,k)=>s.net!==L.base+k*L.blk))out.push('align');
      if(q.diag(q.fields.map(f=>NS.LAB.show(f))).some(Boolean))out.push('diag');}
      return [...new Set(out)];})()""")
    ok(bad==[],f'300 random networks: right subnet count and bits, hosts fit, table rules followed, no duplicates, right answers pass {bad}')
    print('Feedback')
    answer(pg,'4'); ok('serial link between R1 and R2' in msg(pg) and '5' not in msg(pg).split('Try again')[0],'forgetting the WAN link: says count it, without giving 5')
    answer(pg,'6'); ok('single subnet' in msg(pg),'counting the WAN link twice is caught')
    answer(pg,'5'); answer(pg,'5'); ok('number of subnets' in msg(pg),'typing the subnet count as the bits borrowed is caught')
    answer(pg,'2'); ok('fewer than 5' in msg(pg),'too few bits borrowed is caught')
    answer(pg,'4'); ok('borrowed too many' in msg(pg),'too many bits (14 hosts < 25) is caught')
    answer(pg,'3'); answer(pg,'5'); ok('full power of 2' in msg(pg),'subnets created = subnets needed is caught')
    answer(pg,'8'); answer(pg,'32'); ok('subtract 2' in msg(pg),'forgetting the − 2 for hosts is caught')
    answer(pg,'30'); answer(pg,'64'); answer(pg,'00000010'); ok('borrowed' in msg(pg) and 'leftmost' in msg(pg),'subnet 2 written as 00000010 gets “the subnet number sits in the borrowed bits”')
    upto(pg,'f. New subnet mask, 4th octet in binary'); answer(pg,'11000000'); ok('borrowed bits are the 1s' in msg(pg),'a mask with the wrong number of 1s is caught')
    upto(pg,'R1 G0/1 IP address'); answer(pg,'1'); ok('subnet 0' in msg(pg) and 'subnet 1' in msg(pg),'an address from the wrong subnet names both subnets')
    upto(pg,'R2 S0/0/0 IP address'); answer(pg,'129'); ok('clash' in msg(pg),'R2 taking the WAN link’s first address (R1’s) is caught')
    upto(pg,'S1 VLAN 1 IP address'); answer(pg,'1'); ok('first usable' in msg(pg) and 'second usable' in msg(pg),'a switch given the router’s address gets the switch rule')
    upto(pg,'PC1 default gateway'); answer(pg,'2'); ok('That’s the switch' in msg(pg),'a PC gateway set to the switch is caught')
    answer(pg,'<img src=x onerror=window.__x=1>'); ok(pg.locator('.lab-fb img').count()==0 and not pg.evaluate("!!window.__x"),'typed HTML is shown as text in the feedback')
    print('Hints and Show the answer')
    pg.goto(URL+CLASS); pg.wait_for_timeout(300)
    upto(pg,'R2 S0/0/0 IP address'); pg.click('.lab-q button:has-text("Hint")')
    ok('Which subnet number' in pg.inner_text('.lab-hints'),'an Addressing Table hint first asks which subnet the device is on')
    pg.click('.lab-q button:has-text("Next hint")'); ok(pg.locator('.lab-hints li').count()==2,'Next hint adds the next step')
    pg.click('.lab-q button:has-text("Show the answer")'); ok(pg.input_value('#labIn')=='158','Show the answer fills in just the last octet')
    print('A perfect run, then Part 2')
    pg.goto(URL+CLASS); pg.wait_for_timeout(300)
    for a in answers(pg): answer(pg,short(a))
    ok(pg.is_visible('.done-banner') and '72 of 72' in pg.inner_text('.done-banner'),'all 72 right on the first try is reported')
    ok('255.255.255.224' in pg.inner_text('.lab-sol') and 'PC4' in pg.inner_text('.lab-sol'),'the worked answer shows the subnet and addressing tables')
    pg.click('button:has-text("Part 2: configure the devices")'); pg.wait_for_timeout(200)
    p=pg.evaluate("NS.Tasks.t&&NS.Tasks.t.params")
    ok(p=={'lab':'192.168.100.0','hosts':25,'r1':2,'r2':2} and 'task=scenario' in pg.url and 'lab=192.168.100.0' in pg.url,'Part 2 opens the configuration task on the same network (and the link says so)')
    pg.click('button:has-text("Part 1: subnetting")'); pg.wait_for_timeout(200)
    ok(pg.is_visible('#v-lab') and pg.evaluate("NS.LAB.ipStr(NS.Lab.q.L.base)")=='192.168.100.0','the Part 2 task links back to Part 1 with the same network')
    print('Parts')
    ok(pg.locator('#v-lab .groups .chip').count()==4,'the part picker has Part 1, Step 1, Steps 2–3 and Part 2')
    for name,first,n in [('Step 1: subnetting','a. Based on the topology, how many subnets are needed?',44),('Steps 2–3: Addressing Table','Assign Subnet 0 to the LAN on R1 G0/0: its subnet address',28)]:
        pg.click(f'#v-lab .groups .chip:has-text("{name}")'); pg.wait_for_timeout(150)
        ok(pg.inner_text('.lab-q .dpurpose')==first and len(labels(pg))==n and pg.evaluate("NS.Lab.q.L.hosts")==25,f'“{name}”: {n} questions, starting at the right step, same network')
    ok(pg.locator('.fs-ref').count()==1,'Steps 2–3 show the subnet table as a reference')
    pg.click('#v-lab .groups .chip:has-text("All of Part 1")')
    print('Your own lab and lab links')
    pg.click('button:has-text("Your own lab")')
    for net,h,expect in [('192.168.100.5','25','ends in .0'),('127.0.0.0','25','not 127'),('10.0.0.0','x','whole number'),('10.0.0.0','40','fewer than 40')]:
        pg.fill('#labNet',net); pg.fill('#labHosts',h); pg.click('#labOwn button:has-text("Load lab")'); ok(expect in pg.inner_text('#labOwnMsg'),f'rejects {net} with {h} hosts')
    pg.fill('#labNet','10.20.30.0'); pg.fill('#labHosts','50'); pg.select_option('#labR1','1'); pg.select_option('#labR2','1'); pg.click('#labOwn button:has-text("Load lab")'); pg.wait_for_timeout(100)
    ok(pg.evaluate("[NS.Lab.q.L.n,NS.Lab.q.L.per]")==[2,62] and 'lab=10.20.30.0' in pg.url,'a 1 + 1 LAN network borrows 2 bits (62 hosts each), and the address bar links to it')
    p2=b.new_page(); e2=[]; p2.on('pageerror',lambda e:e2.append(str(e))); p2.goto(pg.url); p2.wait_for_timeout(300)
    ok(p2.evaluate("NS.LAB.ipStr(NS.Lab.q.L.base)")=='10.20.30.0','opening that link loads the same lab')
    p2.goto(URL+'?lab=%3Cimg%20src%3Dx%20onerror%3Dwindow.__p%3D1%3E&hosts=%3Cscript%3E&r1=9'); p2.wait_for_timeout(300)
    ok(not p2.evaluate("!!window.__p") and not e2 and p2.is_visible('#v-lab'),'a malformed or malicious lab link is ignored safely (a random lab opens)')
    p2.goto(URL+'?tab=lab'); p2.wait_for_timeout(200); ok(p2.is_visible('#v-lab'),'?tab=lab opens the lab')
    print('Printing')
    pg.evaluate("document.querySelector('#labKey').checked=true")
    pg.evaluate("window.print=()=>{window.__printed=document.querySelectorAll('#printArea .pp').length}"); pg.click('#v-lab button:has-text("Print")')
    ok(pg.evaluate("window.__printed")==2,'Print builds the lab plus its answer key')
    pg.evaluate("document.querySelector('#printArea').innerHTML='<div class=\"pp-title\"><h2>x</h2></div>'+NS.LAB.printLabHTML(NS.Lab.q,1,false);document.body.classList.add('printing')")
    pg.emulate_media(media='print'); pg.pdf(path='/tmp/ns_lab_print.pdf',format='Letter'); pg.emulate_media(media='screen'); pg.evaluate("document.body.classList.remove('printing')")
    try:
        import fitz
        d=fitz.open('/tmp/ns_lab_print.pdf'); txt=''.join(d[k].get_text() for k in range(len(d)))
        ok('Addressing Table' in txt and 'Part 2' in txt and 'No Shutdown' not in txt and len(d)<=3,f'the printout has the lab, its Addressing Table and the Part 2 note, on {len(d)} page(s), without the site around it')
    except ImportError: print('  (PyMuPDF not installed: skipped the PDF check)')
    print('Phone')
    m=b.new_page(viewport={'width':360,'height':800},is_mobile=True,has_touch=True); m.goto(URL+CLASS); m.wait_for_timeout(300); widest=0
    for a in answers(m):
        answer(m,short(a)); widest=max(widest,m.evaluate("document.documentElement.scrollWidth"))
    ok(widest<=360,f'the whole lab fits a 360px phone ({widest}px)')
    ok(not errs,f'no page errors {errs}')
print(f'\n{"all passed" if not fails else str(len(fails))+" failed"}'); sys.exit(1 if fails else 0)
