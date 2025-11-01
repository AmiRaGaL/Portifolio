async function askGroq(prompt) {
  const res = await fetch("/api/groq-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: "llama-3.1-70b-versatile", // or 8b-instant for faster
      temperature: 0.2,
      max_tokens: 512
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }

  const data = await res.json();
  return data.text;
}

// Example UI hook
document.addEventListener("DOMContentLoaded", () => {
  const askBtn = document.getElementById("ask-ai");
  const input = document.getElementById("ai-prompt");
  const out = document.getElementById("ai-output");
  if (!askBtn || !input || !out) return;

  askBtn.addEventListener("click", async () => {
    askBtn.disabled = true;
    out.textContent = "Thinking...";
    try {
      const text = await askGroq(input.value.trim());
      out.textContent = text;
    } catch (e) {
      out.textContent = "Error: " + e.message;
    } finally {
      askBtn.disabled = false;
    }
  });
});
