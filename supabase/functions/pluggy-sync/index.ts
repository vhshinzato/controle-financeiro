const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { itemId, from, to } = await req.json();

    const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

    const authRes = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    const { apiKey } = await authRes.json();

    // Get item info (connector name)
    const itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    const itemData = await itemRes.json();
    const connectorName = itemData.connector?.name || 'Banco';

    // Get accounts for item
    const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    const accountsData = await accountsRes.json();
    const accounts = accountsData.results || [];

    // Fetch transactions per account
    const allTransactions = [];
    for (const account of accounts) {
      const params = new URLSearchParams({ accountId: account.id });
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const txRes = await fetch(`https://api.pluggy.ai/transactions?${params}`, {
        headers: { 'X-API-KEY': apiKey },
      });
      const txData = await txRes.json();

      for (const t of (txData.results || [])) {
        allTransactions.push({
          id: t.id,
          date: t.date?.slice(0, 10),
          description: t.description || t.descriptionRaw || '',
          amount: Math.abs(t.amount),
          type: t.type === 'CREDIT' ? 'receita' : 'despesa',
          category: t.category || null,
          accountName: account.name,
        });
      }
    }

    // Sort by date desc
    allTransactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return new Response(JSON.stringify({ transactions: allTransactions, connectorName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
