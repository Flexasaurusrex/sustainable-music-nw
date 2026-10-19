// Upcoming events = the Squarespace feed + any events an admin adds by hand
// (stored in KV under smnw:events). GET is public and returns the merged,
// upcoming, date-sorted list. POST is admin-gated for add/update/delete.

const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;
const ADMIN = (process.env.ADMIN_KEY || '').trim();

async function kv(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  return r.json();
}

function toPT(ms) {
  if (!ms) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(ms));
  const o = {}; parts.forEach((p) => (o[p.type] = p.value));
  return `${o.year}-${o.month}-${o.day}T${o.hour === '24' ? '00' : o.hour}:${o.minute}`;
}
function todayPT() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function tagFor(title, venue) {
  const s = `${title} ${venue}`.toLowerCase();
  if (s.includes('tezcon')) return 'Festival';
  if (s.includes('jefferson')) return 'Jefferson Park Series';
  if (s.includes('fundraiser') || s.includes('benefit')) return 'Fundraiser';
  return 'Live Set';
}
const clip = (s, n) => (s == null ? '' : String(s)).trim().slice(0, n);

async function getManual() {
  try {
    const o = await kv(['GET', 'smnw:events']);
    const a = JSON.parse((o && o.result) || '[]');
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const key = (req.headers['x-admin-key'] || '').toString().trim();
    if (!ADMIN || key !== ADMIN) { res.status(401).json({ error: 'unauthorized' }); return; }
    if (!URL_ || !TOKEN) { res.status(500).json({ error: 'store not configured' }); return; }
    let b = req.body;
    if (!b || typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }
    const action = b.action;
    let arr = await getManual();
    if (action === 'add' || action === 'update') {
      const ev = b.event || {};
      if (!clip(ev.t, 200) || !clip(ev.s, 40)) { res.status(400).json({ error: 'title and date required' }); return; }
      const rec = {
        id: action === 'update' && ev.id ? String(ev.id) : (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
        manual: true,
        t: clip(ev.t, 200), s: clip(ev.s, 40), e: clip(ev.e, 40) || clip(ev.s, 40),
        v: clip(ev.v, 200), a: clip(ev.a, 200), tag: clip(ev.tag, 60) || 'Live Set',
        img: clip(ev.img, 400), url: clip(ev.url, 500),
      };
      if (action === 'update') arr = arr.map((x) => (x.id === rec.id ? rec : x));
      else arr.push(rec);
    } else if (action === 'delete') {
      arr = arr.filter((x) => x.id !== String(b.id));
    } else { res.status(400).json({ error: 'bad action' }); return; }
    if (arr.length > 200) arr = arr.slice(-200);
    try { await kv(['SET', 'smnw:events', JSON.stringify(arr)]); res.status(200).json({ success: true }); }
    catch (e) { res.status(500).json({ error: 'save failed' }); }
    return;
  }

  // GET — merged upcoming + past
  const dec = (s) => (s == null ? '' : String(s))
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const mapFeed = (e) => {
    const loc = e.location || {};
    return {
      t: dec(e.title), s: toPT(e.startDate), e: toPT(e.endDate),
      v: dec((loc.addressTitle || '').trim()) || 'Seattle', a: dec((loc.addressLine1 || '').trim()),
      tag: tagFor(e.title || '', loc.addressTitle || ''), img: e.assetUrl || null,
      url: '', manual: false,
    };
  };
  let feedUp = [], feedPast = [];
  try {
    const r = await fetch('https://cinnamon-asparagus-bb6t.squarespace.com/events?format=json-pretty', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
    });
    if (r.ok) {
      const data = await r.json();
      feedUp = (data.upcoming || []).map(mapFeed);
      feedPast = (data.past || []).map(mapFeed);
    }
  } catch (e) { /* feed optional */ }

  const manual = await getManual();
  const cutoff = todayPT();
  const asc = (a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : 0);
  const desc = (a, b) => (a.s < b.s ? 1 : a.s > b.s ? -1 : 0);
  const upcoming = feedUp.concat(manual).filter((e) => e && e.s && e.s.slice(0, 10) >= cutoff).sort(asc);
  const past = feedPast.concat(manual.filter((e) => e.s && e.s.slice(0, 10) < cutoff)).filter((e) => e && e.s).sort(desc);

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
  res.status(200).json({ events: upcoming, past, source: 'live+manual' });
};
