from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 page=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:8765/',wait_until='networkidle');page.screenshot(path='runs/castward-redesign/after/home-desktop-viewport.png')
 assert page.locator('.hero-reel video').evaluate_all('(vs)=>vs.every(v=>v.paused && !v.querySelector("source").src)')
 page.locator('#home-world-search').fill('Lake Fork');page.locator('.world-search button').click();page.wait_for_load_state('networkidle');assert page.locator('[data-trip-card]:visible').count()>0
 page.set_viewport_size({'width':390,'height':844});page.locator('[data-action=menu]').click();assert page.locator('#site-nav').is_visible();page.keyboard.press('Escape');assert not page.locator('#site-nav').is_visible()
 page.goto('http://localhost:8765/plan/',wait_until='networkidle');page.locator('#gear-status-shell').select_option('owned');page.locator('[data-packed="shell"]').check();page.reload(wait_until='networkidle');assert page.locator('#gear-status-shell').input_value()=='owned';assert page.locator('[data-packed="shell"]').is_checked()
 page.emulate_media(reduced_motion='no-preference');page.goto('http://localhost:8765/',wait_until='networkidle');page.wait_for_timeout(1000);assert page.locator('.hero-reel video').evaluate_all('(vs)=>vs.some(v=>!v.paused)');page.locator('.hero-motion').click();assert page.locator('.hero-reel video').evaluate_all('(vs)=>vs.every(v=>v.paused)')
 assert not errors,errors
 print('PASS: search, menu and Escape, planner saved status, reduced motion, autoplay and pause; no JavaScript errors')
 b.close()
