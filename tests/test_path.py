"""The learning path (python3 tests/test_path.py): a fresh visit opens on it, each unit's lesson and quick check lead
into a drill session on that topic, only first tries count, a good session adds a bar, unlocks the next unit and
points to its checkpoint task, missed commands come back at the end, progress survives a reload and can't be
tampered with, every unit runs end to end, and it fits a phone."""
import os, sys, threading, http.server, functools
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT,**{}))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv.RequestHandlerClass=functools.partial(Quiet,directory=ROOT)
threading.Thread(target=srv.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{srv.server_address[1]}/'
fails=[]
def ok(c,msg):
    print(('  ✓ ' if c else '  ✗ ')+msg)
    if not c: fails.append(msg)
ANS="(()=>{const c=NS.Drills.cur;const t=c.dr.answer;return typeof t==='function'?t(c.v):t})()"
def drill(pg,right):
    """answer drills until the session ends; right(n) says whether drill n gets the right answer first"""
    n=0
    while pg.is_visible('#v-drills') and n<30:
        a=pg.evaluate(ANS)
        if not right(n): pg.fill('#din','show clock nonsense'); pg.press('#din','Enter')
        pg.fill('#din',a); pg.press('#din','Enter')
        if pg.get_attribute('#din','readonly') is not None: pg.press('#din','Enter') if pg.evaluate("document.activeElement.id==='din'") else pg.click('#v-drills .dacts .btn.primary')
        n+=1
    return n
def lesson(pg,i):
    for _ in range(pg.evaluate(f"NS.Path.UNITS[{i}].learn.length")): pg.click('#plNext')
    pg.click(f'.pl-opt[data-k="{pg.evaluate(f"NS.Path.UNITS[{i}].check.a")}"]'); pg.click('#plNext')
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1300,'height':950}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.goto(URL); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(200)
    print('First visit')
    ok(pg.is_visible('#v-path') and pg.is_visible('#plStart'),'a fresh visit opens on the path')
    ok('getting around the modes' in pg.inner_text('#plStart').lower(),'Start points at the first unit')
    ok(pg.locator('.pl-node.locked').count()==len(pg.evaluate("NS.Path.UNITS"))-1,'every unit after the first starts locked')
    print('Lesson and quick check')
    pg.click('#plStart'); ok('R1(config)#' in pg.inner_text('.pl-body'),'Start opens the lesson, with a sample console')
    for _ in range(pg.evaluate("NS.Path.UNITS[0].learn.length")): pg.click('#plNext')
    a=pg.evaluate("NS.Path.UNITS[0].check.a"); wrong=[k for k in range(3) if k!=a][0]
    ok(pg.is_hidden('#plNext'),'the quick check can’t be skipped')
    pg.click(f'.pl-opt[data-k="{wrong}"]'); ok('Not that one' in pg.inner_text('#plWhy'),'a wrong pick points back to the lesson')
    pg.click(f'.pl-opt[data-k="{a}"]'); pg.click('#plNext')
    ok(pg.is_visible('#v-drills') and pg.is_visible('.pl-run') and pg.locator('#drillTopic').count()==0,'drills start inside the path, without the topic picker')
    ok(pg.evaluate("NS.Drills.cur.dr.g")=='Modes','the drills are the unit’s own topic')
    print('Session')
    n=drill(pg,lambda n: n not in (0,1))
    ok(n==8,f'two misses come back at the end ({n} drills for 6)')
    ok(pg.is_visible('.pl-done') and '4/6' in pg.inner_text('.pl-score'),'only first tries count')
    ok(pg.evaluate("NS.Path.progress.u.modes.l")==0,'4/6 doesn’t add a bar')
    pg.click('#plAgain'); n=drill(pg,lambda n: True)
    ok(n==6 and pg.evaluate("NS.Path.progress.u.modes.l")==1,'6/6 adds a bar')
    ok('First-time setup' in pg.inner_text('.pl-unlock'),'and unlocks the next unit')
    ok('Find your way around the modes' in pg.inner_text('#plCont'),'then points to the unit’s checkpoint task')
    pg.click('#plCont'); ok(pg.is_visible('#v-tasks') and 'Find your way around the modes' in pg.inner_text('#v-tasks'),'the checkpoint opens the task')
    for c in ['enable','configure terminal','interface g0/0','exit','end','disable']:
        pg.fill('#v-tasks .tin input',c); pg.press('#v-tasks .tin input','Enter')
    pg.wait_for_timeout(200)
    ok(pg.evaluate("NS.S.tasks.modes&&NS.S.tasks.modes.done"),'finishing the task counts')
    pg.click('#tabs .tab[data-v="path"]')
    ok(pg.locator('.pl-cp.done[data-task="modes"]').count()==1,'the path ticks the checkpoint off')
    ok('first-time setup' in pg.inner_text('#plStart').lower(),'and moves on to the next unit')
    print('Saved progress')
    pg.reload(); pg.wait_for_timeout(200)
    ok(pg.is_visible('#v-path') and pg.evaluate("NS.Path.progress.u.modes.l")==1,'progress survives a reload')
    pg.click('.pl-node button[data-u="modes"]'); ok(pg.is_visible('#plGo') and pg.is_visible('#plLesson'),'a started unit opens its page')
    pg.click('#plGo'); pg.click('#plQuit'); ok(pg.is_visible('#plStart'),'✕ ends a session and goes back to the map')
    pg.click('#tabs .tab[data-v="drills"]'); ok(pg.locator('#drillTopic').count()==1,'the Drills tab is still free practice')
    pg.evaluate("localStorage.setItem('ns_path',JSON.stringify({u:{modes:{l:'<img src=x onerror=window.__p=1>',d:'x',s:1},__proto__:{l:5}},days:['<b id=inj>']}))")
    pg.goto(URL); pg.wait_for_timeout(200); pg.click('#tabs .tab[data-v="path"]')
    ok(not pg.evaluate("!!window.__p||!!document.getElementById('inj')") and pg.evaluate("NS.Path.progress.u.modes.l")==0 and not errs,'tampered progress is cleaned, not run')
    print('Every unit')
    units=pg.evaluate("NS.Path.UNITS.map(u=>u.id)")
    for i,u in enumerate(units):
        pg.evaluate(f"""()=>{{const p={{u:{{}},days:[]}};NS.Path.UNITS.slice(0,{i}).forEach(x=>p.u[x.id]={{l:1,d:Date.now()+9e9,s:true}});localStorage.setItem('ns_path',JSON.stringify(p));}}""")
        pg.goto(URL+'?tab=path'); pg.wait_for_timeout(100); pg.click(f'.pl-node button[data-u="{u}"]'); lesson(pg,i)
        g=pg.evaluate("NS.Drills.cur.dr.g"); n=drill(pg,lambda n: True)
        ok(n==pg.evaluate(f"NS.Path.UNITS[{i}].n") and g==pg.evaluate(f"NS.Path.UNITS[{i}].group") and pg.evaluate(f"NS.Path.progress.u['{u}'].l")==1,f'unit {i+1} ({u}): lesson, {n} {g} drills, a bar')
    ok(not errs,'no page errors '+str(errs[:2]))
    print('Phone')
    m=b.new_page(viewport={'width':360,'height':780},is_mobile=True,has_touch=True); merrs=[]; m.on('pageerror',lambda e:merrs.append(str(e)))
    m.goto(URL); m.evaluate('localStorage.clear()'); m.reload(); m.wait_for_timeout(200)
    ok(m.evaluate("document.documentElement.scrollWidth<=360"),'the path fits a 360px phone')
    m.tap('#plStart'); ok(m.is_hidden('.app>header') and m.is_hidden('#tabs'),'a lesson hides the header and tabs')
    lesson(m,0); r=m.evaluate("document.querySelector('#din').getBoundingClientRect().bottom")
    ok(r<500,'in a session the command box is near the top of the screen')
    ok(m.evaluate("document.documentElement.scrollWidth<=360") and not merrs,'no overflow or errors on a phone')
    b.close()
srv.shutdown()
print('\nall passed' if not fails else f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
