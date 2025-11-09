// api/save-log.js
import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.VERCEL_BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "Blob token not configured",
      hint: "Set VERCEL_BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN in this environment",
      code: "E_TOKEN_MISSING"
    });
  }

  try {
    const body = await readJson(req);
    const prompt = body?.prompt ?? body?.user;
    const answer = body?.answer ?? body?.ai;
    const model  = body?.model ?? body?.meta?.model ?? "default";
    const sessionId = body?.meta?.sessionId ?? body?.sessionId ?? "anon";

    if (!prompt || !answer) {
      return res.status(400).json({ error: "prompt and answer are required" });
    }

    const ts = new Date().toISOString();
    const day = ts.slice(0, 10); // YYYY-MM-DD
    const key = `chat-logs/${day}/${ts}-${sessionId}.json`;

    const payload = {
      ts, model, prompt, answer,
      meta: {
        sessionId,
        path: body?.meta?.path ?? body?.meta?.page ?? null,
        ua: req.headers["user-agent"] || null,
        ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null
      }
    };

    await put(key, new Blob([JSON.stringify(payload)], { type: "application/json" }), {
      access: "private",
      addRandomSuffix: false,
      token
    });

    return res.status(200).json({ ok: true, key });
  } catch (err) {
    console.error("[save-log] error:", err);
    return res.status(500).json({
      error: "Internal server error",
      detail: err?.message ?? String(err),
      code: "E_RUNTIME"
    });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
