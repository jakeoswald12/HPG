const https = require('https');
const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sheetsUrl = process.env.SHEETS_URL || '';
  if (!sheetsUrl) return res.status(400).json({ error: 'Google Sheets URL not configured' });

  const payload = JSON.stringify(req.body);
  console.log('[Sheets] Writing buyer:', req.body.firstName, req.body.lastName);

  try {
    const sheetsResult = await new Promise((resolve, reject) => {
      const parsed = new URL(sheetsUrl);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const request = https.request(options, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log('[Sheets] Following redirect to:', response.headers.location);
          https.get(response.headers.location, (getRes) => {
            let body = '';
            getRes.on('data', chunk => body += chunk);
            getRes.on('end', () => {
              console.log('[Sheets] Full response:', body);
              resolve({ ok: true, response: body });
            });
          }).on('error', reject);
          return;
        }

        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          console.log('[Sheets] Response:', response.statusCode, body.substring(0, 200));
          resolve({ ok: true, response: body });
        });
      });

      request.on('error', reject);
      request.write(payload);
      request.end();
    });

    // Backup to Supabase checkins table
    try {
      const supabase = getSupabase();
      let buyerNum = '?';
      try {
        const parsed = JSON.parse(sheetsResult.response);
        buyerNum = String(parsed.buyerNumber || parsed.row || '?');
      } catch(e) {}

      await supabase.from('checkins').insert({
        buyer_number: buyerNum,
        last_name: req.body.lastName || '',
        first_name: req.body.firstName || '',
        full_name: req.body.fullName || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(),
        address: req.body.address || '',
        city: req.body.city || '',
        state: req.body.state || '',
        zip: req.body.zip || '',
        phone: req.body.phone || '',
        email: req.body.email || '',
        sheets_response: sheetsResult
      });
      console.log('[Supabase] Backup saved for', req.body.firstName, req.body.lastName);
    } catch(e) {
      console.error('[Supabase] Backup failed:', e.message);
    }

    res.json(sheetsResult);
  } catch (err) {
    console.error('[Sheets] Request error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
