// api/groq-chat.js
import Groq from "groq-sdk";

export const config = { runtime: "nodejs" }; 

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).send("Missing GROQ_API_KEY");
      return;
    }

    // Parse incoming body
    let body = {};
    try {
      body = req.body || {};
      if (typeof body === "string") body = JSON.parse(body);
    } catch (e) {
      console.error("Body parse error:", e);
    }

    const { messages = [], stream = true, model } = body;

    const safeMessages =
      Array.isArray(messages) && messages.length
        ? messages
        : [
            {
              role: "system",
              content:
                "You are ResumeAI for Deva Sai Kumar Bheesetti. Answer using only the provided context. Be concise (1–4 sentences).",
            },
            { role: "user", content: "Hello" },
          ];

    const groq = new Groq({ apiKey });

    // Stream response
    if (stream) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");

      const completion = await groq.chat.completions.create({
        model: model || "llama-3.1-8b-instant",
        messages: safeMessages,
        stream: true,
      });

      for await (const part of completion) {
        const token = part?.choices?.[0]?.delta?.content ?? "";
        if (token) res.write(token);
      }
      res.end();
      return;
    }

    // Non-stream fallback
    const completion = await groq.chat.completions.create({
      model: model || "llama-3.1-8b-instant",
      messages: safeMessages,
      stream: false,
    });

    const text =
      completion?.choices?.[0]?.message?.content || "(no response)";
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (err) {
    console.error("Groq API error:", err);
    res.status(500).send(`Error: ${err.message}`);
  }
}
