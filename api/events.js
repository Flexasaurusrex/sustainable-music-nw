// Serverless function: pulls upcoming events live from the Squarespace feed
// and returns them in the shape the page expects. Same-origin, so no CORS
// issues for the browser. Falls back gracefully (the page keeps its baked-in
// list if this ever errors).

function toPT(ms) {
  if (!ms) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(ms));
  const o = {};
  parts.forEach((p) => (o[p.type] = p.value));
  let hour = o.hour === '24' ? '00' : o.hour;
  return `${o.year}-${o.month}-${o.day}T${hour}:${o.minute}`;
}

function tagFor(title, venue) {
  const s = `${title} ${venue}`.toLowerCase();
  if (s.includes('tezcon')) return 'Festival';
  if (s.includes('jefferson')) return 'Jefferson Park Series';
  if (s.includes('fundraiser') || s.includes('benefit')) return 'Fundraiser';
  return 'Live Set';
}

module.exports = async function handler(req, res) {
  try {
    const r = await fetch('https://www.sustainablemusicnw.org/events?format=json-pretty', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SMNW-site/1.0)' },
    });
    if (!r.ok) throw new Error('feed ' + r.status);
    const data = await r.json();
    const events = (data.upcoming || []).map((e) => {
      const loc = e.location || {};
      return {
        t: e.title,
        s: toPT(e.startDate),
        e: toPT(e.endDate),
        v: (loc.addressTitle || '').trim() || 'Seattle',
        a: (loc.addressLine1 || '').trim(),
        tag: tagFor(e.title || '', loc.addressTitle || ''),
        img: e.assetUrl || null,
        url: 'https://www.sustainablemusicnw.org' + (e.fullUrl || ''),
      };
    });
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ events, source: 'live' });
  } catch (err) {
    res.status(200).json({ events: [], error: String(err) });
  }
};
