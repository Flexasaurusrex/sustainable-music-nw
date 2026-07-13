// Editable content overrides. GET is public (visitors see edits); POST is
// admin-gated (inline editor saves here). Stored as a Redis hash smnw:content.

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

function sanitize(html) {
  if (typeof html !== 'string') return '';
  html = html.slice(0, 20000);
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<\/?(script|style|iframe|object|embed|link|meta)[^>]*>/gi, '');
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '');
  html = html.replace(/javascript:/gi, '');
  return html.trim();
}

module.exports = async function handler(req, res) {
  if (!URL_ || !TOKEN) { res.status(500).json({ error: 'store not configured' }); return; }

  if (req.method === 'GET') {
    try {
      const o = await kv(['HGETALL', 'smnw:content']);
      const arr = (o && o.result) || [];
      const content = {};
      for (let i = 0; i < arr.length; i += 2) content[arr[i]] = arr[i + 1];
      res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=30');
      res.status(200).json({ content });
    } catch (e) { res.status(500).json({ error: 'read failed' }); }
    return;
  }

  if (req.method === 'POST') {
    const key = (req.headers['x-admin-key'] || '').toString().trim();
    if (!ADMIN || key !== ADMIN) { res.status(401).json({ error: 'unauthorized' }); return; }
    let b = req.body;
    if (!b || typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }
    const updates = b.updates || {};
    const cmd = ['HSET', 'smnw:content'];
    let count = 0;
    for (const k in updates) {
      if (!Object.prototype.hasOwnProperty.call(updates, k)) continue;
      if (count >= 300) break;
      let val = updates[k];
      if (typeof val !== 'string') val = String(val);
      if (val.length > 3000000) continue; // ~3MB cap per value
      if (!/^(data:|https?:)/.test(val)) val = sanitize(val);
      cmd.push(k, val);
      count++;
    }
    if (count === 0) { res.status(200).json({ success: true, updated: 0 }); return; }
    try { await kv(cmd); res.status(200).json({ success: true, updated: count }); }
    catch (e) { res.status(500).json({ error: 'save failed' }); }
    return;
  }

  res.status(405).json({ error: 'method' });
};
