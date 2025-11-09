// api/save-log.js
import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Use the updated environment variable
    const token = process.env.VERCEL_BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;
    if (!token) return res.status(500).json({ error: "Blob token not configured" });

    const { prompt, answer, model, meta } = await readJson(req);
    if (!prompt || !answer) {
      return res.status(400).json({ error: "prompt and answer are required" });
    }

    const ts = new Date().toISOString();
    const day = ts.slice(0, 10); // YYYY-MM-DD
    const data = {
      ts,
      model: model || null,
      prompt,
      answer,
      meta: {
        ua: req.headers["user-agent"] || null,
        ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
        ...meta,
      },
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
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

// Append to existing JSONL file in Blob
async function appendJsonl(key, obj, token) {
  let existing = "";
  try {
    const resp = await fetch(`https://blob.vercel-storage.com/${encodeURI(key)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) existing = await resp.text();
  } catch (_) {
    // ignore if file not found
  }

  const next = (existing ? existing + "\n" : "") + JSON.stringify(obj);

  await put(key, new Blob([next], { type: "application/jsonl" }), {
    access: "private",
    addRandomSuffix: false,
    token,
  });
}
