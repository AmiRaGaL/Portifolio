// api/save-log.js
import { put } from "@vercel/blob";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });

  try {
    const { sessionId, user, ai, meta } = await req.json();

    // Build a single log record (one per completed answer)
    const record = {
      ts: new Date().toISOString(),
      sessionId: String(sessionId || crypto.randomUUID()),
      userPrompt: String(user || ""),
      aiAnswer: String(ai || ""),
      meta: {
        path: meta?.path || null,
        model: meta?.model || null,
        userAgent: req.headers.get("user-agent") || null,
        referrer: req.headers.get("referer") || null,
      }
    };

    // Store as a JSONL blob (one file per record) under a date/session folder
    const date = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    const key = `resume-ai/logs/${date}/${record.sessionId}/${Date.now()}.jsonl`;

    await put(key, JSON.stringify(record) + "\n", {
      access: "private",
      contentType: "application/json"
    });

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(`Log error: ${e.message}`, { status: 500 });
  }
}
