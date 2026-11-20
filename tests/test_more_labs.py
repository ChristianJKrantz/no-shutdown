"""Browser tests for the labs added after 11.9.3 (python3 tests/test_more_labs.py):
11.5.5 Subnet an IPv4 Network (Part 1 questions and the hand-off to Part 2), 10.3.4 Connect a Router to a LAN
(goals plus the handout questions, checked live), and 9.3.4 IPv6 Neighbor Discovery (simulation, event list, questions)."""
from playwright.sync_api import sync_playwright
import os, re, sys
URL = os.environ.get('NS_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'index.html')))
fails = []
def ok(c, msg):
    print(('  ok   ' if c else '  FAIL ') + msg)
    if not c: fails.append(msg)
T = 'input[aria-label="Command"]:visible'
def cmd(pg, c): pg.fill(T, c); pg.press(T, 'Enter')

with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    def page(w=1300, h=900, **kw):
        pg = b.new_page(viewport={'width': w, 'height': h}, **kw); pg.on('pageerror', lambda e: errs.append(str(e))); return pg

    print('11.5.5 Subnet an IPv4 Network')
    pg = page(); pg.goto(URL + '?subnet=192.168.0.0&hosts=50,40&spare=2'); pg.wait_for_timeout(300)
    ok(pg.evaluate("NS.Lab.kind") == 'sub', 'a ?subnet= link opens the 11.5.5 lab')
    n = pg.evaluate("NS.Lab.q.fields.length"); ok(n > 30, f'the lab asks the handout questions ({n})')
    for i in range(n):
        f = pg.evaluate(f"(()=>{{const f=NS.Lab.q.fields[{i}];return {{t:f.type,v:NS.LAB.show(f),pre:f.pre||''}};}})()")
        if f['t'] in ('choice', 'multi'):
            for v in ([f['v']] if f['t'] == 'choice' else f['v'].split(', ')):
                pg.locator('.lab-picks button[data-v="%s"]' % v.replace('"', '\\"')).click()
        else:
            v = f['v'][len(f['pre']):] if f['pre'] and f['v'].startswith(f['pre']) else f['v']
            pg.fill('#labIn', v)
        pg.click('#labQ button:has-text("Check")'); pg.wait_for_timeout(10)
    ok(pg.locator('#labQ .done-banner').count() == 1, 'every 11.5.5 answer is accepted and Part 1 finishes')
    pg.click('#labQ button:has-text("Part 2")'); pg.wait_for_timeout(200)
    ok('task=subnet-ipv4' in pg.url and 'subnet=192.168.0.0' in pg.url, 'Part 2 opens the configuration task with the same network')

    print('10.3.4 Connect a Router to a LAN')
    pg = page(); pg.goto(URL + '?task=connect-router'); pg.wait_for_timeout(300)
    ok('task=connect-router' in pg.url and pg.locator('#tquestions').count() == 1, 'the task opens from its link')
    nq = pg.evaluate("NS.Tasks.t.questions.length")
    # finish the goals in the model, then answer the handout questions through the page
    pg.evaluate("""(()=>{const t=NS.Tasks.t;const sec={};Object.values(t.net.devices).forEach(x=>{if(x.cfg)sec[x.cfg.hostname]=x.cfg.enableSecret;});
      t.goals.forEach(g=>{if(g.check(t.net)||g.where==='pcip')return;const d=t.net.devices[g.dev];
        for(let i=0;i<6&&NS.IOS.pendingPrompt(d);i++)NS.IOS.run(d,'cisco',t.net);
        NS.CS.showMe(g,d).forEach(s=>{NS.IOS.run(d,s,t.net);const p=NS.IOS.pendingPrompt(d);if(p&&s==='enable')NS.IOS.run(d,sec[d.cfg.hostname]||'class',t.net);});});})()""")
    right = 0
    for i in range(nq):
        a = pg.evaluate(f"NS.Tasks.t.questions[{i}].answer"); li = pg.locator(f'#tquestions li[data-q="{i}"]')
        if li.locator('.lab-picks').count(): 
            opts = li.locator('.lab-picks button').all_text_contents(); li.locator('.lab-picks button').nth(max(range(len(opts)), key=lambda j: a.startswith(opts[j]) * len(opts[j]))).click()
        else: li.locator('input').fill(re.split(r' \(|, or ', a)[0])
        li.locator('button:has-text("Check")').click(); g = 'good' in (li.locator('.tq-fb').get_attribute('class') or ''); right += g
        if not g: print('   miss:', i, a)
    ok(right == nq, f'every 10.3.4 question accepts its answer ({right}/{nq})')

    print('9.3.4 IPv6 Neighbor Discovery')
    pg = page(); pg.goto(URL + '?lab=nd'); pg.wait_for_timeout(400)
    ok('9.3.4' in pg.text_content('.dmeta'), 'a ?lab=nd link opens the 9.3.4 lab')
    dev = lambda n: pg.click(f'.dtabs button[data-dev="{n}"]')
    Q = pg.locator('.nd-q li:not(.nd-part)')
    def answer(i):
        li = Q.nth(i); li.locator('button:has-text("Show")').click()
        a = li.locator('.tq-fb').text_content()[len('Answer: '):]
        if li.locator('input').count(): li.locator('input').fill(re.split(r' \(', a)[0])
        else: li.locator('.lab-picks button', has_text=re.compile('^' + re.escape(a.split(' (')[0]) + '$')).click()
        li.locator('button:has-text("Check")').click(); return 'ok' in (li.get_attribute('class') or '')
    cmd(pg, 'ping -n 1 2001:db8:acad:1::b')
    ok(pg.locator('.nd-ev tr[tabindex]').count() == 12, 'a first ping on the LAN records 12 events, NDP included')
    pg.locator('.nd-ev tr[tabindex]').nth(1).click()
    ok('3333.ff00.000b' in pg.text_content('.nd-pdu') and 'FF02::1:FF00:B' in pg.text_content('.nd-pdu'), 'the solicitation goes to the solicited-node group and its multicast MAC')
    p1 = all([answer(i) for i in range(13)]); ok(p1, 'Part 1 questions check against the simulation')
    pg.click('button:has-text("Reset Simulation")'); cmd(pg, 'ping -n 1 2001:db8:acad:1::b')
    ok(pg.locator('.nd-ev tr.ndp').count() == 0, 'a second ping needs no Neighbor Discovery')
    dev('RTA'); cmd(pg, ''); cmd(pg, 'enable'); cmd(pg, 'clear ipv6 neighbors'); pg.click('button:has-text("Reset Simulation")')
    dev('PCA1'); cmd(pg, 'ping -n 1 2001:db8:acad:2::a')
    ok(pg.locator('.nd-ev .warn').count() == 0 and pg.locator('.nd-ev tr[tabindex]').count() == 27, 'the first remote ping records ND on both LANs (27 events)')
    p2 = all([answer(i) for i in range(13, 19)])
    dev('RTA'); cmd(pg, 'show ipv6 neighbors'); p2 &= answer(19)
    li = Q.nth(20); li.locator('.lab-picks button:text-is("Yes")').click(); li.locator('button:has-text("Check")').click()
    ok('ok' not in (li.get_attribute('class') or ''), 'PCA2 isn’t in RTA’s table until RTA pings it')
    cmd(pg, 'ping 2001:db8:acad:1::b'); p2 &= answer(20)
    ok(p2, 'Part 2 questions check against RTA’s neighbor table')
    ok(all([answer(i) for i in range(21, 25)]) and 'Lab complete' in pg.text_content('#ndBanner'), 'the reflection questions finish the lab')
    m = page(360, 800, is_mobile=True, has_touch=True); m.goto(URL + '?lab=nd'); m.wait_for_timeout(300)
    cmd(m, 'ping -n 1 2001:db8:acad:2::a'); m.locator('.nd-ev tr[tabindex]').nth(4).click()
    w = m.evaluate("document.documentElement.scrollWidth"); ok(w <= 360, f'the ND lab fits a 360px phone ({w}px)')
    ok(not errs, f'no page errors {errs}')
print(f'\n{"all passed" if not fails else str(len(fails))+" failed"}'); sys.exit(1 if fails else 0)
