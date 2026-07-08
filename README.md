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

## TODO

- **Forms**: the roster + mailing-list forms currently run a client-side success demo. Point them at a Formspree endpoint (see the comment in the `<script>`) to collect real submissions.
- **Events**: the `EVENTS` array in the script was scraped from the live Squarespace calendar. Update it as events roll over, or wire it to pull from `sustainablemusicnw.org/events?format=json` to stay current automatically.
