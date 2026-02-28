const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body;
  const supabase = getSupabase();

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
};
