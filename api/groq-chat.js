import Groq from "groq-sdk";
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).send("Missing GROQ_API_KEY");

    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    const { messages = [], stream = true, model } = body;

    const groq = new Groq({ apiKey });
    const safeMessages = messages.length
      ? messages
      : [{ role: "system", content: "ResumeAI." }, { role: "user", content: "Hello" }];

    if (stream) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");

      const completion = await groq.chat.completions.create({
        model: model || "llama-3.1-8b-instant",
        messages: safeMessages,
        stream: true
      });

      for await (const part of completion) {
        const token = part?.choices?.[0]?.delta?.content ?? "";
        if (token) res.write(token);
      }
      return res.end();
    }

    const completion = await groq.chat.completions.create({
      model: model || "llama-3.1-8b-instant",
      messages: safeMessages,
      stream: false
    });

    const text = completion?.choices?.[0]?.message?.content || "(no response)";
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (err) {
    console.error("Groq API error:", err);
    res.status(500).send(`Error: ${err.message}`);
  }
}
