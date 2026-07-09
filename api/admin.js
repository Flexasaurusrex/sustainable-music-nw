// Returns stored roster + mailing entries. Gated by the ADMIN_KEY env var,
// passed as an x-admin-key header (or ?key= for convenience).

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

function parse(o) {
  return (((o && o.result) || []).map((s) => {
    try { return JSON.parse(s); } catch (e) { return { raw: s }; }
  })).reverse();
}

module.exports = async function handler(req, res) {
  const key = (req.headers['x-admin-key'] || (req.query && req.query.key) || '').toString().trim();
  if (!ADMIN || key !== ADMIN) { res.status(401).json({ error: 'unauthorized' }); return; }
  if (!URL_ || !TOKEN) { res.status(500).json({ error: 'store not configured' }); return; }

  try {
    const roster = parse(await kv(['LRANGE', 'smnw:roster', '0', '-1']));
    const mailing = parse(await kv(['LRANGE', 'smnw:mailing', '0', '-1']));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ roster, mailing });
  } catch (e) {
    res.status(500).json({ error: 'read failed' });
  }
};
