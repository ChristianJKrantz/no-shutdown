"""Imported by the browser suites written before the learning path: a fresh visit now opens on the Path tab, so
every page these suites open starts on Drills instead, as it used to. test_path.py covers the path."""
from playwright.sync_api._generated import Browser, BrowserContext
INIT="window.NS_DEFAULT_TAB='drills'"
_np=Browser.new_page
def new_page(self,*a,**k):
    pg=_np(self,*a,**k); pg.add_init_script(INIT); return pg
Browser.new_page=new_page
_nc=Browser.new_context
def new_context(self,*a,**k):
    c=_nc(self,*a,**k); c.add_init_script(INIT); return c
Browser.new_context=new_context
