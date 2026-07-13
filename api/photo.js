// Serves an uploaded gallery photo by id (decoded from KV), with a long
// immutable cache so the CDN holds it. Public — ids are unguessable.

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

module.exports = async function handler(req, res) {
  const id = ((req.query && req.query.id) || '').toString();
  if (!id || !/^[a-z0-9]+$/i.test(id)) { res.status(400).end(); return; }
  if (!URL_ || !TOKEN) { res.status(500).end(); return; }
  try {
    const o = await kv(['HGET', 'smnw:photos', id]);
    const val = o && o.result;
    const m = val && /^data:(image\/\w+);base64,(.+)$/.exec(val);
    if (!m) { res.status(404).end(); return; }
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(Buffer.from(m[2], 'base64'));
  } catch (e) {
    res.status(500).end();
  }
};
