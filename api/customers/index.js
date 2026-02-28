const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;
  const supabase = getSupabase();

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

  res.json({
    _index: data.id,
    'Last Name': data.last_name,
    'First Name': data.first_name,
    'Business': data.business,
    'Address': data.address,
    'City': data.city,
    'State': data.state,
    'Zip': data.zip,
    'Phone': data.phone,
    'Miscellaneous': data.miscellaneous
  });
};
