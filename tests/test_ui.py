"""Browser tests for No Shutdown (python3 tests/test_ui.py).
Set NS_URL to test a served copy; the default is the local index.html."""
from playwright.sync_api import sync_playwright
import os, json
URL = os.environ.get('NS_URL', 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'index.html')))
R = []
def ok(name, cond, extra=''): R.append((name, bool(cond), extra))
TERM = 'input[aria-label="Command"]:visible'

def type_cmd(pg, cmd):
    pg.fill(TERM, cmd); pg.press(TERM, 'Enter')

def solve_task(pg):
    """Work every goal of the open task through the UI, using the task's own Show me steps."""
    _goals(pg); _questions(pg)

def _questions(pg):
    """Answer the handout questions some tasks add, through the page."""
    import re
    for i in range(pg.evaluate('(NS.Tasks.t.questions||[]).length')):
        a = pg.evaluate(f'NS.Tasks.t.questions[{i}].answer'); li = pg.locator(f'#tquestions li[data-q="{i}"]')
        if li.locator('.lab-picks').count():
            opts = li.locator('.lab-picks button').all_text_contents()
            li.locator('.lab-picks button').nth(max(range(len(opts)), key=lambda j: a.startswith(opts[j]) * len(opts[j]))).click()
        else: li.locator('input').fill(re.split(r' \(|, or ', a)[0])
        li.locator('button:has-text("Check")').click()

def _goals(pg):
    n = pg.evaluate('NS.Tasks.t.goals.length')
    for gi in range(n):
        g = pg.evaluate(f'''(()=>{{const t=NS.Tasks.t,g=t.goals[{gi}],d=t.net.devices[g.dev];
            const sec={{}};Object.values(t.net.devices).forEach(x=>{{if(x.cfg)sec[x.cfg.hostname]=x.cfg.enableSecret;}});
            return {{dev:g.dev,where:g.where,text:g.text,done:!!g.check(t.net),steps:g.where==='pcip'?[]:NS.CS.showMe(g,d),sec}};}})()''')
        if g['done']: continue
        pg.click(f'.tmain .dtabs[role=tablist] button[data-dev="{g["dev"]}"]')
        if g['where'] == 'pcip':
            import re
            m = re.search(r': (\S+), mask (\S+), gateway (\S+)', g['text'])
            pg.click(f'.tmain .pcpanel:visible .pct button:has-text("IP Configuration")')
            for k, v in zip(['ip', 'mask', 'gw'], m.groups()): pg.fill(f'#{g["dev"]}-{k}', v)
            continue
        if pg.locator('.tmain .pcpanel:visible').count():
            pg.click('.tmain .pcpanel:visible .pct button:has-text("Command Prompt")')
        for _ in range(3):  # a console that starts at the login prompt (the 10.3.4 routers)
            if pg.text_content('.tmain .term:visible .tp').startswith('Password'): type_cmd(pg, 'cisco')
            else: break
        for s in g['steps']:
            type_cmd(pg, s)
            pr = pg.text_content('.tmain .term:visible .tp')
            if s == 'enable' and pr.startswith('Password'):
                host = pg.evaluate(f'NS.Tasks.t.net.devices["{g["dev"]}"].cfg.hostname')
                type_cmd(pg, g['sec'].get(host) or 'class')
        for _ in range(5):
            pr = pg.text_content('.tmain .term:visible .tp')
            if pr.endswith('#') or pr.endswith('>'): break
            type_cmd(pg, '')

with sync_playwright() as pw:
    b = pw.chromium.launch(**({'executable_path': os.environ['CHROME_PATH']} if os.environ.get('CHROME_PATH') else {}))
    ctx = b.new_context(viewport={'width': 1400, 'height': 950}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: (errs.append('dialog: ' + d.message), d.dismiss()))
    pg.goto(URL); pg.wait_for_timeout(300)

    # ---------- drills ----------
    ok('opens on Drills', pg.is_visible('#v-drills') and pg.is_visible('#dq'))
    pg.click('.chip:has-text("Interfaces")'); ok('topic chip filters the drills', 'Interfaces' in pg.text_content('.dmeta'))
    pg.fill('#din', 'hostnme X'); pg.press('#din', 'Enter')
    ok('a wrong command shows the IOS error', 'Invalid input' in pg.text_content('#dfb'))
    ok('a miss resets the streak and counts in accuracy', pg.text_content('#sAcc') == '0%' and pg.text_content('#sStreak') == '0')
    pg.click('.dacts button:has-text("Hint")')
    ok('the drill hint shows the command’s shape, not the values', '<' in (pg.text_content('#dfb .ans') or '') or pg.text_content('.dacts button:nth-child(2)') == 'Show answer')
    pg.click('button:has-text("Show answer")'); ans = pg.text_content('#dfb .ans')
    ok('Show answer shows the command', len(ans) > 3)
    pg.fill('#din', ans); pg.press('#din', 'Enter'); ok('typing the shown answer is accepted', '✓ Correct' in pg.text_content('#dfb'))
    ok('…but scores nothing', pg.text_content('#sStreak') == '0')
    pg.press('#din', 'Enter') if pg.get_attribute('#din', 'readonly') is None else pg.click('button:has-text("Next")')
    right = 0
    for _ in range(6):
        a = pg.evaluate('(()=>{const c=NS.Drills.cur;const x=c.dr.short||c.dr.answer;return typeof x==="function"?x(c.v):x;})()')
        pg.fill('#din', a); pg.press('#din', 'Enter')
        if '✓ Correct' in pg.text_content('#dfb'): right += 1
        pg.click('button:has-text("Next")')
    ok('shortcuts IOS would accept are marked right (6/6)', right == 6, right)
    ok('streak counts them', pg.text_content('#sStreak') == '6')
    ok('drill stats are saved', json.loads(pg.evaluate("localStorage.getItem('ns_drill')"))['streak'] == 6)
    pg.click('.chip:has-text("All")')
    pg.fill('#din', 'int'); pg.press('#din', 'Tab')
    want = pg.evaluate("(()=>{const c=NS.Drills.cur;return NS.IOS.complete(c.dr.mode==='pc'?'pc':c.dr.mode,'int',c.dev);})()")
    ok('Tab completes in drills (same as the terminal)', pg.input_value('#din') == want)

    # ---------- tasks: list and complete every task through the UI ----------
    pg.click('.tab[data-v="tasks"]'); ok('task list shows every task', pg.locator('.tcard').count() == pg.evaluate('NS.CS.TASKS.length'))
    ids = pg.evaluate('NS.CS.TASKS.map(t=>t.id)')
    for tid in ids:
        pg.evaluate(f"NS.go('tasks',{{id:'{tid}'}})"); pg.wait_for_timeout(50)
        solve_task(pg)
        left = pg.evaluate('NS.Tasks.t.goals.map((g,i)=>g.check(NS.Tasks.t.net)?0:i+1).filter(Boolean)')
        ok(f'task “{tid}” completed by typing in the terminals', pg.is_visible('.done-banner'), left)
        ok(f'task “{tid}”: every goal ticked', pg.locator('#goals li.ok').count() == pg.locator('#goals li').count())
    ok('finished tasks are saved', len(json.loads(pg.evaluate("localStorage.getItem('ns_tasks')"))) == len(ids))
    ok('tasks-done counter', pg.text_content('#sTasks') == f'{len(ids)}/{len(ids)}')

    # Show me, stars, next goal, help and coach notes in a task
    pg.evaluate("NS.go('tasks',{id:'basic-router'})"); pg.wait_for_timeout(50)
    ok('Next goal line names the first goal', pg.evaluate('NS.Tasks.t.goals[0].text') in pg.text_content('#nextgoal'))
    pg.click('#showBtn'); ok('help starts with what to do, in words', pg.locator('#showme .help-words li').count() >= 1 and 'hostname' not in pg.text_content('#showme').lower())
    pg.click('#showme button:has-text("Show the syntax")'); ok('then the syntax, with the values left as placeholders', '<hostname>' in pg.text_content('#showme ol') and pg.evaluate('NS.Tasks.t.given.find(g=>g[0]==="Hostname")[1]') not in pg.text_content('#showme ol'))
    pg.click('#showme button:has-text("Show the exact commands")'); ok('then the exact commands', pg.evaluate('NS.Tasks.t.given.find(g=>g[0]==="Hostname")[1]') in pg.text_content('#showme ol'))
    type_cmd(pg, 'conf t'); ok('a teaching note for conf t at R1>', 'enable' in pg.text_content('.tmain .tout:visible').lower())
    type_cmd(pg, 'en'); pg.fill(TERM, 'sh '); pg.press(TERM, '?')
    ok('? lists what can follow', 'running-config' in pg.text_content('.tmain .tout:visible'))
    ok('? keeps what was typed', pg.input_value(TERM).startswith('sh'))
    pg.fill(TERM, 'conf'); pg.press(TERM, 'Tab'); ok('Tab completes in the terminal', pg.input_value(TERM) == 'configure ')
    pg.fill(TERM, ''); pg.press(TERM, 'ArrowUp'); ok('↑ brings back the last command', pg.input_value(TERM) == 'en')
    solve_task(pg); ok('using all three help levels on a goal costs a star', '★★☆' in pg.text_content('.stars') and 'exact command' in pg.text_content('.done-banner'))

    # ---------- scenario deep link (from Subnet Sprint) ----------
    def scen(q):
        pg.goto(URL + q); pg.wait_for_timeout(200)
        return pg.evaluate("NS.Tasks.t&&NS.Tasks.t.params")
    p = scen('?task=scenario&lab=192.168.100.0&hosts=25&r1=2&r2=2')
    ok('scenario link uses the lab values', p and p['lab'] == '192.168.100.0' and p['hosts'] == 25)
    ok('scenario opens R1, S3, PC4', [x.strip()[-2:] for x in pg.locator('.tmain .dtabs[role=tablist] button').all_text_contents()] == ['R1', 'S3', 'C4'])
    ok('scenario addressing table uses the lab network', '192.168.100.' in pg.text_content('.ttable'))
    solve_task(pg); ok('scenario can be completed', pg.is_visible('.done-banner'))
    for bad in ['lab=999.1.1.0&hosts=25&r1=2&r2=2', 'lab=192.168.1.5&hosts=25&r1=2&r2=2', 'lab=127.0.0.0&hosts=25&r1=2&r2=2',
                'lab=192.168.1.0&hosts=500&r1=2&r2=2', 'lab=192.168.1.0&hosts=25&r1=9&r2=2', 'lab=192.168.1.0&hosts=60&r1=3&r2=3',
                'lab=<script>&hosts=25&r1=2&r2=2']:
        p = scen('?task=scenario&' + bad)
        ok(f'bad link values fall back to random ones ({bad[:24]}…)', p and p['lab'] != bad.split('&')[0][4:] and 'script' not in json.dumps(p))
    pg.goto(URL + '?task=nope'); pg.wait_for_timeout(100); ok('an unknown task opens Drills', pg.is_visible('#v-drills'))
    pg.goto(URL + '?tab=cheat'); pg.wait_for_timeout(100); ok('?tab=cheat opens the cheat sheet', pg.is_visible('#v-cheat') and 'copy running-config startup-config' in pg.text_content('#v-cheat'))

    # ---------- safety: what you type is shown as text ----------
    pg.goto(URL + '?tab=sandbox'); pg.wait_for_timeout(100)
    for c in ['en', 'conf t', 'banner motd #<img src=x onerror=alert(1)>#', 'hostname <b>x</b>', 'end', 'show run']: type_cmd(pg, c)
    ok('typed HTML is never turned into elements', pg.locator('.tout img, .tout b').count() == 0 and '<img src=x' in pg.text_content('.tout:visible'))
    ok('sandbox has Router, Switch and PC1', pg.locator('#v-sandbox .dtabs[role=tablist] button').count() == 3)
    pg.click('#v-sandbox .dtabs[role=tablist] button:has-text("PC1")'); pg.wait_for_timeout(50)
    ok('PC opens on its IP Configuration form', pg.is_visible('#PC1-ip'))
    for q in ['', '?task=scenario', '?task=basic-router', '?tab=sandbox']:
        pg.goto(URL + q); pg.wait_for_timeout(150); body = pg.inner_text('main')
        ok(f'no stray “null”/“undefined” text ({q or "drills"})', 'null' not in body and 'undefined' not in body)
    ok('no page errors or alert boxes (desktop)', not errs, errs[:3])
    ctx.close()

    # ---------- phone ----------
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    for q in ['', '?tab=tasks', '?task=scenario&lab=192.168.100.0&hosts=25&r1=2&r2=2', '?lab=192.168.100.0&hosts=25&r1=2&r2=2', '?tab=sandbox', '?tab=cheat']:
        pg.goto(URL + q); pg.wait_for_timeout(250)
        ok(f'phone: nothing wider than the screen ({q or "drills"})', pg.evaluate('document.documentElement.scrollWidth') <= 390, pg.evaluate('document.documentElement.scrollWidth'))
    pg.goto(URL + '?task=basic-router'); pg.wait_for_timeout(200)
    ok('phone: helper keys show', pg.is_visible('.tmain .tkeys:visible'))
    pg.fill(TERM, 'en'); pg.tap('.tmain .tkeys:visible button[data-k="help"]')
    ok('phone: the ? key gives help', 'enable' in pg.text_content('.tmain .tout:visible'))
    ok('phone: addressing table starts folded', not pg.evaluate("(document.querySelector('.ttable')||{open:false}).open"))
    ok('no page errors (phone)', not errs, errs[:3])
    ctx.close(); b.close()

fails = [r for r in R if not r[1]]
for n, c, e in R: print(('  ✓ ' if c else '  ✗ ') + n + (f'  [{e}]' if not c and e != '' else ''))
print(f'\n{len(R) - len(fails)}/{len(R)} passed'); raise SystemExit(1 if fails else 0)
