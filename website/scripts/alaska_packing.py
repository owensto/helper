"""Alaska fishing trip packing worksheet; choices stay in the current page."""
from html import escape

GROUPS = {
    'Personal layers and footwear': [
        ('Synthetic or merino wool base layers', 'Pack tops and bottoms; leave cotton shirts and jeans off the water.'),
        ('Mid-layer fleece or wool pullover', 'Adjust weight for May/June, peak summer, or late-season wind.'),
        ('Waterproof rain jacket and rain pants', 'Sealed seams and cuffs matter on coastal boats and rainy river banks.'),
        ('Wool socks (3-4 pairs) and dry camp shoes', 'Keep one dry spare pair sealed away from waders and boots.'),
        ('Rubber-soled or studded wading boots (no felt)', 'Alaska bans felt-soled footwear in fresh water statewide (ADF&G).'),
        ('Polarized sunglasses, warm beanie, brimmed cap, and gloves', 'Amber or copper lenses cut river glare; pack fingerless gloves for wind.'),
        ('Soft-sided waterproof duffel bag and 10-20 L dry bag', 'Floatplanes and bush planes prefer crushable soft duffels over hard rollers.')],
    'Documents, health, and boat/river kit': [
        ('Alaska sport fishing license and photo ID (age 16+)', 'Non-residents age 16+ need a license ($15/1-day to $100/annual); add King Salmon stamp if targeting kings.'),
        ('Insect repellent and head net', 'Mosquitoes and white socks peak June-August on interior and coastal rivers.'),
        ('Sunscreen, lip balm, motion-sickness tablets, and personal medicines', 'Keep essentials in your carry-on, never in checked baggage.'),
        ('Travel rod tube, reels, and sheathed sharp tackle', 'TSA permits rods in carry-on (within airline size limits) or checked bags; pack sharp hooks/knives checked.'),
        ('Guide gratuity cash and offline trip contacts', 'Ask the lodge about local tipping norms and save transfer numbers offline.')],
    'Multi-day lodge, float, or fish-box extras': [
        ('Waders, wading belt, and gravel guards', 'Confirm whether your lodge supplies breathable waders and boots before packing your own.'),
        ('Dry spare travel outfit and extra base-layer set', 'Keep return clothes sealed from damp gear; ask about lodge drying rooms.'),
        ('Headlamp, power bank, and charging cables', 'Needed for remote cabins, early dock calls, and September/October twilight.'),
        ('Insulated fish box and vacuum-pack plan', 'Confirm processing, freezing, and airline checked-seafood weight limits before departure.')]
}


def render():
    out = '<div class="ice-packing"><p>For each item, choose Pack, Operator confirmed, Not needed, or Ask first. Choices stay in this browser and clear on reload. Use Print packing list to save a PDF or paper copy before you pack.</p><label>Trip format<select id="packing-format"><option value="overnight">Multi-day lodge or remote float</option><option value="day">Single-day charter or bank trip</option></select></label>'
    for group, items in GROUPS.items():
        out += '<fieldset' + (' data-overnight' if group == 'Multi-day lodge, float, or fish-box extras' else '') + '><legend>' + escape(group) + '</legend>'
        for name, note in items:
            out += '<label class="packing-row"><span><strong>' + escape(name) + '</strong><small>' + escape(note) + '</small></span><select aria-label="' + escape(name, quote=True) + '"><option value="ask">Ask first</option><option value="pack">Pack</option><option value="supplied">Operator confirmed</option><option value="skip">Not needed</option></select></label>'
        out += '</fieldset>'
    return out + '<p id="packing-progress" role="status" aria-live="polite">16 items need a decision.</p><div class="packing-actions"><button type="button" class="btn" id="packing-print">Print packing list</button><button type="button" class="btn" id="packing-reset">Reset choices</button></div><noscript><p>Use the full list above for a multi-day lodge or float trip. For a day charter, skip the multi-day extras and print this page.</p></noscript></div><script src="/assets/ice-packing.js" defer></script>'
