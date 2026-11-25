"""Header and navigation (python3 tests/test_layout.py): the one-line header, the cheat-sheet button (press it again
to go back to exactly where you were), the Tasks badge, and the bottom tab bar on phones."""
import os, sys, threading, http.server, functools
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv.RequestHandlerClass=functools.partial(Quiet,directory=ROOT)
threading.Thread(target=srv.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{srv.server_address[1]}/'
fails=[]
def ok(c,msg):
    print(('  ✓ ' if c else '  ✗ ')+msg)
    if not c: fails.append(msg)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.goto(URL+'?tab=drills'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(200)
    print('Cheat sheet button')
    prompt=pg.inner_text('#v-drills .dq') if pg.locator('#v-drills .dq').count() else pg.inner_text('#v-drills')
    pg.fill('#din','conf'); pg.click('#cheatBtn')
    ok(pg.is_visible('#v-cheat') and pg.get_attribute('#cheatBtn','aria-pressed')=='true' and 'tab=cheat' in pg.url,'the book button opens the cheat sheet')
    pg.click('#cheatBtn')
    ok(pg.is_visible('#v-drills') and pg.is_hidden('#v-cheat'),'pressing it again goes back to Drills')
    now=pg.inner_text('#v-drills .dq') if pg.locator('#v-drills .dq').count() else pg.inner_text('#v-drills')
    ok(now==prompt and pg.input_value('#din')=='conf','the same drill is still there, with what you typed')
    ok('tab=drills' in pg.url and pg.locator('#tabs .tab.on').get_attribute('data-v')=='drills','the address and tab are put back')
    pg.click('#tabs .tab[data-v="path"]'); pg.click('#plStart')
    for _ in range(pg.evaluate("NS.Path.UNITS[0].learn.length")): pg.click('#plNext')
    pg.click(f'.pl-opt[data-k="{pg.evaluate("NS.Path.UNITS[0].check.a")}"]'); pg.click('#plNext')
    pg.click('#cheatBtn'); pg.click('#cheatBtn')
    ok(pg.is_visible('.pl-run') and pg.evaluate("NS.Drills.inSession"),'a path session survives a look at the cheat sheet')
    pg.goto(URL+'?tab=cheat'); pg.wait_for_timeout(100); pg.click('#cheatBtn')
    ok(pg.is_visible('#v-path'),'opened from a link, the button goes to the Path')
    print('Header')
    ok(pg.locator('.app>header .stat').count()==0,'no stats row in the header')
    ok(pg.inner_text('#sTasks')==f"0/{pg.evaluate('NS.CS.TASKS.length')}",'the Tasks tab shows tasks done')
    ok(pg.locator('#tabs .tab').count()==5,'five sections in the tab row')
    print('Phone')
    m=b.new_page(viewport={'width':360,'height':740},is_mobile=True,has_touch=True); m.goto(URL+'?tab=drills'); m.wait_for_timeout(200)
    bar=m.evaluate("(()=>{const r=document.querySelector('#tabs').getBoundingClientRect();return [r.top,r.bottom,innerHeight]})()")
    ok(abs(bar[1]-bar[2])<2,'the sections are a bar along the bottom')
    tabs=m.evaluate("[...document.querySelectorAll('#tabs .tab')].map(t=>{const r=t.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})")
    ok(len(set(w for w,h in tabs))==1 and all(h>=44 for w,h in tabs),f'the five tabs are the same width and at least 44px tall {tabs}')
    ok(m.evaluate("document.documentElement.scrollWidth<=360"),'no sideways scrolling')
    last=m.evaluate("(()=>{scrollTo(0,1e6);const f=document.querySelector('footer')||document.querySelector('main').lastElementChild;return f.getBoundingClientRect().bottom<=document.querySelector('#tabs').getBoundingClientRect().top+1})()")
    ok(last,'the bottom bar doesn’t cover the end of the page')
    ok(m.evaluate("getComputedStyle(document.querySelector('.app>header .sub')).display")=='none','no tagline on a phone')
    ok(not errs,'no page errors '+str(errs[:2]))
    b.close()
srv.shutdown()
print('\nall passed' if not fails else f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
