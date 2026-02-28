const { getSupabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabase();
  const { data, error } = await supabase.from('checkins').select('*').order('checked_in_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
};
