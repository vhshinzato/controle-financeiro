const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const bytes = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    const mimeType = file.type || 'application/pdf';

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const prompt = `Você é um assistente especializado em extratos bancários brasileiros.
Analise este documento e extraia TODAS as transações financeiras.
Retorne APENAS um JSON válido no seguinte formato, sem texto adicional:
{
  "transacoes": [
    {
      "data": "YYYY-MM-DD",
      "descricao": "descrição da transação",
      "valor": 123.45,
      "tipo": "receita"
    }
  ]
}
Regras:
- "valor" deve ser sempre positivo (número sem R$ ou vírgula, use ponto decimal)
- "tipo" deve ser "receita" para entradas/créditos e "despesa" para saídas/débitos
- "data" no formato YYYY-MM-DD
- Ignore saldo, totais e linhas que não sejam transações
- Se não conseguir identificar uma data exata, use o primeiro dia do mês do extrato`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return new Response(JSON.stringify({ error: 'Erro no Gemini: ' + err }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { transacoes: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
