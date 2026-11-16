"""Cast & Catch: an original one-thumb fishing game with a collectible Fish Log."""
from pathlib import Path
import hashlib
import json
from game_career import career_data

ROOT = Path(__file__).resolve().parents[1]
# Horizon height in each scene image (fraction from the top) and the colour of a fish under that water.
SCENES = {
    'river': (.385, '#0b1d12'), 'lake': (.40, '#131d29'), 'ice': (.405, '#9db4c8'),
    'flats': (.39, '#10403c'), 'offshore': (.382, '#a9c6de'), 'reef': (.375, '#0d3b46'),
}
WATER_GUIDES = [
    ('rivers-streams', 'Rivers and streams'), ('lakes-reservoirs', 'Lakes and reservoirs'), ('ice-fishing', 'Ice fishing'),
    ('saltwater-flats', 'Saltwater flats'), ('offshore', 'Offshore'), ('reef-bottom', 'Reef and bottom'),
]


def asset(name):
    digest = hashlib.sha256((ROOT/'public/assets'/name).read_bytes()).hexdigest()[:12]
    return '/assets/'+name+'?v='+digest


def install(pages, add):
    plates = {w: {'hz': hz, 'shadow': shadow, 'light': w in ('ice', 'offshore'), 'thumb': f'/media/game/{w}-400.webp',
                  'sizes': {str(s): f'/media/game/{w}-{s}.webp' for s in (768, 1152, 1536)}}
              for w, (hz, shadow) in SCENES.items()}
    guides = ''.join(f'<li><a href="/environments/{slug}/">{name} ↗</a></li>' for slug, name in WATER_GUIDES)
    body = '''<section class="cc wrap" data-cast-game data-fish-art="/media/game/fish/" data-plates='__PLATES__'>
<header class="cc-head"><h1>Cast &amp; Catch</h1><p>Tap the water. Watch the float. Land the fish. Free, on your phone or computer.</p></header>
<noscript><p class="note">Cast &amp; Catch needs JavaScript. You can still <a href="/environments/">explore real fishing waters</a>.</p></noscript>
<div class="cc-stage" id="cc-stage">
<canvas id="cc-canvas" tabindex="0" role="application" aria-label="Fishing water. Tap the water to cast. Tap when the float goes under. Hold to reel and let go when the line is too tight. With a keyboard: arrow keys aim, Space does each step.">Your browser cannot show the game.</canvas>
<div class="cc-top"><button type="button" id="cc-water-btn" class="cc-chip" aria-haspopup="dialog"><span id="cc-water-name">River</span> <span aria-hidden="true">▾</span></button><span class="cc-stats"><b id="cc-level">LV 1</b><span><b id="cc-coins">300</b> coins</span></span></div>
<p class="cc-goal" id="cc-goal"></p>
<div class="cc-toast" id="cc-toast" hidden></div>
<div class="cc-fight" id="cc-fight" hidden><div class="cc-tension" role="img" aria-label="Line tension. The green band is safe. Let go in the red."><i class="cc-zone"></i><b id="cc-tension-fill"></b></div><span id="cc-dist"></span></div>
<div class="cc-hint" id="cc-hint" role="status" aria-live="polite"></div>
<nav class="cc-tools" aria-label="Game menu"><button type="button" id="cc-log-btn">Fish Log <span id="cc-log-count">0/34</span></button><button type="button" id="cc-tackle-btn">Tackle</button><button type="button" id="cc-sound" aria-pressed="false">Sound off</button><button type="button" id="cc-full" aria-pressed="false">Full view</button></nav>
<div class="cc-card" id="cc-card" hidden role="group" aria-labelledby="cc-card-name"><div class="cc-card-panel"><div class="cc-card-art"><img id="cc-card-img" alt="" hidden><canvas id="cc-card-art" aria-hidden="true"></canvas></div><div class="cc-card-text"><span class="cc-card-rarity" id="cc-card-rarity"></span><h2 id="cc-card-name"></h2><p class="cc-card-size" id="cc-card-size"></p><ul class="cc-card-tags" id="cc-card-tags"></ul><p class="cc-card-fact" id="cc-card-fact"></p><p class="cc-card-reward" id="cc-card-reward"></p><button type="button" class="cc-primary" id="cc-again">Cast again</button><div class="cc-card-links"><button type="button" id="cc-card-log">Open the Fish Log</button><a id="cc-card-real" href="/environments/"></a></div><p class="cc-small">A game catch. Every fish swims away.</p></div></div></div>
</div>
<div class="cc-below">
<section class="cc-how"><h2>How to play</h2><ol><li><b>Cast.</b> Tap the water. Aim for a fish shadow. A big shadow is a big fish.</li><li><b>Hook.</b> Small dips are nibbles. Tap when the float goes under.</li><li><b>Reel.</b> Hold to reel. Keep the bar in the green band. Let go when it turns red, when the fish runs, or when it jumps.</li></ol><p class="cc-small">Keyboard: arrow keys aim. Space casts, hooks and reels.</p></section>
<section class="cc-daily" id="cc-daily"><h2>Today’s water</h2><p id="cc-daily-text"></p><p class="cc-daily-count"><b id="cc-daily-count">0 of 3</b> landed today</p><button type="button" class="cc-secondary" id="cc-daily-go">Fish today’s water</button><p class="cc-small">Heaviest fish: <span id="cc-best">No fish yet</span>. Progress stays in this browser.</p></section>
</div>
<section class="cc-log-section" id="fish-log"><div class="cc-log-head"><h2>The Fish Log</h2><p><b data-log-count>0 of 34</b> species caught. Six waters. Common, rare and legendary fish.</p></div><div data-fish-log></div></section>
<section class="cc-real"><h2>Fish these waters for real</h2><p>Each game water matches a kind of real water. The guides show where to go, when to go and what to bring.</p><ul>__GUIDES__<li><a href="/atlas/">The trip atlas ↗</a></li><li><a href="/fishing-licenses/">Fishing licences by place ↗</a></li></ul></section>
<dialog class="cc-sheet" id="cc-waters-sheet" aria-labelledby="cc-waters-title"><header><h2 id="cc-waters-title">Choose your water</h2><button type="button" data-close aria-label="Close">×</button></header><div class="cc-waters" id="cc-waters-list"></div><h3>Real places</h3><p class="cc-small">Each place has its own fish and three goals. New places open as your level goes up.</p><ul class="cc-places" id="cc-places-list"></ul></dialog>
<dialog class="cc-sheet" id="cc-tackle-sheet" aria-labelledby="cc-tackle-title"><header><h2 id="cc-tackle-title">Tackle</h2><button type="button" data-close aria-label="Close">×</button></header><p class="cc-small">You have <b id="cc-tackle-coins"></b>. Coins come from fish you land. No real money.</p><ul class="cc-tackle" id="cc-tackle-list"></ul></dialog>
<dialog class="cc-sheet" id="cc-log-sheet" aria-labelledby="cc-log-title"><header><h2 id="cc-log-title">Fish Log · <span data-log-count></span></h2><button type="button" data-close aria-label="Close">×</button></header><div data-fish-log></div></dialog>
</section>'''
    body = body.replace('__PLATES__', json.dumps(plates, separators=(',', ':'))).replace('__GUIDES__', guides)
    body += '<script id="career-data" type="application/json">'+json.dumps({'version': 2, 'places': [{k: p[k] for k in ('id', 'name', 'water', 'licence', 'level', 'canonicalPath', 'country', 'speciesIds')} for p in career_data()['places']]}, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')+'</script>'
    add('/play/', 'Cast & Catch: A Free Fishing Game | Castward',
        'Tap the water, watch the float and land the fish. A free fishing game with 34 real species on six waters. It runs in your browser, on a phone or a computer.',
        body, 'game')
    pages['/play/']['atlasAssets'] = '<link rel="stylesheet" href="'+asset('game.css')+'">'+''.join(
        '<script src="'+asset(name)+'" defer></script>' for name in ['game-engine.js', 'game-career.js', 'game-play.js'])
