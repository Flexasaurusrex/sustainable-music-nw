// Admin-gated image upload. Stores the image in KV (hash smnw:photos) keyed by
// a generated id, returns { id }. Served back lazily by /api/photo so gallery
// images never bloat the global content payload.

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  const key = (req.headers['x-admin-key'] || '').toString().trim();
  if (!ADMIN || key !== ADMIN) { res.status(401).json({ error: 'unauthorized' }); return; }
  if (!URL_ || !TOKEN) { res.status(500).json({ error: 'store not configured' }); return; }

  let b = req.body;
  if (!b || typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }
  const img = (b.image || '').toString();
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(img)) { res.status(400).json({ error: 'bad image' }); return; }
  if (img.length > 4000000) { res.status(413).json({ error: 'too large' }); return; }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  try {
    await kv(['HSET', 'smnw:photos', id, img]);
    res.status(200).json({ id });
  } catch (e) {
    res.status(500).json({ error: 'save failed' });
  }
};
