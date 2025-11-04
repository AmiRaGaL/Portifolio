// js/groq.js
export async function chatGroq(messagesOrPrompt, onToken, model) {
  const looksLikeMessages =
    typeof messagesOrPrompt === "string" &&
    messagesOrPrompt.trim().startsWith("[");

  const body = looksLikeMessages
    ? { messages: JSON.parse(messagesOrPrompt) }
    : { messages: [{ role: "user", content: String(messagesOrPrompt ?? "").trim() }] };

  // only send model if it's a real id
  const payload = { ...body, stream: true, ...(model ? { model } : {}) };

  console.debug("[chatGroq] POST /api/groq-chat", { body: payload });

  const res = await fetch("/api/groq-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[chatGroq] HTTP error", res.status, res.statusText, text);
    throw new Error(`Groq chat failed: ${res.status} ${res.statusText} — ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (onToken) onToken(chunk);
  }
}
