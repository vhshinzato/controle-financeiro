const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Events we care about
const TX_EVENTS = ['transactions/created', 'transactions/updated', 'all'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { event, itemId } = payload;

    // Only process transaction events
    if (!TX_EVENTS.some(e => event?.startsWith(e.replace('all', '')))) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Authenticate with Pluggy
    const authRes = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    const { apiKey } = await authRes.json();

    // Get accounts for item
    const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    const { results: accounts } = await accountsRes.json();

    // Fetch recent transactions (last 3 days to catch new ones)
    const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    const newTx = [];

    for (const account of (accounts || [])) {
      const params = new URLSearchParams({ accountId: account.id, from, to });
      const txRes = await fetch(`https://api.pluggy.ai/transactions?${params}`, {
        headers: { 'X-API-KEY': apiKey },
      });
      const txData = await txRes.json();
      for (const t of (txData.results || [])) {
        newTx.push({
          pluggy_tx_id: t.id,
          item_id: itemId,
          date: t.date?.slice(0, 10),
          description: t.description || t.descriptionRaw || '',
          amount: Math.abs(t.amount),
          type: t.type === 'CREDIT' ? 'receita' : 'despesa',
          category: t.category || null,
        });
      }
    }

    // Find which user owns this item
    const itemOwnerRes = await fetch(
      `${supabaseUrl}/rest/v1/pluggy_items?item_id=eq.${itemId}&select=user_id`,
      { headers: { apikey: supabaseKey!, Authorization: `Bearer ${supabaseKey}` } }
    );
    const owners = await itemOwnerRes.json();
    if (!owners?.length) {
      return new Response(JSON.stringify({ ok: true, skipped: 'item not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = owners[0].user_id;

    // Save pending transactions to a staging table for user review
    if (newTx.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/pluggy_pending_tx`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey!,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates',
        },
        body: JSON.stringify(newTx.map(t => ({ ...t, user_id: userId }))),
      });
    }

    return new Response(JSON.stringify({ ok: true, received: newTx.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
