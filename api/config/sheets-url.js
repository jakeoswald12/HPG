module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({ url: process.env.SHEETS_URL || '' });
  }
  // POST is a no-op on Vercel (env vars are read-only at runtime)
  res.json({ ok: true, url: process.env.SHEETS_URL || '' });
};
