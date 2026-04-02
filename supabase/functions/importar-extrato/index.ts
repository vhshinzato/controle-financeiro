const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function extractTextFromPDF(bytes: Uint8Array, password?: string): Promise<string> {
  // @ts-ignore — esm.sh import
  const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.2.67/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    password: password || '',
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const texts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    texts.push(pageText);
  }

  return texts.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const senha = formData.get('senha') as string | null;

    if (!file) return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = file.type || 'application/pdf';
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    let geminiBody: object;

    // If PDF with password, extract text and send as text prompt
    if (senha && mimeType === 'application/pdf') {
      let text: string;
      try {
        text = await extractTextFromPDF(bytes, senha);
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Senha incorreta ou PDF inválido.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const prompt = `Você é um assistente especializado em extratos bancários brasileiros.
Analise o texto abaixo de um extrato bancário e extraia TODAS as transações financeiras.
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
- Se não conseguir identificar uma data exata, use o primeiro dia do mês do extrato

TEXTO DO EXTRATO:
${text}`;

      geminiBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      };
    } else {
      // No password — send binary directly to Gemini
      const base64 = btoa(String.fromCharCode(...bytes));
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

      geminiBody = {
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      };
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return new Response(JSON.stringify({ error: 'Erro no Gemini: ' + err }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
