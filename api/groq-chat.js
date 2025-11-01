// Run on Vercel as a serverless function (Edge-compatible)
export const config = {
  runtime: "edge",
};

// Whitelist models you want to allow from the client (optional but safer)
const ALLOWED_MODELS = new Set([
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768"
]);

function corsHeaders(origin) {
  const allowed = process.env.ALLOWED_ORIGIN || ""; // e.g., https://yourdomain.vercel.app
  const isAllowed = allowed && origin && origin === allowed;
  return {
    "Access-Control-Allow-Origin": isAllowed ? allowed : "https://example.com", // fallback blocks random origins
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default async function handler(req) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured: GROQ_API_KEY missing" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Basic input validation & guardrails
  const {
    prompt = "",
    model = "llama-3.1-70b-versatile",
    temperature = 0.2,
    max_tokens = 512,
    system = "You are a helpful assistant.",
  } = body || {};

  if (!prompt || typeof prompt !== "string" || prompt.length > 8000) {
    return new Response(JSON.stringify({ error: "Invalid 'prompt'." }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!ALLOWED_MODELS.has(model)) {
    return new Response(JSON.stringify({ error: "Model not allowed." }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // OpenAI-compatible Groq endpoint
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const payload = {
    model,
    temperature,
    max_tokens,
    // You can enable streaming later; start simple
    stream: false,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: "Groq error", detail: err }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ text, model }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Network/Server error", detail: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
