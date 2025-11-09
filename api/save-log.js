// api/save-log.js
import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = process.env.VERCEL_BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: "Blob token not configured" });

    const body = await readJson(req);

    // Back-compat: accept either {prompt, answer} or {user, ai}
    const prompt = body?.prompt ?? body?.user;
    const answer = body?.answer ?? body?.ai;
    const model  = body?.model ?? body?.meta?.model ?? null;

    if (!prompt || !answer) {
      return res.status(400).json({ error: "prompt and answer are required" });
    }

    const ts  = new Date().toISOString();
    const day = ts.slice(0, 10); // YYYY-MM-DD
    const data = {
      ts,
      model,
      prompt,
      answer,
      meta: {
        sessionId: body?.meta?.sessionId ?? body?.sessionId ?? null,
        path: body?.meta?.path ?? body?.meta?.page ?? null,
        ua: req.headers["user-agent"] || null,
        ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null
      }
    };

    const key = `chat-logs/${day}/log.jsonl`;
    await appendJsonl(key, data, token);

    return res.status(200).json({ ok: true, key });
  } catch (err) {
    console.error("[save-log] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

// Append one JSON object as a line into a per-day JSONL file.
// (Simple approach: read-if-exists, then re-put. Good enough for small logs.)
async function appendJsonl(key, obj, token) {
  let existing = "";
  try {
    const r = await fetch(`https://blob.vercel-storage.com/${encodeURI(key)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.ok) existing = await r.text();
  } catch {/* ignore if missing */}

  const next = (existing ? existing + "\n" : "") + JSON.stringify(obj);
  await put(key, new Blob([next], { type: "application/jsonl" }), {
    access: "private",
    addRandomSuffix: false,
    token
  });
}
