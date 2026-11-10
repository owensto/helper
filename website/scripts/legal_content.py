"""Public policies grounded in the deployed site's data paths and controls."""
from html import escape

def paragraphs(*items):
    return ''.join('<p>'+item+'</p>' for item in items)

def bullets(*items):
    return '<ul>'+''.join('<li>'+item+'</li>' for item in items)+'</ul>'

CONTACT='<a href="mailto:contact@castward.app">contact@castward.app</a>'
PRIVACY='<a href="mailto:privacy@castward.app">privacy@castward.app</a>'
SETTINGS='<button type="button" class="btn outline" data-cookie-settings>Change consent</button>'

LEGAL = {
'privacy': ('Privacy policy', [
('scope','Who we are and what this policy covers',paragraphs(
'Castward operates castward.app. In this policy, “we”, “us” and “our” mean Castward. Castward decides how information is used for the site and its contact service.',
'This policy covers the atlas, guides, films, planner, contact form and related correspondence. It explains the current site. It does not describe a booking platform or an account service that does not exist.',
'For a privacy request, contact '+PRIVACY+'. For other questions, use '+CONTACT+'. You do not need an account to make a request.')),
('collection','Information we collect',paragraphs(
'The contact form asks for your name, email address, topic, message and agreement to use those details to answer you. It also sends a form start time, a request identifier and an empty anti-spam field. These help validate requests and avoid duplicate delivery.',
'If you email us, we receive your address, message, attachments and the usual email headers. Please send only what we need. Do not send payment card details, passwords, identity documents, health records or private details about another person.',
'Vercel hosts the site and the contact endpoint. Network requests can include an IP address, browser information, requested path, query string, time and technical error information. These are needed to deliver the page, operate the endpoint and investigate abuse. Avoid private information in a URL.',
'After analytics consent, Google Analytics 4 can receive online identifiers, device and browser details, approximate location and site activity. This is separate from the contact form. We do not ask the browser for precise location.')),
('plans','Your local plan and shared links',paragraphs(
'The planner saves a plan in local storage on your browser. This can include your destination, trip type, dates, group size, equipment choices and checklist state. The site has no central plan account or cloud plan database.',
'Your plan can remain on a shared device. Clear site data when appropriate. Export a copy first if you want to keep it. A different browser or device does not automatically receive your plan.',
'A shared link contains a readable plan snapshot. The normal share feature places it after the URL fragment marker. The site also accepts older query-string snapshots. Query strings can reach servers and logs; fragments normally do not. Anyone with a shared link can read its contents. A shared snapshot is not a private, access-controlled document.',
'An exported file, copied inquiry or shared link leaves your browser only through the action you choose. Copies held by recipients are outside our control.')),
('analytics','Analytics and your consent',paragraphs(
'Google Analytics 4 uses measurement ID G-4NYGJ2BF32. The Google script does not load until analytics consent is accepted. The site remains usable if you reject it.',
'Our event code measures page views, searches, trip and guide views, planner starts and saves, film plays, accepted contact submissions and operator-link clicks. It omits search text, contact fields and plan contents from those event parameters. Configured page URLs omit query strings and fragments; the configured referrer contains only the origin.',
'Advertising storage, advertising user data, advertising personalization and Google signals are disabled in our configuration. This implementation does not include an advertising pixel or a data-sale feature.',
'Use Cookie settings in any footer or the button below to change your choice. Withdrawal stops our analytics events and removes accessible Google Analytics cookies. It does not undo lawful processing that occurred before withdrawal or automatically delete records already held by Google.',
'A Global Privacy Control signal keeps analytics off. We do not separately interpret the older Do Not Track signal. The <a href="/cookies/">cookie policy</a> lists the storage keys and their duration.')+SETTINGS),
('purposes','Purposes and GDPR legal bases',paragraphs(
'Where the EU GDPR or UK GDPR applies, the purpose determines the legal basis. The following bases describe the current service. They do not authorize unrelated marketing.')+bullets(
'<strong>Optional analytics — consent.</strong> We use it to understand page and feature use. You can withdraw consent through Cookie settings.',
'<strong>Contact requests — consent and requested assistance.</strong> The form asks you to agree to use of your details for a reply. Where your request involves steps before a possible contract, those requested steps may also provide a basis. A message alone does not create a contract.',
'<strong>Site operation and security — legitimate interests.</strong> These interests include delivery of the site, prevention of spam and investigation of errors. Any use must remain proportionate to your rights.',
'<strong>Local plan features — the service you request.</strong> Browser storage lets the planner keep your choices. It is not an advertising profile.',
'<strong>Legal requests and claims — legal obligations or legitimate interests.</strong> We may need relevant records to meet a duty or establish, exercise or defend a legal claim.')+paragraphs(
'We do not use the site to make solely automated decisions with legal or similarly significant effects. You can contact us to challenge a decision about your privacy request.')),
('retention','How long information remains',paragraphs(
'Local plans have no automatic expiry in the site code. They remain until you clear the site data, replace the plan or your browser removes them. Consent choices are valid for 180 days; an expired choice no longer enables analytics.',
'The Google Analytics cookie lifetime is configured to 180 days and can renew with activity. Cookie expiry is not the same as deletion of analytics records on Google’s systems.',
'The contact endpoint sends the message through Resend and does not create a separate application database. Email copies and delivery records can remain with the email providers and in the receiving mailbox.',
'The code does not set a fixed deletion period for email, Vercel logs, Resend records or Google account data. Those periods depend on provider and account settings. We do not claim a duration that the implementation cannot confirm.',
'For correspondence under our control, the relevant criteria are the time needed to answer the request, resolve follow-up questions, address a dispute and meet applicable legal duties. A legal hold can require longer retention. Ask '+PRIVACY+' about your records or request deletion.')),
('providers','Who receives information',paragraphs(
'The current site uses these services. A service provider receives the information needed for its role; an external link does not send your saved plan automatically.')+
'<div class="legal-table-wrap" role="region" aria-label="Service providers" tabindex="0"><table><thead><tr><th scope="col">Provider</th><th scope="col">Role and information</th><th scope="col">Further information</th></tr></thead><tbody>'+
'<tr><th scope="row">Vercel</th><td>Page hosting, contact function and request or security logs. Network and request information.</td><td><a href="https://vercel.com/legal/privacy-policy">Vercel privacy policy</a></td></tr>'+
'<tr><th scope="row">Resend</th><td>Contact email delivery. Form name, email, topic, message, consent note and delivery metadata. The server routes messages to the Castward contact inbox.</td><td><a href="https://resend.com/legal/privacy-policy">Resend privacy policy</a></td></tr>'+
'<tr><th scope="row">Google Analytics</th><td>Optional measurement after consent. Browser identifiers and usage events.</td><td><a href="https://policies.google.com/privacy">Google privacy policy</a></td></tr>'+
'<tr><th scope="row">Email services</th><td>The sender’s and recipient’s email services handle correspondence and headers. The site code does not identify every mailbox or forwarding provider.</td><td>Ask us about the service relevant to your request.</td></tr></tbody></table></div>'+paragraphs(
'We may disclose relevant information where a law requires it or where necessary to protect rights, security or a legal claim. If control of the service changes, any transfer of personal information must follow applicable law and appropriate notice.',
'Guides, retailers and other websites control their own forms, cookies and privacy policies. Check their policies before you provide information.')),
('transfers','International transfers',paragraphs(
'Our providers may process information outside your country, including in the United States. The site does not promise that all information stays in one region.',
'Where applicable law restricts a transfer, it requires an appropriate lawful mechanism. Depending on the circumstances, this can include an adequacy decision or contractual safeguards, such as EU standard contractual clauses and relevant UK safeguards.',
'This notice does not claim a particular certification or a transfer arrangement for every provider. Ask '+PRIVACY+' for details about the destination, recipient and safeguards relevant to your information. See the <a href="https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/rules-international-data-transfers_en">European Commission transfer guidance</a>.')),
('europe','EU, EEA and UK rights',paragraphs(
'Where the GDPR or UK GDPR applies, you may request access, correction, erasure, restriction or a portable copy. You may object to processing based on legitimate interests. The conditions and exceptions depend on the right and the circumstances.',
'You can withdraw consent at any time. You can also complain to the authority in your place of residence, work or the alleged infringement. You need not contact us first to use a right to complain.',
'We will address requests within the applicable legal period, normally one month under these laws. If an extension or an exception applies, we will explain it as required. See <a href="https://ico.org.uk/for-the-public/">ICO guidance</a> and <a href="https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en">EU rights guidance</a>.')),
('do-not-sell','California: Do Not Sell or Share My Personal Information',paragraphs(
'The current site does not sell personal information or share it for cross-context behavioral advertising. We do not offer financial incentives for personal information. Optional analytics remains subject to consent, and Global Privacy Control keeps it off.',
'Where the CCPA, as amended by the CPRA, applies, California residents can request to know, access, correct or delete personal information. They can opt out of sale or sharing and limit certain uses of sensitive personal information where relevant. They have a right to non-discriminatory treatment for exercising these rights.',
'The categories collected by the current implementation are identifiers and contact details, internet or network activity, approximate location from analytics, and information you choose to put in correspondence. The sections above explain their sources, purposes, recipients and retention criteria. We do not request sensitive personal information.',
'You can use the button below to keep optional analytics off. Send other requests, including an authorized-agent request, to '+PRIVACY+'. We may request proportionate verification for access, correction or deletion. We do not require identity verification merely to reject analytics.',
'We apply the response periods and exceptions required by the law that covers your request. For eligible California access or deletion requests, the general response period is 45 days, subject to permitted extensions. See <a href="https://oag.ca.gov/privacy/ccpa">California’s official rights guide</a>.')+SETTINGS),
('other-states','Other US state privacy laws',paragraphs(
'Depending on your state and whether its law applies, you may have rights to confirm processing, access, correct, delete or obtain a portable copy. You may also have rights to opt out of targeted advertising, sale or certain profiling.',
'This implementation does not provide targeted advertising, sale or profiling with legal or similarly significant effects. You can still reject analytics. If we deny a request, you can ask for an appeal by email with the subject “Privacy appeal”. Where the law provides an appeal, we will explain the decision and any further complaint route.',
'We do not promise that every state law applies to Castward. We will assess the request under the relevant law and explain any material limit.')),
('canada','Canada',paragraphs(
'Where PIPEDA or an applicable provincial privacy law applies, you can ask what personal information we hold, how we use it and to whom it is disclosed. You can request access and correction, challenge our practices and withdraw consent subject to legal or contractual limits.',
'Contact '+PRIVACY+' first if you want us to address a concern. You can also seek help from the appropriate privacy commissioner. The <a href="https://www.priv.gc.ca/en/privacy-topics/accessing-personal-information/api_bus/">Office of the Privacy Commissioner of Canada</a> explains access rights and complaint options.')),
('australia','Australia',paragraphs(
'Where the Australian Privacy Act and Australian Privacy Principles apply, you can request access to or correction of your personal information. Tell us if you believe we have mishandled it.',
'Email '+PRIVACY+' with the details of the concern. We will assess it and reply. If the matter remains unresolved, you may be able to complain to the <a href="https://www.oaic.gov.au/privacy/privacy-complaints/lodge-a-privacy-complaint-with-us">Office of the Australian Information Commissioner</a>. See also its <a href="https://www.oaic.gov.au/privacy/your-privacy-rights/your-personal-information/access-your-personal-information">access guidance</a>.')),
('requests','How to make a request',paragraphs(
'Email '+PRIVACY+' and explain the right you want to use. Include enough information to locate the relevant correspondence. Do not send an identity document unless we explain why a proportionate check is needed.',
'We may ask you to confirm control of the email address associated with a record. An agent may need proof of authority. We will explain an applicable refusal, exception, fee or extension instead of treating every request as automatically valid.',
'We cannot retrieve a plan that exists only in your browser. You can inspect or delete it through the planner and browser site-data controls. We may be unable to connect an anonymous analytics identifier to you without further information.')),
('children','Children',paragraphs(
'Castward is not directed to children under 13, or to children under 16 where that is the applicable age for independent consent. The contact form is not intended for children to submit their personal details.',
'If you believe a child sent us information, contact '+PRIVACY+'. Give enough information to locate the message without adding unnecessary details about the child. We will investigate and take appropriate steps, including deletion where required.')),
('security','Security',paragraphs(
'The production site uses HTTPS. The contact function validates inputs, checks the request origin, uses anti-spam checks and keeps the email provider credential on the server. The recipient is fixed on the server. These controls reduce certain risks; they do not make every message safe.',
'No website, email system or device can guarantee complete security. Keep your device secure and avoid sensitive details in a form or shared plan. Contact us promptly if you notice a suspected disclosure or security problem.')),
('changes','Changes and contact',paragraphs(
'We will update this page and its date when the policy changes. If a change requires a separate notice or fresh consent, we will provide it as required. A new policy does not make an earlier unlawful use lawful.',
'Privacy requests: '+PRIVACY+'. General contact: '+CONTACT+'. The <a href="/cookies/">cookie policy</a> explains browser controls, and the <a href="/terms/">terms</a> explain site use.'))]),

 'terms': ('Terms of use', [
('acceptance','Acceptance and scope',paragraphs(
'These terms govern your use of Castward and castward.app. Castward is the site operator. By using the site, you agree to these terms to the extent that applicable law permits. If you do not agree, stop using it.',
'You must have the legal capacity needed for any agreement you make. A parent or guardian should supervise a minor’s use. These terms do not replace a provider’s separate terms for a trip, purchase or other external service.',
'Questions about these terms can go to '+CONTACT+'. The <a href="/privacy/">privacy policy</a> explains personal information. The <a href="/disclaimer/">safety disclaimer</a> explains the limits of trip information.')),
('service','What Castward provides',paragraphs(
'Castward provides fishing trip information, destination profiles, preparation guides, illustrative maps, films and a browser-based checklist planner. Research depth varies. Some profiles are preparation frameworks with unresolved local details.',
'The site provides general information. It does not provide professional legal, medical, safety, navigation or fisheries advice. A source citation or checked date does not guarantee that a rule, access point or service remains current.',
'The current site has no native booking checkout, payment collection, escrow or live availability service. A plan, inquiry draft, contact message or saved checklist does not reserve a trip.')),
('regulations','Fishing rules and your responsibilities',paragraphs(
'Before a trip, check the rules for the exact water, date, species, method and person. Check licences, permits, size and possession limits, closures, protected species, access rights and any guide requirements with the responsible authority.',
'A seasonal pattern in a guide is not a legal opening. A local fish name may identify different species in different places. Do not rely on an image or informal name to decide what you can catch or keep.',
'You remain responsible for your conduct and for a decision to fish, boat, wade, travel or buy equipment. Obtain permission for private land and follow site-specific restrictions. No entry in Castward grants access rights.')),
('safety','Safety and changing conditions',paragraphs(
'Fishing and outdoor travel can involve drowning, cold water, heat, weather, moving vessels, hooks, wildlife, difficult terrain and delayed rescue. Match the trip to your skills, health, equipment and local conditions.',
'Check current forecasts and warnings. Seek qualified local guidance. Carry suitable safety equipment and an emergency plan. Cancel or change a trip when conditions require it. A checklist cannot identify every hazard.',
'The site is not an emergency service. Do not use a contact form to request urgent help. Use the emergency or marine rescue service appropriate to your location. Decorative maps and generated scenes are not navigation charts.')),
('providers','Independent guides and operators',paragraphs(
'A named guide, captain, lodge, retailer or source remains independent of Castward unless a specific statement says otherwise. A source link, listing or future booking slot is not a certification, partnership claim or safety inspection.',
'Confirm the provider’s identity, qualifications, licensing, insurance, vessel, access arrangements and suitability directly. Ask what the price includes and how weather, cancellations, refunds and emergencies are handled.',
'Any external purchase or booking is between you and that provider under its terms. Castward does not operate the trip, employ the crew, control the vessel or perform the provider’s obligations merely because the site links to it.',
'If a future feature changes Castward’s role, it will require clear information and any additional terms before the relevant transaction. An empty “Book a guide” slot is not an offer or a claim of inventory.')),
('affiliate','Affiliate links and paid relationships',paragraphs(
'Castward may earn a commission from future eligible purchases or bookings made through marked affiliate links. A paid placement or material relationship should have a clear disclosure near the relevant recommendation or link.',
'An affiliate relationship does not establish that a product or guide is suitable for you. Provider prices, availability, eligibility and cancellation rules apply. Read the <a href="/affiliate-disclosure/">affiliate disclosure</a> and the specific offer.')),
('media','AI illustrations, films and maps',paragraphs(
'Some scenes are AI-generated illustrations made with GPT Image. The site also uses animated reels derived from generated images. These works represent environments and stories; they are not documentary proof of a named place, actual catch, guide service or trip result.',
'Generated images can contain inaccurate geography, species, equipment or conditions. Do not use them for species identification, route selection, weather assessment or proof of access. Check the page’s written sources and current official information.',
'The <a href="/about/#photo-credits">image notes</a> and film descriptions explain the media. A decorative route or pin shows an editorial connection, not a surveyed route or a safe course.')),
('plans','Saved plans and shared content',paragraphs(
'Plans save locally in your browser. Clearing storage, private-browsing limits, device changes or browser errors can remove them. Export a copy if you need a record. Castward does not promise cloud backups or synchronization.',
'A shared link contains a snapshot that anyone with the link can read. A later change to your local plan does not update copies. Keep personal and sensitive details out of shared links.',
'The planner’s “Guide provides” choice means you have confirmed provision. It is not a provider’s promise. Verify quantities, fit, compatibility, legal use and safety before you depend on a checklist.')),
('submissions','Messages, user content and feedback',paragraphs(
'You retain rights you hold in a message, correction or other submission. Send only material you may lawfully share. Do not submit another person’s private information without an appropriate basis.',
'You allow Castward to use a submission as needed to read it, answer it and address the issue you raise. We may use general feedback to improve the site without an obligation to pay for an unsolicited suggestion. This does not transfer ownership of your work or permit unrelated use of personal information.',
'The current site does not offer a public review or user-post forum. A contact message is not automatically published. If we seek to publish an attributable contribution, we should agree on that use with you first.')),
('acceptable-use','Acceptable use',bullets(
'Use the site for lawful purposes and respect other people’s rights.',
'Do not send spam, threats, malicious files, unlawful material or deceptive messages.',
'Do not attempt unauthorized access, bypass access controls or interfere with service availability.',
'Do not impersonate a provider, Castward or another person.',
'Do not harvest personal information or use automated requests that materially disrupt the service.',
'Do not misrepresent Castward’s content as your own verified field research or imply an endorsement that does not exist.')+paragraphs(
'These rules do not restrict lawful research, accessibility tools or rights that applicable law protects. Report a suspected problem through '+CONTACT+'.')),
('intellectual-property','Intellectual property',paragraphs(
'Castward’s original text, code, layout and brand elements are protected where applicable intellectual property law provides protection. Third-party material and names remain subject to their respective rights. We do not claim exclusive rights that the law does not grant in AI-generated material.',
'You may browse the site, link to its public pages and use or export your own plan for personal preparation. Copyright exceptions and other lawful rights remain available.',
'Ask before you commercially republish substantial original site content or use the Castward brand in a way that suggests an association. Do not remove attribution or notices from material where those notices are required.')),
('disclaimers','Information and service disclaimers',paragraphs(
'To the extent permitted by law, the site and its information are provided as available, without a promise of uninterrupted service, accuracy, completeness, fitness for a particular trip or freedom from errors.',
'We do not guarantee catches, conditions, safe access, a provider’s conduct, a product’s performance or a particular result from a plan. Wildlife, weather and human services are uncertain.',
'A linked source may change or disappear. A technical check tests a function or page; it does not independently verify every factual claim. Confirm material decisions with the relevant authority or provider.')),
('liability','Limits on liability',paragraphs(
'To the extent permitted by applicable law, Castward is not liable for indirect or consequential losses arising from site use. These can include lost profits, lost opportunities, interruption of business or loss of locally saved data.',
'Castward is not responsible for an independent provider’s acts or omissions merely because we link to that provider. Any liability for our own conduct remains subject to applicable law.',
'Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited. This includes applicable liability for fraud, deliberate misconduct, death or personal injury caused by negligence, and mandatory consumer guarantees. Where a restriction is not allowed, it does not apply to you.')),
('indemnity','Claims caused by misuse',paragraphs(
'To the extent permitted by law, you are responsible for reasonable losses and costs Castward incurs from a third-party claim caused by your unlawful use, infringement of another person’s rights or material breach of these terms.',
'This provision does not make you responsible for Castward’s own negligence, wrongdoing or breach of law. It does not override protections available to consumers. Any claimed amount must reflect a legally recoverable loss, not an automatic penalty.')),
('law','Applicable law',paragraphs(
'These terms are governed by the laws applicable where Castward operates, as determined by the relevant conflict-of-laws rules. This wording does not select an undisclosed state, country or exclusive court.',
'Mandatory laws and consumer protections that apply in your place of residence remain in force. If a choice-of-law restriction is ineffective, the law that otherwise applies will govern.')),
('disputes','Questions and disputes',paragraphs(
'Please send a dispute to '+CONTACT+' with the relevant page, event and requested outcome. We can try to resolve it through direct discussion. This is not a requirement that delays an urgent remedy or a statutory deadline.',
'These terms do not impose binding arbitration or a class-action waiver. If discussion does not resolve a matter, either party may use the courts or complaint bodies with jurisdiction under applicable law. Your right to contact a regulator remains intact.')),
('termination','Access, termination and changes',paragraphs(
'You may stop using Castward at any time. We may restrict abusive use, remove unlawful material or suspend a feature where reasonably necessary to protect the site or comply with law.',
'Content and features can change. Local copies you keep remain your responsibility. Provisions that need to continue after use ends, such as applicable rights, liability limits and dispute provisions, continue to the extent permitted by law.',
'We will publish revised terms with a new date. Material changes will receive further notice where the law requires it. Changes apply to future use and do not remove rights that already arose.')),
('contact','Contact and interpretation',paragraphs(
'Contact '+CONTACT+' about these terms. If one provision is invalid, the remaining provisions continue where the law allows. A failure to enforce a provision on one occasion does not automatically waive it for all occasions.',
'The operator name used by this site is Castward.'))]),

'cookies': ('Cookies and consent policy', [
('choice','Your choice comes first',paragraphs(
'Castward blocks the Google Analytics script until you accept analytics. Reject non-essential keeps it off. Neither choice prevents you from reading guides, viewing films, using the planner or sending the contact form.',
'Use this control to reopen the existing consent banner. You can also use Cookie settings in any footer. The choice applies to this browser and site; it does not automatically apply to another device.')+SETTINGS),
('meaning','Cookies, local storage and temporary values',paragraphs(
'A cookie is a small browser value that can accompany requests to its domain. Local storage stays in the browser and is read by site code. Local storage does not have a built-in expiry unless the site checks one.',
'The table lists the persistent values written by the current site code or its consented Google tag. The site does not use sessionStorage. Temporary contact identifiers, anti-spam timing values and motion state stay in page memory; the site does not save them as persistent keys.')),
('inventory','Current cookie and storage inventory','<div class="legal-table-wrap" role="region" aria-label="Cookie and storage inventory" tabindex="0"><table><caption>Castward browser storage as of November 10, 2026</caption><thead><tr><th scope="col">Exact key</th><th scope="col">Type and provider</th><th scope="col">Purpose and trigger</th><th scope="col">Duration</th></tr></thead><tbody>'+
'<tr><th scope="row"><code>fishing-atlas.plan.v1</code></th><td>Local storage · Castward</td><td>Saves planner choices when you save or change a plan. Functional storage for the feature you request.</td><td>No automatic expiry. Until removed or replaced, or cleared by the browser.</td></tr>'+
'<tr><th scope="row"><code>castward.analytics-consent.v1</code></th><td>Local storage · Castward</td><td>Saves your acceptance or rejection and its timestamp when you select a consent button.</td><td>Choice valid for 180 days. The stored record can remain until replaced or cleared, but an expired acceptance does not enable analytics.</td></tr>'+
'<tr><th scope="row"><code>_ga</code></th><td>First-party cookie · Google Analytics</td><td>Distinguishes browser visits after analytics acceptance.</td><td>Configured to 180 days; can renew with activity. Browser limits can shorten it.</td></tr>'+
'<tr><th scope="row"><code>_ga_4NYGJ2BF32</code></th><td>First-party cookie · Google Analytics</td><td>Stores session state for the site’s GA4 property after acceptance.</td><td>Configured to 180 days; can renew with activity. Browser limits can shorten it.</td></tr></tbody></table></div>'+paragraphs(
'The current implementation does not set an advertising cookie. Advertising storage and personalization remain denied. Browser caches and provider-level security mechanisms are separate from these application keys. The code does not specify a stable additional Vercel cookie name, so this table does not invent one.')),
('legacy','Values from older versions',paragraphs(
'Older releases may have left <code>fishing-atlas.events.v1</code> and <code>fishing-atlas.attribution.v1</code> in local storage. The current code does not write either key. The rejection path removes them.',
'These names remain documented so you can recognize old data. They are not active analytics storage in this implementation. You can also remove them with your browser’s site-data controls.')),
('consent','How consent works',paragraphs(
'Before a choice, analytics storage and advertising consent default to denied. Acceptance loads the Google tag and enables our analytics events. Rejection disables those events and deletes accessible cookies whose names start with <code>_ga</code>.',
'A saved choice is read when a page opens. A change in another tab updates open pages on the same origin through the browser storage event. A Global Privacy Control signal keeps analytics rejected even if a previous acceptance exists.',
'The site does not interpret Do Not Track as a separate setting. You can use the explicit rejection control regardless of that browser setting.',
'The banner is a choice about analytics, not permission for a booking or a marketing subscription. The contact form has a separate agreement for use of its message.')),
('withdraw','Withdrawal and deletion',paragraphs(
'Reopen the banner and select Reject non-essential to withdraw analytics consent. Rejection stops our analytics events immediately and removes the accessible Google cookies. A Google script already loaded in that page can remain in memory; a fresh page opened after rejection does not load it.',
'Withdrawal does not automatically erase analytics records already received by Google. Contact '+PRIVACY+' about a data-rights request. Some data may not be identifiable from your email address.',
'Use browser site-data controls to remove all Castward local storage and cookies. This also removes your saved plan and consent choice. Export the plan first if you need a copy. Clearing data can make the banner appear again.')),
('limits','Browser limits and external sites',paragraphs(
'If a browser blocks local storage, the site may be unable to remember a choice or save a plan. Private mode can remove data when the session ends. Essential page content remains available.',
'An external guide, retailer or booking website can use its own storage after you follow a link. Castward’s banner does not control that site. Read its own policy before you provide information.',
'The <a href="https://developers.google.com/tag-platform/security/guides/customize-cookies">Google cookie documentation</a> explains configurable cookie lifetimes. The actual settings in our code govern the periods stated above.')),
('contact','Changes and questions',paragraphs(
'We will update this policy if the site’s storage changes. The date at the top identifies this version. See the <a href="/privacy/">privacy policy</a> for purposes, providers, rights and retention beyond your browser.',
'For a privacy question, email '+PRIVACY+'. For other site questions, email '+CONTACT+'.'))]),

'disclaimer': ('Fishing and boating safety', [
('scope','Plan carefully. Confirm locally.',paragraphs(
'Castward offers general trip preparation information. It is not a live safety service, navigation system, regulation database or substitute for qualified local instruction. A well-organized plan cannot remove the risks of outdoor activity.',
'The decision to fish, travel, boat or enter the water belongs to you and the people responsible for the activity. Match that decision to current conditions, your ability and the advice of competent local professionals.',
'In an emergency, contact the relevant local emergency or marine rescue service. Castward’s contact form is not monitored as an emergency channel.')),
('before','Before you leave',bullets(
'Confirm the exact meeting point, access permission, route and return arrangements.',
'Check a current official forecast and any local warning, closure or access notice.',
'Confirm the group’s ability, health needs and equipment with the person responsible for the trip.',
'Leave a trip or float plan with someone who can raise an alarm if you fail to return.',
'Choose a communication and emergency plan appropriate to the area. A phone may have no signal.',
'Carry suitable drinking water, clothing, first aid supplies and safety equipment.')+paragraphs(
'This is a preparation prompt, not a complete equipment standard. A remote river, winter lake and offshore vessel need different precautions.')),
('boating','Boating, wading and ice',paragraphs(
'Use an appropriate, properly fitted life jacket and follow local carriage and wear rules. Check the vessel, capacity, required equipment and operator qualifications. Keep safe access to emergency equipment and a way to call for help.',
'Current, waves, cold water and slippery ground can overwhelm a person quickly. Do not infer safe wading depth or footing from a picture. Seek local advice before you enter unfamiliar water.',
'Ice appearance, an old report or another person’s track does not establish safety. Conditions can vary across one waterbody. Follow current local authority guidance and use qualified local expertise.',
'Do not let a planned catch or a non-refundable trip dictate a safety decision. Change the plan or stop when the conditions exceed your ability or equipment.')),
('weather','Weather and water conditions',paragraphs(
'Weather, tides, river flow, dam releases, swell, visibility, heat and lightning can change. A seasonal guide describes a pattern or source reference; it does not forecast the day of your trip.',
'Use official local forecasts and alerts before departure and during the trip where possible. Ask the captain or guide about cancellation limits and safe shelter. A favorable app icon is not a complete marine or river assessment.',
'The site does not connect to a live weather or water-condition feed. Verify any time-sensitive information at its official source.')),
('rules','Licences, limits and closures',paragraphs(
'Check the responsible authority for the exact water and date. Confirm the required licences and permits, lawful methods, seasons, size and possession limits, protected species and access restrictions.',
'A documented fishing month does not mean a legal open season. Rules can differ between adjacent waters, resident and visitor anglers, shore and boat fishing, or target species.',
'Confirm the rules again before you fish. A source date, provider page or saved checklist does not override a current order. Ask the authority if the rule is unclear.')),
('species','Species identification and food safety',paragraphs(
'Common names and slang can refer to different species. Use reliable regional identification guidance and qualified local help. Do not use AI imagery to decide whether a fish is legal to retain.',
'If identification is uncertain, do not assume that a bag limit for a similar fish applies. Follow the authority’s instructions for protected, prohibited or accidentally caught fish.',
'For retained fish, check current local consumption advisories and safe handling guidance. Castward does not assess contamination, food safety or an individual’s dietary needs.')),
('release','Catch-and-release and habitat care',paragraphs(
'Plan for release before the fish is caught. Use equipment suitable for the target and follow current species-specific rules and agency advice. Keep handling and time out of water to the minimum needed for a safe, lawful release.',
'Use wet hands where handling is necessary and support the fish appropriately. Avoid contact with the eyes and gills. Deep-water species can need a specialized release method; learn the applicable method before the trip.',
'A released fish does not always survive. Do not present release as a guarantee of no harm. See <a href="https://www.fisheries.noaa.gov/national/resources-fishing/catch-and-release-fishing-best-practices">NOAA’s catch-and-release guidance</a> and the local authority’s species advice.',
'Remove litter and discarded line. Respect wildlife, other water users and private land. Follow local rules to prevent the spread of invasive species.')),
('guides','Choose a provider and confirm the details',paragraphs(
'Ask about the captain’s or guide’s relevant qualifications, licences, insurance, local experience and emergency procedures. Confirm what the provider supplies and what you must bring.',
'A listing on Castward is not proof of a safety inspection or a business relationship. Read the provider’s own terms, cancellation policy and weather policy before you pay. Tell the provider about access needs that affect the trip.')),
('results','No guarantee of catches or conditions',paragraphs(
'Fish are wild animals. A season, technique, guide or location does not guarantee a catch, a particular size or species, or a safe and successful trip. Past results and illustrative scenes do not promise future results.',
'AI-generated images, animated reels, map pins and route lines are editorial illustrations. They do not prove navigable water, safe ice, current access or the presence of a fish.')),
('contact','Corrections and further information',paragraphs(
'Report a possible error to '+CONTACT+' with the page and the official source. We can review a correction, but we cannot confirm an urgent local condition through the form.',
'Read the <a href="/terms/">terms of use</a> for the service’s limits and the <a href="/affiliate-disclosure/">affiliate disclosure</a> for commercial links. We will update this page when its guidance changes.'))]),

'affiliate-disclosure': ('Affiliate and commercial disclosure', [
('summary','How Castward may earn money',paragraphs(
'Castward may earn a commission if you follow a marked affiliate link and complete an eligible purchase or booking. This can create a financial interest in the link. You should know about that interest before you choose.',
'The current site provides trip information, independent source links and retailer category searches. It does not accept booking payments or operate a native booking checkout. A future guide booking slot is not evidence that a paid partnership already exists.',
'This page explains the policy for future commercial links as well as any link-specific disclosure. It does not claim membership in a particular affiliate program.')),
('labels','Look for a disclosure beside the link',paragraphs(
'A material relationship should be clear near the relevant recommendation or link. A suitable message is: “Castward may earn a commission if you book or buy through this link.” Paid editorial placements should be identified as sponsored.',
'This general page does not replace a disclosure at the point where you make a decision. A disclosure hidden only in the footer is not our intended approach.',
'The same principle applies to a free product, hosted trip or other material benefit if one affects a recommendation. We should identify the relationship rather than imply an independent purchase or personal experience.')),
('types','Different links have different roles',bullets(
'<strong>Reference links</strong> point to research, agencies or other source material. A citation alone does not indicate payment.',
'<strong>Operator links</strong> help you contact an independent guide, captain or lodge. A link alone does not establish a partnership or an endorsement.',
'<strong>Retailer searches</strong> open a category search. They are not a review of a specific product, a stock check or a guarantee of fit.',
'<strong>Affiliate links</strong> can attribute an eligible transaction to Castward and produce a commission when a program applies.',
'<strong>Sponsored placements</strong> involve a paid or other material relationship and should carry an appropriate label.')),
('decisions','Your price and your decision',paragraphs(
'The external provider sets prices, availability, fees, taxes, eligibility and transaction terms. We do not promise that an affiliate offer is the cheapest price or that every program leaves the price unchanged.',
'A commission does not prove quality, safety or suitability. Compare the options, ask questions and read the provider’s terms. Do not buy equipment merely because the planner lists a category; first confirm what you own and what a guide provides.',
'We do not guarantee a catch, trip result, refund or product performance. A generated scene or animated reel is not a customer testimonial.')),
('bookings','Guide bookings and external contracts',paragraphs(
'Castward is not the fishing operator. If you book on another website, your agreement is with that provider under its terms. Confirm the vessel, meeting point, inclusions, credentials, insurance and weather policy directly.',
'Ask how cancellations and refunds work before you pay. A Castward contact message does not create a reservation. An empty booking slot does not claim a provider’s availability.',
'If a future service gives Castward a different role, the relevant page must explain that role and any additional terms before the transaction.')),
('privacy','Referral data and privacy',paragraphs(
'An external affiliate program may use a referral identifier or its own cookies to attribute a transaction. The provider’s privacy and cookie policies apply on that website. Castward’s consent choice does not control the external site.',
'On Castward, our consented analytics can record an operator-link click and the destination domain. It does not send contact fields or saved plan contents in that event. See the <a href="/privacy/">privacy policy</a> and <a href="/cookies/">cookie policy</a>.')),
('contact','Questions, corrections and updates',paragraphs(
'If a relationship or a link is unclear, email '+CONTACT+' with the page and link. We can review the disclosure and correct it where necessary.',
'We will update this page if the commercial model changes. The <a href="https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking">FTC endorsement guidance</a> explains why a material connection should be clear and conspicuous. Read the <a href="/terms/">terms of use</a> for the service’s general limits.'))]),

'accessibility': ('Accessibility statement', [
('commitment','Our approach',paragraphs(
'Castward aims to make its trip information and controls usable by people with different abilities and devices. Clear reading order, keyboard use and motion controls form part of that work.',
'We use the Web Content Accessibility Guidelines as a reference for improvements. This statement does not claim a certification or complete conformance across every page, device or assistive technology.')),
('features','Features you can use',bullets(
'A skip link leads to the main content. Headings and landmarks organize the pages.',
'Navigation, forms and visible controls support keyboard input. Focus styles help show the active control.',
'Images have text alternatives where they convey information. Decorative map artwork does not replace the linked destination names.',
'A reduced-motion preference disables non-essential animation, smooth scroll, scroll pinning and film autoplay.',
'The home hero has a motion pause control. Film controls allow manual playback.',
'Article text and links remain available without JavaScript. Forms and interactive tools have the limits explained below.')+paragraphs(
'You can zoom with your browser controls. On a phone, horizontal trip bands use normal touch scrolling; you can also follow each card’s link.')),
('motion','Motion, video and navigation',paragraphs(
'Enable reduced motion in your device’s accessibility settings to reduce movement. The site reads the browser preference, including changes made while a page is open.',
'The home motion button pauses optional home effects. Film controls are also available. Animated reels show illustrative scenes; they are not spoken safety instructions or evidence of an actual trip.',
'Page transitions fall back to normal navigation when unsupported. A motion effect should not be necessary to read a heading, inspect a count or follow a link.')),
('limits','Known limits and alternatives',paragraphs(
'The planner, consent controls, filters and contact submission need JavaScript. If you cannot use the contact form, email '+CONTACT+'. If browser storage is unavailable, the planner cannot reliably retain a saved plan.',
'Wide data tables may need horizontal scrolling at high zoom or on a small screen. Tables retain headings, and the table region can receive keyboard focus where it needs to scroll.',
'Generated images and decorative maps are not accessible route instructions. Use the written trip information and official navigation sources. External operator, retailer and agency websites have their own accessibility features and limits.',
'The catalog contains many pages. Automated checks alone cannot identify every barrier. Some combinations of browser, assistive technology and content may still present problems.')),
('help','Request help or report a barrier',paragraphs(
'Email '+CONTACT+' with the page URL, the task you wanted to complete and what prevented it. If useful, include your browser, device and assistive technology. Tell us which format or alternative would help.',
'Do not include private medical information. A functional description of the barrier is enough. If the request concerns personal information, you can use '+PRIVACY+'.',
'We will review the report and seek a practical way to provide the information or improve the feature. We do not promise a fixed response time or an immediate repair of a third-party service.')),
('updates','Review and changes',paragraphs(
'Accessibility is part of ongoing site maintenance. New layouts and motion features need checks for keyboard access, visible content, contrast, screen size and reduced motion.',
'The date above identifies the statement version. We will revise it as the features or known limits change. Contact '+CONTACT+' for an accessible alternative or a question about this statement.'))])}


def legal_body(slug, title, sections, intro):
    toc='<nav class="legal-toc" aria-label="On this page"><span class="eyebrow">ON THIS PAGE</span><ol>'+''.join('<li><a href="#'+anchor+'">'+escape(heading)+'</a></li>' for anchor,heading,_ in sections)+'</ol></nav>'
    article='<article class="prose legal-article">'+''.join('<section id="'+anchor+'" tabindex="-1"><h2>'+escape(heading)+'</h2>'+content+'</section>' for anchor,heading,content in sections)+'</article>'
    return intro('CASTWARD / TRUST',title,'Last updated: November 10, 2026')+'<div class="wrap legal-layout">'+toc+article+'</div>'
