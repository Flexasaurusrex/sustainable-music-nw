// Receives roster + mailing-list submissions and stores them in Vercel KV
// (Upstash Redis) via the REST API. No dependencies, plain fetch.

const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function kv(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  return r.json();
}

const clip = (s, n) => (s || '').toString().trim().slice(0, n);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  if (!URL_ || !TOKEN) { res.status(500).json({ error: 'store not configured' }); return; }

  let b = req.body;
  if (!b || typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }

  const type = b.type === 'mailing' ? 'mailing' : 'roster';
  const email = clip(b.email, 200);
  if (!email || email.indexOf('@') < 0) { res.status(400).json({ error: 'email required' }); return; }

  const rec = type === 'mailing'
    ? { ts: Date.now(), email }
    : {
        ts: Date.now(), name: clip(b.name, 200), email,
        act: clip(b.act, 200), discipline: clip(b.discipline, 200),
        links: clip(b.links, 500), notes: clip(b.notes, 2000),
      };

  try {
    await kv(['RPUSH', 'smnw:' + type, JSON.stringify(rec)]);
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'save failed' });
  }
};
