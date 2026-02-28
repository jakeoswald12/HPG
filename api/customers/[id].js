const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const body = req.body;
  const supabase = getSupabase();

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
