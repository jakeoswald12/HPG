require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Google Apps Script web app URL
const sheetsWebAppUrl = process.env.SHEETS_URL || '';

// ─── Helper: map Supabase row to frontend format ─────────────

function toFrontend(row) {
  return {
    _index: row.id,
    'Last Name': row.last_name,
    'First Name': row.first_name,
    'Business': row.business,
    'Address': row.address,
    'City': row.city,
    'State': row.state,
    'Zip': row.zip,
    'Phone': row.phone,
    'Miscellaneous': row.miscellaneous
  };
}

// ─── API routes ──────────────────────────────────────────────

// Search by first and/or last name (case-insensitive, partial match)
app.get('/api/customers/search', async (req, res) => {
  try {
    const { first, last } = req.query;
    if (!first && !last) return res.json([]);

    let query = supabase.from('customers').select('*');
    if (first) query = query.ilike('first_name', `%${first}%`);
    if (last) query = query.ilike('last_name', `%${last}%`);

    const { data, error } = await query.order('last_name').order('first_name');
    if (error) return res.status(500).json({ error: error.message });

    res.json(data.map(toFrontend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a customer by Supabase ID
app.put('/api/customers/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const updates = {};
    if (body['Last Name'] !== undefined) updates.last_name = body['Last Name'];
    if (body['First Name'] !== undefined) updates.first_name = body['First Name'];
    if (body['Business'] !== undefined) updates.business = body['Business'];
    if (body['Address'] !== undefined) updates.address = body['Address'];
    if (body['City'] !== undefined) updates.city = body['City'];
    if (body['State'] !== undefined) updates.state = body['State'];
    if (body['Zip'] !== undefined) updates.zip = body['Zip'];
    if (body['Phone'] !== undefined) updates.phone = body['Phone'];
    if (body['Miscellaneous'] !== undefined) updates.miscellaneous = body['Miscellaneous'];
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Customer not found' });

    res.json(toFrontend(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new customer
app.post('/api/customers', async (req, res) => {
  try {
    const body = req.body;
    const row = {
      last_name: body['Last Name'] || '',
      first_name: body['First Name'] || '',
      business: body['Business'] || '',
      address: body['Address'] || '',
      city: body['City'] || '',
      state: body['State'] || '',
      zip: body['Zip'] || '',
      phone: body['Phone'] || '',
      miscellaneous: body['Miscellaneous'] || ''
    };

    const { data, error } = await supabase.from('customers').insert(row).select().single();
    if (error) return res.status(500).json({ error: error.message });

    res.json(toFrontend(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Check-in (log to Supabase) ─────────────────────────────

app.post('/api/checkin', async (req, res) => {
  try {
    const data = req.body;
    const { data: row, error } = await supabase.from('checkins').insert({
      buyer_number: String(data.buyerNumber || ''),
      last_name: data.lastName || '',
      first_name: data.firstName || '',
      full_name: data.fullName || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      phone: data.phone || '',
      email: data.email || '',
      sheets_response: data.sheetsResponse || null
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all checked-in buyers
app.get('/api/checkin/list', async (req, res) => {
  try {
    const { data, error } = await supabase.from('checkins').select('*').order('checked_in_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Google Sheets config ────────────────────────────────────

app.post('/api/config/sheets-url', (req, res) => {
  res.json({ ok: true, url: sheetsWebAppUrl });
});

app.get('/api/config/sheets-url', (req, res) => {
  res.json({ url: sheetsWebAppUrl });
});

// ─── Proxy write to Google Sheets + Supabase backup ─────────

app.post('/api/sheets/write', async (req, res) => {
  if (!sheetsWebAppUrl) {
    return res.status(400).json({ error: 'Google Sheets URL not configured' });
  }

  const payload = JSON.stringify(req.body);
  console.log('[Sheets] Writing buyer:', req.body.firstName, req.body.lastName);

  try {
    const sheetsResult = await new Promise((resolve, reject) => {
      const parsed = new URL(sheetsWebAppUrl);
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
});

// ─── Start ───────────────────────────────────────────────────

const PORT = process.env.PORT || 8000;
app.listen(PORT, async () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║       Bull Sale Check-In System              ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  Operator screen:  http://localhost:${PORT}/operator.html`);
  console.log(`  Customer screen:  http://localhost:${PORT}/customer.html`);
  console.log('');
  console.log(`  Database: Supabase (${process.env.SUPABASE_URL ? 'connected' : 'NOT CONFIGURED'})`);
  console.log(`  Sheets URL: ${sheetsWebAppUrl ? 'configured' : 'NOT CONFIGURED'}`);

  try {
    const { count } = await supabase.from('checkins').select('*', { count: 'exact', head: true });
    console.log(`  ${count || 0} buyers checked in`);
  } catch(e) {}

  console.log('');
});
