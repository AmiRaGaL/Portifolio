// api/groq-chat.js
import Groq from "groq-sdk";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).send("Missing GROQ_API_KEY");

    let body = req.body || {};
    if (typeof body === "string") { try { body = JSON.parse(body); } catch {} }
    const { messages = [], stream = true, model } = body;

    const groq = new Groq({ apiKey });
    const useModel = (model && model !== "default") ? model : "llama-3.1-8b-instant";
    const safeMessages = Array.isArray(messages) && messages.length
      ? messages
      : [
          {
            role: "system",
            content:
              "You are Deva Sai Kumar Bheesetti's AI assistant for his portfolio visitors. Speak as the assistant ('I'), refer to Deva by name, use only provided context, be concise (1–4 sentences), and preserve exact metrics. Avoid speaking as if you are Deva.",
          },
          { role: "user", content: "Hello" }
        ];

    if (stream) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");

      const completion = await groq.chat.completions.create({
        model: useModel,
        messages: safeMessages,
        stream: true,
        temperature: 0.2,
        max_tokens: 512
      });

      for await (const part of completion) {
        const token = part?.choices?.[0]?.delta?.content ?? "";
        if (token) res.write(token);
      }
      return res.end();
    }

    const completion = await groq.chat.completions.create({
      model: useModel,
      messages: safeMessages,
      stream: false,
      temperature: 0.2,
      max_tokens: 512
    });

    const text = completion?.choices?.[0]?.message?.content || "";
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (err) {
    console.error("groq-chat error:", err);
    res.status(500).send(`Error: ${err.message}`);
  }
}
