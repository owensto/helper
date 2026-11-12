"""Small visitor decision aid; legal source links remain in the authored guide."""
def render():
    return '''<form class="fl-license-form" id="fl-license-form">
<label>Angler age<select name="age"><option value="adult">16 or older</option><option value="child">Under 16</option></select></label>
<label>One planned outing<select name="outing"><option value="shore">Saltwater beach or bank</option><option value="pier">Saltwater pier</option><option value="charter">Saltwater charter boat</option><option value="private">Private or rental boat, saltwater</option><option value="fresh">Freshwater fishing</option></select></label>
<label>Has the operator confirmed license coverage?<select name="covered"><option value="unknown">No, unknown, or not applicable</option><option value="yes">Yes, current saltwater pier or charter coverage</option></select></label>
<label>Saltwater license period<select name="period"><option value="3">3 days</option><option value="7">7 days</option><option value="annual">1 year</option></select></label>
<button class="btn" type="submit">Check this outing</button>
</form><div id="fl-license-result" class="gr-callout" role="status" aria-live="polite"><p>Choose your outing, then check the result. The table below also works without JavaScript.</p></div>
<p class="small">For Florida visitors. This tool does not decide species permits, open seasons, local access, or every special exemption. Check FWC before you fish.</p>
<script src="/assets/florida-license.js" defer></script>'''
