// api/groq-chat.js
// Secure Groq Chat endpoint for your portfolio (Vercel serverless)
//
// - Uses the official groq-sdk (ESM import supported by Vercel)
// - Reads model + defaults from env vars (you can change them in the Vercel dashboard)
// - Supports streaming and non-streaming modes
// - No API keys exposed to client

import Groq from "groq-sdk";

// Initialize once (env var must be set in Vercel)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Default settings via environment
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const DEFAULT_TEMP = parseFloat(process.env.GROQ_TEMPERATURE || "0.3");
const DEFAULT_TOP_P = parseFloat(process.env.GROQ_TOP_P || "1");
const DEFAULT_MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS || "1024", 10);

// Helper: read request body safely
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  try {
    const body = JSON.parse(await readBody(req));
    const {
      messages,
      model = DEFAULT_MODEL,
      temperature = DEFAULT_TEMP,
      top_p = DEFAULT_TOP_P,
      max_tokens = DEFAULT_MAX_TOKENS,
      stream = true,
      stop = null,
      reasoning_effort = "medium",
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] is required" });
    }

    // STREAMING MODE
    if (stream) {
      const completion = await groq.chat.completions.create({
        messages,
        model,
        temperature,
        top_p,
        max_completion_tokens: max_tokens,
        stream: true,
        reasoning_effort,
        stop,
      });

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of completion) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) {
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      return res.end();
    }

    // NON-STREAMING MODE
    const completion = await groq.chat.completions.create({
      messages,
      model,
      temperature,
      top_p,
      max_completion_tokens: max_tokens,
      reasoning_effort,
      stop,
    });

    const output = completion?.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: output, model });
  } catch (err) {
    console.error("[groq-chat] error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
