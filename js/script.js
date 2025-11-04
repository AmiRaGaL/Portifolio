// js/script.js
import { chatGroq } from "/js/groq.js";

/* ---------- Debug UI ---------- */
function log(...a){ console.debug("[ResumeAI]", ...a); }
function showError(msg){
  let box = document.getElementById("ai-error-box");
  if (!msg) {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    return;
  }
  if (!box) {
    box = document.createElement("div");
    box.id = "ai-error-box";
    box.style.cssText = "margin:.5rem 0;padding:.5rem;border:1px solid #e11;background:#fee;color:#900;border-radius:.5rem;white-space:pre-wrap;";
    const out = document.getElementById("answer") || document.body;
    out.parentNode.insertBefore(box, out);
  }
  box.textContent = msg;
}

/* ---------- Retrieval ---------- */
function score(q, qa){
  const terms = new Set(String(q).toLowerCase().split(/\W+/).filter(Boolean));
  return qa.map(x=>{
    const h=(x.q+" "+x.a).toLowerCase();
    let s=0; for(const t of terms) if(h.includes(t)) s++;
    return {...x,_score:s};
  }).sort((a,b)=>b._score-a._score).slice(0,5);
}
async function getResumeContext(query){
  try{
    const r = await fetch("/assets/resume_qa.json", { cache:"no-store" });
    if(!r.ok) throw new Error(`KB HTTP ${r.status}`);
    const kb = await r.json();
    const top = score(query, kb.qa);
    return [
      `NAME: ${kb.profile.name}`,
      `SUMMARY: ${kb.profile.summary}`,
      `HIGHLIGHTS: ${kb.highlights.join(" | ")}`,
      `RELEVANT QA: ${top.map(x=>`Q:${x.q} A:${x.a}`).join(" | ")}`
    ].join("\n");
  }catch(e){
    showError(`KB load failed: ${e.message||e}`);
    return "";
  }
}

/* ---------- Chat core ---------- */
async function askResumeAI(userPrompt, onToken, model){
  const ctx = await getResumeContext(userPrompt);
  const SYSTEM = `You are ResumeAI for Deva Sai Kumar Bheesetti.
Answer strictly with the provided context. If you don't know, say so and suggest
asking about skills, projects, experience, education, or certifications.
Keep answers concise (1–4 sentences). Preserve exact metrics.

--- CONTEXT START ---
${ctx}
--- CONTEXT END ---`;
  const messages = [
    { role:"system", content:SYSTEM },
    { role:"user", content:userPrompt }
  ];
  log("POST /api/groq-chat", {model, hasCtx:Boolean(ctx)});
  return chatGroq(JSON.stringify(messages), onToken, model);
}

/* ---------- Bind & handlers ---------- */
let bound = false;

function handleSubmit(e, root){
  e?.preventDefault?.();
  e?.stopPropagation?.();

  const form    = root.querySelector("#chat-form");
  const input   = root.querySelector("#prompt");
  const output  = root.querySelector("#answer");
  const modelEl = root.querySelector("#model");
  if(!form||!input||!output){ return; }

  const submitBtn = form.querySelector('button[type="submit"]');
  const prompt = input.value.trim();
  if(!prompt) return;

  showError(""); // hide error box
  output.textContent = "";
  if(submitBtn) submitBtn.disabled = true;

  // normalize model (avoid sending "default")
  const selected = modelEl?.value;
  const effectiveModel = (selected && selected !== "default") ? selected : undefined;

  // stable per-tab session id for logging
  const sidKey="resumeAI_sessionId";
  let sessionId = localStorage.getItem(sidKey) || (crypto.randomUUID?.() || String(Date.now()));
  localStorage.setItem(sidKey, sessionId);

  askResumeAI(prompt, (t)=>output.textContent += t, effectiveModel)
    .then(()=>{
      // fire-and-forget log (ok if fails)
      fetch("/api/save-log", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          sessionId,
          user: prompt,
          ai: output.textContent,
          meta:{ model: effectiveModel || "default", path: location.pathname }
        })
      }).catch(()=>{});
    })
    .catch(err=>{
      console.error(err);
      showError(`Chat error: ${err.message}`);
      output.textContent = `Error: ${err.message}`;
    })
    .finally(()=>{
      if(submitBtn) submitBtn.disabled=false;
    });
}

function bindChatOnce(root=document){
  if(bound) return;
  const form    = root.querySelector("#chat-form");
  const input   = root.querySelector("#prompt");
  const output  = root.querySelector("#answer");
  const sendBtn = root.querySelector("#send-btn");
  const clearBtn= root.querySelector("#clear-chat");
  if(!form||!input||!output){ log("Chat nodes missing; wait…"); return; }

  bound = true;
  log("Binding chat handlers.");

  form.addEventListener("submit", (e)=>handleSubmit(e, root), true);
  if(sendBtn){
    sendBtn.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      handleSubmit(e, root);
    }, true);
  }
  if(clearBtn){
    clearBtn.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      showError("");            // hide red bar
      output.textContent = "";  // clear answer
      input.value = "";         // clear prompt
      input.focus();
    }, true);
  }

  log("Chat ready.");
}

document.addEventListener("DOMContentLoaded", ()=>{
  bindChatOnce(document);

  const mo = new MutationObserver(()=>{ if(!bound) bindChatOnce(document); });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  window.addEventListener("sections:loaded", ()=>{ if(!bound) bindChatOnce(document); });
});
