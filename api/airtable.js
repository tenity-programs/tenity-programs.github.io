// Airtable proxy - keeps the PAT server-side (AIRTABLE_PAT env var).
// Returns only the fields the dashboard needs (name + statuses), never the
// full application data, so applicant PII is not exposed publicly.
const BASE = 'appLY4d1qYmYgd1lh';
const TABLE = 'tbl4E1lgZJA51jMgg';
const FIELDS = ['Name', 'Status', 'Status after 1st Call'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) return res.status(500).json({ error: 'AIRTABLE_PAT not configured' });

  const params = new URLSearchParams();
  params.set('pageSize', '100');
  if (req.query.offset) params.set('offset', String(req.query.offset));
  for (const f of FIELDS) params.append('fields[]', f);

  const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}?${params}`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  if (!r.ok) return res.status(r.status).json({ error: 'airtable ' + r.status });
  const data = await r.json();
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({
    records: (data.records || []).map(rec => ({ id: rec.id, fields: rec.fields })),
    offset: data.offset || null,
  });
}
