const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { first, last } = req.query;
  if (!first && !last) return res.json([]);

  const supabase = getSupabase();
  let query = supabase.from('customers').select('*');

  if (first) query = query.ilike('first_name', `%${first}%`);
  if (last) query = query.ilike('last_name', `%${last}%`);

  const { data, error } = await query.order('last_name').order('first_name');
  if (error) return res.status(500).json({ error: error.message });

  const results = data.map(row => ({
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
  }));

  res.json(results);
};
