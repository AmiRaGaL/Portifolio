// js/script.js
import { chatGroq } from "/js/groq.js";

/* ============================
   Lightweight Retrieval Logic
=============================== */
function score(query, qa) {
  const terms = new Set(String(query).toLowerCase().split(/\W+/).filter(Boolean));
  return qa
    .map(x => {
      const hay = (x.q + " " + x.a).toLowerCase();
      let s = 0;
      for (const t of terms) if (hay.includes(t)) s++;
      return { ...x, _score: s };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);
}

async function getResumeContext(query) {
  try {
    const kb = await fetch("/assets/resume_qa.json", { cache: "no-store" }).then(r => r.json());
    const top = score(query, kb.qa);
    return [
      `NAME: ${kb.profile.name}`,
      `SUMMARY: ${kb.profile.summary}`,
      `HIGHLIGHTS: ${kb.highlights.join(" | ")}`,
      `RELEVANT QA: ${top.map(x => `Q:${x.q} A:${x.a}`).join(" | ")}`
    ].join("\n");
  } catch (err) {
    console.error("Error loading resume KB:", err);
    return "";
  }
}

/* ============================
   Resume AI Chat Function
=============================== */
async function askResumeAI(userPrompt, onToken, model) {
  const ctx = await getResumeContext(userPrompt);
  const SYSTEM_PROMPT = `You are ResumeAI for Deva Sai Kumar Bheesetti.
Answer strictly with the provided context. If you don't know, say so and suggest
asking about skills, projects, experience, education, or certifications.
Keep answers concise (1–4 sentences). Preserve exact metrics.

--- CONTEXT START ---
${ctx}
--- CONTEXT END ---`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt }
  ];

  return chatGroq(JSON.stringify(messages), onToken, model);
}

/* ============================
   DOM + Event Handlers + Logging
=============================== */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("prompt");
  const output = document.getElementById("answer");
  const modelSel = document.getElementById("model");
  const clearBtn = document.getElementById("clear-chat");

  if (!form || !input || !output) return;

  // Stable per-browser session id for grouping logs
  const sidKey = "resumeAI_sessionId";
  let sessionId = localStorage.getItem(sidKey);
  if (!sessionId) {
    sessionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    localStorage.setItem(sidKey, sessionId);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;

    output.textContent = "";
    const submitBtn = form.querySelector("button[type=submit]");
    if (submitBtn) submitBtn.disabled = true;

    try {
      await askResumeAI(
        prompt,
        (t) => (output.textContent += t),
        modelSel?.value
      );

      // Persist one record per completed exchange to your API (Vercel Blob or logs)
      fetch("/api/save-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          user: prompt,
          ai: output.textContent,
          meta: {
            model: modelSel?.value || "default",
            path: location.pathname
          }
        })
      }).catch(() => { /* non-blocking */ });

    } catch (err) {
      console.error(err);
      output.textContent = `Error: ${err.message}`;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  if (clearBtn && output) {
    clearBtn.addEventListener("click", () => {
      output.textContent = "";
      input.value = "";
      input.focus();
    });
  }
});
