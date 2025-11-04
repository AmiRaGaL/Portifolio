// js/script.js
import { chatGroq } from "/js/groq.js";

async function getResumeContext() {
  try {
    const kb = await fetch("/assets/resume_qa.json", { cache: "no-store" }).then(r => r.json());
    const kbText = [
      `NAME: ${kb.profile.name}`,
      `SUMMARY: ${kb.profile.summary}`,
      `HIGHLIGHTS: ${kb.highlights.join(" | ")}`,
      `TOP QA: ${kb.qa.slice(0, 8).map(x => `Q:${x.q} A:${x.a}`).join(" | ")}`
    ].join("\n");
    return kbText;
  } catch {
    return "";
  }
}

async function askResumeAI(userPrompt, onToken, model) {
  const ctx = await getResumeContext();
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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("prompt");
  const output = document.getElementById("answer");
  const modelSel = document.getElementById("model");
  const clearBtn = document.getElementById("clear-chat");

  if (!form || !input || !output) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;

    output.textContent = "";
    form.querySelector("button[type=submit]").disabled = true;

    try {
      await askResumeAI(
        prompt,
        (t) => (output.textContent += t),
        modelSel?.value
      );
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
    } finally {
      form.querySelector("button[type=submit]").disabled = false;
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
