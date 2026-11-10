# Castward trust release — November 10, 2026

The release is live at https://castward.app.

- Base commit: `531e6219` (premium motion and original scenes).
- Production deployment: `dpl_9M44sygLcUS7PnKigei9zuGQYX2r`.
- Deployment URL: https://castward-39n17obcp-owens-projects-f5c36e9a.vercel.app.
- Rollback deployment: `dpl_BsBnxWT7EmYKJxNcC7RfKHveTEJr`.
- Rollback URL: https://castward-8gihfdemq-owens-projects-f5c36e9a.vercel.app.
- Project: `owens-projects-f5c36e9a/castward`.
- Repository: `owensto/helper`. Branch: `castward-launch` only.

## Delivered

- GA4 measurement ID `G-4NYGJ2BF32` on all generated pages.
- Analytics requires acceptance worldwide. Advertising consent remains denied.
- Accept, Reject non-essential, and footer Cookie settings controls.
- Events: `search`, `trip_view`, `plan_start`, `plan_save`, `guide_view`, `video_play`, `contact_submit`, `outbound_booking_click`.
- Search events exclude search text. Analytics excludes contact fields and plan contents.
- Query strings and fragments are excluded from configured analytics page URLs.
- Legacy local analytics logs and attribution writes were removed. Rejection deletes old stored values.
- Privacy, terms, cookies, affiliate disclosure, accessibility, contact, and about pages.
- Footer links and plain, selectable `contact@castward.app` text.
- Photo and AI credits remain on About. Existing motion and video assets remain intact.
- Castward titles, Open Graph names, and schema author names. URLs remain unchanged.
- Contact form with required consent, field validation, a honeypot, and a server-checked time trap.
- Real provider success and error states. The recipient is fixed on the server.

## Email provider and test

The owner’s mycraftai and mydrinkai-bakedai repositories use Resend.
The requested bizai directory was absent.
The source Vercel project for mycraftai is `stitchly`.

`RESEND_API_KEY` and `EMAIL_FROM` were copied from that project into Castward production through `vercel env`.
No secret was printed or committed. The temporary source environment file was deleted.
The existing verified sender remains in use. Replies go to the visitor’s email address.
All form messages go to `contact@mediaatl.as`.

One live test was submitted through the contact page:

- Subject: `Castward contact form test`.
- HTTP result: `200`.
- Resend acceptance ID: `01a1c775-6132-7d3f-b6eb-e4a719c38f68`.
- The page showed the provider acceptance message.

Provider acceptance confirms the send request. It does not prove inbox placement.
FormSubmit was not used. No activation email or owner click is required.

## Checks

- Production build passed: 1,619 generated routes.
- All 26 existing engine tests passed.
- The new contact test passed validation, provider acceptance, rejection, and network failure checks.
- Browser checks passed default consent denial, persisted rejection, acceptance, withdrawal, form success, form failure, and mobile width.
- The mobile contact screenshot received a visual check.
- Curl checks passed for all 1,100 non-redirect content pages: HTTP status, Castward title, and canonical URL.
- `/404/` serves the explicit static page with HTTP 200. The route was included in the checks.
- IndexNow returned HTTP 200 for all 103 indexable URLs. Acceptance does not prove search indexing.

Evidence files are beside this report:

- `castward-trust-live-checks.json`
- `castward-trust-contact-receipt.json`
- `castward-trust-indexnow.json`

## Owner action

Replace `[owner to confirm]` for the legal entity name and mailing address on Privacy and Terms.
No other owner placeholders were added. No company facts were invented.
The owner can inspect the inbox for the test message. No activation step is required.

The release preserves unrelated pre-existing changes, including `.gitignore` and untracked generated video files.

## Reference checks

- Google consent: https://developers.google.com/tag-platform/security/concepts/consent-mode
- California rights: https://oag.ca.gov/privacy/ccpa
- EU rights: https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en
- Resend API: https://resend.com/docs/api-reference/emails/send-email
