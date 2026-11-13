"""Accessible, local-only worksheet for comparing two rental quotes."""
from html import escape

QUESTIONS = [
 ('Trip and dates', 'Name the lake, dates, guest count, and day or overnight format.'),
 ('Instruction', 'Who teaches the setup, and how often does a guide visit?'),
 ('Access and return', 'Who provides transport, and how do we leave early?'),
 ('Gear and bait', 'List rods, tackle, bait, electronics, and any rental charges.'),
 ('Clothing and fit', 'What must each guest bring, and which rental sizes are available?'),
 ('Sleeping and facilities', 'Confirm beds, bedding, toilet, drinking water, and cooking equipment.'),
 ('Heat and power', 'Who manages fuel, ventilation, alarms, and any power failure?'),
 ('Full quote', 'Record the total, taxes, extras, deposit, and balance deadline.'),
 ('Changed conditions', 'Record the refund, credit, relocation, and cancellation terms.'),
 ('Rules and contacts', 'Save official license links, the meeting point, and the trip contact.')
]

def render():
    body = '<div class="ice-worksheet"><p>Write the answers from two operators below. Blank answers stay open questions. Use Print to save a paper copy or PDF. Entries stay on this page and clear when you reload it.</p>'
    body += '<div class="ice-quote-names"><label>First operator<input name="operator-a" autocomplete="off"></label><label>Second operator<input name="operator-b" autocomplete="off"></label></div>'
    for i, (title, question) in enumerate(QUESTIONS):
        body += '<fieldset><legend>'+escape(title)+'</legend><p>'+escape(question)+'</p><div class="ice-quote-names">'
        for key, label in [('a','First operator'),('b','Second operator')]:
            body += '<label>'+label+' — '+escape(title.lower())+'<textarea rows="3" name="'+key+str(i)+'"></textarea></label>'
        body += '</div></fieldset>'
    return body+'<button type="button" class="btn" id="ice-print">Print comparison</button><p role="status" id="ice-progress">0 of 20 answers entered. Empty answers need a follow-up.</p></div><script src="/assets/ice-rental.js" defer></script>'
