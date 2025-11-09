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
      code: "E_TOKEN_MISSING"
    });
  }

  try {
    const body = await readJson(req);
    const prompt = body?.prompt ?? body?.user;
    const answer = body?.answer ?? body?.ai;
    const model  = body?.model ?? body?.meta?.model ?? "default";
    const sessionId = body?.meta?.sessionId ?? body?.sessionId ?? "anon";
    const path     = body?.meta?.path ?? body?.meta?.page ?? null;

    if (!prompt || !answer) {
      return res.status(400).json({ error: "prompt and answer are required" });
    }

    const ts  = new Date().toISOString();
    const day = ts.slice(0, 10); // YYYY-MM-DD
    // Public blob (token requires it) + hard-to-guess path
    const key = `chat-logs/${day}/${sessionId}/${ts}.json`;

    const payload = { ts, model, prompt, answer, meta: { sessionId, path } };

    const { url } = await put(
      key,
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
      {
        // ✅ Your token requires "public"
        access: "public",
        // Make the final URL hard to guess; also avoids name collisions
        addRandomSuffix: true,
        token,
        contentType: "application/json",
        cacheControl: "no-store"
      }
    );

    return res.status(200).json({ ok: true, url });
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
