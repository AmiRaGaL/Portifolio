// js/script.js
import { chatGroq } from "/js/groq.js";

/* ============================
   Debug helpers (visible + console)
=============================== */
function log(...args) { console.debug("[ResumeAI]", ...args); }
function showError(msg) {
  let box = document.getElementById("ai-error-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "ai-error-box";
    box.style.cssText = "margin:.5rem 0;padding:.5rem;border:1px solid #e11;background:#fee;color:#900;border-radius:.5rem;white-space:pre-wrap;";
    const out = document.getElementById("answer") || document.body;
    out.parentNode.insertBefore(box, out);
  }
  box.textContent = msg;
}

/* ============================
   Lightweight Retrieval Logic
=============================== */
function score(query, qa) {
  const terms = new Set(String(query).toLowerCase().split(/\W+/).filter(Boolean));
  return qa
    .map(x => {
      const hay = (x.q + " " + x.a).toLowerCase();
      let s = 0; for (const t of terms) if (hay.includes(t)) s++;
      return { ...x, _score: s };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);
}

async function getResumeContext(query) {
  try {
    log("Fetching KB /assets/resume_qa.json …");
    const res = await fetch("/assets/resume_qa.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`KB HTTP ${res.status}`);
    const kb = await res.json();
    const top = score(query, kb.qa);
    return [
      `NAME: ${kb.profile.name}`,
      `SUMMARY: ${kb.profile.summary}`,
      `HIGHLIGHTS: ${kb.highlights.join(" | ")}`,
      `RELEVANT QA: ${top.map(x => `Q:${x.q} A:${x.a}`).join(" | ")}`
    ].join("\n");
  } catch (err) {
    console.error("Error loading resume KB:", err);
    showError(`KB load failed: ${String(err.message || err)}`);
    return ""; // still proceed; model can answer with reduced context
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

  log("Calling /api/groq-chat …", { model, hasCtx: Boolean(ctx) });
  return chatGroq(JSON.stringify(messages), onToken, model);
}

/* ============================
   Robust init that waits for section
=============================== */
let bound = false;

function bindChatOnce(root = document) {
  if (bound) return;
  const form = root.querySelector("#chat-form");
  const input = root.querySelector("#prompt");
  const output = root.querySelector("#answer");
  const modelSel = root.querySelector("#model");
  const clearBtn = root.querySelector("#clear-chat");

  if (!form || !input || !output) {
    log("Chat elements not present yet. Waiting…");
    return;
  }

  bound = true;
  log("Binding chat handlers.");

  // Session id for grouping logs
  const sidKey = "resumeAI_sessionId";
  let sessionId = localStorage.getItem(sidKey);
  if (!sessionId) {
    sessionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    localStorage.setItem(sidKey, sessionId);
  }

  // Quick API reachability ping (should return 405)
  fetch("/api/groq-chat", { method: "GET" })
    .then(r => log("Ping /api/groq-chat:", r.status))
    .catch(e => { console.error(e); showError("Cannot reach /api/groq-chat"); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;
    showError(""); // clear any previous visible error

    output.textContent = "";
    const submitBtn = form.querySelector("button[type=submit]");
    if (submitBtn) submitBtn.disabled = true;

    try {
      await askResumeAI(
        prompt,
        (t) => (output.textContent += t),
        modelSel?.value
      );

      // fire-and-forget log
      fetch("/api/save-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          user: prompt,
          ai: output.textContent,
          meta: { model: modelSel?.value || "default", path: location.pathname }
        })
      }).catch(() => {});

    } catch (err) {
      console.error(err);
      showError(`Chat error: ${err.message}`);
      output.textContent = `Error: ${err.message}`;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  if (clearBtn && output) {
    clearBtn.addEventListener("click", () => {
      showError("");
      output.textContent = "";
      input.value = "";
      input.focus();
    });
  }

  log("Chat ready. Try a prompt like: 'Summarize my strengths for an AI Engineer role in 2 lines.'");
}

/* Bind when DOM is ready (for static pages) */
document.addEventListener("DOMContentLoaded", () => {
  bindChatOnce(document);

  // If sections are injected later, watch for the chat section
  const mo = new MutationObserver(() => {
    if (!bound) bindChatOnce(document);
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Also, if your loader dispatches a custom event when sections finish, listen for it:
  window.addEventListener("sections:loaded", () => {
    log("sections:loaded received");
    bindChatOnce(document);
  });
});
