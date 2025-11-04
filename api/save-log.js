import { put } from "@vercel/blob";
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  try {
    let body = req.body || {};
    if (typeof body === "string") { try { body = JSON.parse(body); } catch {} }
    const { sessionId, user, ai, meta } = body;

    const record = {
      ts: new Date().toISOString(),
      sessionId: String(sessionId || Date.now()),
      userPrompt: String(user || ""),
      aiAnswer: String(ai || ""),
      meta: {
        path: meta?.path || null,
        model: meta?.model || null,
        userAgent: req.headers["user-agent"] || null,
        referrer: req.headers.referer || null
      }
    };

    const date = new Date().toISOString().slice(0,10);
    const key = `resume-ai/logs/${date}/${record.sessionId}/${Date.now()}.jsonl`;

    await put(key, JSON.stringify(record) + "\n", {
      access: "private",
      contentType: "application/json"
    });

    res.status(200).send("ok");
  } catch (e) {
    console.error("save-log error:", e);
    res.status(500).send(`Log error: ${e.message}`);
  }
}
