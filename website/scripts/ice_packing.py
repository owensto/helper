"""Trip-specific packing worksheet; choices stay in the current page."""
from html import escape

GROUPS = {
    'Personal essentials': [
        ('License and ID for your trip', 'Check your age, residency, dates, and water with Minnesota DNR.'),
        ('Meeting details and return contact', 'Keep an offline copy; confirm how to leave early.'),
        ('Outdoor layers, hat, and mittens', 'Pack for the transfer and time outside, not just the heated room.'),
        ('Waterproof winter boots and dry socks', 'Try the socks inside the boots before departure.'),
        ('Dry spare clothes in a separate bag', 'Keep the return outfit away from wet tackle.'),
        ('Personal medicines and toiletries', 'Keep your personal essentials accessible.'),
        ('Drinking water and ready-to-eat food', 'Confirm whether the supplied water is drinking water.'),
        ('Headlamp and charged phone', 'Check batteries and save the contact before travel.')],
    'Confirm with the operator': [
        ('Rods, reels, and suitable tackle', 'Record the exact rental package before buying more.'),
        ('Bait and bait container', 'Ask what is supplied and which bait is permitted.'),
        ('Electronics and charged batteries', 'Ask about rental units, instruction, and charging.'),
        ('Ice scoop, ruler, and hook-removal tools', 'Confirm these small items as well as the rods.'),
        ('Waste bags and toilet supplies', 'Ask how all rubbish and human waste leave the lake.')],
    'Overnight extras': [
        ('Sleeping bag or blankets and pillow', 'Confirm the bed size and bedding provision.'),
        ('Meals, cookware, dishes, and utensils', 'Match meals to the appliances the operator permits.'),
        ('Indoor shoes and sleep clothes', 'Keep a dry indoor set separate from outdoor boots.'),
        ('Towel and wash kit', 'Ask where washing facilities are available.'),
        ('Power needs and charging cables', 'Confirm outlets and permitted loads; do not assume household power.')]
}


def render():
    out = '<div class="ice-packing"><p>For each item, choose Pack, Operator confirmed, Not needed, or Ask first. Only mark equipment as supplied after the operator confirms it. Choices clear on reload. Print or save a PDF before you leave this page.</p><label>Trip format<select id="packing-format"><option value="overnight">Overnight sleeper</option><option value="day">Day house</option></select></label>'
    for group, items in GROUPS.items():
        out += '<fieldset' + (' data-overnight' if group == 'Overnight extras' else '') + '><legend>' + escape(group) + '</legend>'
        for name, note in items:
            out += '<label class="packing-row"><span><strong>' + escape(name) + '</strong><small>' + escape(note) + '</small></span><select aria-label="' + escape(name, quote=True) + '"><option value="ask">Ask first</option><option value="pack">Pack</option><option value="supplied">Operator confirmed</option><option value="skip">Not needed</option></select></label>'
        out += '</fieldset>'
    return out + '<p id="packing-progress" role="status" aria-live="polite">18 items need a decision.</p><div class="packing-actions"><button type="button" class="btn" id="packing-print">Print packing list</button><button type="button" class="btn" id="packing-reset">Reset choices</button></div><noscript><p>Use the full list above for an overnight trip. For a day trip, omit Overnight extras. Use your browser’s Print command.</p></noscript></div><script src="/assets/ice-packing.js" defer></script>'
