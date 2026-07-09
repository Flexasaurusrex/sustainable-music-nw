# Sustainable Music NW

Redesigned site for [Sustainable Music Northwest](https://www.sustainablemusicnw.org/), a Seattle 501(c)(3) that puts professional, fairly-paid musicians into the places neighborhoods already gather.

Single self-contained `index.html` — fonts (Zodiak, Satoshi, Space Mono), the brand seal, team photos, and event flyers are all embedded as data URIs. No build step, no external dependencies.

## Views

- **Home** — cinematic logo intro, mission, and the artist-roster signup
- **Our Approach** — how it works, with community photography
- **Events** — upcoming events with a List ⇄ Calendar toggle
- **About** — the board of working musicians
- **Donate** — where support goes (wired to Givebutter)

Light/dark theme toggle in the nav. Hash-based routing (`#approach`, `#events`, `#about`, `#donate`).

## Deploy

Static site. `vercel --prod` deploys as-is. Pushing to `main` auto-deploys via the connected Vercel project.

## Live event sync

`api/events.js` is a Vercel serverless function that pulls upcoming events from
the Squarespace feed and returns them in the page's shape. The page fetches
`/api/events` on load and falls back to its baked-in list if the call fails.
Events stay current automatically, no manual edits.

## Forms + admin panel

The roster + mailing-list forms POST to `api/submit.js`, which stores entries in
Vercel KV (Upstash Redis) under `smnw:roster` and `smnw:mailing`.

`/admin.html` is a password-gated dashboard that reads them via `api/admin.js`
(tables, mailto links, CSV export). Two env vars drive it:

- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — injected by the connected KV store
- `ADMIN_KEY` — the dashboard password (`vercel env add ADMIN_KEY`)

## Gallery

`/#gallery` renders a masonry of event photos with a keyboard-navigable
lightbox. Photos are embedded; the `GALLERY` array in the script controls them.
