const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const randomId = Math.floor(Math.random() * 1000000) + 10000;
  const { data, error } = await supabase.from('Complain_Data').insert({
    complaint_id: randomId,
    email: 'test@example.com',
    product_type: 'Electronic',
    date: '2026-01-01',
    category: 'Other',
    text: 'Test',
    resolve_status: 'submitted'
  });
  console.log("Insert error:", error);
}
run();
